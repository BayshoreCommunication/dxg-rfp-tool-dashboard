import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { autoExtractKey, AUTO_EXTRACT_MAX_WAIT_MS, SOURCE_REQUEST_TIMEOUT_MS, useAutoExtraction, useSourceUpload } from './useConversation';
import { createPrivateUploadSession, listPrivateDocumentSources } from '@/app/actions/durableJobs';

jest.mock('@/app/actions/durableJobs', () => ({
  listPrivateDocumentSources: jest.fn(), createPrivateUploadSession: jest.fn(),
  completePrivateUpload: jest.fn(), createSourceScanJob: jest.fn(), getDurableJob: jest.fn(),
}));
jest.mock('@/app/actions/conversation', () => ({}));

const listSources = jest.mocked(listPrivateDocumentSources);
const proposalId = 'attachment-recovery-test';
const source = (id: string, status: string) => ({ id, status, originalFilename: `${id}.txt`, confidentiality: 'non_confidential' as const, createdAt: new Date().toISOString(), origin: 'upload' as const });
const ok = (data: ReturnType<typeof source>[]) => ({ success: true as const, data, correlationId: 'test' });

beforeEach(() => { jest.resetAllMocks(); jest.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); });
afterEach(() => jest.useRealTimers());

test.each(['pending', 'failed'])('a persisted %s file state hydrates without a server/client mismatch', async (state) => {
  localStorage.setItem(autoExtractKey(proposalId), JSON.stringify(state === 'pending'
    ? { pending: ['brief'], handled: [] }
    : { pending: [], handled: ['brief'], failures: [{ sourceId: 'brief', filename: 'brief.txt', reason: 'failed' }] }));
  listSources.mockResolvedValue(ok([source('brief', 'scanning')]));
  const send = jest.fn();
  function Harness() {
    const intake = useAutoExtraction(proposalId, send);
    return <p>{intake.failedNotices.length ? 'File needs attention' : intake.autoScanning ? 'Reading file' : 'Loading conversation'}</p>;
  }
  const container = document.createElement('div');
  container.innerHTML = renderToString(<Harness />);
  expect(container.textContent).toBe('Loading conversation');
  document.body.appendChild(container);
  const onRecoverableError = jest.fn();
  let root!: Root;
  try {
    await act(async () => { root = hydrateRoot(container, <Harness />, { onRecoverableError }); });
    await act(async () => { await jest.advanceTimersByTimeAsync(1); });
    expect(container.textContent).toBe(state === 'pending' ? 'Reading file' : 'File needs attention');
    expect(onRecoverableError).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

test('restored unextracted attachments block the very first render before scan effects start', () => {
  listSources.mockResolvedValue(ok([source('brief', 'scanning')]));
  const { result } = renderHook(() => useAutoExtraction(proposalId, jest.fn(), [], ['brief']));
  expect(result.current.autoScanning).toBe(true);
});

test('late persisted intake from the first-send handoff starts a watch when its message arrives', async () => {
  listSources.mockResolvedValue(ok([source('brief', 'ready')]));
  const send = jest.fn().mockResolvedValue(true);
  const { result, rerender } = renderHook(({ attached }) => useAutoExtraction(proposalId, send, [], attached), {
    initialProps: { attached: [] as string[] },
  });
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });
  expect(result.current.autoScanning).toBe(false);
  // The originating workspace can persist intake after the destination's
  // one-time restore effect has already seen an empty store.
  localStorage.setItem(autoExtractKey(proposalId), JSON.stringify({ pending: ['brief'], handled: [] }));
  rerender({ attached: ['brief'] });
  await act(async () => { await jest.advanceTimersByTimeAsync(2); });
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ sourceIds: ['brief'] }), proposalId);
  expect(result.current.autoScanning).toBe(false);
});

test('a failed file stays recoverable after reload and does not discard a healthy file in the same batch', async () => {
  listSources.mockResolvedValue(ok([source('bad', 'failed'), source('good', 'ready')]));
  const send = jest.fn().mockResolvedValue(true);
  const { result, unmount } = renderHook(() => useAutoExtraction(proposalId, send));
  await act(async () => result.current.queueAutoExtract(proposalId, ['bad', 'good']));
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ sourceIds: ['good'] }), proposalId);
  expect(result.current.failedNotices).toEqual([{ sourceId: 'bad', filename: 'bad.txt', reason: 'failed' }]);
  unmount();
  const restored = renderHook(() => useAutoExtraction(proposalId, send, ['good'], ['bad']));
  expect(restored.result.current.failedNotices).toHaveLength(1);
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });
  expect(restored.result.current.failedNotices).toHaveLength(1);
  expect(restored.result.current.autoScanning).toBe(false);
  expect(send).toHaveBeenCalledTimes(1);
  act(() => restored.result.current.continueWithoutFiles());
  expect(restored.result.current.failedNotices).toHaveLength(0);
  expect(JSON.parse(localStorage.getItem(autoExtractKey(proposalId))!).handled).toContain('bad');
});

test.each(['failed-response', 'network-rejection'])('a persistent %s ends in recovery, not endless polling', async (failure) => {
  if (failure === 'network-rejection') listSources.mockRejectedValue(new Error('offline'));
  else listSources.mockResolvedValue({ success: false, message: 'Unavailable', code: 'NETWORK_ERROR', correlationId: 'test' });
  const send = jest.fn();
  const { result } = renderHook(() => useAutoExtraction(proposalId, send));
  await act(async () => result.current.queueAutoExtract(proposalId, ['brief']));
  await act(async () => { await jest.advanceTimersByTimeAsync(AUTO_EXTRACT_MAX_WAIT_MS + 10_000); });
  expect(result.current.autoScanning).toBe(false);
  expect(result.current.failedNotices[0]).toMatchObject({ sourceId: 'brief', reason: 'timeout' });
  expect(send).not.toHaveBeenCalled();
});

test('retry checks the original source and extracts only once when it becomes ready', async () => {
  listSources.mockResolvedValue(ok([source('brief', 'failed')]));
  const send = jest.fn().mockResolvedValue(true);
  const { result } = renderHook(() => useAutoExtraction(proposalId, send));
  await act(async () => result.current.queueAutoExtract(proposalId, ['brief']));
  listSources.mockResolvedValue(ok([source('brief', 'ready')]));
  await act(async () => result.current.retryFileCheck('brief'));
  expect(result.current.failedNotices).toHaveLength(0);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ sourceIds: ['brief'] }), proposalId);
});

test('a blocked file cannot bypass the security check through retry', async () => {
  listSources.mockResolvedValue(ok([source('brief', 'blocked')]));
  const send = jest.fn();
  const { result } = renderHook(() => useAutoExtraction(proposalId, send));
  await act(async () => result.current.queueAutoExtract(proposalId, ['brief']));
  listSources.mockResolvedValue(ok([source('brief', 'ready')]));
  await act(async () => result.current.retryFileCheck('brief'));
  expect(result.current.failedNotices[0].reason).toBe('blocked');
  expect(send).not.toHaveBeenCalled();
});

test('an aborted upload action settles and permits another attempt', async () => {
  jest.mocked(createPrivateUploadSession).mockRejectedValue(new Error('aborted action'));
  const { result } = renderHook(() => useSourceUpload(proposalId));
  const file = new File(['brief'], 'brief.txt', { type: 'text/plain' });
  await act(async () => { expect(await result.current.upload(file, 'non_confidential')).toBeNull(); });
  expect(result.current.uploadBusy).toBe(false);
  expect(result.current.uploadError).toMatch(/could not be completed/);
  await act(async () => { await result.current.upload(file, 'non_confidential'); });
  expect(createPrivateUploadSession).toHaveBeenCalledTimes(2);
});

test('explicit manual continuation cancels a scheduled automatic extraction retry', async () => {
  listSources.mockResolvedValue(ok([source('brief', 'ready')]));
  const send = jest.fn().mockResolvedValue(false);
  const { result } = renderHook(() => useAutoExtraction(proposalId, send));
  await act(async () => result.current.queueAutoExtract(proposalId, ['brief']));
  expect(send).toHaveBeenCalledTimes(1);
  act(() => result.current.skipSources(['brief']));
  await act(async () => { await jest.advanceTimersByTimeAsync(30_000); });
  expect(send).toHaveBeenCalledTimes(1);
  expect(result.current.autoScanning).toBe(false);
});

test('a source service that never responds reaches recovery rather than hanging forever', async () => {
  listSources.mockReturnValue(new Promise(() => {}));
  const { result } = renderHook(() => useAutoExtraction(proposalId, jest.fn()));
  act(() => result.current.queueAutoExtract(proposalId, ['brief']));
  await act(async () => { await jest.advanceTimersByTimeAsync(AUTO_EXTRACT_MAX_WAIT_MS + SOURCE_REQUEST_TIMEOUT_MS); });
  expect(result.current.autoScanning).toBe(false);
  expect(result.current.failedNotices[0].reason).toBe('timeout');
});

test('an upload session that never responds unlocks the composer for a retry', async () => {
  jest.mocked(createPrivateUploadSession).mockReturnValue(new Promise(() => {}));
  const { result } = renderHook(() => useSourceUpload(proposalId));
  let upload!: Promise<string | null>;
  act(() => { upload = result.current.upload(new File(['brief'], 'brief.txt'), 'non_confidential'); });
  await act(async () => { await jest.advanceTimersByTimeAsync(SOURCE_REQUEST_TIMEOUT_MS); });
  expect(await upload).toBeNull();
  expect(result.current.uploadBusy).toBe(false);
  expect(result.current.uploadError).toMatch(/could not be completed/);
});

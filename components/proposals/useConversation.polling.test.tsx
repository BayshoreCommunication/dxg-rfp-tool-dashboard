import { act, renderHook } from '@testing-library/react';
import { useConversation } from './useConversation';
import { readConversationSnapshot } from '@/lib/proposals/conversationRead';
import { postConversationMessageAction } from '@/app/actions/conversation';

jest.mock('@/lib/proposals/conversationRead', () => ({readConversationSnapshot: jest.fn()}));
jest.mock('@/app/actions/conversation', () => ({postConversationMessageAction: jest.fn(), patchConversationQuestionAction: jest.fn(), createProposalNotesAction: jest.fn()}));
jest.mock('@/app/actions/durableJobs', () => ({}));
const read = jest.mocked(readConversationSnapshot);
const snapshot = {success: true as const, correlationId:'test', data:{conversation:null, messages:[], questions:[]}};

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  Object.defineProperty(document, 'hidden', {configurable:true, value:false});
  read.mockImplementation(async () => JSON.parse(JSON.stringify(snapshot)));
});
afterEach(() => jest.useRealTimers());

test('idle reads back off, preserve unchanged data and never create AI messages', async () => {
  const {result} = renderHook(() => useConversation('aaaaaaaaaaaaaaaaaaaaaaaa'));
  await act(async () => {});
  const original = result.current.data;
  expect(read).toHaveBeenCalledTimes(1);
  await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });
  expect(read).toHaveBeenCalledTimes(4); // initial, 30s, 60s, 120s
  expect(result.current.data).toBe(original);
  expect(postConversationMessageAction).not.toHaveBeenCalled();
});

test('hidden tabs do not poll and repeated visibility events do not overlap reads', async () => {
  renderHook(() => useConversation('aaaaaaaaaaaaaaaaaaaaaaaa'));
  await act(async () => {});
  Object.defineProperty(document, 'hidden', {configurable:true, value:true});
  await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
  expect(read).toHaveBeenCalledTimes(1);
  let finish!: (value: typeof snapshot) => void;
  read.mockImplementationOnce(() => new Promise(resolve => {finish=resolve;}));
  Object.defineProperty(document, 'hidden', {configurable:true, value:false});
  act(() => { document.dispatchEvent(new Event('visibilitychange')); document.dispatchEvent(new Event('visibilitychange')); });
  expect(read).toHaveBeenCalledTimes(2);
  await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
  expect(read).toHaveBeenCalledTimes(2);
  await act(async () => { finish(snapshot); });
  await act(async () => { await jest.advanceTimersByTimeAsync(30_000); });
  expect(read).toHaveBeenCalledTimes(3);
});

test('an expired session stops the poll loop instead of repeatedly calling the server', async () => {
  read.mockResolvedValueOnce({success:false,code:'AUTHENTICATION_REQUIRED',message:'Please sign in.',correlationId:'test'});
  const {result} = renderHook(() => useConversation('aaaaaaaaaaaaaaaaaaaaaaaa'));
  await act(async () => {});
  await act(async () => { await jest.advanceTimersByTimeAsync(180_000); });
  expect(read).toHaveBeenCalledTimes(1);
  expect(result.current.loadError).toBe('Please sign in.');
});

test('initial loading does not start another read while the first request is pending', async () => {
  let finish!: (value: typeof snapshot) => void;
  read.mockImplementationOnce(() => new Promise(resolve => {finish=resolve;}));
  renderHook(() => useConversation('aaaaaaaaaaaaaaaaaaaaaaaa'));
  await act(async () => { await jest.advanceTimersByTimeAsync(90_000); });
  expect(read).toHaveBeenCalledTimes(1);
  await act(async () => { finish(snapshot); });
});

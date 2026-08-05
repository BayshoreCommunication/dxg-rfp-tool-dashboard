import { act, renderHook, waitFor } from "@testing-library/react";
import { SEND_TIMEOUT_MS, useConversation } from "./useConversation";
import { getConversationAction, postConversationMessageAction } from "@/app/actions/conversation";

// Recovery behaviour of the send pipeline: a server action call that rejects
// (an aborted POST) or never settles (a hung request) must always land the
// pending entry in "failed" — never leave it in "sending" forever, which
// presented as a permanently stuck "Sending… / The assistant is responding"
// composer with no error and no retry.

jest.mock("@/app/actions/conversation", () => ({
  getConversationAction: jest.fn(),
  postConversationMessageAction: jest.fn(),
  patchConversationQuestionAction: jest.fn(),
  createProposalNotesAction: jest.fn(),
  closeConversationSegmentAction: jest.fn(),
}));

jest.mock("@/app/actions/durableJobs", () => ({
  listPrivateDocumentSources: jest.fn(),
  createPrivateUploadSession: jest.fn(),
  completePrivateUpload: jest.fn(),
  createSourceScanJob: jest.fn(),
  getDurableJob: jest.fn(),
}));

const mockedPostMessage = postConversationMessageAction as jest.MockedFunction<typeof postConversationMessageAction>;
const mockedGetConversation = getConversationAction as jest.MockedFunction<typeof getConversationAction>;

const PROPOSAL_ID = "proposal-e2e-recovery";

describe("useConversation send recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { conversation: null, messages: [], questions: [] },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("a rejected action marks the entry failed instead of leaving it sending", async () => {
    mockedPostMessage.mockRejectedValue(new Error("net::ERR_ABORTED"));
    // proposalId null keeps the SSE/polling effects inert; the send targets
    // the freshly created proposal explicitly, like the first-send flow does.
    const { result } = renderHook(() => useConversation(null));

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendMessage({ content: "hello", intent: "chat" }, PROPOSAL_ID);
    });

    expect(sent).toBe(false);
    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    expect(result.current.pending[0].state).toBe("failed");
    expect(result.current.pending[0].errorMessage).toMatch(/didn't go through/);
  });

  test("a send that never settles fails after the client-side timeout", async () => {
    jest.useFakeTimers();
    mockedPostMessage.mockImplementation(() => new Promise(() => undefined));
    const { result } = renderHook(() => useConversation(null));

    let sendPromise: Promise<boolean> | undefined;
    act(() => {
      sendPromise = result.current.sendMessage({ content: "hello", intent: "chat" }, PROPOSAL_ID);
    });
    await act(async () => {
      jest.advanceTimersByTime(SEND_TIMEOUT_MS + 1);
    });

    await expect(sendPromise).resolves.toBe(false);
    expect(result.current.pending[0].state).toBe("failed");
  });

  test("a retried entry reuses its idempotency key and clears on success", async () => {
    mockedPostMessage
      .mockRejectedValueOnce(new Error("net::ERR_ABORTED"))
      .mockResolvedValueOnce({
        success: true,
        correlationId: "test-correlation",
        data: { created: true, message: null, assistantMessageId: null, run: null },
      });
    const { result } = renderHook(() => useConversation(null));

    await act(async () => {
      await result.current.sendMessage({ content: "hello", intent: "chat" }, PROPOSAL_ID);
    });
    await waitFor(() => expect(result.current.pending[0]?.state).toBe("failed"));

    await act(async () => {
      await result.current.retrySend(result.current.pending[0].localId);
    });

    expect(mockedPostMessage).toHaveBeenCalledTimes(2);
    expect(mockedPostMessage.mock.calls[0][2]).toBe(mockedPostMessage.mock.calls[1][2]);
    await waitFor(() => expect(result.current.pending).toHaveLength(0));
  });
});

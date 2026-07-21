import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConversationWorkspace from "./ConversationWorkspace";
import { getConversationAction, patchConversationQuestionAction } from "@/app/actions/conversation";

jest.mock("@/app/actions/conversation", () => ({
  getConversationAction: jest.fn(),
  postConversationMessageAction: jest.fn(),
  patchConversationQuestionAction: jest.fn(),
  createProposalNotesAction: jest.fn(),
}));

jest.mock("@/app/actions/durableJobs", () => ({
  createSourceScanJob: jest.fn(),
  getDurableJob: jest.fn(),
  listPrivateDocumentSources: jest.fn().mockResolvedValue({ success: true, data: [], correlationId: "test-correlation" }),
}));

class EventSourceStub {
  static instances: EventSourceStub[] = [];
  url: string;
  onerror: ((event: unknown) => void) | null = null;
  constructor(url: string) {
    this.url = url;
    EventSourceStub.instances.push(this);
  }
  addEventListener() {}
  removeEventListener() {}
  close() {}
}
(globalThis as unknown as { EventSource: unknown }).EventSource = EventSourceStub;

const mockedGetConversation = getConversationAction as jest.MockedFunction<typeof getConversationAction>;
const mockedPatchQuestion = patchConversationQuestionAction as jest.MockedFunction<typeof patchConversationQuestionAction>;

const conversationFixture = {
  success: true as const,
  correlationId: "test-correlation",
  data: {
    conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 2, updatedAt: "2026-07-21T10:00:00.000Z" },
    messages: [
      {
        id: "msg-1", ordinal: 1, role: "user" as const, kind: "instruction" as const, content: "Please review the venue requirements.",
        intent: "chat", runType: null, runId: null, jobId: null, status: "complete" as const, createdAt: "2026-07-21T09:59:00.000Z", attachments: [],
      },
      {
        id: "msg-2", ordinal: 2, role: "assistant" as const, kind: "run_result" as const, content: "I extracted the requirements from your sources.",
        intent: null, runType: "proposal_context" as const, runId: "run-1", jobId: "job-1", status: "complete" as const, createdAt: "2026-07-21T10:00:00.000Z",
        attachments: [{ sourceId: "src-1", role: "input", filename: "venue.pdf", sourceStatus: "ready" }],
      },
    ],
    questions: [
      {
        id: "q-1", code: "MISSING_EVENT_DATE", severity: "blocking" as const, paths: ["/eventDate"],
        prompt: "What is the event date?", status: "open" as const, contextRunId: "run-1", createdAt: "2026-07-21T10:00:00.000Z",
      },
    ],
  },
};

describe("ConversationWorkspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    EventSourceStub.instances = [];
    mockedGetConversation.mockResolvedValue(conversationFixture);
  });

  test("renders messages, attachments, run links, and open question cards", async () => {
    const onOpenRun = jest.fn();
    render(<ConversationWorkspace proposalId="507f1f77bcf86cd799439011" onOpenRun={onOpenRun} />);
    expect(await screen.findByText("Please review the venue requirements.")).toBeInTheDocument();
    expect(screen.getByText("I extracted the requirements from your sources.")).toBeInTheDocument();
    expect(screen.getByText("venue.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View extracted requirements" }));
    expect(onOpenRun).toHaveBeenCalledWith("proposal_context", "run-1");
    expect(screen.getByText("What is the event date?")).toBeInTheDocument();
    expect(screen.getByText("Blocking")).toBeInTheDocument();
  });

  test("answering a question calls the patch action and refetches the conversation", async () => {
    mockedPatchQuestion.mockResolvedValue({ success: true, correlationId: "test-correlation", data: { id: "q-1", status: "answered", answeredMessageId: "msg-3" } });
    render(<ConversationWorkspace proposalId="507f1f77bcf86cd799439011" />);
    await screen.findByText("What is the event date?");
    const initialLoads = mockedGetConversation.mock.calls.length;

    const answerButton = screen.getByRole("button", { name: "Answer" });
    expect(answerButton).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Type your answer"), { target: { value: "12 March 2027" } });
    expect(answerButton).toBeEnabled();
    fireEvent.click(answerButton);

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "q-1",
      { status: "answered", answer: "12 March 2027" },
    ));
    await waitFor(() => expect(mockedGetConversation.mock.calls.length).toBeGreaterThan(initialLoads));
  });

  test("disables Extract requirements when no source is selected", async () => {
    render(<ConversationWorkspace proposalId="507f1f77bcf86cd799439011" />);
    await screen.findByText("Please review the venue requirements.");
    expect(screen.getByRole("button", { name: "Extract requirements" })).toBeDisabled();
  });
});

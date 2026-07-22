import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssistantWorkspacePage from "./AssistantWorkspacePage";
import { createProposalNotesAction, getConversationAction, patchConversationQuestionAction, postConversationMessageAction } from "@/app/actions/conversation";
import { getProposalContextAction } from "@/app/actions/proposalContext";
import {
  completePrivateUpload,
  createPrivateUploadSession,
  createSourceScanJob,
  getDurableJob,
  listPrivateDocumentSources,
} from "@/app/actions/durableJobs";
import { createProposalAction, getProposalByIdAction } from "@/app/actions/proposals";
import { getUserData } from "@/app/actions/user";
import { applyCandidatesAction, getCandidateReviewAction, saveCandidateReviewAction } from "@/app/actions/candidateApplication";

const replace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

jest.mock("@/app/actions/conversation", () => ({
  getConversationAction: jest.fn(),
  postConversationMessageAction: jest.fn(),
  patchConversationQuestionAction: jest.fn(),
  createProposalNotesAction: jest.fn(),
}));

jest.mock("@/app/actions/durableJobs", () => ({
  listPrivateDocumentSources: jest.fn(),
  createPrivateUploadSession: jest.fn(),
  completePrivateUpload: jest.fn(),
  createSourceScanJob: jest.fn(),
  getDurableJob: jest.fn(),
}));

jest.mock("@/app/actions/proposals", () => ({
  createProposalAction: jest.fn(),
  getProposalByIdAction: jest.fn(),
}));

jest.mock("@/app/actions/user", () => ({ getUserData: jest.fn() }));
jest.mock("@/app/actions/guidance", () => ({ generateGuidanceAction: jest.fn() }));
jest.mock("@/app/actions/investment", () => ({ generateInvestmentGuidanceAction: jest.fn() }));
jest.mock("@/app/actions/proposalContext", () => ({
  getLatestProposalContextAction: jest.fn().mockResolvedValue({ success: false, code: "CONTEXT_RUN_UNAVAILABLE", message: "none" }),
  getProposalContextAction: jest.fn(),
}));
jest.mock("@/app/actions/proposalDraft", () => ({ getProposalDraftAction: jest.fn() }));
jest.mock("@/app/actions/candidateApplication", () => ({
  getCandidateReviewAction: jest.fn(),
  saveCandidateReviewAction: jest.fn(),
  applyCandidatesAction: jest.fn(),
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

if (typeof globalThis.crypto?.randomUUID !== "function") {
  Object.defineProperty(globalThis.crypto ?? (globalThis as unknown as { crypto: object }).crypto, "randomUUID", {
    value: () => "00000000-0000-4000-8000-000000000000",
  });
}

const mockedGetConversation = getConversationAction as jest.MockedFunction<typeof getConversationAction>;
const mockedPostMessage = postConversationMessageAction as jest.MockedFunction<typeof postConversationMessageAction>;
const mockedListSources = listPrivateDocumentSources as jest.MockedFunction<typeof listPrivateDocumentSources>;
const mockedCreateProposal = createProposalAction as jest.MockedFunction<typeof createProposalAction>;
const mockedGetProposal = getProposalByIdAction as jest.MockedFunction<typeof getProposalByIdAction>;
const mockedGetUser = getUserData as jest.MockedFunction<typeof getUserData>;
const mockedCreateNotes = createProposalNotesAction as jest.MockedFunction<typeof createProposalNotesAction>;
const mockedCreateSession = createPrivateUploadSession as jest.MockedFunction<typeof createPrivateUploadSession>;
const mockedCompleteUpload = completePrivateUpload as jest.MockedFunction<typeof completePrivateUpload>;
const mockedCreateScanJob = createSourceScanJob as jest.MockedFunction<typeof createSourceScanJob>;
const mockedGetDurableJob = getDurableJob as jest.MockedFunction<typeof getDurableJob>;
const mockedPatchQuestion = patchConversationQuestionAction as jest.MockedFunction<typeof patchConversationQuestionAction>;
const mockedGetProposalContext = getProposalContextAction as jest.MockedFunction<typeof getProposalContextAction>;
const mockedGetReview = getCandidateReviewAction as jest.MockedFunction<typeof getCandidateReviewAction>;
const mockedSaveReview = saveCandidateReviewAction as jest.MockedFunction<typeof saveCandidateReviewAction>;
const mockedApplyCandidates = applyCandidatesAction as jest.MockedFunction<typeof applyCandidatesAction>;

const PROPOSAL_ID = "abc123abc123abc123abc123";

const scanJob = (status: "queued" | "succeeded") => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "source_scan",
  status,
  progress: status === "succeeded" ? 100 : 0,
  progressStage: null,
  attemptCount: 1,
  maxAttempts: 3,
  cancellationRequested: false,
  errorCode: null,
  resultReference: null,
  createdAt: "2026-07-21T10:00:00.000Z",
  updatedAt: "2026-07-21T10:00:00.000Z",
});

const emptyConversation = {
  success: true as const,
  correlationId: "test-correlation",
  data: { conversation: null, messages: [], questions: [] },
};

const conversationWithQuestion = {
  success: true as const,
  correlationId: "test-correlation",
  data: {
    conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 1, updatedAt: "2026-07-21T10:00:00.000Z" },
    messages: [
      {
        id: "msg-1", ordinal: 1, role: "user" as const, kind: "instruction" as const, content: "Please review the venue requirements.",
        intent: "chat", runType: null, runId: null, jobId: null, status: "complete" as const, createdAt: "2026-07-21T09:59:00.000Z", attachments: [],
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

const guidedQuestion = (id: string, prompt: string, path: string, impact: "schedule" | "cost" | "production" | "scope") => ({
  id,
  code: `MISSING_FIELD:${path}`,
  severity: "question" as const,
  paths: [path],
  prompt,
  status: "open" as const,
  impact,
  contextRunId: "run-1",
  createdAt: "2026-07-21T10:00:00.000Z",
});

const startDateQuestion = guidedQuestion("q-start", "When does the event start? (YYYY-MM-DD)", "/content/event/startDate", "schedule");
const roomsQuestion = guidedQuestion("q-rooms", "How many event rooms are required?", "/content/venueSchedule/numberOfEventRooms", "cost");

const conversationWithGuidedQuestions = (questions: Array<ReturnType<typeof guidedQuestion>>) => ({
  success: true as const,
  correlationId: "test-correlation",
  data: {
    conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 1, updatedAt: "2026-07-21T10:00:00.000Z" },
    messages: conversationWithQuestion.data.messages,
    questions,
  },
});

describe("AssistantWorkspacePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    EventSourceStub.instances = [];
    mockedGetUser.mockResolvedValue({ ok: true, data: { name: "Travis Deployment" } });
    mockedGetConversation.mockResolvedValue(emptyConversation);
    mockedListSources.mockResolvedValue({ success: true, data: [], correlationId: "test-correlation" });
    mockedGetProposal.mockResolvedValue({ success: true, message: "ok", data: { _id: PROPOSAL_ID, event: { eventName: "" } } });
    // Auto-apply stays silent by default: a review that cannot be loaded
    // leaves the manual flow untouched.
    mockedGetReview.mockResolvedValue({ success: false, code: "REVIEW_UNAVAILABLE", message: "none" });
  });

  test("empty state greets the signed-in user by first name", async () => {
    render(<AssistantWorkspacePage />);
    expect(await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/)).toBeInTheDocument();
    expect(screen.getByText("your mind?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe your event or ask for help…")).toBeInTheDocument();
    // No proposal exists yet, so nothing was created or loaded.
    expect(mockedCreateProposal).not.toHaveBeenCalled();
    expect(mockedGetConversation).not.toHaveBeenCalled();
  });

  test("first send lazily creates the proposal, updates the URL in place, then posts the message", async () => {
    mockedCreateProposal.mockResolvedValue({ success: true, message: "ok", data: { _id: PROPOSAL_ID } });
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: null },
    });

    render(<AssistantWorkspacePage />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "We are planning a 300-person conference." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "We are planning a 300-person conference.", intent: "chat" },
      expect.any(String),
    ));
    expect(mockedCreateProposal).toHaveBeenCalledWith(
      expect.objectContaining({ event: { eventName: "Untitled proposal" }, status: "unsubmitted", isDraft: true }),
    );
    // The proposal must exist before the message is sent.
    expect(mockedCreateProposal.mock.invocationCallOrder[0]).toBeLessThan(mockedPostMessage.mock.invocationCallOrder[0]);
    expect(replace).toHaveBeenCalledWith(`/proposals/add-new-proposal?proposalId=${PROPOSAL_ID}`);
  });

  test("guided flow shows one question at a time with progress, impact tag, and a remaining count in the rail", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([startDateQuestion, roomsQuestion]));
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("When does the event start? (YYYY-MM-DD)")).toBeInTheDocument();
    expect(screen.getByText("affects schedule")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer this question")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    // Only ONE question card — the second question is not rendered yet.
    expect(screen.queryByText("How many event rooms are required?")).not.toBeInTheDocument();
    // The rail no longer lists prompts; it shows the remaining count.
    expect(await screen.findByText(/2 questions remaining/)).toBeInTheDocument();
    // Nothing was answered yet, so no completion card.
    expect(screen.queryByText(/All key questions answered/)).not.toBeInTheDocument();
  });

  test("answering a question confirms the value and advances to the next one", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([startDateQuestion, roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([roomsQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-start", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/startDate", mongoPath: "event.startDate", value: "2026-09-01" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Question 1 of 2");
    fireEvent.change(screen.getByLabelText("Answer this question"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-start",
      { status: "answered", answer: "2026-09-01" },
    ));
    // The confirmed value shows and the flow advances to the next question.
    expect(await screen.findByText("Start date: 2026-09-01 ✓")).toBeInTheDocument();
    expect(await screen.findByText("Question 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("How many event rooms are required?")).toBeInTheDocument();
    expect(screen.getByText("affects cost")).toBeInTheDocument();
  });

  test("an invalid answer shows the validation message and re-asks the same question", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([startDateQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: false,
      code: "INVALID_CANDIDATE_VALUE",
      message: "Candidate date must use the YYYY-MM-DD format.",
      correlationId: "test-correlation",
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Question 1 of 1");
    fireEvent.change(screen.getByLabelText("Answer this question"), { target: { value: "next Tuesday" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    expect(await screen.findByText("Candidate date must use the YYYY-MM-DD format.")).toBeInTheDocument();
    // The question stays open for another attempt; no confirmation, no advance.
    expect(screen.getByText("When does the event start? (YYYY-MM-DD)")).toBeInTheDocument();
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
  });

  test("Skip dismisses the current question", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([startDateQuestion, roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([roomsQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-start", status: "dismissed", answeredMessageId: null, appliedField: null },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Question 1 of 2");
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(PROPOSAL_ID, "q-start", { status: "dismissed" }));
    expect(await screen.findByText("Question 2 of 2")).toBeInTheDocument();
    // Skipping never shows a confirmed value and never completes the flow.
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
  });

  test("answering the last question shows the completion card linking to the editor", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-rooms", status: "answered", answeredMessageId: null, appliedField: { path: "/content/venueSchedule/numberOfEventRooms", mongoPath: "venueSchedule.numberOfEventRooms", value: "6" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Question 1 of 1");
    fireEvent.change(screen.getByLabelText("Answer this question"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    expect(await screen.findByText("Number of event rooms: 6 ✓")).toBeInTheDocument();
    expect(await screen.findByText("All key questions answered — everything else is optional.")).toBeInTheDocument();
    expect(screen.getByText("Review your full proposal in the editor.")).toBeInTheDocument();
    const editorLink = screen.getByRole("link", { name: "Open the proposal editor" });
    expect(editorLink).toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`);
    // The rail reflects completion too (it slides in asynchronously).
    expect(await screen.findByText("All key questions answered.")).toBeInTheDocument();
  });

  test("a completed extraction run links to reviewing and applying the extracted fields", async () => {
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 1, updatedAt: "2026-07-21T10:00:00.000Z" },
        messages: [{
          id: "msg-run", ordinal: 1, role: "assistant" as const, kind: "run_result" as const, content: "I reviewed your sources and extracted the requirements below.",
          intent: null, runType: "proposal_context" as const, runId: "run-1", jobId: "job-1", status: "complete" as const, createdAt: "2026-07-21T10:00:00.000Z", attachments: [],
        }],
        questions: [],
      },
    });
    mockedGetProposalContext.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { run: { id: "run-1", model: "gpt-test" }, evidence: [], operations: [{}, {}, {}] },
    } as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const reviewLink = await screen.findByRole("link", { name: /Review & apply 3 extracted fields/ });
    expect(reviewLink).toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`);
  });

  test("Extract requirements is disabled when no ready non-confidential source exists", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);
    mockedListSources.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: [{ id: "src-9", status: "scanning", confidentiality: "non_confidential", originalFilename: "pending.pdf", createdAt: "2026-07-21T10:00:00.000Z" }],
    });
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("pending.pdf");
    expect(screen.getByRole("button", { name: "Extract requirements" })).toBeDisabled();
  });

  test("Extract requirements auto-selects ready sources and sends the intent", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);
    mockedListSources.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: [
        { id: "src-1", status: "ready", confidentiality: "non_confidential", originalFilename: "venue.pdf", createdAt: "2026-07-21T10:00:00.000Z" },
        { id: "src-2", status: "ready", confidentiality: "confidential", originalFilename: "internal.pdf", createdAt: "2026-07-21T10:00:00.000Z" },
      ],
    });
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: { runType: "proposal_context", runId: "run-1", jobId: "job-1" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const extractButton = await screen.findByRole("button", { name: "Extract requirements" });
    await waitFor(() => expect(extractButton).toBeEnabled());
    fireEvent.click(extractButton);

    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      expect.objectContaining({ intent: "extract_requirements", sourceIds: ["src-1"] }),
      expect.any(String),
    ));
  });

  test("choosing a file stages a composer chip without uploading anything", async () => {
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["venue requirements"], "venue.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // The chip (name + size + remove control) is staged in the composer…
    expect(await screen.findByText("venue.pdf")).toBeInTheDocument();
    expect(screen.getByText("18 B")).toBeInTheDocument();
    const removeButton = screen.getByRole("button", { name: "Remove venue.pdf" });
    // …and nothing was uploaded yet.
    expect(mockedCreateSession).not.toHaveBeenCalled();
    expect(mockedCompleteUpload).not.toHaveBeenCalled();
    expect(mockedCreateScanJob).not.toHaveBeenCalled();

    // Removing the chip discards the staged file.
    fireEvent.click(removeButton);
    expect(screen.queryByText("venue.pdf")).not.toBeInTheDocument();
  });

  test("send uploads staged files as non_confidential, then posts the message with sourceIds and clears the chips", async () => {
    mockedCreateSession.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { sourceId: "src-new", uploadUrl: "https://uploads.local/src-new", requiredHeaders: { "x-upload-token": "t" } },
    });
    mockedCompleteUpload.mockResolvedValue({ success: true, correlationId: "test-correlation", data: {} });
    mockedCreateScanJob.mockResolvedValue({ success: true, correlationId: "test-correlation", data: scanJob("queued") });
    mockedGetDurableJob.mockResolvedValue({ success: true, correlationId: "test-correlation", data: scanJob("succeeded") });
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: null },
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["venue requirements"], "venue.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByText("venue.pdf");
    expect(mockedCreateSession).not.toHaveBeenCalled();

    // Sending with an empty composer uses the fallback message content.
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "Please review the attached file.", intent: "chat", sourceIds: ["src-new"] },
      expect.any(String),
    ));
    // Full upload chain ran on send: session -> PUT -> complete -> scan job.
    expect(mockedCreateSession).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { name: "venue.pdf", type: "application/pdf", size: expect.any(Number) },
      expect.any(String),
      "non_confidential",
    );
    expect(fetchMock).toHaveBeenCalledWith("https://uploads.local/src-new", expect.objectContaining({ method: "PUT", body: file }));
    expect(mockedCompleteUpload).toHaveBeenCalledWith("src-new");
    expect(mockedCreateScanJob).toHaveBeenCalledWith("src-new", expect.any(String));
    // Upload completed before the message was posted.
    expect(mockedCreateSession.mock.invocationCallOrder[0]).toBeLessThan(mockedPostMessage.mock.invocationCallOrder[0]);
    // The staged chip is cleared after the send.
    await waitFor(() => expect(screen.queryByRole("button", { name: "Remove venue.pdf" })).not.toBeInTheDocument());
    // Still no confirmation checkbox anywhere in the flow.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  test("a failed staged upload keeps the chip and offers an inline retry", async () => {
    mockedCreateSession.mockResolvedValueOnce({
      success: false,
      code: "NETWORK_ERROR",
      message: "The service could not be reached. Try again shortly.",
      correlationId: "test-correlation",
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["venue requirements"], "venue.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    // The message was never posted, the chip is kept, and a retry is offered.
    expect(await screen.findByText("venue.pdf could not be uploaded.")).toBeInTheDocument();
    expect(mockedPostMessage).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remove venue.pdf" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  test("right rail is hidden in the empty state and appears once the conversation begins", async () => {
    mockedCreateProposal.mockResolvedValue({ success: true, message: "ok", data: { _id: PROPOSAL_ID } });
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: null },
    });
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);

    render(<AssistantWorkspacePage />);
    await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
    // No Sources card, tasks, or questions rail in the empty greeting state.
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
    expect(screen.queryByText("Suggested tasks")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add notes" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message the proposal assistant"), { target: { value: "Plan a gala dinner." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    // Once the send lands the rail slides in and stays.
    expect(await screen.findByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Suggested tasks")).toBeInTheDocument();
    expect(screen.getByText("Suggested questions")).toBeInTheDocument();
  });

  const mockUploadChain = (sourceId = "src-new") => {
    mockedCreateSession.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { sourceId, uploadUrl: `https://uploads.local/${sourceId}`, requiredHeaders: { "x-upload-token": "t" } },
    });
    mockedCompleteUpload.mockResolvedValue({ success: true, correlationId: "test-correlation", data: {} });
    mockedCreateScanJob.mockResolvedValue({ success: true, correlationId: "test-correlation", data: scanJob("queued") });
    mockedGetDurableJob.mockResolvedValue({ success: true, correlationId: "test-correlation", data: scanJob("succeeded") });
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({ ok: true });
  };

  const sourceRow = (status: string, id = "src-new") => ({
    id,
    status,
    confidentiality: "non_confidential" as const,
    originalFilename: "venue.pdf",
    createdAt: "2026-07-21T10:00:00.000Z",
  });

  const stageAndSendFile = async () => {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["venue requirements"], "venue.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByText("venue.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  };

  const extractCalls = () =>
    mockedPostMessage.mock.calls.filter(([, input]) => (input as { intent: string }).intent === "extract_requirements");

  test("a send with attachments auto-runs extraction exactly once after all scans turn ready", async () => {
    jest.useFakeTimers();
    try {
      let sourceStatus = "scanning";
      mockedListSources.mockImplementation(async () => ({
        success: true as const,
        correlationId: "test-correlation",
        data: [sourceRow(sourceStatus)],
      }));
      mockUploadChain();
      mockedPostMessage.mockResolvedValue({
        success: true,
        correlationId: "test-correlation",
        data: { created: true, message: null, assistantMessageId: null, run: null },
      });

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await stageAndSendFile();
      await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledTimes(1));

      // While the scan runs, the in-thread status line shows and no
      // extraction has fired yet.
      expect(await screen.findByText(/Checking your file/)).toBeInTheDocument();
      expect(extractCalls()).toHaveLength(0);

      sourceStatus = "ready";
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
      await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
        PROPOSAL_ID,
        { content: "Extracting requirements from the attached files.", intent: "extract_requirements", sourceIds: ["src-new"] },
        expect.any(String),
      ));

      // Exactly once per originating send — later polls never re-fire it.
      await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
      expect(extractCalls()).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test("a failed scan shows an inline notice instead of auto-running extraction", async () => {
    jest.useFakeTimers();
    try {
      let sourceStatus = "scanning";
      mockedListSources.mockImplementation(async () => ({
        success: true as const,
        correlationId: "test-correlation",
        data: [sourceRow(sourceStatus)],
      }));
      mockUploadChain();
      mockedPostMessage.mockResolvedValue({
        success: true,
        correlationId: "test-correlation",
        data: { created: true, message: null, assistantMessageId: null, run: null },
      });

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await stageAndSendFile();
      await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledTimes(1));

      sourceStatus = "failed";
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

      expect(await screen.findByText("venue.pdf couldn’t be processed — try re-uploading.")).toBeInTheDocument();
      // The watch is over: the status line is gone and extraction never fires.
      expect(screen.queryByText(/Checking your file/)).not.toBeInTheDocument();
      await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
      expect(extractCalls()).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test("an assistant typing indicator shows while a send is in flight", async () => {
    let resolvePost: (value: unknown) => void = () => undefined;
    mockedPostMessage.mockImplementation(() => new Promise(resolve => { resolvePost = resolve as (value: unknown) => void; }) as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "Plan a hybrid summit." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByLabelText("The assistant is responding")).toBeInTheDocument();

    resolvePost({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: null },
    });
    await waitFor(() => expect(screen.queryByLabelText("The assistant is responding")).not.toBeInTheDocument());
  });

  test("saving notes needs no approval checkbox and stores them as non_confidential", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);
    mockedCreateNotes.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { source: { id: "src-notes", status: "uploaded", confidentiality: "non_confidential", originalFilename: "Notes", createdAt: "2026-07-21T10:00:00.000Z" } },
    } as never);
    mockedCreateScanJob.mockResolvedValue({ success: true, correlationId: "test-correlation", data: scanJob("queued") });
    mockedGetDurableJob.mockResolvedValue({ success: true, correlationId: "test-correlation", data: scanJob("succeeded") });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Add notes" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Paste or type notes to attach to this proposal…"), { target: { value: "Outdoor stage, 300 guests." } });
    fireEvent.click(screen.getByRole("button", { name: "Save notes" }));

    await waitFor(() => expect(mockedCreateNotes).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { text: "Outdoor stage, 300 guests.", classification: "non_confidential" },
      expect.any(String),
    ));
  });

  // ── Auto-apply after extraction ─────────────────────────────────────────────

  const conversationWithCompletedRun = (questions: Array<Record<string, unknown>> = []) => ({
    success: true as const,
    correlationId: "test-correlation",
    data: {
      conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 1, updatedAt: "2026-07-21T10:00:00.000Z" },
      messages: [{
        id: "msg-run", ordinal: 1, role: "assistant" as const, kind: "run_result" as const, content: "I reviewed your sources and extracted the requirements below.",
        intent: null, runType: "proposal_context" as const, runId: "run-1", jobId: "job-1", status: "complete" as const, createdAt: "2026-07-21T10:00:00.000Z", attachments: [],
      }],
      questions,
    },
  }) as never;

  const candidate = (id: string, path: string, value: string, confidence: number) => ({
    id, ordinal: 0, path, value, confidence, evidence_ids: [], decision: "pending" as const, modified_value: null, reason: null,
  });

  // op-a is the only safe candidate: empty current value, confidence >= 0.8 and
  // no competing candidate on its path. op-low is low confidence, op-filled
  // targets a field that already has a value, op-c1/op-c2 conflict on one path.
  const reviewFixture = {
    success: true as const,
    correlationId: "test-correlation",
    data: {
      reviewId: null,
      revision: 3,
      proposalVersion: 7,
      canonicalPaths: {
        "op-a": "/content/event/eventName",
        "op-low": "/content/event/startDate",
        "op-filled": "/content/event/city",
        "op-c1": "/content/venueSchedule/numberOfEventRooms",
        "op-c2": "/content/venueSchedule/numberOfEventRooms",
      },
      currentValues: { "/content/event/city": "Berlin" },
      appliedOperationIds: [],
      operations: [
        candidate("op-a", "/content/event/eventName", "Annual Gala", 0.95),
        candidate("op-low", "/content/event/startDate", "2026-09-01", 0.5),
        candidate("op-filled", "/content/event/city", "Munich", 0.9),
        candidate("op-c1", "/content/venueSchedule/numberOfEventRooms", "6", 0.9),
        candidate("op-c2", "/content/venueSchedule/numberOfEventRooms", "8", 0.85),
      ],
    },
  } as never;

  const contextRunResult = {
    success: true as const,
    correlationId: "test-correlation",
    data: { run: { id: "run-1", model: "gpt-test" }, evidence: [], operations: [{}, {}, {}, {}, {}] },
  } as never;

  const applyJob = (status: "succeeded" | "failed", errorCode: string | null = null) => ({
    ...scanJob("succeeded"),
    id: "22222222-2222-4222-8222-222222222222",
    type: "candidate_application",
    status,
    errorCode,
  });

  test("auto-apply accepts only empty high-confidence fields, applies them once, and reports the rest", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun());
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetReview.mockResolvedValue(reviewFixture);
    mockedSaveReview.mockResolvedValue({ success: true, data: { reviewId: "rev-1", revision: 4, savedCount: 5 } } as never);
    mockedApplyCandidates.mockResolvedValue({ success: true, data: { applicationId: "app-1", jobId: "job-apply", status: "queued" } } as never);
    mockedGetDurableJob.mockResolvedValue({ success: true, correlationId: "test-correlation", data: applyJob("succeeded") });

    const { unmount } = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText("Added 1 field to your proposal ✓ — 4 need your review")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review & apply" })).toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`);

    // The saved review accepts ONLY the safe candidate; conflicts, filled
    // fields, and low-confidence candidates stay pending.
    expect(mockedSaveReview).toHaveBeenCalledTimes(1);
    expect(mockedSaveReview).toHaveBeenCalledWith(PROPOSAL_ID, "run-1", 3, [
      { operationId: "op-a", decision: "accepted" },
      { operationId: "op-low", decision: "pending" },
      { operationId: "op-filled", decision: "pending" },
      { operationId: "op-c1", decision: "pending" },
      { operationId: "op-c2", decision: "pending" },
    ]);
    // The application job uses the review's proposal version and NEVER
    // confirms overwrites.
    expect(mockedApplyCandidates).toHaveBeenCalledTimes(1);
    expect(mockedApplyCandidates).toHaveBeenCalledWith(PROPOSAL_ID, "run-1", 7, ["op-a"], []);
    expect(mockedSaveReview.mock.invocationCallOrder[0]).toBeLessThan(mockedApplyCandidates.mock.invocationCallOrder[0]);
    expect(window.sessionStorage.getItem("rfpilot:auto-apply:run-1")).toBe("started");

    // The sessionStorage guard prevents a re-fire for the same run.
    unmount();
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByRole("link", { name: /Review & apply 5 extracted fields/ });
    expect(mockedApplyCandidates).toHaveBeenCalledTimes(1);
    expect(mockedSaveReview).toHaveBeenCalledTimes(1);
  });

  test("a proposal version conflict shows a quiet notice with the manual review link and never retries", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun());
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetReview.mockResolvedValue(reviewFixture);
    mockedSaveReview.mockResolvedValue({ success: true, data: { reviewId: "rev-1", revision: 4, savedCount: 5 } } as never);
    mockedApplyCandidates.mockResolvedValue({ success: false, code: "PROPOSAL_VERSION_CONFLICT", message: "The proposal changed." } as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText(/Your proposal changed while I was filling it in, so nothing was applied automatically\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review & apply" })).toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`);
    // Quiet notice: no alert, no success message, and no automatic retry.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/Added .* to your proposal/)).not.toBeInTheDocument();
    await act(async () => { await Promise.resolve(); });
    expect(mockedApplyCandidates).toHaveBeenCalledTimes(1);
    expect(mockedGetDurableJob).not.toHaveBeenCalled();
  });

  test("a failed application job shows the quiet notice instead of retrying", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun());
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetReview.mockResolvedValue(reviewFixture);
    mockedSaveReview.mockResolvedValue({ success: true, data: { reviewId: "rev-1", revision: 4, savedCount: 5 } } as never);
    mockedApplyCandidates.mockResolvedValue({ success: true, data: { applicationId: "app-1", jobId: "job-apply", status: "queued" } } as never);
    mockedGetDurableJob.mockResolvedValue({ success: true, correlationId: "test-correlation", data: applyJob("failed") });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText(/I couldn’t fill your proposal automatically\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review & apply" })).toBeInTheDocument();
    expect(mockedApplyCandidates).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Added .* to your proposal/)).not.toBeInTheDocument();
  });

  test("the no-questions notice renders once extraction completes with an empty questions list", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun([]));
    mockedGetProposalContext.mockResolvedValue(contextRunResult);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText("I have all the key details I need — no clarification questions. Everything else is optional in the editor.")).toBeInTheDocument();
  });

  test("the no-questions notice never shows before an extraction has completed or while questions are open", async () => {
    // A chat-only conversation without a completed extraction shows nothing.
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);
    const { unmount } = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Please review the venue requirements.");
    expect(screen.queryByText(/I have all the key details I need/)).not.toBeInTheDocument();
    unmount();

    // A completed extraction with an open question shows the question instead.
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun([startDateQuestion]));
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("When does the event start? (YYYY-MM-DD)");
    expect(screen.queryByText(/I have all the key details I need/)).not.toBeInTheDocument();
  });
});

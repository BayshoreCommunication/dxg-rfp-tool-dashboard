import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssistantWorkspacePage, { displayQuestionPrompt, isBeforeLocalToday, maximumDateForQuestion, minimumDateForQuestion, visibleRunMessages } from "./AssistantWorkspacePage";
import { closeConversationSegmentAction, createProposalNotesAction, getConversationAction, patchConversationQuestionAction, postConversationMessageAction } from "@/app/actions/conversation";
import { getLatestProposalContextAction, getProposalContextAction } from "@/app/actions/proposalContext";
import { getProposalDraftAction } from "@/app/actions/proposalDraft";
import { generateGuidanceAction, getLatestGuidanceAction } from "@/app/actions/guidance";
import {
  completePrivateUpload,
  createPrivateUploadSession,
  createSourceScanJob,
  getDurableJob,
  listPrivateDocumentSources,
} from "@/app/actions/durableJobs";
import { createProposalAction, getProposalByIdAction } from "@/app/actions/proposals";
import { getUserData } from "@/app/actions/user";
import { getCandidateReviewAction } from "@/app/actions/candidateApplication";
import { storeProposalHandoffDraft } from "@/lib/aiAssistant/handoff";

const replace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

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

jest.mock("@/app/actions/proposals", () => ({
  createProposalAction: jest.fn(),
  getProposalByIdAction: jest.fn(),
}));

jest.mock("@/app/actions/user", () => ({ getUserData: jest.fn() }));
jest.mock("@/app/actions/guidance", () => ({
  generateGuidanceAction: jest.fn(),
  // Restored on load so a refresh keeps the findings; default to none stored.
  getLatestGuidanceAction: jest.fn().mockResolvedValue({ success: false, code: "GUIDANCE_NOT_FOUND", message: "none" }),
}));
jest.mock("@/app/actions/investment", () => ({
  generateInvestmentGuidanceAction: jest.fn(),
  getLatestInvestmentGuidanceAction: jest.fn().mockResolvedValue({ success: false, code: "INVESTMENT_NOT_FOUND", message: "none" }),
}));
jest.mock("@/app/actions/proposalContext", () => ({
  getLatestProposalContextAction: jest.fn().mockResolvedValue({ success: false, code: "CONTEXT_RUN_UNAVAILABLE", message: "none" }),
  getProposalContextAction: jest.fn(),
}));
jest.mock("@/app/actions/proposalDraft", () => ({ getProposalDraftAction: jest.fn() }));
jest.mock("@/app/actions/candidateApplication", () => ({
  getCandidateReviewAction: jest.fn(),
}));

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
const mockedCloseSegment = closeConversationSegmentAction as jest.MockedFunction<typeof closeConversationSegmentAction>;
const mockedCreateSession = createPrivateUploadSession as jest.MockedFunction<typeof createPrivateUploadSession>;
const mockedCompleteUpload = completePrivateUpload as jest.MockedFunction<typeof completePrivateUpload>;
const mockedCreateScanJob = createSourceScanJob as jest.MockedFunction<typeof createSourceScanJob>;
const mockedGetDurableJob = getDurableJob as jest.MockedFunction<typeof getDurableJob>;
const mockedPatchQuestion = patchConversationQuestionAction as jest.MockedFunction<typeof patchConversationQuestionAction>;
const mockedGetProposalContext = getProposalContextAction as jest.MockedFunction<typeof getProposalContextAction>;
const mockedGetLatestContext = getLatestProposalContextAction as jest.MockedFunction<typeof getLatestProposalContextAction>;
const mockedGetReview = getCandidateReviewAction as jest.MockedFunction<typeof getCandidateReviewAction>;
const mockedGenerateGuidance = generateGuidanceAction as jest.MockedFunction<typeof generateGuidanceAction>;
const mockedGetDraft = getProposalDraftAction as jest.MockedFunction<typeof getProposalDraftAction>;

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
    capabilities: { conversationExtraction: true },
    messages: [
      {
        id: "msg-1", ordinal: 1, role: "user" as const, kind: "instruction" as const, content: "Please review the venue requirements.",
        intent: "chat", runType: null, runId: null, jobId: null, status: "complete" as const, createdAt: "2026-07-21T09:59:00.000Z", attachments: [],
      },
    ],
    questions: [
      {
        id: "q-1", code: "MISSING_EVENT_DATE", severity: "blocking" as const, paths: ["/eventDate"],
        prompt: "What is the event date?", status: "open" as const, answerType: "text" as const, options: [], answeredMessageId: null, contextRunId: "run-1", createdAt: "2026-07-21T10:00:00.000Z",
      },
    ],
  },
};

const guidedQuestion = (
  id: string,
  prompt: string,
  path: string,
  impact: "schedule" | "cost" | "production" | "scope",
  control: { answerType?: "date" | "time" | "choice" | "number" | "text"; options?: string[]; status?: "open" | "answered"; answeredMessageId?: string; suggestedAnswer?: string } = {},
) => ({
  id,
  code: `MISSING_FIELD:${path}`,
  severity: "question" as const,
  paths: [path],
  prompt,
  status: control.status ?? ("open" as const),
  impact,
  answerType: control.answerType ?? ("text" as const),
  options: control.options ?? [],
  suggestedAnswer: control.suggestedAnswer ?? null,
  answeredMessageId: control.answeredMessageId ?? null,
  contextRunId: "run-1",
  createdAt: "2026-07-21T10:00:00.000Z",
});

const startDateQuestion = guidedQuestion("q-start", "When does the event start? (YYYY-MM-DD)", "/content/event/startDate", "schedule");
const roomsQuestion = guidedQuestion("q-rooms", "How many event rooms are required?", "/content/venueSchedule/numberOfEventRooms", "cost");
const datePickerQuestion = guidedQuestion("q-start", "When does the event start? (YYYY-MM-DD)", "/content/event/startDate", "schedule", { answerType: "date" });
const endDatePickerQuestion = guidedQuestion("q-end", "When does the event end? (YYYY-MM-DD)", "/content/event/endDate", "schedule", { answerType: "date" });
const loadInDatePickerQuestion = guidedQuestion("q-load-in", "When can production load in? (YYYY-MM-DD)", "/content/venueSchedule/loadInDate", "schedule", { answerType: "date" });
const loadInTimePickerQuestion = guidedQuestion("q-load-in-time", "What time can production load in? (HH:MM)", "/content/venueSchedule/loadInTime", "schedule", { answerType: "time" });
// Mirrors streamingPlatformOptions in the wizard step and the backend whitelist.
const STREAMING_PLATFORMS = [
  "Client-Owned Platform",
  "Attendee Hub (Cvent)",
  "Zoom Webinar",
  "ON24",
  "Hopin",
  "Webex Events",
  "YouTube Live",
  "Vendor Recommendation Needed",
  "Other",
];
const formatQuestion = guidedQuestion("q-format", "Is the event in-person, hybrid, or virtual?", "/content/event/eventFormat", "scope", {
  answerType: "choice",
  options: ["In-Person", "Hybrid", "Virtual"],
});

const conversationWithGuidedQuestions = (questions: Array<ReturnType<typeof guidedQuestion>>) => ({
  success: true as const,
  correlationId: "test-correlation",
  data: {
    conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 1, updatedAt: "2026-07-21T10:00:00.000Z" },
    messages: conversationWithQuestion.data.messages,
    questions,
  },
});

let replaceStateSpy: jest.SpyInstance;

describe("AssistantWorkspacePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    replaceStateSpy = jest.spyOn(window.history, "replaceState").mockImplementation(() => undefined);
    window.sessionStorage.clear();
    window.localStorage.clear();
    mockedGetUser.mockResolvedValue({ ok: true, data: { name: "Travis Deployment" } });
    mockedGetConversation.mockResolvedValue(emptyConversation);
    mockedListSources.mockResolvedValue({ success: true, data: [], correlationId: "test-correlation" });
    mockedCloseSegment.mockResolvedValue({ success: true, data: { created: false, reason: "empty" }, correlationId: "test-correlation" });
    mockedCreateNotes.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { source: { id: "typed-source" } },
    } as never);
    mockedCreateScanJob.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: scanJob("queued"),
    });
    mockedGetDurableJob.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: scanJob("succeeded"),
    });
    mockedGetProposal.mockResolvedValue({ success: true, message: "ok", data: { _id: PROPOSAL_ID, event: { eventName: "" } } });
    // Candidate review remains an explicit editor workflow.
    mockedGetReview.mockResolvedValue({ success: false, code: "REVIEW_UNAVAILABLE", message: "none" });
    mockedGetLatestContext.mockResolvedValue({ success: false, code: "CONTEXT_RUN_UNAVAILABLE", message: "none" } as never);
    // The completion card's readiness check degrades quietly by default.
    mockedGenerateGuidance.mockResolvedValue({ success: false, code: "GUIDANCE_DISABLED", message: "Proposal guidance is not enabled for this environment yet." });
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  test("empty state greets the signed-in user by first name", async () => {
    render(<AssistantWorkspacePage />);
    expect(await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/)).toBeInTheDocument();
    expect(screen.getByText("Tell me about your event?")).toBeInTheDocument();
    expect(screen.queryByText(/your mind\?/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe your event or ask for help…")).toBeInTheDocument();
    // No proposal exists yet, so nothing was created or loaded.
    expect(mockedCreateProposal).not.toHaveBeenCalled();
    expect(mockedGetConversation).not.toHaveBeenCalled();
  });

  test("consumes a general-assistant handoff as an unsent draft", async () => {
    storeProposalHandoffDraft(
      PROPOSAL_ID,
      "What is missing from this proposal?",
    );

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(
      await screen.findByLabelText("Message the proposal assistant"),
    ).toHaveValue("What is missing from this proposal?");
    expect(mockedPostMessage).not.toHaveBeenCalled();
    expect(window.sessionStorage.length).toBe(0);
  });

  test("first send lazily creates the proposal, moves the URL to the assistant route, then posts the message", async () => {
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
    // Ordinary conversation stays in the thread. Only explicit notes or
    // attachments become governed extraction sources.
    expect(mockedCreateNotes).not.toHaveBeenCalled();
    expect(mockedCreateProposal).toHaveBeenCalledWith(
      expect.objectContaining({ event: { eventName: "Untitled proposal" }, status: "unsubmitted", isDraft: true }),
    );
    // The proposal must exist before the message is sent.
    expect(mockedCreateProposal.mock.invocationCallOrder[0]).toBeLessThan(mockedPostMessage.mock.invocationCallOrder[0]);
    // One canonical URL for an existing proposal's assistant — moved with a
    // shallow history swap. A router.replace() here would start a real
    // navigation that races the send and can abort its server action POST
    // mid-flight, leaving the composer stuck on "Sending…".
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", `/proposals/${PROPOSAL_ID}/assistant`);
    expect(replace).not.toHaveBeenCalled();
  });

  test("a send whose action rejects marks the message failed with a retry and frees the composer", async () => {
    mockedCreateProposal.mockResolvedValue({ success: true, message: "ok", data: { _id: PROPOSAL_ID } });
    // An aborted server action POST rejects without a structured result —
    // exactly what happens when a navigation cancels the request mid-flight.
    mockedPostMessage.mockRejectedValue(new Error("net::ERR_ABORTED"));

    render(<AssistantWorkspacePage />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "A corporate town hall in Dhaka for 300 attendees." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    // The failure is visible and actionable instead of an eternal "Sending…".
    expect(await screen.findByText(/didn't go through/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("Sending…")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("The assistant is responding")).not.toBeInTheDocument();
    // The composer recovers: typing again re-enables Send. (Re-query the
    // textarea — the workspace re-rendered into the started layout once the
    // proposal was created.)
    fireEvent.change(screen.getByLabelText("Message the proposal assistant"), { target: { value: "second try" } });
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    // The proposal created before the failed send is preserved.
    expect(mockedCreateProposal).toHaveBeenCalledTimes(1);
  });

  test("retrying a failed send reuses the idempotency key and never creates a second proposal", async () => {
    mockedCreateProposal.mockResolvedValue({ success: true, message: "ok", data: { _id: PROPOSAL_ID } });
    mockedPostMessage
      .mockRejectedValueOnce(new Error("net::ERR_ABORTED"))
      .mockResolvedValueOnce({
        success: true,
        correlationId: "test-correlation",
        data: { created: true, message: null, assistantMessageId: null, run: null },
      });

    render(<AssistantWorkspacePage />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "A corporate town hall in Dhaka for 300 attendees." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledTimes(2));
    // Retry replays the SAME idempotency key so the backend can deduplicate a
    // send that actually reached it before the client saw the failure.
    expect(mockedPostMessage.mock.calls[0][2]).toBe(mockedPostMessage.mock.calls[1][2]);
    expect(mockedPostMessage.mock.calls[0][0]).toBe(PROPOSAL_ID);
    expect(mockedCreateProposal).toHaveBeenCalledTimes(1);
    // The failed bubble clears once the retry lands.
    await waitFor(() => expect(screen.queryByText(/didn't go through/)).not.toBeInTheDocument());
  });

  test("room schedule guidance renders allowlisted download and upload workflow actions", async () => {
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 1, updatedAt: "2026-07-21T10:00:00.000Z" },
        messages: [{
          id: "msg-room-help",
          ordinal: 1,
          role: "assistant",
          kind: "status",
          content: "Download the room schedule template, fill it, and upload it in Room Specifications.",
          actions: ["download_room_schedule_template", "open_room_specifications"],
          intent: null,
          runType: null,
          runId: null,
          jobId: null,
          status: "complete",
          createdAt: "2026-07-21T10:00:00.000Z",
          attachments: [],
        }],
        questions: [],
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const download = await screen.findByRole("link", { name: "Download Sample Sheet" });
    expect(download).toHaveAttribute("href", "/files/RFPilot%20schedule-example-sheet.xlsx");
    expect(download).toHaveAttribute("download");
    expect(screen.getByRole("link", { name: "Open Room Specifications & Upload" })).toHaveAttribute(
      "href",
      `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}&step=3`,
    );
  });

  test("guided flow shows one question at a time with progress, impact tag, and a remaining count in the rail", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([startDateQuestion, roomsQuestion]));
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText("Guided question 1")).toBeInTheDocument();
    expect(screen.getByText("When does the event start? (YYYY-MM-DD)")).toBeInTheDocument();
    expect(screen.getByText("affects schedule")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer this question")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    // Only ONE question card — the second question is not rendered yet.
    expect(screen.queryByText("How many event rooms are required?")).not.toBeInTheDocument();
    // The rail no longer lists prompts; it shows the remaining count.
    expect(await screen.findByText(/2 questions are open now/)).toBeInTheDocument();
    // Nothing was answered yet, so no completion card.
    expect(screen.queryByText(/All key questions answered/)).not.toBeInTheDocument();
  });

  test("event start date validation uses the user's local calendar day", () => {
    const now = new Date(2026, 6, 27, 23, 45);

    expect(isBeforeLocalToday(new Date(2026, 6, 26, 23, 59), now)).toBe(true);
    expect(isBeforeLocalToday(new Date(2026, 6, 27, 0, 0), now)).toBe(false);
    expect(isBeforeLocalToday(new Date(2026, 6, 28, 0, 0), now)).toBe(false);
  });

  test("event end date uses the applied start date as its earliest selectable day", () => {
    const now = new Date(2026, 6, 27, 23, 45);
    const proposal = { event: { startDate: "2026-07-30" } };

    expect(minimumDateForQuestion(endDatePickerQuestion, proposal, now))
      .toEqual(new Date(2026, 6, 30));
    expect(minimumDateForQuestion(datePickerQuestion, proposal, now))
      .toEqual(new Date(2026, 6, 27));
  });

  test("production load-in cannot be selected after the event starts", () => {
    const proposal = { event: { startDate: "2026-07-30", endDate: "2026-08-02" } };

    expect(maximumDateForQuestion(loadInDatePickerQuestion, proposal))
      .toEqual(new Date(2026, 6, 30));
    expect(maximumDateForQuestion(endDatePickerQuestion, proposal)).toBeUndefined();
  });

  test("production load-in time uses a native time picker and submits HH:MM", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([loadInTimePickerQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-load-in-time", status: "answered", answeredMessageId: null, appliedField: null },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("What time can production load in? (HH:MM)");
    const timeInput = screen.getByLabelText("Answer this question");
    expect(timeInput).toHaveAttribute("type", "time");
    expect(timeInput).toHaveAttribute("step", "300");

    fireEvent.input(timeInput, { target: { value: "07:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-load-in-time",
      { status: "answered", answer: "07:30" },
    ));
  });

  test("venue-name guidance points undecided users to Skip, not a missing option", () => {
    const venueQuestion = guidedQuestion(
      "q-venue",
      "Which venue will host the event? Enter the venue name, or “Not selected” if it is still undecided.",
      "/content/venueSchedule/venueName",
      "cost",
    );

    expect(displayQuestionPrompt(venueQuestion)).toMatch(/use Skip/i);
    expect(displayQuestionPrompt(venueQuestion)).not.toMatch(/Not selected/i);
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
    await screen.findByText("Guided question 1");
    const initialLoads = mockedGetConversation.mock.calls.length;

    // Ported from the retired ConversationWorkspace suite: the Answer control
    // stays disabled until something has actually been typed.
    const answerButton = screen.getByRole("button", { name: "Answer" });
    expect(answerButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Answer this question"), { target: { value: "2026-09-01" } });
    expect(answerButton).toBeEnabled();
    fireEvent.click(answerButton);

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-start",
      { status: "answered", answer: "2026-09-01" },
    ));
    // …and resolving a question refetches the conversation (useConversation).
    await waitFor(() => expect(mockedGetConversation.mock.calls.length).toBeGreaterThan(initialLoads));
    // The confirmed value shows and the flow advances to the next question.
    expect(await screen.findByText("Start date: 2026-09-01 ✓")).toBeInTheDocument();
    expect(await screen.findByText("Guided question 2")).toBeInTheDocument();
    expect(screen.getByText("How many event rooms are required?")).toBeInTheDocument();
    expect(screen.getByText("affects cost")).toBeInTheDocument();
  });

  test("an invalid answer shows the validation message and re-asks the same question", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([roomsQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: false,
      code: "INVALID_CANDIDATE_VALUE",
      message: "Room count must be between 1 and 200.",
      correlationId: "test-correlation",
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    const answerInput = screen.getByLabelText("Answer this question");
    fireEvent.change(answerInput, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    const validation = await screen.findByRole("alert");
    expect(validation).toHaveTextContent("Room count must be between 1 and 200.");
    expect(answerInput).toHaveAttribute("aria-invalid", "true");
    expect(answerInput).toHaveAttribute("aria-describedby", validation.id);
    // The question stays open for another attempt; no confirmation, no advance.
    expect(screen.getByText("How many event rooms are required?")).toBeInTheDocument();
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
  });

  test("a failed answer request recovers when refresh shows the question already advanced", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([roomsQuestion]));
    mockedPatchQuestion.mockImplementation(async () => {
      // Simulate Mongo accepting the value while the live synchronizer retires
      // the Postgres question before the request finishes.
      mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([]));
      return {
        success: false,
        code: "INTERNAL_ERROR",
        message: "We couldn't complete that request. Please try again. Reference: recovery-test",
        correlationId: "recovery-test",
      };
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("How many event rooms are required?");
    fireEvent.change(screen.getByLabelText("Answer this question"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    expect(await screen.findByText("Number of event rooms: 4 ✓")).toBeInTheDocument();
    expect(screen.queryByText(/Reference: recovery-test/)).not.toBeInTheDocument();
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
    await screen.findByText("Guided question 1");
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(PROPOSAL_ID, "q-start", { status: "dismissed" }));
    expect(await screen.findByText("Guided question 2")).toBeInTheDocument();
    // Skipping never shows a confirmed value and never completes the flow.
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
  });

  test("a date question renders the date picker and submits a YYYY-MM-DD value", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([datePickerQuestion, roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([roomsQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-start", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/startDate", mongoPath: "event.startDate", value: "2026-09-01" } },
    });

    const { container } = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    // The date control is the shared react-datepicker wrapper, not a bare text box.
    expect(container.querySelector(".react-datepicker__input-container")).not.toBeNull();
    const input = screen.getByLabelText("Answer this question");
    expect(input).toHaveAttribute("placeholder", "YYYY-MM-DD");

    fireEvent.change(input, { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-start",
      { status: "answered", answer: "2026-09-01" },
    ));
    expect(await screen.findByText("Start date: 2026-09-01 ✓")).toBeInTheDocument();
  });

  test("an extraction-suggested date pre-fills the picker and one click confirms it", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([
      guidedQuestion("q-start", "When does the event start? (YYYY-MM-DD)", "/content/event/startDate", "schedule", { answerType: "date", suggestedAnswer: "2026-10-15" }),
    ]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-start", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/startDate", mongoPath: "event.startDate", value: "2026-10-15" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    // The picker is seeded, the provenance note is visible, and Answer is
    // enabled without any typing.
    expect(screen.getByLabelText("Answer this question")).toHaveValue("2026-10-15");
    expect(screen.getByText("Pre-filled from your message — confirm or edit.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-start",
      { status: "answered", answer: "2026-10-15" },
    ));
  });

  test("an extraction-suggested number pre-fills the input and submits unchanged", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([
      guidedQuestion("q-attendees", "Roughly how many people will attend?", "/content/event/attendees", "scope", { answerType: "number", suggestedAnswer: "300" }),
    ]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-attendees", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/attendees", mongoPath: "event.attendees", value: "300" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    expect(screen.getByLabelText("Answer this question")).toHaveValue(300);
    expect(screen.getByText("Pre-filled from your message — confirm or edit.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-attendees",
      { status: "answered", answer: "300" },
    ));
  });

  test("an extraction-suggested choice highlights its pill without auto-selecting it", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([
      guidedQuestion("q-format", "Is the event in-person, hybrid, or virtual?", "/content/event/eventFormat", "scope", {
        answerType: "choice",
        options: ["In-Person", "Hybrid", "Virtual"],
        suggestedAnswer: "In-Person",
      }),
    ]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-format", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/eventFormat", mongoPath: "event.eventFormat", value: "In-Person" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    expect(screen.getByText("The highlighted option comes from your message — tap it to confirm.")).toBeInTheDocument();
    const suggestedPill = screen.getByRole("button", { name: "In-Person" });
    expect(suggestedPill).toHaveAccessibleDescription("Suggested from your message");
    // Nothing was submitted by the highlight alone; the tap is the review.
    expect(mockedPatchQuestion).not.toHaveBeenCalled();
    fireEvent.click(suggestedPill);
    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-format",
      { status: "answered", answer: "In-Person" },
    ));
  });

  test("a question without a suggestion renders no prefill note and an empty control", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([
      guidedQuestion("q-name", "What is this event called?", "/content/event/eventName", "scope"),
    ]));

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    expect(screen.getByLabelText("Answer this question")).toHaveValue("");
    expect(screen.queryByText(/Pre-filled from your message/)).not.toBeInTheDocument();
    expect(screen.queryByText(/highlighted option comes from your message/)).not.toBeInTheDocument();
  });

  test("a choice question renders pills and clicking one submits that option immediately", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([formatQuestion, roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([roomsQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-format", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/eventFormat", mongoPath: "event.eventFormat", value: "in_person" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    for (const option of ["In-Person", "Hybrid", "Virtual"])
      expect(screen.getByRole("button", { name: option })).toBeInTheDocument();
    // A closed option set answers in one tap: no separate Answer control.
    expect(screen.queryByRole("button", { name: "Answer" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hybrid" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-format",
      { status: "answered", answer: "Hybrid" },
    ));
    expect(await screen.findByText("Event format: Hybrid ✓")).toBeInTheDocument();
    expect(await screen.findByText("Guided question 2")).toBeInTheDocument();
  });

  test("a long choice list renders every option as a pill and submits the clicked one", async () => {
    const platformQuestion = guidedQuestion("q-platform", "Which streaming platform will the event use?", "/content/hybridVirtual/streamingPlatform", "production", {
      answerType: "choice",
      options: STREAMING_PLATFORMS,
    });
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([platformQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-platform", status: "answered", answeredMessageId: null, appliedField: { path: "/content/hybridVirtual/streamingPlatform", mongoPath: "hybridVirtual.streamingPlatform", value: "Vendor Recommendation Needed" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    for (const option of STREAMING_PLATFORMS)
      expect(screen.getByRole("button", { name: option })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Vendor Recommendation Needed" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-platform",
      { status: "answered", answer: "Vendor Recommendation Needed" },
    ));
    expect(await screen.findByText("Streaming platform: Vendor Recommendation Needed ✓")).toBeInTheDocument();
  });

  test("a text question keeps the typed answer plus Answer button behaviour", async () => {
    const platformQuestion = guidedQuestion("q-platform", "Which streaming platform will the event use?", "/content/hybridVirtual/streamingPlatform", "production", { answerType: "text" });
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([platformQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-platform", status: "answered", answeredMessageId: null, appliedField: { path: "/content/hybridVirtual/streamingPlatform", mongoPath: "hybridVirtual.streamingPlatform", value: "Zoom" } },
    });

    const { container } = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    const input = screen.getByLabelText("Answer this question");
    expect(input).toHaveAttribute("type", "text");
    expect(container.querySelector(".react-datepicker__input-container")).toBeNull();

    fireEvent.change(input, { target: { value: "Zoom" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-platform",
      { status: "answered", answer: "Zoom" },
    ));
    expect(await screen.findByText("Streaming platform: Zoom ✓")).toBeInTheDocument();
  });

  test("an answered question is replayed above its answer, and an unmatched answer still renders alone", async () => {
    const answerMessage = {
      id: "msg-answer", ordinal: 2, role: "user" as const, kind: "question_answer" as const, content: "2027-04-14",
      intent: "chat", runType: null, runId: null, jobId: null, status: "complete" as const, createdAt: "2026-07-21T10:01:00.000Z", attachments: [],
    };
    const orphanAnswer = { ...answerMessage, id: "msg-orphan", ordinal: 3, content: "Zoom Webinar" };
    const answeredQuestion = guidedQuestion("q-start", "When does the event start? (YYYY-MM-DD)", "/content/event/startDate", "schedule", {
      answerType: "date",
      status: "answered",
      answeredMessageId: "msg-answer",
    });
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 2, updatedAt: "2026-07-21T10:00:00.000Z" },
        messages: [answerMessage, orphanAnswer],
        questions: [answeredQuestion],
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    // The question that produced the answer is replayed as history above it.
    expect(await screen.findByText("When does the event start? (YYYY-MM-DD)")).toBeInTheDocument();
    expect(screen.getByText("2027-04-14")).toBeInTheDocument();
    expect(screen.getAllByText("Asked")).toHaveLength(1);
    // The answer with no matching question renders exactly as before.
    expect(screen.getByText("Zoom Webinar")).toBeInTheDocument();
    expect(screen.getAllByText("Answer")).toHaveLength(2);
  });

  // ── Completion progress card ────────────────────────────────────────────────

  const roomsAnswered = {
    success: true as const,
    correlationId: "test-correlation",
    data: { id: "q-rooms", status: "answered" as const, answeredMessageId: null, appliedField: { path: "/content/venueSchedule/numberOfEventRooms", mongoPath: "venueSchedule.numberOfEventRooms", value: "6" } },
  };

  // "Event basics" is complete, so it must never appear among the weakest three;
  // "Risk" is the fourth-thinnest and is cut by the cap.
  const guidanceReport = {
    id: "gr-1",
    proposalVersion: 7,
    engineVersion: "guidance.v1",
    overallCompleteness: 0.68,
    completeness: [
      { section: "event", label: "Event basics", filled: 8, total: 8, score: 1 },
      { section: "risk", label: "Risk & compliance", filled: 5, total: 6, score: 0.83 },
      { section: "venueSchedule", label: "Venue & schedule", filled: 2, total: 9, score: 0.22 },
      { section: "production", label: "Production", filled: 3, total: 6, score: 0.5 },
      { section: "budget", label: "Budget", filled: 1, total: 4, score: 0.25 },
    ],
    findings: [
      { code: "MISSING_VENUE", severity: "blocking" as const, category: "completeness" as const, message: "The venue is missing.", paths: ["/venue"] },
      { code: "MISSING_BUDGET", severity: "blocking" as const, category: "budget" as const, message: "The budget is missing.", paths: ["/budget"] },
    ],
    findingCount: 2,
    blockingCount: 2,
    createdAt: "2026-07-21T10:00:00.000Z",
  };

  const answerLastQuestion = async () => {
    await screen.findByText("Guided question 1");
    fireEvent.change(screen.getByLabelText("Answer this question"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    await screen.findByText("Number of event rooms: 6 ✓");
  };

  test("answering the last question shows a completion progress card built from the guidance report", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([]));
    mockedPatchQuestion.mockResolvedValue(roomsAnswered);
    mockedGenerateGuidance.mockResolvedValue({ success: true, data: guidanceReport });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await answerLastQuestion();

    // "Complete" is the stepper's word for workflow phase; this card measures how
    // much of the questionnaire is filled in, which is a different question.
    expect(await screen.findByText("Your proposal details are 68% filled in")).toBeInTheDocument();
    expect(screen.queryByText(/68% complete/)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Proposal completeness" })).toHaveAttribute("aria-valuenow", "68");
    // The three thinnest sections, thinnest first; complete sections stay out.
    expect(screen.getByText("Venue & schedule")).toBeInTheDocument();
    expect(screen.getByText("2/9")).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("3/6")).toBeInTheDocument();
    expect(screen.queryByText("Event basics")).not.toBeInTheDocument();
    expect(screen.queryByText("Risk & compliance")).not.toBeInTheDocument();
    // One calm amber line for the blocking findings.
    expect(screen.getByText("2 items need attention before publishing.")).toBeInTheDocument();
    // The deterministic engine runs exactly once, not on every render.
    expect(mockedGenerateGuidance).toHaveBeenCalledTimes(1);
    expect(mockedGenerateGuidance).toHaveBeenCalledWith(PROPOSAL_ID);
    // The rail reflects completion too (it slides in asynchronously).
    expect(await screen.findByText("All key questions answered.")).toBeInTheDocument();
    // The consistent action row: one primary, a tertiary link, and no second
    // readiness button because a report is already on screen — only the rail's
    // own chip remains.
    expect(screen.getByRole("button", { name: "Generate proposal draft" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Run readiness check" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Edit all details" })).toHaveLength(2);
    // The old vague copy is gone for good.
    expect(screen.queryByText(/everything else is optional/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open the proposal editor" })).not.toBeInTheDocument();
  });

  test("a failed readiness check falls back to the plain headline with the actions still working", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([]));
    mockedPatchQuestion.mockResolvedValue(roomsAnswered);
    mockedGetProposal.mockResolvedValue({ success: true, message: "ok", data: { _id: PROPOSAL_ID, version: 4, event: { eventName: "" } } });
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: { runType: "proposal_draft", runId: "run-2", jobId: "job-2" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await answerLastQuestion();

    expect(await screen.findByText("Key questions answered.")).toBeInTheDocument();
    // No percentage, no bar, and never a raw error from the guidance service.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/is not enabled for this environment/)).not.toBeInTheDocument();
    // With no report on screen the card offers the check itself, alongside the
    // rail's own chip (the rail slides in asynchronously).
    await screen.findByText("All key questions answered.");
    expect(screen.getAllByRole("button", { name: "Run readiness check" })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Generate proposal draft" }));
    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "Generate a proposal draft from the current information.", intent: "generate_draft", expectedProposalVersion: 4 },
      expect.any(String),
    ));
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
      data: [{ id: "src-9", status: "scanning", confidentiality: "non_confidential", originalFilename: "pending.pdf", createdAt: "2026-07-21T10:00:00.000Z" , origin: "upload" as const }],
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
        { id: "src-1", status: "ready", confidentiality: "non_confidential", originalFilename: "venue.pdf", createdAt: "2026-07-21T10:00:00.000Z" , origin: "upload" as const },
        { id: "src-2", status: "ready", confidentiality: "confidential", originalFilename: "internal.pdf", createdAt: "2026-07-21T10:00:00.000Z" , origin: "upload" as const },
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
    expect(screen.queryByText("AI workspace")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add notes" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message the proposal assistant"), { target: { value: "Plan a gala dinner." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    // Once the send lands the rail slides in and stays.
    expect(await screen.findByRole("heading", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByText("AI workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Proposal assistant tools")).toBeInTheDocument();
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
    origin: "upload" as const,
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
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "Plan a hybrid summit." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByLabelText("The assistant is responding")).toBeInTheDocument();
    expect(screen.queryByText("What is the event date?")).not.toBeInTheDocument();

    resolvePost({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: null },
    });
    await waitFor(() => expect(screen.queryByLabelText("The assistant is responding")).not.toBeInTheDocument());
    expect(await screen.findByText("What is the event date?")).toBeInTheDocument();
  });

  test("a persisted pending chat job remains visible after reload and blocks duplicate sends", async () => {
    mockedGetConversation.mockResolvedValue({
      ...conversationWithQuestion,
      data: {
        ...conversationWithQuestion.data,
        messages: [
          ...conversationWithQuestion.data.messages,
          {
            id: "assistant-pending", ordinal: 2, role: "assistant" as const, kind: "status" as const,
            content: "The assistant is preparing a response.", intent: null, runType: null, runId: null,
            jobId: "job-chat-1", status: "pending" as const, createdAt: "2026-07-21T10:00:00.000Z", attachments: [],
          },
        ],
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByLabelText("The assistant is responding")).toBeInTheDocument();
    const composer = screen.getByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "Do not send this twice." } });
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  test("a terminal persisted chat failure replaces responding and releases the composer", async () => {
    mockedGetConversation.mockResolvedValue({
      ...conversationWithQuestion,
      data: {
        ...conversationWithQuestion.data,
        messages: [
          ...conversationWithQuestion.data.messages,
          {
            id: "assistant-failed", ordinal: 2, role: "assistant" as const, kind: "status" as const,
            content: "The assistant could not complete this response. Please try again.", intent: null,
            runType: null, runId: null, jobId: "job-chat-1", status: "failed" as const,
            createdAt: "2026-07-21T10:00:00.000Z", attachments: [],
          },
        ],
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("could not complete this response");
    expect(screen.queryByLabelText("The assistant is responding")).not.toBeInTheDocument();
    const composer = screen.getByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "Try a new message." } });
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  test("saving notes needs no approval checkbox and stores them as non_confidential", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);
    mockedCreateNotes.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { source: { id: "src-notes", status: "uploaded", confidentiality: "non_confidential", originalFilename: "Notes", createdAt: "2026-07-21T10:00:00.000Z" , origin: "upload" as const } },
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

  // ── Explicit review after extraction ───────────────────────────────────────

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

  const contextRunResult = {
    success: true as const,
    correlationId: "test-correlation",
    data: { run: { id: "run-1", model: "gpt-test" }, evidence: [], operations: [{}, {}, {}, {}, {}] },
  } as never;

  test("a completed extraction stays read-only and sends the user to explicit review", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun());
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal.mockResolvedValue({
      success: true,
      data: { _id: PROPOSAL_ID, version: 7, event: { eventName: "Annual Gala" } },
    } as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    expect(await screen.findByText("I reviewed your sources and extracted the requirements below.")).toBeInTheDocument();
    expect(screen.queryByText(/Added .* field.* to your proposal/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review suggestions" }))
      .toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`);
  });

  // ── Captured-details overview ───────────────────────────────────────────────

  const OVERVIEW_HEADING = "Here’s what I have for Annual Leadership Summit";

  // Ten populated rows: the union-venue row is intentionally "NO" so it stays
  // hidden and the proposal due date is not pushed past the ten-row cap.
  const capturedProposal = {
    success: true as const,
    message: "ok",
    data: {
      _id: PROPOSAL_ID,
      event: {
        eventName: "Annual Leadership Summit",
        startDate: "2027-03-16",
        endDate: "2027-03-18",
        eventFormat: "Hybrid",
        attendees: "450",
      },
      venueSchedule: { venueName: "Riverfront Convention Center", venueCity: "Detroit", numberOfEventRooms: "6", isUnionVenue: "NO" },
      hybridVirtual: { streamingPlatform: "Zoom Events" },
      videoRecordingStep: { videoRecordingRequired: "YES", numberOfCameras: "4" },
      budget: { proposalSubmissionDueDate: "2026-08-15" },
    },
  };

  test("the overview card renders the captured details and the next step once extraction completes with no questions", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun([]));
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal.mockResolvedValue(capturedProposal);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText(OVERVIEW_HEADING)).toBeInTheDocument();
    // Only fields that carry a value, with humanized labels and values.
    expect(screen.getByText("Dates")).toBeInTheDocument();
    expect(screen.getByText("16–18 Mar 2027")).toBeInTheDocument();
    expect(screen.getByText("Hybrid")).toBeInTheDocument();
    expect(screen.getByText("450")).toBeInTheDocument();
    expect(screen.getByText("Riverfront Convention Center")).toBeInTheDocument();
    expect(screen.getByText("Detroit")).toBeInTheDocument();
    expect(screen.getByText("Zoom Events")).toBeInTheDocument();
    expect(screen.getByText("Yes — 4 cameras")).toBeInTheDocument();
    expect(screen.getByText("15 Aug 2026")).toBeInTheDocument();
    // isUnionVenue is "NO", so no union row.
    expect(screen.queryByText("Union venue")).not.toBeInTheDocument();
    expect(screen.getByText("10 details captured from your sources.")).toBeInTheDocument();
    // Extraction output stays read-only and links to the explicit review.
    expect(screen.getByText(/ready for explicit review/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review suggestions" })).toBeInTheDocument();
    // The explicit next step plus the softer alternatives.
    expect(screen.getByRole("button", { name: "Generate proposal draft" })).toBeInTheDocument();
    expect(screen.getByText("Or add more details — upload another file, paste notes, or ask me anything.")).toBeInTheDocument();
    // The card's own editor link (the top bar carries the second one).
    expect(screen.getAllByRole("link", { name: "Edit all details" }).length).toBeGreaterThan(1);
    // The old notice is gone for good.
    expect(screen.queryByText(/I have all the key details I need/)).not.toBeInTheDocument();
  });

  test("the overview card never shows before an extraction has completed, while a question is open, or once a draft exists", async () => {
    // A chat-only conversation without a completed extraction shows nothing.
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);
    mockedGetProposal.mockResolvedValue(capturedProposal);
    const { unmount } = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Please review the venue requirements.");
    expect(screen.queryByText(OVERVIEW_HEADING)).not.toBeInTheDocument();
    unmount();

    // A completed extraction with an open question shows the question instead —
    // the guided flow always runs ahead of the overview.
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun([startDateQuestion]));
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    const openQuestionRender = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("When does the event start? (YYYY-MM-DD)");
    expect(screen.queryByText(OVERVIEW_HEADING)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate proposal draft" })).not.toBeInTheDocument();
    openQuestionRender.unmount();

    // Once a draft run exists the thread shows the draft results instead.
    (getProposalDraftAction as jest.MockedFunction<typeof getProposalDraftAction>).mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { run: { id: "run-2", model: "gpt-test" }, sections: [] },
    } as never);
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 2, updatedAt: "2026-07-21T10:05:00.000Z" },
        questions: [],
        messages: [
          {
            id: "msg-run", ordinal: 1, role: "assistant" as const, kind: "run_result" as const, content: "I reviewed your sources and extracted the requirements below.",
            intent: null, runType: "proposal_context" as const, runId: "run-1", jobId: "job-1", status: "complete" as const,
            createdAt: "2026-07-21T10:00:00.000Z", attachments: [],
          },
          {
            id: "msg-draft", ordinal: 2, role: "assistant" as const, kind: "run_result" as const, content: "Here is your draft.",
            intent: null, runType: "proposal_draft" as const, runId: "run-2", jobId: "job-2", status: "complete" as const,
            createdAt: "2026-07-21T10:05:00.000Z", attachments: [],
          },
        ],
      },
    } as never);
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Here is your draft.");
    expect(screen.queryByText(OVERVIEW_HEADING)).not.toBeInTheDocument();
  });

  test("Generate proposal draft sends the generate_draft intent with the current proposal version", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun([]));
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal.mockResolvedValue(capturedProposal);
    mockedGetLatestContext.mockResolvedValue({ success: true, correlationId: "test-correlation", data: { run: { id: "run-1" } } } as never);
    // Candidate review is read-only here and only supplies the fallback version.
    mockedGetReview.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { reviewId: null, revision: 1, proposalVersion: 9, canonicalPaths: {}, currentValues: {}, appliedOperationIds: [], operations: [] },
    } as never);
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: { runType: "proposal_draft", runId: "run-2", jobId: "job-2" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Generate proposal draft" }));

    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "Generate a proposal draft from the current information.", intent: "generate_draft", expectedProposalVersion: 9 },
      expect.any(String),
    ));
  });

  test("the overview sends extracted suggestions to explicit review without applying them", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun());
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal.mockResolvedValue(capturedProposal);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText(/details captured from your sources/)).toBeInTheDocument();
    expect(screen.getByText(/ready for explicit review/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review suggestions" }))
      .toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`);
    expect(screen.queryByText(/Added .* field.* to your proposal/)).not.toBeInTheDocument();
  });

  // ── Draft staleness ─────────────────────────────────────────────────────────

  const draftMessage = {
    id: "msg-draft", ordinal: 2, role: "assistant" as const, kind: "run_result" as const, content: "Here is your draft.",
    intent: null, runType: "proposal_draft" as const, runId: "run-2", jobId: "job-2", status: "complete" as const,
    createdAt: "2026-07-21T10:05:00.000Z", attachments: [],
  };

  const conversationWithDraft = (questions: Array<Record<string, unknown>> = []) => ({
    success: true as const,
    correlationId: "test-correlation",
    data: {
      conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 2, updatedAt: "2026-07-21T10:05:00.000Z" },
      capabilities: { conversationExtraction: true },
      messages: [...conversationWithQuestion.data.messages, draftMessage],
      questions,
    },
  }) as never;

  // The run payload is the raw draft-run row, so the version lives on
  // expected_proposal_version; `null` models a payload that carries none.
  const draftRun = (expectedProposalVersion: number | null) => ({
    success: true as const,
    correlationId: "test-correlation",
    data: {
      run: { id: "run-2", model: "gpt-test", ...(expectedProposalVersion === null ? {} : { expected_proposal_version: expectedProposalVersion }) },
      sections: [],
      gaps: [],
      regenerations: [],
      proposalMutation: false,
    },
  }) as never;

  const proposalAtVersion = (version: number) => ({
    success: true as const,
    message: "ok",
    data: { _id: PROPOSAL_ID, version, event: { eventName: "" } },
  });

  const STALE_HINT = "This draft was written before your latest answers.";

  test("completed draft paragraphs display their citations", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithDraft());
    mockedGetProposal.mockResolvedValue(proposalAtVersion(7));
    mockedGetDraft.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        run: { id: "run-2", model: "gpt-test", expected_proposal_version: 7 },
        sections: [{
          id: "section-1",
          key: "event_overview",
          heading: "Event Overview",
          ordinal: 0,
          paragraphs: [{
            text: "Northstar Summit is a hybrid event.",
            citations: ["/content/event/eventName", "/content/event/eventFormat"],
          }],
          decision: null,
          decisionReason: null,
        }],
        gaps: [],
        regenerations: [],
        proposalMutation: false,
      },
    } as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const draftParagraph = await screen.findByText(
      "Northstar Summit is a hybrid event.",
    );
    expect(draftParagraph).toBeInTheDocument();
    const citationSources = draftParagraph.parentElement?.querySelector(
      '[aria-label="Sources"]',
    );
    expect(citationSources).toHaveTextContent("Event name");
    expect(citationSources).toHaveTextContent("Event format");
    expect(citationSources).not.toHaveTextContent("/content/");
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
    expect(screen.queryByText("gpt-test")).not.toBeInTheDocument();
  });

  test("a source built from chat is labelled, so it never looks like an attached file", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithDraft([]));
    mockedListSources.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: [
        { ...sourceRow("ready", "src-file"), originalFilename: "venue.pdf" },
        { ...sourceRow("ready", "src-chat"), originalFilename: "conversation-notes-2.txt", origin: "conversation" as const },
      ],
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    // The planner never pressed "add this as a source" for the chat-derived
    // one, so it must be distinguishable from a file they chose to upload.
    expect(await screen.findByText("conversation-notes-2.txt")).toBeInTheDocument();
    expect(screen.getAllByText("from chat")).toHaveLength(1);
  });

  test("asking the assistant to use typed messages reports what happened", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithDraft([]));
    mockedCloseSegment.mockResolvedValue({ success: true, correlationId: "c", data: { created: true } });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: /Use what/i }));

    // Extraction is otherwise silent: a source and applied fields would appear
    // with nothing explaining where they came from.
    expect(await screen.findByText(/saved what you/i)).toBeInTheDocument();
    expect(mockedCloseSegment).toHaveBeenCalledWith(PROPOSAL_ID);
  });

  test("the backend capability prevents the dashboard from offering unavailable chat extraction", async () => {
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        ...conversationWithQuestion.data,
        capabilities: { conversationExtraction: false },
      },
    } as never);
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    // The runtime API is authoritative, preventing the mismatch seen in the
    // live workflow.
    const task = await screen.findByRole("button", { name: /Use what/i });
    expect(task).toBeDisabled();
    expect(task).toHaveAttribute("title", expect.stringMatching(/isn't switched on/i));
    fireEvent.click(task);
    expect(mockedCloseSegment).not.toHaveBeenCalled();
  });

  test("a successful retry retires the earlier failed-run alert", () => {
    const messages = [
      {
        id: "draft-failed", ordinal: 1, role: "assistant", kind: "run_result", content: "failed",
        intent: null, runType: "proposal_draft", runId: "run-1", jobId: "job-1", status: "failed",
        createdAt: "2026-07-21T10:00:00.000Z", attachments: [],
      },
      {
        id: "draft-complete", ordinal: 2, role: "assistant", kind: "run_result", content: "complete",
        intent: null, runType: "proposal_draft", runId: "run-2", jobId: "job-2", status: "complete",
        createdAt: "2026-07-21T10:01:00.000Z", attachments: [],
      },
    ] as Parameters<typeof visibleRunMessages>[0];

    expect(visibleRunMessages(messages).map(message => message.id)).toEqual(["draft-complete"]);
    expect(visibleRunMessages([messages[0]])).toEqual([messages[0]]);
  });

  test("nothing new to use is reported as a normal outcome, not an error", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithDraft([]));
    mockedCloseSegment.mockResolvedValue({ success: true, correlationId: "c", data: { created: false, reason: "insufficient" } });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: /Use what/i }));

    const notice = await screen.findByText(/enough detail in your messages/i);
    expect(notice).toBeInTheDocument();
    // A skip is a status, not an alert: nothing failed.
    expect(notice.getAttribute("role")).toBe("status");
  });

  test("a stored readiness check is restored on load instead of having to be re-run", async () => {
    // Both reports are persisted server-side, but the thread only ever held the
    // copy produced in this tab, so a refresh silently discarded them.
    (getLatestGuidanceAction as jest.MockedFunction<typeof getLatestGuidanceAction>)
      .mockResolvedValueOnce({ success: true, data: guidanceReport });
    mockedGetConversation.mockResolvedValue(conversationWithDraft([]));

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText("Results — Readiness check")).toBeInTheDocument();
    expect(screen.getByText("The venue is missing.")).toBeInTheDocument();
  });

  test("the primary action reads Regenerate draft once a draft exists", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithDraft([roomsQuestion]))
      .mockResolvedValue(conversationWithDraft([]));
    mockedPatchQuestion.mockResolvedValue(roomsAnswered);
    mockedGenerateGuidance.mockResolvedValue({ success: true, data: guidanceReport });
    mockedGetDraft.mockResolvedValue(draftRun(7));
    mockedGetProposal.mockResolvedValue(proposalAtVersion(7));

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await answerLastQuestion();

    expect(await screen.findByText("Your proposal details are 68% filled in")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate draft" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate proposal draft" })).not.toBeInTheDocument();
    // Draft and proposal are on the same version, so nothing is stale.
    expect(screen.queryByText(STALE_HINT)).not.toBeInTheDocument();
  });

  test("the staleness hint shows only when the proposal moved past the draft's version", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithDraft([]));
    mockedGetDraft.mockResolvedValue(draftRun(5));
    mockedGetProposal.mockResolvedValue(proposalAtVersion(9));
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: { runType: "proposal_draft", runId: "run-3", jobId: "job-3" } },
    });

    const ahead = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    expect(await screen.findByText(STALE_HINT)).toBeInTheDocument();
    // Regenerating uses the CURRENT proposal version, not the draft's.
    fireEvent.click(screen.getByRole("button", { name: "Regenerate draft" }));
    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "Generate a proposal draft from the current information.", intent: "generate_draft", expectedProposalVersion: 9 },
      expect.any(String),
    ));
    ahead.unmount();

    // Same version — the draft is current, so no hint.
    mockedGetProposal.mockResolvedValue(proposalAtVersion(5));
    const level = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Here is your draft.");
    await waitFor(() => expect(mockedGetDraft).toHaveBeenCalled());
    expect(screen.queryByText(STALE_HINT)).not.toBeInTheDocument();
    level.unmount();

    // The run carries no version at all — never guess.
    mockedGetDraft.mockResolvedValue(draftRun(null));
    mockedGetProposal.mockResolvedValue(proposalAtVersion(9));
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Here is your draft.");
    await waitFor(() => expect(mockedGetDraft).toHaveBeenCalled());
    expect(screen.queryByText(STALE_HINT)).not.toBeInTheDocument();
  });
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssistantWorkspacePage, { displayQuestionPrompt, fieldAnswerFromInstruction, isBeforeLocalToday, isSkipQuestionInstruction, maximumDateForQuestion, mentionedFieldAnswers, minimumDateForQuestion, naturalDateToIso, naturalTimeTo24Hour, proposalWorkspaceActionFromInstruction, questionAnswerHint, questionFieldContract, sourceIdsForFailedExtraction, speechTranscriptFromSegments, visibleRunMessages } from "./AssistantWorkspacePage";
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
  path: string | string[],
  impact: "schedule" | "cost" | "production" | "scope",
  control: { answerType?: "date" | "time" | "date_time" | "choice" | "number" | "text"; options?: string[]; status?: "open" | "answered"; answeredMessageId?: string; suggestedAnswer?: string } = {},
) => ({
  id,
  code: `MISSING_FIELD:${path}`,
  severity: "question" as const,
  paths: Array.isArray(path) ? path : [path],
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
const combinedLoadInQuestion = guidedQuestion(
  "q-load-in-combined",
  "What date and time can production load-in?",
  ["/content/venueSchedule/loadInDate", "/content/venueSchedule/loadInTime"],
  "schedule",
  { answerType: "date_time" },
);
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
const eventNameQuestion = guidedQuestion(
  "q-event-name",
  "What is this event called?",
  "/content/event/eventName",
  "scope",
);

const conversationWithGuidedQuestions = (questions: Array<ReturnType<typeof guidedQuestion>>) => ({
  success: true as const,
  correlationId: "test-correlation",
  data: {
    conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 1, updatedAt: "2026-07-21T10:00:00.000Z" },
    messages: conversationWithQuestion.data.messages,
    questions,
  },
});

const proposalContextMessage = (status: "pending" | "complete" | "failed") => ({
  id: "msg-context-1",
  ordinal: 2,
  role: "assistant" as const,
  kind: "run_result" as const,
  content: "I reviewed your sources and extracted the requirements below.",
  intent: null,
  runType: "proposal_context" as const,
  runId: "run-ctx-1",
  jobId: "job-ctx-1",
  status,
  createdAt: "2026-07-21T10:01:00.000Z",
  attachments: [],
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
    delete (window as typeof window & { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition;
  });

  test("empty state greets the signed-in user by first name", async () => {
    render(<AssistantWorkspacePage />);
    expect(await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/)).toBeInTheDocument();
    expect(screen.getByText("Tell me about your event?")).toBeInTheDocument();
    expect(screen.queryByText(/your mind\?/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe your event or ask for help…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start voice input" })).toBeInTheDocument();
    // No proposal exists yet, so nothing was created or loaded.
    expect(mockedCreateProposal).not.toHaveBeenCalled();
    expect(mockedGetConversation).not.toHaveBeenCalled();
  });

  test("transcribes voice into an editable draft without auto-submitting", async () => {
    class MockSpeechRecognition {
      static latest: MockSpeechRecognition;
      onstart: (() => void) | null = null;
      onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      continuous = false;
      interimResults = false;
      lang = '';
      start = jest.fn(() => this.onstart?.());
      // Chrome may deliver the final result and `onend` in the same turn.
      stop = jest.fn(() => {
        this.onresult?.({
          results: [{ 0: { transcript: "Plan a 300-person conference" } }],
        });
        this.onend?.();
      });
      abort = jest.fn();
      constructor() {
        MockSpeechRecognition.latest = this;
      }
    }
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });

    render(<AssistantWorkspacePage voiceInputEnabled />);
    fireEvent.click(await screen.findByRole("button", { name: "Start voice input" }));
    const recognition = MockSpeechRecognition.latest;
    expect(screen.getByRole("status", { name: "Voice input is listening" })).toBeInTheDocument();
    expect(screen.getByText("Ready when you are.")).toBeInTheDocument();

    act(() => {
      recognition.onresult?.({
        results: [{ 0: { transcript: "Plan a 300-person confer" } }],
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Finish voice input" }));
    expect(recognition.stop).toHaveBeenCalled();
    expect(screen.getByRole("status", { name: "Voice input is transcribing" })).toBeInTheDocument();
    expect(screen.getByText("Transcribing…")).toBeInTheDocument();
    const composer = await screen.findByLabelText(
      "Message the proposal assistant",
    ) as HTMLTextAreaElement;
    await waitFor(() => expect(composer)
      .toHaveValue("Plan a 300-person conference"));
    await waitFor(() => {
      expect(composer).toHaveFocus();
      expect(composer.selectionStart).toBe(composer.value.length);
      expect(composer.selectionEnd).toBe(composer.value.length);
    });
    expect(mockedCreateProposal).not.toHaveBeenCalled();
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("replaces Android cumulative interim hypotheses instead of duplicating them", async () => {
    type AndroidSpeechResult = {
      0: { transcript: string };
      isFinal?: boolean;
    };
    class MockSpeechRecognition {
      static latest: MockSpeechRecognition;
      onstart: (() => void) | null = null;
      onresult: ((event: {
        resultIndex?: number;
        results: ArrayLike<AndroidSpeechResult>;
      }) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      continuous = false;
      interimResults = false;
      lang = '';
      start = jest.fn(() => this.onstart?.());
      stop = jest.fn(() => this.onend?.());
      abort = jest.fn();
      constructor() {
        MockSpeechRecognition.latest = this;
      }
    }
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });

    render(<AssistantWorkspacePage voiceInputEnabled />);
    fireEvent.click(await screen.findByRole("button", { name: "Start voice input" }));
    act(() => {
      MockSpeechRecognition.latest.onresult?.({
        resultIndex: 0,
        results: [
          { 0: { transcript: "hello" }, isFinal: false },
          { 0: { transcript: "hello I" }, isFinal: false },
          { 0: { transcript: "hello I want" }, isFinal: false },
        ],
      });
      MockSpeechRecognition.latest.onresult?.({
        resultIndex: 2,
        results: [
          { 0: { transcript: "hello" }, isFinal: false },
          { 0: { transcript: "hello I" }, isFinal: false },
          {
            0: { transcript: "hello I want to create a proposal" },
            isFinal: false,
          },
        ],
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish voice input" }));

    await waitFor(() => expect(
      screen.getByLabelText("Message the proposal assistant"),
    ).toHaveValue("hello I want to create a proposal"));
    expect(mockedCreateProposal).not.toHaveBeenCalled();
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("joins finalized and updated interim speech without repeating overlap", () => {
    expect(speechTranscriptFromSegments([
      { transcript: "hello", isFinal: true },
      { transcript: "hello I want to create", isFinal: false },
      { transcript: "hello I want to create a proposal", isFinal: false },
    ])).toBe("hello I want to create a proposal");
    expect(speechTranscriptFromSegments([
      { transcript: "hello", isFinal: false },
      { transcript: "hello I want", isFinal: false },
      { transcript: "hello I want to create a proposal", isFinal: true },
    ])).toBe("hello I want to create a proposal");
  });

  test("cancels voice capture and restores the previous composer draft", async () => {
    class MockSpeechRecognition {
      static latest: MockSpeechRecognition;
      onstart: (() => void) | null = null;
      onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      continuous = false;
      interimResults = false;
      lang = '';
      start = jest.fn(() => this.onstart?.());
      stop = jest.fn();
      abort = jest.fn();
      constructor() {
        MockSpeechRecognition.latest = this;
      }
    }
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });

    render(<AssistantWorkspacePage voiceInputEnabled />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "Existing details" } });
    fireEvent.click(screen.getByRole("button", { name: "Start voice input" }));
    act(() => {
      MockSpeechRecognition.latest.onresult?.({
        results: [{ 0: { transcript: "discard this" } }],
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel voice input" }));

    expect(MockSpeechRecognition.latest.abort).toHaveBeenCalled();
    expect(screen.getByLabelText("Message the proposal assistant")).toHaveValue(
      "Existing details",
    );
  });

  test("keeps an incomplete voice transcript editable until the planner sends it", async () => {
    mockedGetConversation.mockResolvedValue(
      conversationWithGuidedQuestions([datePickerQuestion]),
    );
    class MockSpeechRecognition {
      static instances: MockSpeechRecognition[] = [];
      onstart: (() => void) | null = null;
      onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      continuous = false;
      interimResults = false;
      lang = '';
      start = jest.fn(() => this.onstart?.());
      stop = jest.fn(() => this.onend?.());
      abort = jest.fn();
      constructor() { MockSpeechRecognition.instances.push(this); }
    }
    Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: MockSpeechRecognition });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} voiceInputEnabled />);
    fireEvent.click(await screen.findByRole("button", { name: "Start voice input" }));
    act(() => MockSpeechRecognition.instances[0].onresult?.({
      results: [{ 0: { transcript: "Event date is 21 August 202" } }],
    }));
    fireEvent.click(screen.getByRole("button", { name: "Finish voice input" }));
    const composer = await screen.findByLabelText("Message the proposal assistant");
    expect(composer).toHaveValue("Event date is 21 August 202");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText(/21 August 2026/)).toBeInTheDocument();
    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(mockedPatchQuestion).not.toHaveBeenCalled();
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

  test("extracts a guided field value from an explicit typed instruction", () => {
    expect(
      fieldAnswerFromInstruction(
        eventNameQuestion,
        "Set the event name to Tech and Startup",
      ),
    ).toBe("Tech and Startup");
    expect(
      fieldAnswerFromInstruction(eventNameQuestion, "How is the proposal looking?"),
    ).toBeNull();
    expect(
      fieldAnswerFromInstruction(
        eventNameQuestion,
        "Uh the event name isAttack and startup",
      ),
    ).toBe("Attack and startup");
    expect(
      fieldAnswerFromInstruction(
        eventNameQuestion,
        "Feel please feel the event event called either event called name is take and startup",
      ),
    ).toBe("take and startup");
    const cityQuestion = guidedQuestion(
      "q-city",
      "Which city will host the event? Add the state for ambiguous city names.",
      "/content/venueSchedule/venueCity",
      "cost",
    );
    expect(
      fieldAnswerFromInstruction(cityQuestion, "The city name is new New York"),
    ).toBe("New York");
  });

  test("derives natural text labels from dynamic backend paths", () => {
    const cases = [
      ["/content/venueSchedule/venueName", "Which venue will host the event?", "Venue name is Creator Showcase", "Creator Showcase"],
      ["/content/venueSchedule/venueCity", "Which city will host the event?", "City is Dhaka", "Dhaka"],
      ["/content/venueSchedule/venueState", "Which state or region will host the event?", "Region is New York", "New York"],
      ["/content/venue/venueAccessRequirements", "Are there loading dock, freight elevator, security, parking, or access restrictions?", "Access restrictions are loading dock only", "loading dock only"],
    ] as const;
    for (const [path, prompt, instruction, expected] of cases) {
      expect(
        fieldAnswerFromInstruction(
          guidedQuestion(`q-${path}`, prompt, path, "cost"),
          instruction,
        ),
      ).toBe(expected);
    }
  });

  test("understands a venue value spoken before the frontend relationship", () => {
    const venueQuestion = guidedQuestion(
      "q-venue",
      "Which venue will host the event? Enter the venue name, or use Skip if it is still undecided.",
      "/content/venueSchedule/venueName",
      "cost",
    );
    expect(fieldAnswerFromInstruction(venueQuestion, "Data Path is host the event")).toBe("Data Path");
    expect(fieldAnswerFromInstruction(venueQuestion, "Data Path will host the event")).toBe("Data Path");
    expect(fieldAnswerFromInstruction(venueQuestion, "The event will be at Data Path")).toBe("Data Path");
  });

  test("builds one frontend-label and backend-model contract for every control type", () => {
    const questions = [
      eventNameQuestion,
      datePickerQuestion,
      loadInTimePickerQuestion,
      combinedLoadInQuestion,
      formatQuestion,
      roomsQuestion,
    ];
    for (const question of questions) {
      const contract = questionFieldContract(question);
      expect(contract.modelPath).toEqual(question.paths);
      expect(contract.modelName).toBe(question.paths.at(-1)?.split('/').at(-1));
      expect(contract.label).not.toBe('');
      expect(contract.prompt).toBe(question.prompt);
      expect(contract.answerType).toBe(question.answerType);
      expect(contract.options).toEqual(question.options);
      expect(contract.aliases.length).toBeGreaterThan(0);
    }
  });

  test("builds hints dynamically from answer types and backend options", () => {
    expect(questionAnswerHint(formatQuestion)).toContain("In-Person, Hybrid, Virtual");
    expect(questionAnswerHint(combinedLoadInQuestion)).toContain("20 August 2026 at 3 PM");
    expect(questionAnswerHint(datePickerQuestion)).toContain("tomorrow");
    expect(questionAnswerHint(loadInTimePickerQuestion)).toContain("15:00");
    expect(questionAnswerHint(roomsQuestion)).toContain("three hundred");
    expect(questionAnswerHint(eventNameQuestion)).toContain("Event name is");
  });

  test("accepts concise relative text answers but keeps assistant commands as chat", () => {
    const cityQuestion = guidedQuestion(
      "q-city",
      "Which city will host the event?",
      "/content/venueSchedule/venueCity",
      "cost",
    );
    expect(fieldAnswerFromInstruction(cityQuestion, "Dhaka")).toBe("Dhaka");
    expect(fieldAnswerFromInstruction(cityQuestion, "New York, NY")).toBe("New York, NY");
    expect(fieldAnswerFromInstruction(cityQuestion, "Plan a hybrid summit")).toBeNull();
    expect(fieldAnswerFromInstruction(cityQuestion, "Check readiness")).toBeNull();
  });

  test("shows contextual help without answering, skipping, or chatting", async () => {
    mockedGetConversation.mockResolvedValue(
      conversationWithGuidedQuestions([formatQuestion]),
    );
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "How should I answer this?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText(/In-Person, Hybrid, Virtual/)).toBeInTheDocument();
    expect(mockedPatchQuestion).not.toHaveBeenCalled();
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("maps every visible proposal workspace action from natural commands", () => {
    const cases = [
      ["Generate proposal draft", "generate_draft"],
      ["Regenerate draft", "generate_draft"],
      ["Edit all details", "edit_details"],
      ["Run readiness check", "readiness"],
      ["Show investment guidance", "investment"],
      ["Download sample sheet", "download_sample"],
      ["Open room specifications and upload", "open_room_specifications"],
      ["Use what I've told you", "use_messages"],
      ["Extract requirements", "extract_requirements"],
      ["What can I say now?", "show_actions"],
    ] as const;
    for (const [instruction, action] of cases) {
      expect(proposalWorkspaceActionFromInstruction(instruction)).toBe(action);
    }
    expect(proposalWorkspaceActionFromInstruction("Can you improve the wording?"))
      .toBeNull();
  });

  test("recognizes natural spoken ways to skip the active question", () => {
    const instructions = [
      "Skip",
      "skip it",
      "skip now",
      "please skip this question",
      "I want to skib",
      "I want to skip it",
      "I'd like to skip this one",
      "let's skip",
      "can you please skip it now",
      "okay, just pass this for now",
      "go to the next question",
      "move on",
      "next please",
    ];

    for (const instruction of instructions) {
      expect(isSkipQuestionInstruction(instruction)).toBe(true);
    }
  });

  test("does not skip when skip is negated or only mentioned in an answer", () => {
    const instructions = [
      "don't skip this",
      "I do not want to skip",
      "can you not skip it",
      "never skip this question",
      "the venue has a skip loading dock",
      "what does skip mean?",
      "I skipped this last year",
    ];

    for (const instruction of instructions) {
      expect(isSkipQuestionInstruction(instruction)).toBe(false);
    }
  });

  test("shows final action hints without posting an assistant chat message", async () => {
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "What can I say now?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText(/Generate draft[\s\S]*Edit all details/)).toBeInTheDocument();
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("prefers the visible frontend wording when it differs from the backend model name", () => {
    const mismatchedQuestion = guidedQuestion(
      "q-location-code",
      "Which city will host the event?",
      "/content/internal/locationCode",
      "cost",
    );
    expect(questionFieldContract(mismatchedQuestion).aliases).toContain("city");
    expect(
      fieldAnswerFromInstruction(mismatchedQuestion, "City is Dhaka"),
    ).toBe("Dhaka");
  });

  test("normalizes natural spoken dates for the active date question", () => {
    expect(naturalDateToIso("Date is 16 August 2026")).toBe("2026-08-16");
    expect(naturalDateToIso("August 16, 2026")).toBe("2026-08-16");
    expect(naturalDateToIso("16th August 2026")).toBe("2026-08-16");
    expect(naturalDateToIso("31 February 2026")).toBeNull();
    expect(naturalDateToIso("Date is 21 August")).toBe(
      `${new Date().getFullYear()}-08-21`,
    );
    expect(naturalDateToIso("Event in that is 21 August 202")).toBeNull();
    expect(naturalDateToIso("The date is 2026 August 21")).toBe("2026-08-21");
    expect(naturalDateToIso("2026/8/21")).toBe("2026-08-21");
    expect(naturalDateToIso("21/08/2026")).toBe("2026-08-21");
    expect(naturalDateToIso("08/09/2026")).toBeNull();
    expect(naturalDateToIso("tomorrow", new Date(2026, 7, 13))).toBe("2026-08-14");
    expect(
      fieldAnswerFromInstruction(datePickerQuestion, "Date is 16 August 2026"),
    ).toBe("2026-08-16");
  });

  test("asks for a clipped spoken year instead of sending or applying a fallback", async () => {
    mockedGetConversation.mockResolvedValue(
      conversationWithGuidedQuestions([datePickerQuestion]),
    );

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, {
      target: { value: "Event in that is 21 August 202" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(
      await screen.findByText(/not a complete valid date/i),
    ).toBeInTheDocument();
    expect(composer).toHaveValue("Event in that is 21 August 202");
    expect(mockedPatchQuestion).not.toHaveBeenCalled();
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("normalizes natural time, choice, number, and combined voice answers", () => {
    expect(naturalTimeTo24Hour("Load in is at 7:30 PM")).toBe("19:30");
    expect(naturalTimeTo24Hour("Time is 07:30")).toBe("07:30");
    expect(naturalTimeTo24Hour("at noon")).toBe("12:00");
    expect(naturalTimeTo24Hour("midnight")).toBe("00:00");
    expect(
      fieldAnswerFromInstruction(formatQuestion, "The event is hybrid"),
    ).toBe("Hybrid");
    expect(
      fieldAnswerFromInstruction(formatQuestion, "The event will be in person"),
    ).toBe("In-Person");
    expect(
      fieldAnswerFromInstruction(roomsQuestion, "We need 6 event rooms"),
    ).toBe("6");
    expect(fieldAnswerFromInstruction(roomsQuestion, "six rooms")).toBe("6");
    expect(
      fieldAnswerFromInstruction(
        guidedQuestion("q-attendees", "How many attendees?", "/content/event/attendees", "cost", { answerType: "number" }),
        "around three hundred attendees",
      ),
    ).toBe("300");
    expect(
      fieldAnswerFromInstruction(
        combinedLoadInQuestion,
        "Load in is 16 August 2026 at 7:30 PM",
      ),
    ).toEqual({ date: "2026-08-16", time: "19:30" });
    expect(
      fieldAnswerFromInstruction(
        combinedLoadInQuestion,
        "Production load in 20 in August 2026At 3 pm",
      ),
    ).toEqual({ date: "2026-08-20", time: "15:00" });
    expect(
      fieldAnswerFromInstruction(
        combinedLoadInQuestion,
        "Production load in 2019 August 2026At 3 pm",
      ),
    ).toBeNull();
  });

  test("keeps a garbled load-in date-time out of chat and asks for a precise retry", async () => {
    mockedGetConversation.mockResolvedValue(
      conversationWithGuidedQuestions([combinedLoadInQuestion]),
    );
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, {
      target: { value: "Uh the date and timeProduction load in 2019 August 2026At 3 pm" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText(/Load-in is 20 August 2026 at 3 PM/)).toBeInTheDocument();
    expect(composer).toHaveValue("Uh the date and timeProduction load in 2019 August 2026At 3 pm");
    expect(mockedPatchQuestion).not.toHaveBeenCalled();
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("uses backend choice options for a targeted clarification", async () => {
    mockedGetConversation.mockResolvedValue(
      conversationWithGuidedQuestions([formatQuestion]),
    );
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "at the venue" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText(/In-Person, Hybrid, Virtual/)).toBeInTheDocument();
    expect(mockedPatchQuestion).not.toHaveBeenCalled();
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("accepts concise yes or no for an active frontend yes-no text question", () => {
    const accessQuestion = guidedQuestion(
      "q-access",
      "Are there loading dock, freight elevator, security, parking, or access restrictions?",
      "/content/venue/venueAccessRequirements",
      "production",
    );
    expect(fieldAnswerFromInstruction(accessQuestion, "Yes")).toBe("Yes");
    expect(fieldAnswerFromInstruction(accessQuestion, "no")).toBe("No");
    expect(fieldAnswerFromInstruction(accessQuestion, "none")).toBe("None");
    expect(fieldAnswerFromInstruction(accessQuestion, "not sure")).toBe("Not Sure");
  });

  test("treats a voice-style skip phrase as the guided action instead of an assistant chat message", async () => {
    const accessQuestion = guidedQuestion(
      "q-access",
      "Are there loading dock, freight elevator, security, parking, or access restrictions?",
      "/content/venue/venueAccessRequirements",
      "production",
    );
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([accessQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-access", status: "dismissed", answeredMessageId: null, appliedField: null },
    });
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "I want to skib" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-access",
      { status: "dismissed" },
    ));
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("applies standalone yes through the active guided question", async () => {
    const accessQuestion = guidedQuestion(
      "q-access",
      "Are there loading dock, freight elevator, security, parking, or access restrictions?",
      "/content/venue/venueAccessRequirements",
      "production",
    );
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([accessQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-access", status: "answered", answeredMessageId: null, appliedField: null },
    });
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "Yes" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-access",
      { status: "answered", answer: "Yes" },
    ));
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("resolves multiple explicitly labeled fields from one natural instruction", () => {
    expect(
      mentionedFieldAnswers(
        [datePickerQuestion, endDatePickerQuestion, formatQuestion],
        "Start is 21 August 2026, end is 23 August 2026, event format is in person",
      ).map(({ question, answer }) => [question.id, answer]),
    ).toEqual([
      ["q-start", "2026-08-21"],
      ["q-end", "2026-08-23"],
      ["q-format", "In-Person"],
    ]);
  });

  test("resolves an unlabeled natural event brief from the live question contracts", () => {
    const eventTypeQuestion = guidedQuestion(
      "q-type",
      "What type of event is this?",
      "/content/event/eventType",
      "scope",
      { answerType: "choice", options: ["Corporate Conference", "Trade Show", "Fundraiser"] },
    );
    const venueQuestion = guidedQuestion(
      "q-venue",
      "Which venue will host the event?",
      "/content/venueSchedule/venueName",
      "cost",
    );
    const cityQuestion = guidedQuestion(
      "q-city",
      "Which city will host the event?",
      "/content/venueSchedule/venueCity",
      "cost",
    );
    const attendeesQuestion = guidedQuestion(
      "q-attendees",
      "How many in-person attendees are expected?",
      "/content/event/attendees",
      "cost",
      { answerType: "number" },
    );
    expect(
      mentionedFieldAnswers(
        [eventNameQuestion, datePickerQuestion, endDatePickerQuestion, formatQuestion, eventTypeQuestion, venueQuestion, cityQuestion, attendeesQuestion],
        "The event is Horizon Tech Summit, an in-person corporate conference at Javits Center in New York, from 21 August 2026 to 22 August 2026, with 300 attendees.",
      ).map(({ question, answer }) => [question.id, answer]),
    ).toEqual([
      ["q-event-name", "Horizon Tech Summit"],
      ["q-start", "2026-08-21"],
      ["q-end", "2026-08-22"],
      ["q-format", "In-Person"],
      ["q-type", "Corporate Conference"],
      ["q-venue", "Javits Center"],
      ["q-city", "New York"],
      ["q-attendees", "300"],
    ]);
  });

  test("applies a typed field instruction through the current guided question", async () => {
    mockedGetConversation.mockResolvedValue(
      conversationWithGuidedQuestions([eventNameQuestion]),
    );
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        id: "q-event-name",
        status: "answered",
        answeredMessageId: null,
        appliedField: {
          path: "/content/event/eventName",
          mongoPath: "event.eventName",
          value: "Tech and Startup",
        },
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, {
      target: { value: "Event name is Tech and Startup" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() =>
      expect(mockedPatchQuestion).toHaveBeenCalledWith(
        PROPOSAL_ID,
        "q-event-name",
        { status: "answered", answer: "Tech and Startup" },
      ),
    );
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("applies the natural city-name wording shown in the guided flow", async () => {
    const cityQuestion = guidedQuestion(
      "q-city",
      "Which city will host the event? Add the state for ambiguous city names.",
      "/content/venueSchedule/venueCity",
      "cost",
    );
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([cityQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-city", status: "answered", answeredMessageId: null, appliedField: null },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "The city name is new New York" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-city",
      { status: "answered", answer: "New York" },
    ));
    expect(mockedPostMessage).not.toHaveBeenCalled();
  });

  test("applies the screenshot venue wording through the full guided flow", async () => {
    const venueQuestion = guidedQuestion(
      "q-venue",
      "Which venue will host the event? Enter the venue name, or use Skip if it is still undecided.",
      "/content/venueSchedule/venueName",
      "cost",
    );
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([venueQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-venue", status: "answered", answeredMessageId: null, appliedField: null },
    });
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "Data Path is host the event" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-venue",
      { status: "answered", answer: "Data Path" },
    ));
    expect(mockedPostMessage).not.toHaveBeenCalled();
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

    const guidedLabel = await screen.findByText("Guided question 1");
    expect(guidedLabel).toBeInTheDocument();
    const guidedCard = guidedLabel.parentElement?.parentElement;
    expect(guidedCard).toHaveClass(
      "my-2",
      "rounded-2xl",
      "border",
      "p-4",
    );
    expect(screen.getByText("When does the event start? (YYYY-MM-DD)")).toBeInTheDocument();
    expect(screen.getByText("affects schedule")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer this question")).toHaveClass(
      "col-span-2",
      "w-full",
      "sm:basis-48",
    );
    expect(screen.getByRole("button", { name: "Answer" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
    expect(screen.getByRole("button", { name: "Skip" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
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

  test("production load-in uses one card with coordinated date and time controls", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([combinedLoadInQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        id: "q-load-in-combined",
        status: "answered",
        answeredMessageId: null,
        appliedField: { path: "/content/venueSchedule/loadInDate", mongoPath: "venueSchedule.loadInDate", value: "2026-09-01" },
        appliedFields: [
          { path: "/content/venueSchedule/loadInDate", mongoPath: "venueSchedule.loadInDate", value: "2026-09-01" },
          { path: "/content/venueSchedule/loadInTime", mongoPath: "venueSchedule.loadInTime", value: "07:30" },
        ],
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("What date and time can production load-in?");
    const dateInput = screen.getByLabelText("Answer this question");
    const timeInput = screen.getByLabelText("Load-in time");
    expect(dateInput).toHaveAttribute("placeholder", "YYYY-MM-DD");
    expect(timeInput).toHaveAttribute("type", "time");
    expect(screen.getByRole("button", { name: "Answer" })).toBeDisabled();

    fireEvent.change(dateInput, { target: { value: "2026-09-01" } });
    fireEvent.input(timeInput, { target: { value: "07:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-load-in-combined",
      { status: "answered", answer: { date: "2026-09-01", time: "07:30" } },
    ));
    expect(await screen.findByText("Production load-in: 2026-09-01 at 07:30 ✓")).toBeInTheDocument();
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

  test("a guided question stays hidden while source extraction is pending, showing a reading state instead", async () => {
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: conversationWithQuestion.data.conversation,
        messages: [...conversationWithQuestion.data.messages, proposalContextMessage("pending")],
        questions: [guidedQuestion("q-name", "What is this event called?", "/content/event/eventName", "scope")],
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    // The persisted extraction-in-progress state is visible...
    expect(await screen.findByText(/Extracting requirements…/)).toBeInTheDocument();
    // ...and so is the dedicated "waiting to ask" placeholder in the question's slot...
    expect(screen.getByText(/Reading your sources before asking the next question/)).toBeInTheDocument();
    // ...but the guided question control itself is not, even though it is open.
    expect(screen.queryByText("Guided question 1")).not.toBeInTheDocument();
    expect(screen.queryByText("What is this event called?")).not.toBeInTheDocument();
    // Normal conversation content is not hidden by the pending extraction.
    expect(screen.getByText("Please review the venue requirements.")).toBeInTheDocument();
  });

  test("a guided question appears with its extracted suggestion once extraction finishes", async () => {
    jest.useFakeTimers();
    try {
      const withoutSuggestion = guidedQuestion("q-name", "What is this event called?", "/content/event/eventName", "scope");
      const withSuggestion = guidedQuestion("q-name", "What is this event called?", "/content/event/eventName", "scope", {
        suggestedAnswer: "Northstar Leadership Summit 2026",
      });
      mockedGetConversation
        .mockResolvedValueOnce({
          success: true,
          correlationId: "test-correlation",
          data: {
            conversation: conversationWithQuestion.data.conversation,
            messages: [...conversationWithQuestion.data.messages, proposalContextMessage("pending")],
            questions: [withoutSuggestion],
          },
        })
        .mockResolvedValue({
          success: true,
          correlationId: "test-correlation",
          data: {
            conversation: conversationWithQuestion.data.conversation,
            messages: [...conversationWithQuestion.data.messages, proposalContextMessage("complete")],
            questions: [withSuggestion],
          },
        });
      mockedGetProposalContext.mockResolvedValue({
        success: true,
        correlationId: "test-correlation",
        data: { run: { id: "run-ctx-1", model: "gpt-test" }, evidence: [], operations: [] },
      } as never);

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      expect(await screen.findByText(/Extracting requirements…/)).toBeInTheDocument();
      expect(screen.queryByText("Guided question 1")).not.toBeInTheDocument();

      // The pending message keeps the poll interval fast (1s), so the next
      // poll lands the completed run and the now-suggested question without
      // any remount — the same clarification-question row/id stays open the
      // whole time.
      await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });

      expect(await screen.findByText("Guided question 1")).toBeInTheDocument();
      expect(screen.getByText("What is this event called?")).toBeInTheDocument();
      expect(screen.getByLabelText("Answer this question")).toHaveValue("Northstar Leadership Summit 2026");
      expect(screen.getByText("Pre-filled from your message — confirm or edit.")).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test("an extraction failure holds guided questions until the planner explicitly continues", async () => {
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: conversationWithQuestion.data.conversation,
        messages: [...conversationWithQuestion.data.messages, proposalContextMessage("failed")],
        questions: [guidedQuestion("q-name", "What is this event called?", "/content/event/eventName", "scope")],
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText("Requirement extraction did not finish. Try again.")).toBeInTheDocument();
    expect(screen.queryByText("Guided question 1")).not.toBeInTheDocument();
    expect(screen.queryByText("What is this event called?")).not.toBeInTheDocument();
    expect(screen.queryByText(/Reading your sources before asking the next question/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue without extraction" }));
    expect(await screen.findByText("Guided question 1")).toBeInTheDocument();
    expect(screen.getByText("What is this event called?")).toBeInTheDocument();
  });

  test("a late-arriving suggestion does not overwrite an answer the planner already typed", async () => {
    jest.useFakeTimers();
    try {
      const withoutSuggestion = guidedQuestion("q-name", "What is this event called?", "/content/event/eventName", "scope");
      const withSuggestion = guidedQuestion("q-name", "What is this event called?", "/content/event/eventName", "scope", {
        suggestedAnswer: "Northstar Leadership Summit 2026",
      });
      mockedGetConversation
        .mockResolvedValueOnce(conversationWithGuidedQuestions([withoutSuggestion]))
        .mockResolvedValue(conversationWithGuidedQuestions([withSuggestion]));

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await screen.findByText("Guided question 1");

      const input = screen.getByLabelText("Answer this question");
      fireEvent.change(input, { target: { value: "My Own Event Name" } });
      expect(input).toHaveValue("My Own Event Name");

      // No message is pending, so this is the slow (10s) poll interval.
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

      expect(screen.getByLabelText("Answer this question")).toHaveValue("My Own Event Name");
      expect(screen.queryByText("Pre-filled from your message — confirm or edit.")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test("a conversation update refreshes the proposal only once", async () => {
    jest.useFakeTimers();
    try {
      mockedGetConversation
        .mockResolvedValueOnce(conversationWithGuidedQuestions([startDateQuestion]))
        .mockResolvedValue({
          ...conversationWithGuidedQuestions([startDateQuestion]),
          data: {
            ...conversationWithGuidedQuestions([startDateQuestion]).data,
            conversation: {
              ...conversationWithGuidedQuestions([startDateQuestion]).data.conversation,
              updatedAt: "2026-07-21T10:01:00.000Z",
            },
          },
        });
      mockedGetProposal.mockResolvedValue({
        success: true,
        message: "ok",
        data: { _id: PROPOSAL_ID, version: 7, event: { eventName: "Northstar" } },
      });

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await screen.findByText("Guided question 1");
      await waitFor(() => expect(mockedGetProposal).toHaveBeenCalledTimes(1));

      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

      await waitFor(() => expect(mockedGetProposal).toHaveBeenCalledTimes(2));
    } finally {
      jest.useRealTimers();
    }
  });

  test("a late-arriving date suggestion does not overwrite a date the planner already picked", async () => {
    jest.useFakeTimers();
    try {
      const withoutSuggestion = guidedQuestion("q-start", "When does the event start? (YYYY-MM-DD)", "/content/event/startDate", "schedule", { answerType: "date" });
      const withSuggestion = guidedQuestion("q-start", "When does the event start? (YYYY-MM-DD)", "/content/event/startDate", "schedule", {
        answerType: "date",
        suggestedAnswer: "2026-09-14",
      });
      mockedGetConversation
        .mockResolvedValueOnce(conversationWithGuidedQuestions([withoutSuggestion]))
        .mockResolvedValue(conversationWithGuidedQuestions([withSuggestion]));

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await screen.findByText("Guided question 1");

      const input = screen.getByLabelText("Answer this question");
      fireEvent.change(input, { target: { value: "2026-09-20" } });
      expect(input).toHaveValue("2026-09-20");

      // No message is pending, so this is the slow (10s) poll interval — the
      // extraction-derived "2026-09-14" suggestion lands on this refresh.
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

      expect(screen.getByLabelText("Answer this question")).toHaveValue("2026-09-20");
      expect(screen.queryByText("Pre-filled from your message — confirm or edit.")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test("a conversation-only proposal (no attachments) shows guided questions immediately", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([startDateQuestion]));
    mockedListSources.mockResolvedValue({ success: true, data: [], correlationId: "test-correlation" });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText("Guided question 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer this question")).toBeInTheDocument();
    expect(screen.queryByText(/Reading your sources before asking the next question/)).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Generate proposal draft" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
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

  test("a failed extraction keeps guided questions hidden and retries the same attached sources", async () => {
    const requestMessage = {
      id: "msg-extract-request", ordinal: 1, role: "user" as const, kind: "action_request" as const,
      content: "Extract the requirements from the selected sources.", intent: "extract_requirements",
      runType: null, runId: null, jobId: null, status: "complete" as const,
      createdAt: "2026-07-21T10:00:00.000Z",
      attachments: [{ sourceId: "src-existing", role: "primary", filename: "event-brief.txt", sourceStatus: "ready" }],
    };
    const failedRun = { ...proposalContextMessage("failed"), ordinal: 2 };
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 2, updatedAt: "2026-07-21T10:01:00.000Z" },
        capabilities: { conversationExtraction: true },
        messages: [requestMessage, failedRun],
        questions: [startDateQuestion],
      },
    });
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "retry-correlation",
      data: { created: true, message: null, assistantMessageId: "msg-retry", run: { runType: "proposal_context", runId: "run-retry", jobId: "job-retry" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText("Requirement extraction did not finish. Try again.")).toBeInTheDocument();
    expect(screen.queryByText(startDateQuestion.prompt)).not.toBeInTheDocument();
    expect(sourceIdsForFailedExtraction([requestMessage, failedRun], failedRun)).toEqual(["src-existing"]);

    fireEvent.click(screen.getByRole("button", { name: "Retry extraction" }));
    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "Extract the requirements from the selected sources.", intent: "extract_requirements", sourceIds: ["src-existing"] },
      expect.any(String),
    ));
  });

  test("a planner can explicitly continue to guided questions after extraction fails", async () => {
    const requestMessage = {
      id: "msg-extract-request", ordinal: 1, role: "user" as const, kind: "action_request" as const,
      content: "Extract the requirements from the selected sources.", intent: "extract_requirements",
      runType: null, runId: null, jobId: null, status: "complete" as const,
      createdAt: "2026-07-21T10:00:00.000Z",
      attachments: [{ sourceId: "src-existing", role: "primary", filename: "event-brief.txt", sourceStatus: "ready" }],
    };
    const failedRun = { ...proposalContextMessage("failed"), ordinal: 2 };
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 2, updatedAt: "2026-07-21T10:01:00.000Z" },
        capabilities: { conversationExtraction: true },
        messages: [requestMessage, failedRun],
        questions: [startDateQuestion],
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue without extraction" }));

    expect(await screen.findByText(startDateQuestion.prompt)).toBeInTheDocument();
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
    expect(screen.getAllByText("AI workspace")).toHaveLength(2);
    const toolsToggle = screen.getByLabelText("Toggle AI workspace tools");
    expect(toolsToggle).toHaveAttribute("aria-expanded", "false");
    const toolsPanel = screen.getByLabelText("Proposal assistant tools");
    expect(toolsPanel).toHaveClass("hidden", "xl:flex", "overflow-hidden");
    fireEvent.click(toolsToggle);
    expect(toolsToggle).toHaveAttribute("aria-expanded", "true");
    expect(toolsPanel).toHaveClass("flex");
    expect(
      screen.getByTestId("proposal-conversation-scroll"),
    ).toHaveClass("px-4", "md:-mr-3", "md:px-0", "md:pr-4");
    expect(
      screen.getByTestId("proposal-assistant-tools-scroll"),
    ).toHaveClass(
      "overflow-x-hidden",
      "overflow-y-auto",
      "pr-1",
      "xl:-mr-1",
      "xl:pr-2",
      "[scrollbar-gutter:stable]",
    );
    expect(screen.getByText("Suggested tasks")).toBeInTheDocument();
    expect(screen.getByText("Suggested questions")).toBeInTheDocument();
  });

  test("right rail stays mounted while a created proposal is waiting for its first persisted message", async () => {
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: {
          id: "conv-1",
          title: "Proposal assistant",
          status: "active",
          messageCount: 0,
          updatedAt: "2026-07-21T10:00:00.000Z",
        },
        messages: [],
        questions: [],
      },
    } as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByLabelText("Proposal assistant tools")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ready to help" })).toBeInTheDocument();
  });

  test("sends once on a rapid double-click", async () => {
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 0, updatedAt: "2026-07-21T10:00:00.000Z" },
        messages: [],
        questions: [],
      },
    } as never);
    let finishSend: ((value: unknown) => void) | undefined;
    mockedPostMessage.mockImplementationOnce(
      () => new Promise((resolve) => { finishSend = resolve; }) as never,
    );

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "I want to create a proposal" } });
    const sendButton = screen.getByRole("button", { name: "Send message" });
    fireEvent.click(sendButton);
    expect(sendButton).toBeDisabled();
    expect(sendButton).toHaveAttribute("aria-busy", "true");
    fireEvent.click(sendButton);

    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledTimes(1));
    await act(async () => {
      finishSend?.({ success: true, correlationId: "test-correlation", data: { created: true, message: null, assistantMessageId: null, run: null } });
    });
  });

  test("Enter sends while Shift+Enter keeps editing", async () => {
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 0, updatedAt: "2026-07-21T10:00:00.000Z" },
        messages: [],
        questions: [],
      },
    } as never);
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: null },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "First line" } });
    fireEvent.keyDown(composer, { key: "Enter", code: "Enter", shiftKey: true });
    expect(mockedPostMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(composer, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledTimes(1));
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

  test("keeps the mobile composer on one compact line without shrinking its controls", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const composer = await screen.findByLabelText(
      "Message the proposal assistant",
    );
    expect(composer).toHaveClass(
      "max-h-40",
      "max-sm:!h-9",
      "max-sm:!max-h-9",
      "max-sm:overflow-y-hidden",
      "max-sm:whitespace-nowrap",
      "max-sm:text-[11px]",
    );
    expect(screen.getByRole("button", { name: "Send message" })).toHaveClass(
      "h-10",
      "w-10",
      "shrink-0",
    );
    expect(
      screen.getByRole("region", { name: "Proposal assistant workspace" }),
    ).toHaveClass(
      "md:h-[calc(100svh-18rem)]",
      "md:max-h-[calc(100svh-18rem)]",
      "lg:h-[calc(100svh-10rem)]",
    );
  });

  test("shows a meaningful desktop breadcrumb before the proposal is created", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);

    render(<AssistantWorkspacePage />);

    expect(
      screen.getByRole("link", { name: "Back to all proposals" }),
    ).toHaveAttribute("href", "/proposals");
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toHaveTextContent(/All proposals\s*\/\s*New proposal/);
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
    expect(screen.queryByText("Guided question 1")).not.toBeInTheDocument();
    expect(screen.queryByText("What is the event date?")).not.toBeInTheDocument();
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

  // Legacy standalone recording data is intentionally present to prove the
  // retired section cannot leak into the active captured-details overview.
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
    expect(screen.queryByText("Yes — 4 cameras")).not.toBeInTheDocument();
    expect(screen.queryByText("Video recording")).not.toBeInTheDocument();
    expect(screen.getByText("15 Aug 2026")).toBeInTheDocument();
    // isUnionVenue is "NO", so no union row.
    expect(screen.queryByText("Union venue")).not.toBeInTheDocument();
    expect(screen.getByText("9 details captured from your sources.")).toBeInTheDocument();
    // Extraction output stays read-only and links to the explicit review.
    expect(screen.getByText(/need your explicit review/)).toBeInTheDocument();
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

  test("Generate draft command invokes the same version-safe action without posting chat", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun([]));
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal.mockResolvedValue(capturedProposal);
    mockedGetLatestContext.mockResolvedValue({ success: true, correlationId: "test-correlation", data: { run: { id: "run-1" } } } as never);
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
    const composer = await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(composer, { target: { value: "Generate draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "Generate a proposal draft from the current information.", intent: "generate_draft", expectedProposalVersion: 9 },
      expect.any(String),
    ));
    expect(mockedPostMessage).not.toHaveBeenCalledWith(
      PROPOSAL_ID,
      expect.objectContaining({ content: "Generate draft", intent: "chat" }),
      expect.any(String),
    );
  });

  test("the overview sends extracted suggestions to explicit review without applying them", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun());
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal.mockResolvedValue(capturedProposal);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByText(/details captured from your sources/)).toBeInTheDocument();
    expect(screen.getByText(/need your explicit review/)).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "Proposal draft ready" })).toBeInTheDocument();
    expect(screen.getByLabelText("Proposal draft preview")).toBeInTheDocument();
    expect(screen.getByText("1 section")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review & edit draft" }))
      .toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`);
    expect(screen.getByRole("link", { name: "Review & edit draft" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
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

  test("a readiness card hides every finding that touches standalone recording data", async () => {
    const reportWithRetiredRecording = {
      ...guidanceReport,
      findings: [
        {
          code: "RETIRED_ONLY",
          severity: "blocking" as const,
          category: "production" as const,
          message: "RETIRED_ONLY_MESSAGE",
          paths: ["/content/videoRecordingStep/deliveryMethod"],
        },
        {
          code: "RETIRED_MIXED",
          severity: "warning" as const,
          category: "production" as const,
          message: "RETIRED_MIXED_MESSAGE",
          paths: [
            "/content/videoRecording/required",
            "/content/roomByRoom/rooms/0/videoRecording/required",
          ],
        },
        {
          code: "ROOM_ONLY",
          severity: "warning" as const,
          category: "production" as const,
          message: "ROOM_ONLY_RECORDING_MESSAGE",
          paths: [
            "/content/roomByRoom/rooms/0/videoRecording/required",
          ],
        },
      ],
      findingCount: 3,
      blockingCount: 1,
    };
    (
      getLatestGuidanceAction as jest.MockedFunction<
        typeof getLatestGuidanceAction
      >
    ).mockResolvedValueOnce({
      success: true,
      data: reportWithRetiredRecording,
    });
    mockedGetConversation.mockResolvedValue(conversationWithDraft([]));

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(
      await screen.findByText("ROOM_ONLY_RECORDING_MESSAGE"),
    ).toBeInTheDocument();
    expect(screen.queryByText("RETIRED_ONLY_MESSAGE")).not.toBeInTheDocument();
    expect(screen.queryByText("RETIRED_MIXED_MESSAGE")).not.toBeInTheDocument();
    expect(
      screen.getByText("1 finding — 0 blocking, 1 worth reviewing."),
    ).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Regenerate draft" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
    expect(screen.queryByRole("button", { name: "Generate proposal draft" })).not.toBeInTheDocument();
    // Draft and proposal are on the same version, so nothing is stale.
    expect(screen.queryByText(STALE_HINT)).not.toBeInTheDocument();
  });

  test("regenerating creates an accessible progress card at the bottom of the active workflow", async () => {
    let resolvePost: (value: unknown) => void = () => undefined;
    mockedGetConversation.mockResolvedValue(conversationWithDraft([]));
    mockedGetDraft.mockResolvedValue(draftRun(5));
    mockedGetProposal.mockResolvedValue(proposalAtVersion(7));
    mockedPostMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve as (value: unknown) => void;
        }) as never,
    );

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Regenerate draft" }),
    );

    const progress = await screen.findByTestId("draft-progress-card");
    expect(progress).toHaveAttribute(
      "aria-label",
      "Updating your proposal draft",
    );
    expect(progress).toHaveTextContent("Using your latest proposal details and answers");
    expect(screen.queryByText("The assistant is responding")).not.toBeInTheDocument();
    expect(screen.queryByText("Generate a proposal draft from the current information.")).not.toBeInTheDocument();

    expect(progress.closest("li")).toBe(
      progress.closest("ol")?.lastElementChild,
    );

    await act(async () => {
      resolvePost({
        success: true,
        correlationId: "test-correlation",
        data: {
          created: true,
          message: null,
          assistantMessageId: null,
          run: {
            runType: "proposal_draft",
            runId: "run-3",
            jobId: "job-3",
          },
        },
      });
    });
  });

  test("a regenerated draft is current and older drafts collapse into history", async () => {
    const updatedDraftMessage = {
      ...draftMessage,
      id: "msg-draft-updated",
      ordinal: 3,
      content: "I updated your draft using the latest proposal details.",
      runId: "run-3",
      jobId: "job-3",
      createdAt: "2026-07-21T10:10:00.000Z",
    };
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: {
          id: "conv-1",
          title: "Proposal assistant",
          status: "active",
          messageCount: 3,
          updatedAt: "2026-07-21T10:10:00.000Z",
        },
        capabilities: { conversationExtraction: true },
        messages: [
          ...conversationWithQuestion.data.messages,
          draftMessage,
          updatedDraftMessage,
        ],
        questions: [],
      },
    } as never);
    mockedGetDraft.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        run: {
          id: "run-3",
          model: "gpt-test",
          expected_proposal_version: 7,
        },
        sections: [],
        gaps: [],
        regenerations: [],
        proposalMutation: false,
      },
    } as never);
    mockedGetProposal.mockResolvedValue(proposalAtVersion(7));

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(
      await screen.findByRole("heading", {
        name: "Updated proposal draft ready",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Current draft")).toBeInTheDocument();
    expect(screen.getByText("Previous proposal draft")).toBeInTheDocument();
    expect(screen.getByText("Superseded")).toBeInTheDocument();
    expect(screen.getByText("I updated your draft using the latest proposal details.")).toBeInTheDocument();
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

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { formatAppDate } from "@/lib/dateFormat";
import { AUTO_EXTRACT_RETRY_DELAY_MS, autoExtractKey } from "./useConversation";
import AssistantWorkspacePage, { displayQuestionPrompt, fieldAnswerFromInstruction, isBeforeLocalToday, isSkipQuestionInstruction, maximumDateForQuestion, mentionedFieldAnswers, minimumDateForQuestion, naturalDateToIso, naturalTimeTo24Hour, PROPOSAL_MESSAGE_MAX_CHARACTERS, proposalWorkspaceActionFromInstruction, questionAnswerHint, questionFieldContract, sourceIdsForFailedExtraction, speechTranscriptFromSegments, visibleRunMessages } from "./AssistantWorkspacePage";
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
import { getAiAvailabilityAction } from "@/app/actions/aiAvailability";
import { storeProposalHandoffDraft } from "@/lib/aiAssistant/handoff";

const replace = jest.fn();
const mockedAiAvailability = getAiAvailabilityAction as jest.MockedFunction<typeof getAiAvailabilityAction>;
jest.mock('@/lib/proposals/conversationRead', () => ({readConversationSnapshot: (...args: unknown[]) => getConversationAction(...args as [string])}));
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
jest.mock("@/app/actions/aiAvailability", () => ({ getAiAvailabilityAction: jest.fn() }));
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

/**
 * A date the picker will still accept.
 *
 * `minimumDateForQuestion` refuses anything before today, so a literal like
 * "2026-09-01" silently stopped being answerable the morning after it was
 * written — the picker rejected it, the Answer button never submitted, and the
 * assertion failed with "Number of calls: 0". Anchor these on today instead.
 */
const futureIsoDate = (daysAhead = 30): string => {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + daysAhead);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
};

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
  control: { answerType?: "date" | "time" | "date_time" | "choice" | "number" | "text"; options?: string[]; status?: "open" | "answered"; answeredMessageId?: string; suggestedAnswer?: string; reviewAnswer?: string } = {},
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
  reviewAnswer: control.reviewAnswer ?? control.suggestedAnswer ?? null,
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
    mockedAiAvailability.mockResolvedValue({ available: true, reason: null, since: null, checkedAt: "2026-09-15T00:00:00.000Z" });
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

  test("greeting is timezone-neutral until the client profile resolves", async () => {
    let resolveProfile!: (value: Awaited<ReturnType<typeof getUserData>>) => void;
    (getUserData as jest.Mock).mockReturnValueOnce(new Promise((resolve) => { resolveProfile = resolve; }));
    const hour = jest.spyOn(Date.prototype, "getHours").mockReturnValue(6);
    try {
      expect(renderToString(<AssistantWorkspacePage />)).toContain(">Welcome</h1>");
      hour.mockReturnValue(14);
      expect(renderToString(<AssistantWorkspacePage />)).toContain(">Welcome</h1>");
      render(<AssistantWorkspacePage />);
      expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
      await act(async () => { resolveProfile({ ok: true, data: { name: "Travis" } } as Awaited<ReturnType<typeof getUserData>>); });
      expect(screen.getByRole("heading", { name: "Good Afternoon, Travis" })).toBeInTheDocument();
    } finally {
      hour.mockRestore();
    }
  });

  test("empty state greets the signed-in user by first name", async () => {
    render(<AssistantWorkspacePage />);
    expect(await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/)).toBeInTheDocument();
    expect(screen.getByText("Let’s build your event RFP")).toBeInTheDocument();
    // First-run definition: one sentence naming the product, defining the
    // RFP, and promising nothing goes out without the planner. It sits right
    // under the tagline; there is no step strip, so the next thing after it
    // is the starter row.
    const definition = screen.getByTestId("assistant-product-definition");
    expect(definition).toHaveTextContent(
      "RFPilot turns your event details into an AV production RFP, the request you send to vendors so they can quote. Nothing goes out until you pick vendors.",
    );
    expect(definition.compareDocumentPosition(screen.getByText("Let’s build your event RFP")) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(definition.compareDocumentPosition(screen.getByRole("group", { name: "Ways to start" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The former instruction, hint, and "How it works" step strip are gone:
    // the starters and the placeholder carry that guidance now.
    expect(screen.queryByText(/Tell me what you're planning/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Include if you know:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "How it works" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Annual sales kickoff/)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Example: Sales kickoff, Dallas, 500 guests…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toHaveTextContent("Send");
    expect(screen.getByRole("button", { name: "Start voice input" })).toBeInTheDocument();
    // No proposal exists yet, so nothing was created or loaded.
    expect(mockedCreateProposal).not.toHaveBeenCalled();
    expect(mockedGetConversation).not.toHaveBeenCalled();
  });

  test("a provider outage pauses the composer and says so", async () => {
    // Every exit from this composer is a live-AI call, so when OpenAI cannot
    // serve requests (exhausted quota, revoked key, outage) sending would only
    // produce "Requirement extraction failed" a few seconds later.
    mockedAiAvailability.mockResolvedValue({
      available: false, reason: "PROVIDER_UNAVAILABLE",
      since: "2026-09-12T07:16:58.000Z", checkedAt: "2026-09-15T11:00:00.000Z",
    });
    render(<AssistantWorkspacePage />);

    const notice = await screen.findByTestId("ai-unavailable-notice");
    expect(notice).toHaveTextContent(/temporarily unavailable/i);
    expect(notice).toHaveTextContent(/your work is saved/i);
    expect(notice).toHaveAttribute("role", "status");

    fireEvent.change(screen.getByPlaceholderText("Example: Sales kickoff, Dallas, 500 guests…"), {
      target: { value: "Sales kickoff, Dallas, 500 guests" },
    });
    // Typed text would normally enable the button.
    const send = screen.getByRole("button", { name: "Send message" });
    expect(send).toBeDisabled();
    expect(send).toHaveAttribute("title", "AI assistance is temporarily unavailable.");
    // ...but preparing still works. Staging a file, prefilling the composer and
    // dictating are local; nothing is uploaded or created until Send. Gating
    // them stopped a planner getting ready while they waited, and did it
    // unevenly: "Describe it from scratch" has no picker to disable, so it
    // stayed live and prefilled text into a composer that could not send.
    expect(screen.getByRole("button", { name: "Attach a file" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Start voice input" })).toBeEnabled();
    for (const starter of ["Try an example brief", "Upload my brief or old RFP", "Describe it from scratch"])
      expect(screen.getByRole("button", { name: starter })).toBeEnabled();
  });

  test("a configuration halt is worded for the administrator, not the provider", async () => {
    mockedAiAvailability.mockResolvedValue({
      available: false, reason: "KILL_SWITCH", since: null, checkedAt: "2026-09-15T11:00:00.000Z",
    });
    render(<AssistantWorkspacePage />);
    const notice = await screen.findByTestId("ai-unavailable-notice");
    expect(notice).toHaveTextContent(/switched off for your organization/i);
    expect(notice).toHaveTextContent(/administrator/i);
  });

  test("an unreadable availability signal never blocks the composer", async () => {
    // The signal is an optimisation, not a gate. If it cannot be read the
    // composer must stay usable and let the real call produce the real error.
    mockedAiAvailability.mockResolvedValue({
      available: true, reason: null, since: null, checkedAt: "2026-09-15T11:00:00.000Z",
    });
    render(<AssistantWorkspacePage />);
    fireEvent.change(screen.getByPlaceholderText("Example: Sales kickoff, Dallas, 500 guests…"), {
      target: { value: "Sales kickoff" },
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled());
    expect(screen.queryByTestId("ai-unavailable-notice")).not.toBeInTheDocument();
  });

  test("composer exposes and enforces the backend's 8,000-character message maximum", async () => {
    render(<AssistantWorkspacePage />);
    await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
    const composer = screen.getByLabelText("Message the proposal assistant");
    expect(PROPOSAL_MESSAGE_MAX_CHARACTERS).toBe(8000);
    expect(composer).toHaveAttribute("maxlength", "8000");

    fireEvent.change(composer, { target: { value: "a".repeat(8001) } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText(/Shorten this message by 1 character/)).toBeInTheDocument();
    expect(mockedCreateProposal).not.toHaveBeenCalled();
  });

  describe("first-run starters", () => {
    const EXAMPLE_BRIEF_NAME = "Example brief - Northstar Leadership Summit.docx";

    test("empty state offers three ways to start and none of them creates a proposal", async () => {
      render(<AssistantWorkspacePage />);
      await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
      const starters = screen.getByRole("group", { name: "Ways to start" });
      expect(starters).not.toHaveTextContent("Or start with");
      // Compact chips: the label is the whole visible text, and the
      // explanation lives in the tooltip so the row stays one line.
      expect(within(starters).getByRole("button", { name: /Upload my brief or old RFP/ })).toHaveAttribute(
        "title",
        "PDF, DOCX, XLSX, CSV or TXT",
      );
      expect(within(starters).getByRole("button", { name: /Try an example brief/ })).toBeEnabled();
      expect(within(starters).getByRole("button", { name: /Upload my brief or old RFP/ })).toBeEnabled();
      expect(within(starters).getByRole("button", { name: /Describe it from scratch/ })).toBeEnabled();
      // The starters sit between the definition and the composer.
      const definition = screen.getByTestId("assistant-product-definition");
      expect(definition.compareDocumentPosition(starters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(starters.compareDocumentPosition(screen.getByLabelText("Message the proposal assistant")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(mockedCreateProposal).not.toHaveBeenCalled();
    });

    test("starters disappear once a conversation has started", async () => {
      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await waitFor(() => expect(mockedGetConversation).toHaveBeenCalled());
      expect(screen.queryByRole("group", { name: "Ways to start" })).not.toBeInTheDocument();
    });

    test("example brief stages the fictional Northstar DOCX and prefills the message without sending", async () => {
      const originalFetch = globalThis.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["northstar brief"]),
      });
      (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
      try {
        render(<AssistantWorkspacePage />);
        await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
        fireEvent.click(screen.getByRole("button", { name: /Try an example brief/ }));

        // The brief is staged as an ordinary composer chip…
        expect(await screen.findByText(EXAMPLE_BRIEF_NAME)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: `Remove ${EXAMPLE_BRIEF_NAME}` })).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith("/files/RFPilot%20example-event-brief.docx");
        // …the message explains it is an example, and the planner keeps control of Send.
        const composer = screen.getByLabelText("Message the proposal assistant") as HTMLTextAreaElement;
        expect(composer.value).toBe(
          "This is an example brief so I can see how RFPilot works. Pull out everything you can from it.",
        );
        expect(composer).toHaveFocus();
        expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
        expect(mockedCreateProposal).not.toHaveBeenCalled();
        expect(mockedCreateSession).not.toHaveBeenCalled();
        expect(mockedPostMessage).not.toHaveBeenCalled();

        // A second tap does not stage the brief twice.
        fireEvent.click(screen.getByRole("button", { name: /Try an example brief/ }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(screen.getAllByText(EXAMPLE_BRIEF_NAME)).toHaveLength(1);
      } finally {
        (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
      }
    });

    test("example brief failure explains itself and leaves the composer untouched", async () => {
      const originalFetch = globalThis.fetch;
      (globalThis as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
      try {
        render(<AssistantWorkspacePage />);
        await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
        fireEvent.click(screen.getByRole("button", { name: /Try an example brief/ }));
        expect(await screen.findByRole("alert")).toHaveTextContent(
          "The example brief could not be loaded. Try again, or attach a file of your own.",
        );
        expect(screen.queryByText(EXAMPLE_BRIEF_NAME)).not.toBeInTheDocument();
        expect((screen.getByLabelText("Message the proposal assistant") as HTMLTextAreaElement).value).toBe("");
        expect(screen.getByRole("button", { name: /Try an example brief/ })).toBeEnabled();
      } finally {
        (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
      }
    });

    test("upload starter opens the same file picker as the paperclip", async () => {
      const clickSpy = jest.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
      try {
        render(<AssistantWorkspacePage />);
        await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
        fireEvent.click(screen.getByRole("button", { name: /Upload my brief or old RFP/ }));
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(clickSpy.mock.instances[0]).toBe(document.querySelector('input[type="file"]'));
      } finally {
        clickSpy.mockRestore();
      }
    });

    test("scratch starter drops an editable sample into the composer and never overwrites typed text", async () => {
      render(<AssistantWorkspacePage />);
      await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
      const composer = screen.getByLabelText("Message the proposal assistant") as HTMLTextAreaElement;
      fireEvent.click(screen.getByRole("button", { name: /Describe it from scratch/ }));
      await waitFor(() => expect(composer.value).toMatch(/^Sales kickoff in Dallas/));
      expect(composer).toHaveFocus();
      expect(composer.selectionStart).toBe(composer.value.length);
      expect(mockedCreateProposal).not.toHaveBeenCalled();

      fireEvent.change(composer, { target: { value: "Board retreat, Austin" } });
      fireEvent.click(screen.getByRole("button", { name: /Describe it from scratch/ }));
      expect(composer.value).toBe("Board retreat, Austin");
    });
  });

  describe("starter carried in from the dashboard (?start=)", () => {
    test("scratch starter prefills the composer once and strips the param", async () => {
      window.history.replaceState(null, "", "/proposals/add-new-proposal?start=scratch");
      render(<AssistantWorkspacePage initialStarter="scratch" />);
      const composer = screen.getByLabelText("Message the proposal assistant") as HTMLTextAreaElement;
      await waitFor(() => expect(composer.value).toMatch(/^Sales kickoff in Dallas/));
      expect(window.location.search).toBe("");
      expect(mockedCreateProposal).not.toHaveBeenCalled();
    });

    test("example starter stages the example brief without sending", async () => {
      const originalFetch = globalThis.fetch;
      (globalThis as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["northstar brief"]),
      });
      try {
        render(<AssistantWorkspacePage initialStarter="example" />);
        expect(await screen.findByText("Example brief - Northstar Leadership Summit.docx")).toBeInTheDocument();
        expect(mockedCreateProposal).not.toHaveBeenCalled();
        expect(mockedPostMessage).not.toHaveBeenCalled();
      } finally {
        (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
      }
    });

    test("a starter is ignored on an existing proposal", async () => {
      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} initialStarter="scratch" />);
      await waitFor(() => expect(mockedGetConversation).toHaveBeenCalled());
      const composer = screen.getByLabelText("Message the proposal assistant") as HTMLTextAreaElement;
      expect(composer.value).toBe("");
    });
  });

  describe("attachment drop target", () => {
    const workspace = () => screen.getByRole("region", { name: "Proposal assistant workspace" });
    const dragData = (files: File[]) => ({ dataTransfer: { files, types: ["Files"], dropEffect: "none" } });

    test("empty state names the accepted file types under the composer", async () => {
      render(<AssistantWorkspacePage />);
      await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
      expect(screen.getByTestId("attachment-caption")).toHaveTextContent(
        "Drop a file here or use the paperclip: PDF, DOCX, XLSX, CSV or TXT, up to 3 per message.",
      );
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.accept).toBe(".pdf,.docx,.xlsx,.csv,.txt");
    });

    test("caption is gone once the conversation has started", async () => {
      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await waitFor(() => expect(mockedGetConversation).toHaveBeenCalled());
      expect(screen.queryByTestId("attachment-caption")).not.toBeInTheDocument();
    });

    test("dragging a file over the workspace shows an overlay that clears when it leaves", async () => {
      render(<AssistantWorkspacePage />);
      await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
      const file = new File(["brief"], "brief.pdf", { type: "application/pdf" });
      expect(screen.queryByTestId("attachment-dropzone")).not.toBeInTheDocument();

      fireEvent.dragEnter(workspace(), dragData([file]));
      expect(screen.getByTestId("attachment-dropzone")).toHaveTextContent("Drop to attach");
      expect(screen.getByTestId("attachment-dropzone")).toHaveTextContent("PDF, DOCX, XLSX, CSV or TXT, up to 3 files per message");

      // Crossing into a child fires another enter/leave pair; the overlay must survive it.
      fireEvent.dragEnter(screen.getByLabelText("Message the proposal assistant"), dragData([file]));
      fireEvent.dragLeave(screen.getByLabelText("Message the proposal assistant"), dragData([file]));
      expect(screen.getByTestId("attachment-dropzone")).toBeInTheDocument();

      fireEvent.dragLeave(workspace(), dragData([file]));
      expect(screen.queryByTestId("attachment-dropzone")).not.toBeInTheDocument();
    });

    test("a non-file drag (text selection) is ignored", async () => {
      render(<AssistantWorkspacePage />);
      await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
      fireEvent.dragEnter(workspace(), { dataTransfer: { files: [], types: ["text/plain"] } });
      expect(screen.queryByTestId("attachment-dropzone")).not.toBeInTheDocument();
    });

    test("dropping supported files stages chips without uploading", async () => {
      render(<AssistantWorkspacePage />);
      await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
      const brief = new File(["brief"], "brief.pdf", { type: "application/pdf" });
      const agenda = new File(["agenda"], "agenda.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      fireEvent.dragEnter(workspace(), dragData([brief, agenda]));
      fireEvent.drop(workspace(), dragData([brief, agenda]));

      expect(await screen.findByText("brief.pdf")).toBeInTheDocument();
      expect(screen.getByText("agenda.xlsx")).toBeInTheDocument();
      expect(screen.queryByTestId("attachment-dropzone")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(mockedCreateProposal).not.toHaveBeenCalled();
      expect(mockedCreateSession).not.toHaveBeenCalled();
      expect(mockedPostMessage).not.toHaveBeenCalled();
    });

    test("unsupported and overflow files are skipped with one plain explanation", async () => {
      render(<AssistantWorkspacePage />);
      await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
      const files = [
        new File(["a"], "one.pdf", { type: "application/pdf" }),
        new File(["b"], "two.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
        new File(["c"], "three.txt", { type: "text/plain" }),
        new File(["d"], "four.csv", { type: "text/csv" }),
        new File(["e"], "photo.png", { type: "image/png" }),
      ];
      fireEvent.drop(workspace(), dragData(files));

      expect(await screen.findByText("one.pdf")).toBeInTheDocument();
      expect(screen.getByText("two.docx")).toBeInTheDocument();
      expect(screen.getByText("three.txt")).toBeInTheDocument();
      expect(screen.queryByText("four.csv")).not.toBeInTheDocument();
      expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "One file was skipped: only PDF, DOCX, XLSX, CSV or TXT files can be attached. You can attach up to 3 files per message, so one file was left out.",
      );
    });

    test("dropping while three files are already staged explains the limit instead of staging", async () => {
      render(<AssistantWorkspacePage />);
      await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
      const staged = ["a.pdf", "b.pdf", "c.pdf"].map((name) => new File(["x"], name, { type: "application/pdf" }));
      fireEvent.drop(workspace(), dragData(staged));
      await screen.findByText("c.pdf");

      fireEvent.dragEnter(workspace(), dragData([new File(["y"], "d.pdf", { type: "application/pdf" })]));
      expect(screen.getByTestId("attachment-dropzone")).toHaveTextContent("You can attach up to 3 files per message.");
      fireEvent.drop(workspace(), dragData([new File(["y"], "d.pdf", { type: "application/pdf" })]));
      expect(screen.queryByText("d.pdf")).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("You can attach up to 3 files per message.");
    });
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

  test("first send lazily creates the proposal and moves the URL only after message acceptance", async () => {
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
    await waitFor(() => expect(replaceStateSpy).toHaveBeenCalledWith(null, "", `/proposals/${PROPOSAL_ID}/assistant`));
    expect(mockedPostMessage.mock.invocationCallOrder[0]).toBeLessThan(replaceStateSpy.mock.invocationCallOrder[0]);
    expect(replace).not.toHaveBeenCalled();
  });

  test("a slow first message keeps the original route until it is durably accepted", async () => {
    mockedCreateProposal.mockResolvedValue({success:true,message:'ok',data:{_id:PROPOSAL_ID}});
    let accept!: (value: Awaited<ReturnType<typeof postConversationMessageAction>>) => void;
    mockedPostMessage.mockImplementationOnce(() => new Promise(resolve => {accept=resolve;}));
    render(<AssistantWorkspacePage />);
    fireEvent.change(await screen.findByLabelText('Message the proposal assistant'),{target:{value:'A synthetic conference brief.'}});
    fireEvent.click(screen.getByRole('button',{name:'Send message'}));
    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledTimes(1));
    expect(replaceStateSpy).not.toHaveBeenCalled();
    await act(async () => {accept({success:true,correlationId:'test',data:{created:true,message:null,assistantMessageId:null,run:null}});});
    await waitFor(() => expect(replaceStateSpy).toHaveBeenCalledWith(null,'',`/proposals/${PROPOSAL_ID}/assistant`));
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
    expect(screen.getByText("When does the event start?")).toBeInTheDocument();
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
    // The rail lists every question as a checklist with progress; nothing is
    // ticked yet and the active question is marked as up next.
    expect(await screen.findByText("0/2")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ of \d+ done/)).not.toBeInTheDocument();
    expect(screen.getByText("2. How many event rooms are required?")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Key questions progress" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("progressbar", { name: "Key questions progress" })).toHaveAttribute("aria-valuetext", "0 of 2 questions completed");
    const checklist = screen.getByRole("list", { name: "Question checklist" });
    expect(checklist).toHaveClass("mt-3", "space-y-1");
    expect(checklist).not.toHaveClass("overflow-y-auto", "max-h-[22rem]", "space-y-2");
    const rows = within(checklist).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveClass("px-2.5", "py-1.5");
    expect(rows[0].querySelector("p")).toHaveClass("text-[13px]", "leading-[1.35rem]");
    expect(rows[0]).toHaveAttribute("aria-current", "step");
    expect(rows[1]).not.toHaveAttribute("aria-current");
    expect(within(rows[0]).getByRole("img", { name: "Up next" })).toBeInTheDocument();
    expect(within(rows[1]).getByRole("img", { name: "Open" })).toBeInTheDocument();
    expect(within(checklist).queryByText(/^(Start date|Event rooms|Up next|Open|Answered|Skipped)$/)).not.toBeInTheDocument();
    expect(checklist.querySelectorAll("p")).toHaveLength(2);
    // Nothing was answered yet, so no completion card.
    expect(screen.queryByText(/All key questions answered/)).not.toBeInTheDocument();
  });

  test("the fixed intake checklist includes future questions and separates extra clarification progress", async () => {
    const snapshot = conversationWithGuidedQuestions([startDateQuestion, roomsQuestion]);
    const items = Array.from({length:19}, (_, index) => ({key:`/content/qa/${index}`,paths:[`/content/qa/${index}`],
      prompt:`Core question ${index + 1}?`,status:'open' as const,questionId:null as string | null}));
    items[0] = {...items[0],questionId:startDateQuestion.id};
    mockedGetConversation.mockResolvedValue({...snapshot,data:{...snapshot.data,
      intakeProgress:{total:19,completed:0,items,extraQuestionIds:[roomsQuestion.id]}}});
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    expect(await screen.findByText('0/19')).toBeInTheDocument();
    expect(within(screen.getByRole('list',{name:'Question checklist'})).getAllByRole('listitem')).toHaveLength(19);
    expect(within(screen.getByRole('list',{name:'Additional clarifications'})).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('progressbar',{name:'Key questions progress'})).toHaveAttribute('aria-valuemax','19');
    expect(screen.getByText('Guided question 1')).toBeInTheDocument();
    expect(screen.queryByText(/\d+ of \d+ done/)).not.toBeInTheDocument();
  });

  test("finished intake does not hide an unresolved extra decision or inflate its count", async () => {
    const snapshot = conversationWithGuidedQuestions([roomsQuestion]);
    const items = Array.from({length:19}, (_, index) => ({key:`/content/qa/${index}`,paths:[`/content/qa/${index}`],
      prompt:`Core question ${index + 1}?`,status:'answered' as const,questionId:null}));
    mockedGetConversation.mockResolvedValue({...snapshot,data:{...snapshot.data,
      intakeProgress:{total:19,completed:19,items,extraQuestionIds:[roomsQuestion.id]}}});
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    expect(await screen.findByText('19/19')).toBeInTheDocument();
    expect(screen.getByText('Key questions complete. Let’s resolve the additional clarifications.')).toBeInTheDocument();
    expect(screen.getByText('How many event rooms are required?')).toBeInTheDocument();
    expect(screen.getByRole('list',{name:'Additional clarifications'})).toBeInTheDocument();
  });

  test("core questions follow the fixed catalog even when database rows arrive out of order", async () => {
    const snapshot = conversationWithGuidedQuestions([roomsQuestion, startDateQuestion]);
    const items = Array.from({length:19}, (_, index) => ({key:`/content/qa/${index}`,paths:[`/content/qa/${index}`],
      prompt:`Core question ${index + 1}?`,status:'open' as const,questionId:null as string | null}));
    items[0] = {...items[0],questionId:startDateQuestion.id};
    items[10] = {...items[10],questionId:roomsQuestion.id};
    mockedGetConversation.mockResolvedValue({...snapshot,data:{...snapshot.data,
      intakeProgress:{total:19,completed:0,items,extraQuestionIds:[]}}});
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    expect(await screen.findByText('0/19')).toBeInTheDocument();
    expect(screen.getByText('Guided question 1')).toBeInTheDocument();
    expect(screen.getByText('When does the event start?')).toBeInTheDocument();
    expect(screen.queryByText('How many event rooms are required?')).not.toBeInTheDocument();
    const rows = within(screen.getByRole('list',{name:'Question checklist'})).getAllByRole('listitem');
    expect(rows[0]).toHaveAttribute('aria-current','step');
    expect(rows[10]).not.toHaveAttribute('aria-current');
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

  test("production load-in time uses the shared picker and submits HH:MM", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([loadInTimePickerQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-load-in-time", status: "answered", answeredMessageId: null, appliedField: null },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("What time can production load in? (HH:MM)");
    const timeInput = screen.getByLabelText("Answer this question");
    expect(timeInput).not.toHaveAttribute("type", "time");
    expect(timeInput).toHaveAttribute("placeholder", "Select time");
    expect(screen.getByRole("button", { name: "Open time picker" })).toBeInTheDocument();

    fireEvent.change(timeInput, { target: { value: "7:30 AM" } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-load-in-time",
      { status: "answered", answer: "07:30" },
    ));
  });

  test("production load-in uses one card with coordinated date and time controls", async () => {
    const loadInDate = futureIsoDate();
    mockedGetProposal.mockResolvedValue({
      success: true,
      message: "ok",
      data: {
        _id: PROPOSAL_ID,
        event: { eventName: "", startDate: loadInDate },
      },
    });
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([combinedLoadInQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([{
        ...combinedLoadInQuestion,
        status: "answered" as const,
        answeredMessageId: "msg-answer-load-in",
        reviewAnswer: `${loadInDate} at 07:30`,
      }]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        id: "q-load-in-combined",
        status: "answered",
        answeredMessageId: null,
        appliedField: { path: "/content/venueSchedule/loadInDate", mongoPath: "venueSchedule.loadInDate", value: loadInDate },
        appliedFields: [
          { path: "/content/venueSchedule/loadInDate", mongoPath: "venueSchedule.loadInDate", value: loadInDate },
          { path: "/content/venueSchedule/loadInTime", mongoPath: "venueSchedule.loadInTime", value: "07:30" },
        ],
      },
    });

    const { container } = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("What date and time can production load-in?");
    const dateTimeInput = screen.getByLabelText("Answer this question");
    expect(dateTimeInput).toHaveAttribute("placeholder", "Select date & time");
    expect(dateTimeInput).not.toHaveAttribute("type", "time");
    expect(screen.queryByLabelText("Load-in time")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Date and time calendar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Answer" })).toBeDisabled();
    expect(container.querySelector('[data-datepicker-boundary]')).not.toBeNull();

    const [year, month, day] = loadInDate.split("-");
    fireEvent.change(dateTimeInput, {
      target: { value: `${month}/${day}/${year} 07:30 AM` },
    });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-load-in-combined",
      { status: "answered", answer: { date: loadInDate, time: "07:30" } },
    ));
    const review = await screen.findByTestId("suggested-answers-review");
    expect(review).toHaveTextContent("1 saved detail");
    expect(review).toHaveTextContent(`${loadInDate} at 07:30`);
    expect(screen.queryByText(`Production load-in: ${loadInDate} at 07:30 ✓`)).not.toBeInTheDocument();
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

  test("answering a question adds the value to proposal details and advances", async () => {
    const startDate = futureIsoDate();
    const answeredStartDate = {
      ...startDateQuestion,
      status: "answered" as const,
      answeredMessageId: "msg-answer-start",
      reviewAnswer: startDate,
    };
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([startDateQuestion, roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([answeredStartDate, roomsQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-start", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/startDate", mongoPath: "event.startDate", value: startDate } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    const initialLoads = mockedGetConversation.mock.calls.length;

    // Ported from the retired ConversationWorkspace suite: the Answer control
    // stays disabled until something has actually been typed.
    const answerButton = screen.getByRole("button", { name: "Answer" });
    expect(answerButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Answer this question"), { target: { value: startDate } });
    expect(answerButton).toBeEnabled();
    fireEvent.click(answerButton);

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-start",
      { status: "answered", answer: startDate },
    ));
    // …and resolving a question refetches the conversation (useConversation).
    await waitFor(() => expect(mockedGetConversation.mock.calls.length).toBeGreaterThan(initialLoads));
    // The answer joins the persistent editable details instead of rendering as
    // a detached chat-style confirmation.
    const review = await screen.findByTestId("suggested-answers-review");
    expect(review).toHaveTextContent("Start date");
    expect(review).toHaveTextContent(startDate);
    expect(screen.queryByText(`Start date: ${startDate} ✓`)).not.toBeInTheDocument();
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
      mockedGetConversation.mockResolvedValue(conversationWithGuidedQuestions([{
        ...roomsQuestion,
        status: "answered" as const,
        answeredMessageId: "msg-answer-rooms",
        reviewAnswer: "4",
      }]));
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

    expect(await screen.findByTestId("suggested-answers-review")).toHaveTextContent("4");
    expect(screen.queryByText("Number of event rooms: 4 ✓")).not.toBeInTheDocument();
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
    // And it posts nothing to the conversation. Skipping several questions in
    // a row used to stack up a wall of near-identical "you can add it later"
    // notices; the Key questions rail carries a persistent Skipped badge for
    // each one instead, which survives a refresh as a local card never did.
    expect(screen.queryByText(/you can add it later/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Open Venue/)).not.toBeInTheDocument();
  });

  test("a date question renders the date picker and submits a YYYY-MM-DD value", async () => {
    const startDate = futureIsoDate();
    const answeredStartDate = {
      ...datePickerQuestion,
      status: "answered" as const,
      answeredMessageId: "msg-answer-start",
      reviewAnswer: startDate,
    };
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([datePickerQuestion, roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([answeredStartDate, roomsQuestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-start", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/startDate", mongoPath: "event.startDate", value: startDate } },
    });

    const { container } = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("Guided question 1");
    // The date control is the shared react-datepicker wrapper, not a bare text box.
    expect(container.querySelector(".react-datepicker__input-container")).not.toBeNull();
    const input = screen.getByLabelText("Answer this question");
    expect(input).toHaveAttribute("placeholder", "MM/DD/YYYY");

    fireEvent.change(input, { target: { value: startDate } });
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-start",
      { status: "answered", answer: startDate },
    ));
    expect(await screen.findByTestId("suggested-answers-review")).toHaveTextContent(startDate);
    expect(screen.queryByText(`Start date: ${startDate} ✓`)).not.toBeInTheDocument();
  });

  test("an extraction-suggested date appears in the review and can be edited", async () => {
    // A suggestion outside the picker's bounds is deliberately not seeded, so a
    // literal here stops pre-filling once it falls into the past.
    const suggested = futureIsoDate(45);
    const answeredSuggestion = guidedQuestion(
      "q-start",
      "When does the event start? (YYYY-MM-DD)",
      "/content/event/startDate",
      "schedule",
      {
        answerType: "date",
        status: "answered",
        answeredMessageId: "msg-answer-start",
        suggestedAnswer: suggested,
      },
    );
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([
        guidedQuestion("q-start", "When does the event start? (YYYY-MM-DD)", "/content/event/startDate", "schedule", { answerType: "date", suggestedAnswer: suggested }),
      ]))
      .mockResolvedValue(conversationWithGuidedQuestions([answeredSuggestion]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-start", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/startDate", mongoPath: "event.startDate", value: suggested } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    expect(await screen.findByText("1 saved detail")).toBeInTheDocument();
    const review = screen.getByTestId("suggested-answers-review");
    expect(screen.getByText(suggested)).toBeInTheDocument();
    expect(screen.queryByText("Guided question 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use these details" })).not.toBeInTheDocument();
    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit Start date" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Edit Start date" }));
    expect(await screen.findByText("Edit extracted detail")).toBeInTheDocument();
    expect(review).toContainElement(screen.getByTestId("guided-question-card"));
    expect(screen.getByLabelText("Answer this question")).toHaveValue(formatAppDate(suggested));
    expect(screen.getByText("Saved to your proposal. Change it only if needed.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save change" }));
    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "q-start",
      { status: "answered", answer: suggested },
    ));
  });

  test("all extraction-suggested answers are shown together and applied automatically", async () => {
    const suggestions = [
      guidedQuestion("q-name", "What is this event called?", "/content/event/eventName", "scope", { suggestedAnswer: "Northstar Leadership Summit 2026" }),
      guidedQuestion("q-attendees", "Roughly how many people will attend?", "/content/event/attendees", "scope", { answerType: "number", suggestedAnswer: "300" }),
    ];
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions(suggestions))
      .mockResolvedValue(conversationWithGuidedQuestions(
        suggestions.map((question, index) => ({
          ...question,
          status: "answered" as const,
          answeredMessageId: `msg-answer-${index}`,
        })),
      ));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-attendees", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/attendees", mongoPath: "event.attendees", value: "300" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const review = await screen.findByTestId("suggested-answers-review");
    expect(review).toHaveTextContent("2 saved details");
    expect(review).toHaveTextContent("Northstar Leadership Summit 2026");
    expect(review).toHaveTextContent("300");
    expect(screen.queryByTestId("guided-question-card")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use these details" })).not.toBeInTheDocument();
    expect(review).toHaveTextContent(/Saved|Saving details/);
    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledTimes(2));
    expect(mockedPatchQuestion).toHaveBeenNthCalledWith(
      1,
      PROPOSAL_ID,
      "q-name",
      { status: "answered", answer: "Northstar Leadership Summit 2026", useOnlyIfEmpty: true },
    );
    expect(mockedPatchQuestion).toHaveBeenNthCalledWith(
      2,
      PROPOSAL_ID,
      "q-attendees",
      { status: "answered", answer: "300", useOnlyIfEmpty: true },
    );
  });

  test("an extraction-suggested choice can be edited from the review", async () => {
    const suggestion = guidedQuestion("q-format", "Is the event in-person, hybrid, or virtual?", "/content/event/eventFormat", "scope", {
          answerType: "choice",
          options: ["In-Person", "Hybrid", "Virtual"],
          suggestedAnswer: "In-Person",
        });
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([suggestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([{
        ...suggestion,
        status: "answered" as const,
        answeredMessageId: "msg-answer-format",
      }]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { id: "q-format", status: "answered", answeredMessageId: null, appliedField: { path: "/content/event/eventFormat", mongoPath: "event.eventFormat", value: "In-Person" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByText("1 saved detail");
    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit Event format" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Edit Event format" }));
    expect(await screen.findByText("Edit extracted detail")).toBeInTheDocument();
    const suggestedPill = screen.getByRole("button", { name: "In-Person" });
    expect(suggestedPill).toHaveAccessibleDescription("Suggested from your message or brief");
    fireEvent.click(suggestedPill);
    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledTimes(2));
    expect(mockedPatchQuestion).toHaveBeenLastCalledWith(
      PROPOSAL_ID,
      "q-format",
      { status: "answered", answer: "In-Person" },
    );
  });

  test("an edited extracted default replaces the automatically used value", async () => {
    const openSuggestion = guidedQuestion(
      "q-name",
      "What is this event called?",
      "/content/event/eventName",
      "scope",
      { suggestedAnswer: "Northstar Leadership Summit 2026" },
    );
    const answeredSuggestion = {
      ...openSuggestion,
      status: "answered" as const,
      answeredMessageId: "msg-answer-name",
    };
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([openSuggestion]))
      .mockResolvedValueOnce(conversationWithGuidedQuestions([answeredSuggestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([{
        ...answeredSuggestion,
        suggestedAnswer: "Northstar Executive Summit 2026",
        reviewAnswer: "Northstar Executive Summit 2026",
      }]));
    mockedPatchQuestion.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        id: "q-name",
        status: "answered",
        answeredMessageId: "msg-answer-name",
        appliedField: {
          path: "/content/event/eventName",
          mongoPath: "event.eventName",
          value: "Northstar Executive Summit 2026",
        },
      },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit Event name" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Edit Event name" }));
    const input = screen.getByLabelText("Answer this question");
    fireEvent.change(input, { target: { value: "Northstar Executive Summit 2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Save change" }));

    await waitFor(() => expect(mockedPatchQuestion).toHaveBeenCalledTimes(2));
    expect(mockedPatchQuestion).toHaveBeenLastCalledWith(
      PROPOSAL_ID,
      "q-name",
      { status: "answered", answer: "Northstar Executive Summit 2026" },
    );
    expect(await screen.findByText("Northstar Executive Summit 2026")).toBeInTheDocument();
    expect(screen.getByTestId("suggested-answers-review")).toBeInTheDocument();
    expect(
      screen.queryByText("Event name: Northstar Executive Summit 2026 ✓"),
    ).not.toBeInTheDocument();
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
    expect(await screen.findByRole('status', { name: 'Attachment progress' })).toHaveTextContent('Reading your brief');
    expect(screen.getByRole('status', { name: 'Attachment progress' }).parentElement?.parentElement).toHaveClass('items-start', 'gap-2.5');
    // A single progress card replaces the two competing extraction loaders.
    expect(screen.getAllByRole('status', { name: 'Attachment progress' })).toHaveLength(1);
    expect(screen.queryByText(/Reading your sources before asking the next question/)).not.toBeInTheDocument();
    // ...but the guided question control itself is not, even though it is open.
    expect(screen.queryByText("Guided question 1")).not.toBeInTheDocument();
    expect(screen.queryByText("What is this event called?")).not.toBeInTheDocument();
    // Normal conversation content is not hidden by the pending extraction.
    expect(screen.getByText("Please review the venue requirements.")).toBeInTheDocument();
  });

  test("an extracted suggestion appears in the review once extraction finishes", async () => {
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
      expect(await screen.findByRole('status', { name: 'Attachment progress' })).toHaveTextContent('Reading your brief');
      expect(screen.queryByText("Guided question 1")).not.toBeInTheDocument();

      await act(async () => { await jest.advanceTimersByTimeAsync(2_000); });

      const review = await screen.findByTestId("suggested-answers-review");
      expect(review).toHaveTextContent("Northstar Leadership Summit 2026");
      expect(screen.queryByText("Guided question 1")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit Event name" })).toBeInTheDocument();
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

      // No message is pending, so this is the quiet (30s) poll interval.
      await act(async () => { await jest.advanceTimersByTimeAsync(30_000); });

      expect(screen.getByLabelText("Answer this question")).toHaveValue("My Own Event Name");
      expect(screen.queryByText("Pre-filled from your message or brief — confirm or edit.")).not.toBeInTheDocument();
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

      await act(async () => { await jest.advanceTimersByTimeAsync(30_000); });

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
      fireEvent.change(input, { target: { value: "09/20/2026" } });
      expect(input).toHaveValue("09/20/2026");

      // No message is pending, so this is the slow (10s) poll interval — the
      // extraction-derived "2026-09-14" suggestion lands on this refresh.
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

      expect(screen.getByLabelText("Answer this question")).toHaveValue("09/20/2026");
      expect(screen.queryByText("Pre-filled from your message or brief — confirm or edit.")).not.toBeInTheDocument();
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
    const answeredFormat = {
      ...formatQuestion,
      status: "answered" as const,
      answeredMessageId: "msg-answer-format",
      reviewAnswer: "Hybrid",
    };
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([formatQuestion, roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([answeredFormat, roomsQuestion]));
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
    expect(await screen.findByTestId("suggested-answers-review")).toHaveTextContent("Hybrid");
    expect(screen.queryByText("Event format: Hybrid ✓")).not.toBeInTheDocument();
    expect(await screen.findByText("Guided question 2")).toBeInTheDocument();
  });

  test("a long choice list renders every option as a pill and submits the clicked one", async () => {
    const platformQuestion = guidedQuestion("q-platform", "Which streaming platform will the event use?", "/content/hybridVirtual/streamingPlatform", "production", {
      answerType: "choice",
      options: STREAMING_PLATFORMS,
    });
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([platformQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([{
        ...platformQuestion,
        status: "answered" as const,
        answeredMessageId: "msg-answer-platform",
        reviewAnswer: "Vendor Recommendation Needed",
      }]));
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
    expect(await screen.findByTestId("suggested-answers-review")).toHaveTextContent("Vendor Recommendation Needed");
  });

  test("a text question keeps the typed answer plus Answer button behaviour", async () => {
    const platformQuestion = guidedQuestion("q-platform", "Which streaming platform will the event use?", "/content/hybridVirtual/streamingPlatform", "production", { answerType: "text" });
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([platformQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([{
        ...platformQuestion,
        status: "answered" as const,
        answeredMessageId: "msg-answer-platform",
        reviewAnswer: "Zoom",
      }]));
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
    expect(await screen.findByTestId("suggested-answers-review")).toHaveTextContent("Zoom");
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
    expect(await screen.findByText("When does the event start?")).toBeInTheDocument();
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
  const roomsAnsweredQuestion = {
    ...roomsQuestion,
    status: "answered" as const,
    answeredMessageId: "msg-answer-rooms",
    reviewAnswer: "6",
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
    expect(await screen.findByTestId("suggested-answers-review")).toHaveTextContent("6");
  };

  test("answering the last question shows a completion progress card built from the guidance report", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([roomsAnsweredQuestion]));
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
    expect(await screen.findByText("All key questions completed.")).toBeInTheDocument();
    // The consistent action row: one primary, a tertiary link, and no second
    // readiness button because a report is already on screen (the rail no
    // longer carries task chips).
    expect(screen.getByRole("button", { name: "Generate proposal draft" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
    expect(screen.queryByRole("button", { name: "Run readiness check" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit all details" })).not.toBeInTheDocument();
    const completionCard = screen.getByTestId("completion-card");
    expect(completionCard).toHaveClass("w-full", "max-w-3xl");
    expect(completionCard.closest("li")).toHaveClass(
      "items-start",
      "gap-2.5",
      "sm:gap-3",
    );
    expect(screen.queryByRole("link", { name: "Open RFP questions" })).not.toBeInTheDocument();
    // The old vague copy is gone for good.
    expect(screen.queryByText(/everything else is optional/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open the proposal editor" })).not.toBeInTheDocument();
  });

  test("a failed readiness check falls back to the plain headline with the actions still working", async () => {
    mockedGetConversation
      .mockResolvedValueOnce(conversationWithGuidedQuestions([roomsQuestion]))
      .mockResolvedValue(conversationWithGuidedQuestions([roomsAnsweredQuestion]));
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
    expect(screen.queryByRole("progressbar", { name: "Proposal completeness" })).not.toBeInTheDocument();
    expect(screen.queryByText(/is not enabled for this environment/)).not.toBeInTheDocument();
    // With no report on screen the card offers the check itself (the rail
    // slides in asynchronously and no longer carries task chips).
    await screen.findByText("All key questions completed.");
    expect(screen.getAllByRole("button", { name: "Run readiness check" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Generate proposal draft" }));
    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "Generate a proposal draft from the current information.", intent: "generate_draft", expectedProposalVersion: 4 },
      expect.any(String),
    ));
  });

  test("a completed extraction keeps the next step in the conversation without editor links", async () => {
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
    expect(await screen.findByText("I’ve pulled out the key details from your brief. Review them together, then we’ll ask only about anything missing.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Review & apply/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View details" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open RFP questions" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Review the suggestions together/)).not.toBeInTheDocument();
  });

  test("an extraction without captured fields keeps honest recovery text", async () => {
    mockedGetConversation.mockResolvedValue({
      ...conversationWithQuestion,
      data: { ...conversationWithQuestion.data, messages: [proposalContextMessage("complete")] },
    });
    mockedGetProposalContext.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { run: { id: "run-1" }, evidence: [], operations: [] },
    } as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    expect(await screen.findByText("I couldn’t identify proposal details in this file. You can attach a clearer brief or enter the details below.")).toBeInTheDocument();
    expect(screen.queryByText(/I’ve pulled out the key details/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View details" })).not.toBeInTheDocument();
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
    expect(screen.queryByText("Requirement extraction did not finish. Try again.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue without extraction" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("status", { name: "Attachment progress" })).toHaveLength(1);
    expect(screen.queryByText(/Resolve the attachment issue in the conversation/)).not.toBeInTheDocument();
    await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "Extract the requirements from the selected sources.", intent: "extract_requirements", sourceIds: ["src-existing"] },
      expect.any(String),
    ));
  });

  test('a completed retry replaces progress even before its send response returns', async () => {
    mockedGetProposalContext.mockResolvedValue({ success: false, code: "CONTEXT_RUN_UNAVAILABLE", message: "none" });
    const request = { ...conversationWithQuestion.data.messages[0], id:'extract-input', ordinal:1, intent:'extract_requirements', attachments:[{sourceId:'src-existing',role:'primary',filename:'brief.txt',sourceStatus:'ready'}] };
    const failed = {...proposalContextMessage('failed'), ordinal:2};
    let snapshot = {...conversationWithQuestion, data:{...conversationWithQuestion.data, messages:[request, failed]}};
    mockedGetConversation.mockImplementation(async () => snapshot);
    let finishSend!: (result: Awaited<ReturnType<typeof postConversationMessageAction>>) => void;
    mockedPostMessage.mockReturnValueOnce(new Promise(resolve => { finishSend = resolve; }));
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    fireEvent.click(await screen.findByRole('button',{name:'Retry extraction'}));
    expect(await screen.findByRole('status',{name:'Attachment progress'})).toBeInTheDocument();
    const complete = {...proposalContextMessage('complete'), id:'completed-retry', ordinal:4, content:'The brief is ready to review.'};
    snapshot = {...snapshot, data:{...snapshot.data, messages:[request, failed, {...request,id:'retry-input',ordinal:3}, complete]}};
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(await screen.findByText('The brief is ready to review.')).toBeInTheDocument();
    expect(screen.queryByRole('status',{name:'Attachment progress'})).not.toBeInTheDocument();
    await act(async () => finishSend({success:true,correlationId:'test',data:{created:true,message:null,assistantMessageId:null,run:null}}));
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

    expect(await screen.findByText("When does the event start?")).toBeInTheDocument();
  });

  test("the Extract requirements command auto-selects ready sources and sends the intent", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithQuestion);
    mockedListSources.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: [
        { id: "src-1", status: "ready", confidentiality: "non_confidential", originalFilename: "venue.pdf", createdAt: "2026-07-21T10:00:00.000Z" , origin: "upload" },
        { id: "src-2", status: "ready", confidentiality: "confidential", originalFilename: "internal.pdf", createdAt: "2026-07-21T10:00:00.000Z" , origin: "upload" },
      ],
    });
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: { runType: "proposal_context", runId: "run-1", jobId: "job-1" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await waitFor(() => expect(mockedListSources).toHaveBeenCalled());
    // The rail no longer carries task buttons; the command comes from the composer.
    expect(screen.queryByRole("button", { name: "Extract requirements" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message the proposal assistant"), { target: { value: "Extract requirements" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

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

  test('first file turn and acknowledgement precede upload progress even while proposal creation waits', async () => {
    let finishCreate!: (value: {success:boolean; message:string}) => void;
    mockedCreateProposal.mockReturnValueOnce(new Promise(resolve => { finishCreate = resolve; }));
    render(<AssistantWorkspacePage />);
    await screen.findByText(/Good (Morning|Afternoon|Evening), Travis/);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {target:{files:[new File(['brief'], 'slow-brief.txt', {type:'text/plain'})]}});
    fireEvent.click(screen.getByRole('button', {name:'Send message'}));
    const userTurn = screen.getByTestId('attachment-user-turn');
    const acknowledgement = screen.getByTestId('attachment-acknowledgement');
    const progress = screen.getByRole('status', {name:'Attachment progress'});
    expect(userTurn).toHaveTextContent('slow-brief.txt');
    expect(userTurn.compareDocumentPosition(acknowledgement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(acknowledgement.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mockedCreateSession).not.toHaveBeenCalled();
    expect(screen.queryByText('What is this event called?')).not.toBeInTheDocument();
    await act(async () => finishCreate({success:false,message:'Synthetic creation failure'}));
    expect(screen.queryByRole('status', {name:'Attachment progress'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name:'Remove slow-brief.txt'})).toBeInTheDocument();
  });

  test("empty conversation field gaps cannot appear before a new proposal's first attachment message", async () => {
    mockedGetConversation.mockResolvedValue({
      ...conversationWithGuidedQuestions([eventNameQuestion]),
      data: { ...conversationWithGuidedQuestions([eventNameQuestion]).data, messages: [] },
    });
    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    expect(await screen.findByText(/Share a few event details or attach a brief below/)).toBeInTheDocument();
    expect(screen.queryByText('What is this event called?')).not.toBeInTheDocument();
    expect(screen.queryByText('Guided question 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar', {name:'Key questions progress'})).not.toBeInTheDocument();
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
    expect(screen.queryByText("Key questions")).not.toBeInTheDocument();
    expect(screen.queryByText("AI workspace")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add notes" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message the proposal assistant"), { target: { value: "Plan a gala dinner." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    // Once the send lands the rail slides in and stays.
    expect(await screen.findByRole("heading", { name: "Key questions" })).toBeInTheDocument();
    expect(screen.getAllByText("AI workspace")).toHaveLength(2);
    const toolsToggle = screen.getByLabelText("Toggle AI workspace tools");
    expect(screen.getByTestId("mobile-ai-workspace-disclosure")).toHaveClass(
      "bg-[#eef8f7]",
      "border-y",
      "xl:bg-transparent",
    );
    expect(toolsToggle).toHaveClass("hover:bg-[#e5f4f2]");
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
      "[scrollbar-gutter:stable]",
    );
    expect(screen.getByRole("region", { name: "AI workspace overview and questions" })).toHaveAttribute("tabindex", "0");
    expect(screen.queryByText("Suggested tasks")).not.toBeInTheDocument();
    expect(screen.getByText("Key questions")).toBeInTheDocument();
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
      expect(await screen.findByRole('status', { name: 'Attachment progress' })).toHaveTextContent('Checking your file');
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

      expect(await screen.findByText(/venue.pdf couldn’t be processed/)).toBeInTheDocument();
      // The watch is over: the status line is gone and extraction never fires.
      expect(screen.queryByText(/Checking your file/)).not.toBeInTheDocument();
      await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
      expect(extractCalls()).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test("a blocked (malware) scan shows the inline notice instead of auto-running extraction", async () => {
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

      sourceStatus = "blocked";
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

      expect(await screen.findByText(/venue.pdf couldn’t be processed/)).toBeInTheDocument();
      await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
      expect(extractCalls()).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test("the auto-extraction intent survives leaving the page while the scan runs", async () => {
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

      const first = render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await stageAndSendFile();
      await waitFor(() => expect(mockedPostMessage).toHaveBeenCalledTimes(1));
      // The planner navigates away (or reloads) before the scan settles.
      first.unmount();
      expect(extractCalls()).toHaveLength(0);

      // Coming back to the proposal — a fresh mount, as after a reload or from
      // another tab — resumes the watch and still extracts exactly once.
      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      sourceStatus = "ready";
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
      await waitFor(() => expect(extractCalls()).toHaveLength(1));
      expect(extractCalls()[0][1]).toEqual({
        content: "Extracting requirements from the attached files.",
        intent: "extract_requirements",
        sourceIds: ["src-new"],
      });
      await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
      expect(extractCalls()).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test("a refused extraction send is retried automatically", async () => {
    jest.useFakeTimers();
    try {
      mockedListSources.mockResolvedValue({
        success: true as const,
        correlationId: "test-correlation",
        data: [sourceRow("ready")],
      });
      mockUploadChain();
      let extractAttempts = 0;
      mockedPostMessage.mockImplementation(async (_proposalId, input) => {
        if ((input as { intent: string }).intent === "extract_requirements" && ++extractAttempts === 1) {
          // e.g. the API had no healthy target for a moment.
          return { success: false as const, code: "HTTP_503", message: "The operation could not be completed safely (HTTP_503).", correlationId: "test-correlation" };
        }
        return {
          success: true as const,
          correlationId: "test-correlation",
          data: { created: true, message: null, assistantMessageId: null, run: null },
        };
      });

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await stageAndSendFile();
      await waitFor(() => expect(extractCalls()).toHaveLength(1));

      await act(async () => { await jest.advanceTimersByTimeAsync(AUTO_EXTRACT_RETRY_DELAY_MS + 1_000); });
      await waitFor(() => expect(extractCalls()).toHaveLength(2));
      // Accepted on the retry: nothing further is sent.
      await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
      expect(extractCalls()).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  test("a resumed intent skips sources the thread already extracted", async () => {
    jest.useFakeTimers();
    try {
      window.localStorage.setItem(autoExtractKey(PROPOSAL_ID), JSON.stringify({ pending: ["src-new"], handled: [] }));
      mockedListSources.mockResolvedValue({
        success: true as const,
        correlationId: "test-correlation",
        data: [sourceRow("ready")],
      });
      mockedGetConversation.mockResolvedValue({
        ...conversationWithQuestion,
        data: {
          ...conversationWithQuestion.data,
          messages: [
            {
              id: "msg-extract-1", ordinal: 1, role: "user" as const, kind: "action_request" as const,
              content: "Extracting requirements from the attached files.", intent: "extract_requirements",
              runType: null, runId: null, jobId: null, status: "complete" as const, createdAt: "2026-07-21T10:00:00.000Z",
              attachments: [{ sourceId: "src-new", role: "input", filename: "venue.pdf", sourceStatus: "ready" }],
            },
          ],
        },
      });
      mockedPostMessage.mockResolvedValue({
        success: true,
        correlationId: "test-correlation",
        data: { created: true, message: null, assistantMessageId: null, run: null },
      });

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await screen.findByLabelText("Message the proposal assistant");
      await act(async () => { await jest.advanceTimersByTimeAsync(30_000); });

      expect(extractCalls()).toHaveLength(0);
      expect(JSON.parse(window.localStorage.getItem(autoExtractKey(PROPOSAL_ID)) ?? "{}")).toEqual({ pending: [], handled: ["src-new"] });
    } finally {
      jest.useRealTimers();
    }
  });

  const chatMessageWithAttachment = (createdAt: string) => ({
    ...conversationWithQuestion,
    data: {
      ...conversationWithQuestion.data,
      messages: [
        {
          id: "msg-attach-1", ordinal: 1, role: "user" as const, kind: "instruction" as const,
          content: "Please review the attached file.", intent: "chat",
          runType: null, runId: null, jobId: null, status: "complete" as const, createdAt,
          attachments: [{ sourceId: "src-new", role: "input", filename: "venue.pdf", sourceStatus: "ready" }],
        },
      ],
    },
  });

  test("opening a proposal whose recent attachment was never extracted resumes the extraction from the thread", async () => {
    jest.useFakeTimers();
    try {
      // No local intent at all: another device, a cleared browser, or a tab
      // that sent the file on an older build and then reloaded.
      mockedListSources.mockResolvedValue({
        success: true as const,
        correlationId: "test-correlation",
        data: [sourceRow("ready")],
      });
      mockedGetConversation.mockResolvedValue(chatMessageWithAttachment(new Date(Date.now() - 60_000).toISOString()));
      mockedPostMessage.mockResolvedValue({
        success: true,
        correlationId: "test-correlation",
        data: { created: true, message: null, assistantMessageId: null, run: null },
      });

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await screen.findByText("Please review the attached file.");
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

      await waitFor(() => expect(extractCalls()).toHaveLength(1));
      expect(extractCalls()[0][1]).toEqual({
        content: "Extracting requirements from the attached files.",
        intent: "extract_requirements",
        sourceIds: ["src-new"],
      });
      await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
      expect(extractCalls()).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test("an attachment older than a day is not extracted retroactively on open", async () => {
    jest.useFakeTimers();
    try {
      mockedListSources.mockResolvedValue({
        success: true as const,
        correlationId: "test-correlation",
        data: [sourceRow("ready")],
      });
      mockedGetConversation.mockResolvedValue(chatMessageWithAttachment(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()));
      mockedPostMessage.mockResolvedValue({
        success: true,
        correlationId: "test-correlation",
        data: { created: true, message: null, assistantMessageId: null, run: null },
      });

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await screen.findByText("Please review the attached file.");
      await act(async () => { await jest.advanceTimersByTimeAsync(30_000); });
      expect(extractCalls()).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test("an intent left in sessionStorage by an earlier build is migrated and resumed", async () => {
    jest.useFakeTimers();
    try {
      window.sessionStorage.setItem(autoExtractKey(PROPOSAL_ID), JSON.stringify({ pending: ["src-new"], handled: [] }));
      mockedListSources.mockResolvedValue({
        success: true as const,
        correlationId: "test-correlation",
        data: [sourceRow("ready")],
      });
      mockedPostMessage.mockResolvedValue({
        success: true,
        correlationId: "test-correlation",
        data: { created: true, message: null, assistantMessageId: null, run: null },
      });

      render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
      await screen.findByLabelText("Message the proposal assistant");
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

      await waitFor(() => expect(extractCalls()).toHaveLength(1));
      expect(window.sessionStorage.getItem(autoExtractKey(PROPOSAL_ID))).toBeNull();
      expect(JSON.parse(window.localStorage.getItem(autoExtractKey(PROPOSAL_ID)) ?? "{}")).toEqual({ pending: [], handled: ["src-new"] });
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

  test("a completed extraction stays read-only without showing the retired suggestions notice", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun());
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal.mockResolvedValue({
      success: true,
      data: { _id: PROPOSAL_ID, version: 7, event: { eventName: "Annual Gala" } },
    } as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    expect(await screen.findByText("I reviewed your sources and extracted the requirements below.")).toBeInTheDocument();
    expect(screen.queryByText(/Added .* field.* to your proposal/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Suggestions · not yet confirmed/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Review suggestions" })).not.toBeInTheDocument();
  });

  // ── Captured-details summary removal ───────────────────────────────────────

  const OVERVIEW_HEADING = "Here’s what I have for Annual Leadership Summit";

  // Proposal data remains available to the rail count and downstream actions;
  // it is no longer repeated as a summary card in the conversation.
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

  test("captured details are not repeated in the conversation while next actions remain available", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun([]));
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal.mockResolvedValue(capturedProposal);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByRole("button", { name: "Generate proposal draft" })).toBeInTheDocument();
    expect(screen.queryByText(OVERVIEW_HEADING)).not.toBeInTheDocument();
    expect(screen.queryByText("Confirmed in proposal")).not.toBeInTheDocument();
    expect(screen.queryByText(/details captured from your sources/)).not.toBeInTheDocument();
    expect(screen.queryByText(/need your explicit review/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Review suggestions" })).not.toBeInTheDocument();
    // The action-only fallback keeps the workflow moving without the summary.
    expect(screen.getByRole("link", { name: "Edit all details" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open RFP questions" })).not.toBeInTheDocument();
  });

  test("the removed summary never appears before extraction, with an open question, or after a draft", async () => {
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
    await screen.findByText("When does the event start?");
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

  test("Generate proposal draft re-reads the authoritative version even when one is cached", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun([]));
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal
      .mockResolvedValueOnce({
        ...capturedProposal,
        data: { ...capturedProposal.data, version: 8 },
      } as never)
      .mockResolvedValue({
        ...capturedProposal,
        data: { ...capturedProposal.data, version: 9 },
      } as never);
    mockedPostMessage.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: { created: true, message: null, assistantMessageId: null, run: { runType: "proposal_draft", runId: "run-2", jobId: "job-2" } },
    });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    const generate = await screen.findByRole("button", { name: "Generate proposal draft" });
    await waitFor(() => expect(mockedGetProposal).toHaveBeenCalledTimes(1));
    fireEvent.click(generate);

    await waitFor(() => expect(mockedGetProposal).toHaveBeenCalledTimes(2));
    expect(mockedPostMessage).toHaveBeenCalledWith(
      PROPOSAL_ID,
      { content: "Generate a proposal draft from the current information.", intent: "generate_draft", expectedProposalVersion: 9 },
      expect.any(String),
    );
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

  test("removing the summary does not restore the retired suggestions notice or apply extracted operations", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithCompletedRun());
    mockedGetProposalContext.mockResolvedValue(contextRunResult);
    mockedGetProposal.mockResolvedValue(capturedProposal);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByRole("button", { name: "Generate proposal draft" })).toBeInTheDocument();
    expect(screen.queryByText(/details captured from your sources/)).not.toBeInTheDocument();
    expect(screen.queryByText(/need your explicit review/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Review suggestions" })).not.toBeInTheDocument();
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

  test("completed draft sections remove field-key chips and emphasize important facts without highlight fills", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithDraft());
    mockedGetProposal.mockResolvedValue(proposalAtVersion(7));
    mockedGetDraft.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        run: { id: "run-2", model: "gpt-test", expected_proposal_version: 7 },
        sections: [
          {
            id: "section-1",
            key: "event_overview",
            heading: "Event Overview",
            ordinal: 0,
            paragraphs: [{
              text: "Northstar Leadership Summit 2026 is a corporate conference scheduled for September 14–16, 2026, with 450 attendees listed. The event format is hybrid.",
              citations: ["/content/event/endDate", "/content/event/eventName", "/content/event/startDate"],
            }],
            decision: null,
            decisionReason: null,
          },
          {
            id: "section-2",
            key: "format_experience",
            heading: "Format and Experience",
            ordinal: 1,
            paragraphs: [{
              text: "The event format is listed as Hybrid.",
              citations: ["/content/event/eventFormat"],
            }],
            decision: null,
            decisionReason: null,
          },
          {
            id: "section-3",
            key: "venue_schedule",
            heading: "Venue and Schedule",
            ordinal: 2,
            paragraphs: [{
              text: "The venue is Lakeside Grand Chicago in Chicago, Illinois, with the event set in the America/Chicago time zone. The venue type is listed as Cruise Ship. The venue schedule indicates four event rooms.",
              citations: ["/content/venue/name", "/content/venue/city", "/content/venue/type"],
            }],
            decision: null,
            decisionReason: null,
          },
          {
            id: "section-4",
            key: "production_scope",
            heading: "Production Scope",
            ordinal: 3,
            paragraphs: [{
              text: "Production requirements explicitly include in-house AV, rigging, and power drops. Human captioning is also specified for the hybrid delivery.",
              citations: ["/content/technical/av", "/content/hybrid/captioning"],
            }],
            decision: null,
            decisionReason: null,
          },
          {
            id: "section-5",
            key: "venue_technical",
            heading: "Venue Technical",
            ordinal: 4,
            paragraphs: [{
              text: "The venue requires in-house AV, rigging, power drops, and venue access requirements are marked yes. No further technical specifications were provided.",
              citations: ["/content/venue/technical"],
            }],
            decision: null,
            decisionReason: null,
          },
          {
            id: "section-6",
            key: "budget_procurement",
            heading: "Budget and Procurement",
            ordinal: 5,
            paragraphs: [{
              text: "The proposal submission due date is October 31, 2026. No budget tier or question deadline was provided.",
              citations: ["/content/procurement/proposalDueDate"],
            }],
            decision: null,
            decisionReason: null,
          },
          {
            id: "section-7",
            key: "information_gaps",
            heading: "Information Gaps",
            ordinal: 6,
            paragraphs: [
              {
                text: "Missing information includes event objectives and audience profile beyond total attendance; detailed show format and content plan; room-by-room set-up and technical needs; load-out/strike timing; internet, rigging, and power specifications; AV/vendor coordination details; procurement question deadline; budget tier; and vendor submission or confidentiality terms.",
                citations: [],
              },
              {
                text: "The supplied evidence does not specify room-by-room setups, show times, strike timing, detailed technical specifications, crew counts, in-house AV constraints, procurement submission rules beyond dates, confidentiality or coordination clauses beyond draft status, or a final evaluation matrix.",
                citations: [],
              },
              {
                text: "Technical requirements remain unspecified: internet bandwidth and redundancy; security staffing; load-out timing.",
                citations: [],
              },
            ],
            decision: null,
            decisionReason: null,
          },
        ],
        gaps: [],
        regenerations: [],
        proposalMutation: false,
      },
    } as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    const draftSection = await screen.findByTestId("draft-section-event_overview");
    expect(draftSection).toHaveTextContent(
      "Northstar Leadership Summit 2026 is a corporate conference scheduled for September 14–16, 2026, with 450 attendees listed. The event format is hybrid.",
    );
    expect(screen.getByRole("heading", { name: "Proposal draft ready" })).toBeInTheDocument();
    expect(screen.getByLabelText("Proposal draft preview")).toBeInTheDocument();
    expect(screen.getByText("7 sections")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete 21 missing details" }))
      .toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`);
    expect(screen.getByRole("link", { name: "Complete 21 missing details" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
    const draftPreview = screen.getByLabelText("Proposal draft preview");
    expect(within(draftPreview).queryByLabelText("Sources")).not.toBeInTheDocument();
    expect(within(draftSection).queryByText("End date")).not.toBeInTheDocument();
    expect(within(draftSection).queryByText("Event name")).not.toBeInTheDocument();
    expect(within(draftSection).queryByText("Start date")).not.toBeInTheDocument();
    expect(
      Array.from(draftSection.querySelectorAll("mark"), (mark) =>
        mark.textContent,
      ),
    ).toEqual(
      [
        "Northstar Leadership Summit 2026",
        "corporate conference",
        "September 14–16, 2026",
        "450 attendees",
        "hybrid",
      ],
    );
    const formatSection = screen.getByTestId("draft-section-format_experience");
    const venueSection = screen.getByTestId("draft-section-venue_schedule");
    const productionSection = screen.getByTestId("draft-section-production_scope");
    const venueTechnicalSection = screen.getByTestId("draft-section-venue_technical");
    const budgetSection = screen.getByTestId("draft-section-budget_procurement");
    const gapsSection = screen.getByTestId("draft-section-information_gaps");
    expect(
      Array.from(formatSection.querySelectorAll("mark"), (mark) => mark.textContent),
    ).toEqual(["Hybrid"]);
    expect(
      Array.from(venueSection.querySelectorAll("mark"), (mark) => mark.textContent),
    ).toEqual([
      "Lakeside Grand Chicago",
      "Chicago, Illinois",
      "America/Chicago",
      "Cruise Ship",
      "four event rooms",
    ]);
    expect(
      Array.from(productionSection.querySelectorAll("mark"), (mark) => mark.textContent),
    ).toEqual([
      "in-house AV, rigging, and power drops",
      "Human captioning",
    ]);
    expect(
      Array.from(venueTechnicalSection.querySelectorAll("mark"), (mark) => mark.textContent),
    ).toEqual([
      "in-house AV, rigging, power drops, and venue access requirements are marked yes",
      "further technical specifications",
    ]);
    expect(
      Array.from(budgetSection.querySelectorAll("mark"), (mark) => mark.textContent),
    ).toEqual([
      "October 31, 2026",
      "budget tier or question deadline",
    ]);
    expect(gapsSection.querySelectorAll("mark")).toHaveLength(0);
    expect(within(gapsSection).getByText("21 details still needed")).toBeInTheDocument();
    const gapList = within(gapsSection).getByRole("list", {
      name: "Missing proposal details",
    });
    expect(within(gapList).getAllByRole("listitem")).toHaveLength(21);
    expect(within(gapList).getByText("Event objectives and audience profile beyond total attendance")).toBeInTheDocument();
    expect(within(gapList).getByText("Detailed show format and content plan")).toBeInTheDocument();
    expect(within(gapList).getByText("Vendor submission or confidentiality terms")).toBeInTheDocument();
    for (const mark of screen.getByLabelText("Proposal draft preview").querySelectorAll("mark")) {
      expect(mark).toHaveClass("bg-transparent", "p-0", "font-bold", "text-slate-950");
      expect(mark).not.toHaveClass("bg-emerald-100/80");
    }
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
    expect(screen.queryByText("gpt-test")).not.toBeInTheDocument();
  });

  test("asking the assistant to use typed messages reports what happened", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithDraft([]));
    mockedCloseSegment.mockResolvedValue({ success: true, correlationId: "c", data: { created: true } });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(screen.getByLabelText("Message the proposal assistant"), { target: { value: "Use what I've told you" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

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
    // live workflow: the command explains itself instead of calling the backend.
    await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(screen.getByLabelText("Message the proposal assistant"), { target: { value: "Use what I've told you" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText(/isn't switched on/i)).toBeInTheDocument();
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

  test("a failed draft shows the backend's conflict-specific recovery guidance", async () => {
    const conflictCopy = "The proposal changed while drafting. Please regenerate the draft.";
    mockedGetConversation.mockResolvedValue({
      success: true,
      correlationId: "test-correlation",
      data: {
        conversation: { id: "conv-1", title: "Proposal assistant", status: "active", messageCount: 1, updatedAt: "2026-07-21T10:01:00.000Z" },
        questions: [],
        messages: [{
          id: "draft-conflict", ordinal: 1, role: "assistant", kind: "run_result", content: conflictCopy,
          intent: null, runType: "proposal_draft", runId: "run-1", jobId: "job-1", status: "failed",
          createdAt: "2026-07-21T10:01:00.000Z", attachments: [],
        }],
      },
    } as never);
    mockedGetProposal.mockResolvedValue({
      success: true,
      message: "ok",
      data: { _id: PROPOSAL_ID, version: 9, event: { eventName: "Annual Leadership Summit" } },
    } as never);

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(conflictCopy);
    expect(screen.queryByText("Draft generation did not finish. Try again.")).not.toBeInTheDocument();
  });

  test("nothing new to use is reported as a normal outcome, not an error", async () => {
    mockedGetConversation.mockResolvedValue(conversationWithDraft([]));
    mockedCloseSegment.mockResolvedValue({ success: true, correlationId: "c", data: { created: false, reason: "insufficient" } });

    render(<AssistantWorkspacePage initialProposalId={PROPOSAL_ID} />);
    await screen.findByLabelText("Message the proposal assistant");
    fireEvent.change(screen.getByLabelText("Message the proposal assistant"), { target: { value: "Use what I've told you" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

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
    const guidanceCard = screen.getByTestId("guidance-card");
    expect(guidanceCard).toHaveClass("w-full", "max-w-3xl");
    expect(guidanceCard).not.toHaveClass("sm:max-w-[85%]");
    expect(guidanceCard.closest("li")).toHaveClass(
      "items-start",
      "gap-2.5",
      "sm:gap-3",
    );
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
      .mockResolvedValue(conversationWithDraft([roomsAnsweredQuestion]));
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

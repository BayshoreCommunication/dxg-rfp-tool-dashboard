import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ProposalWorkflowShell from "./ProposalWorkflowShell";
import { getProposalWorkflowAction, setProposalWorkflowStepAction } from "@/app/actions/proposalWorkflow";

// The panels have their own suites; here they only need to prove they are still
// mounted next to the editor. A function declaration (not a const) so it is
// hoisted above the jest.mock calls jest moves to the top of the file.
function panel(testId: string) {
  return {
    __esModule: true,
    default: ({ proposalId }: { proposalId: string }) => <div data-testid={testId}>{proposalId}</div>,
  };
}

jest.mock("./ProposalContextPanel", () => panel("proposal-context"));
jest.mock("./ProposalDraftPanel", () => panel("proposal-draft"));
jest.mock("./GuidancePanel", () => panel("guidance"));
jest.mock("./KeyQuestionsPanel", () => panel("key-questions"));

jest.mock("@/app/actions/proposalWorkflow", () => ({
  getProposalWorkflowAction: jest.fn(),
  setProposalWorkflowStepAction: jest.fn(),
}));

const mockedGetWorkflow = getProposalWorkflowAction as jest.MockedFunction<typeof getProposalWorkflowAction>;
const mockedSetStep = setProposalWorkflowStepAction as jest.MockedFunction<typeof setProposalWorkflowStepAction>;

const PROPOSAL_ID = "abc123abc123abc123abc123";

const workflow = {
  success: true as const,
  data: {
    workflow: { currentStep: 1 as const },
    // The server derives the open-question count with the phase and next
    // action; the stepper reads it from here rather than keeping its own.
    facts: { openQuestionCount: 2 },
    steps: [
      { id: 1 as const, key: "provide", label: "Provide Information", status: "in_progress" as const, summary: "2 sources ready" },
      { id: 2 as const, key: "draft", label: "Review the Draft", status: "available" as const, summary: "No draft yet" },
      { id: 3 as const, key: "questions", label: "Answer Key Questions", status: "available" as const, summary: "2 key question(s) remaining" },
      { id: 4 as const, key: "guidance", label: "See Guidance", status: "gated" as const, summary: "Not enabled" },
      { id: 5 as const, key: "publish", label: "Publish", status: "gated" as const, summary: "Not ready" },
    ],
  },
};

describe("ProposalWorkflowShell", () => {
  const savedFlag = process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = "true";
    mockedGetWorkflow.mockResolvedValue(workflow as never);
    // Selecting a step calls through to the backend; without this the shell
    // reads `success` off undefined.
    mockedSetStep.mockResolvedValue(workflow as never);
  });

  afterAll(() => {
    if (savedFlag === undefined) delete process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;
    else process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = savedFlag;
  });

  test("keeps the five-step stepper and links out to the assistant", async () => {
    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} />);

    // The stepper stays: all five cards with their per-step status lines.
    expect(await screen.findByText("2 sources ready")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Proposal creation steps" })).toBeInTheDocument();
    for (const label of ["Provide Information", "Review the Draft", "Answer Key Questions", "See Guidance", "Publish"])
      expect(screen.getByRole("button", { name: new RegExp(label) })).toBeInTheDocument();

    // The assistant is reached by link, not by a second embedded copy.
    expect(screen.getByRole("link", { name: /Open the assistant/ }))
      .toHaveAttribute("href", `/proposals/${PROPOSAL_ID}/assistant`);
    expect(screen.queryByText(/The assistant drafts the RFP/)).toBeInTheDocument();
    expect(screen.getByText("Keep control")).toBeInTheDocument();
    expect(screen.getByText("Nothing is published automatically.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("0 of 5 stages ready")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Ask a question or describe what you need/)).not.toBeInTheDocument();
  });

  test("sends published proposals to the vendor response inbox", async () => {
    mockedGetWorkflow.mockResolvedValue({
      success: true,
      data: {
        ...workflow.data,
        workflow: { currentStep: 5 },
        state: {
          phase: "published",
          headline: "Sent to vendors",
          nextAction: "none",
          nextActionLabel: "No next action",
        },
      },
    } as never);

    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} proposalName="Testing Proposal" />);

    expect(await screen.findByText("Your proposal is live and accepting responses.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View vendor responses/ }))
      .toHaveAttribute("href", "/vendor-responses");
  });

  test("step statuses and summaries are rendered, not recomputed", async () => {
    // The panel reported its own question count up into local state and the
    // stepper patched step 3 with it, so two definitions of "answered" could
    // disagree in the same view. The server derives every status and summary
    // from one phase; the shell now only renders them.
    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} />);
    expect(await screen.findByText("2 key question(s) remaining")).toBeInTheDocument();
    for (const summary of ["2 sources ready", "No draft yet", "Not enabled", "Not ready"])
      expect(screen.getByText(summary)).toBeInTheDocument();
  });

  test("marks completed stages with an emerald check and highlights the selected stage", async () => {
    mockedGetWorkflow.mockResolvedValue({
      success: true,
      data: {
        ...workflow.data,
        steps: workflow.data.steps.map((item) => ({ ...item, status: "complete" as const })),
      },
    } as never);

    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} />);
    await screen.findByText("2 sources ready");

    for (const [index, label] of ["Provide Information", "Review the Draft", "Answer Key Questions", "See Guidance", "Publish"].entries()) {
      const stage = screen.getByRole("button", { name: new RegExp(label) });
      const indicator = stage.firstElementChild;
      expect(stage).toHaveClass("h-full");
      // Completed stages replace the number with a check icon.
      expect(within(stage).queryByText(String(index + 1))).not.toBeInTheDocument();
      expect(stage.querySelector("svg")).toBeInTheDocument();
      // The selected stage keeps the blue highlight; other completed stages
      // read as done in emerald.
      if (index === 0) expect(indicator).toHaveClass("bg-[#0786cf]", "text-white");
      else expect(indicator).toHaveClass("bg-emerald-500", "text-white");
    }
  });

  test("one click remains selected when the initial workflow load resolves late", async () => {
    let resolveInitialLoad!: (value: typeof workflow) => void;
    mockedGetWorkflow.mockImplementation(() => new Promise<typeof workflow>((resolve) => {
      resolveInitialLoad = resolve;
    }) as never);

    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} />);

    const draftStage = screen.getByRole("button", { name: /Review the Draft/ });
    expect(draftStage).toHaveClass("bg-[#f8fafb]");
    fireEvent.click(draftStage);

    await waitFor(() => expect(draftStage).toHaveAttribute("aria-current", "step"));
    await act(async () => { resolveInitialLoad(workflow); });

    expect(draftStage).toHaveAttribute("aria-current", "step");
    expect(mockedSetStep).toHaveBeenCalledTimes(1);
  });

  test("a stage clicked while another stage is saving is not dropped", async () => {
    let resolveFirstSave!: (value: typeof workflow) => void;
    mockedSetStep.mockImplementationOnce(() => new Promise<typeof workflow>((resolve) => {
      resolveFirstSave = resolve;
    }) as never);

    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} />);
    await screen.findByText("2 sources ready");

    const draftStage = screen.getByRole("button", { name: /Review the Draft/ });
    const questionsStage = screen.getByRole("button", { name: /Answer Key Questions/ });
    fireEvent.click(draftStage);
    fireEvent.click(questionsStage);

    expect(questionsStage).toHaveAttribute("aria-current", "step");
    expect(questionsStage).not.toBeDisabled();

    await act(async () => { resolveFirstSave(workflow); });
    await waitFor(() => expect(mockedSetStep).toHaveBeenCalledTimes(2));

    expect(mockedSetStep).toHaveBeenNthCalledWith(2, PROPOSAL_ID, 3);
    expect(questionsStage).toHaveAttribute("aria-current", "step");
  });

  test("drops the workflow framing above the stepper", async () => {
    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} />);
    await screen.findByText("2 sources ready");

    expect(screen.queryByText(/Assisted proposal/)).not.toBeInTheDocument();
    expect(screen.queryByText("Create your proposal in five steps")).not.toBeInTheDocument();
    expect(screen.queryByText(/You control every saved change/)).not.toBeInTheDocument();
  });

  test("shows the step's technical panels expanded on arrival", async () => {
    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} />);
    await screen.findByText("2 sources ready");

    // Step 2's panels, visible without opening the disclosure first — the
    // assistant's deep links navigate straight here.
    fireEvent.click(screen.getByRole("button", { name: /Review the Draft/ }));
    await waitFor(() => expect(screen.getByTestId("proposal-context")).toHaveTextContent(PROPOSAL_ID));
    expect(screen.getByTestId("proposal-draft")).toHaveTextContent(PROPOSAL_ID);
    expect(document.querySelector("details")).toHaveAttribute("open");
  });

  test("shows readiness guidance without the removed historical comparison panel", async () => {
    mockedGetWorkflow.mockResolvedValue({
      success: true,
      data: {
        ...workflow.data,
        workflow: { currentStep: 4 },
        steps: workflow.data.steps.map((item) => item.id === 4
          ? { ...item, status: "available" as const, summary: "Ready to check" }
          : item),
      },
    } as never);

    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} />);

    expect(await screen.findByTestId("guidance")).toBeInTheDocument();
    expect(screen.queryByText("Learn from selected proposals")).not.toBeInTheDocument();
    expect(screen.queryByText(/Historical proposal insights/)).not.toBeInTheDocument();
    expect(screen.queryByText("Investment guidance")).not.toBeInTheDocument();
    expect(screen.queryByTestId("investment-guidance")).not.toBeInTheDocument();
  });

  test("hides pre-publish readiness guidance once the proposal is live, even with stale workflow state", async () => {
    mockedGetWorkflow.mockResolvedValue({
      success: true,
      data: {
        ...workflow.data,
        workflow: { currentStep: 4 },
        steps: workflow.data.steps.map((item) => item.id === 4
          ? { ...item, status: "complete" as const, summary: "Ready" }
          : item),
      },
    } as never);

    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} proposalIsPublished />);

    expect(await screen.findByText("Your proposal is live and accepting responses.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "See Guidance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check readiness" })).not.toBeInTheDocument();
  });

  test("continues to Contact & Publish with a smooth, focused transition", async () => {
    mockedGetWorkflow.mockResolvedValue({
      success: true,
      data: {
        ...workflow.data,
        workflow: { currentStep: 5 },
      },
    } as never);
    const onNavigateToFormStep = jest.fn();
    const target = document.createElement("section");
    const scrollIntoView = jest.fn();
    target.id = "contact-publish-section";
    target.tabIndex = -1;
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);

    render(
      <ProposalWorkflowShell
        proposalId={PROPOSAL_ID}
        onNavigateToFormStep={onNavigateToFormStep}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Continue to final details" }));

    expect(onNavigateToFormStep).toHaveBeenCalledWith(10);
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
      expect(target).toHaveFocus();
    });
    target.remove();
  });

  test("no longer renders the private document panel, but keeps the banner and the remaining panels", async () => {
    render(<ProposalWorkflowShell proposalId={PROPOSAL_ID} />);
    await screen.findByText("2 sources ready");

    // The duplicate upload/status panel is gone from the editor; files are
    // added on the assistant surface instead.
    expect(screen.queryByTestId("private-document-status")).not.toBeInTheDocument();
    expect(screen.queryByText(/Private document security check/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Reference file")).not.toBeInTheDocument();

    // Stepper and assistant banner stay. The old technical-details duplicate is
    // intentionally removed so the actual intake form begins immediately.
    expect(screen.getByRole("list", { name: "Proposal creation steps" })).toBeInTheDocument();
    expect(screen.getByText(/The assistant drafts the RFP/)).toBeInTheDocument();
    expect(screen.queryByText(/You can upload more than one source/)).not.toBeInTheDocument();

    // The other panels are untouched.
    fireEvent.click(screen.getByRole("button", { name: /Review the Draft/ }));
    await waitFor(() => expect(screen.getByTestId("proposal-context")).toBeInTheDocument());
    expect(screen.getByTestId("proposal-draft")).toBeInTheDocument();
  });
});

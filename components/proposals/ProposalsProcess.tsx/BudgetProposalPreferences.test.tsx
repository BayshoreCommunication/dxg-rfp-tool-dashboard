import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BudgetProposalPreferences from "./BudgetProposalPreferences";
import type { BudgetData, ProposalSettings } from "../AddNewProposal";

const settings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: {
    proposalLanguage: "English",
    defaultCurrency: "USD",
    priceSeparator: ",",
    decimalPrecision: "2",
    dateFormat: "MM-dd-yyyy",
    expiryDate: "7 days",
  },
} as unknown as ProposalSettings;

const budget = (overrides: Partial<BudgetData> = {}): BudgetData => ({
  estimatedAvBudget: "",
  budgetFlexibility: "",
  proposalFormatPreferences: [],
  evaluationMatrix: {
    technicalApproach: 25,
    crewExperience: 20,
    hybridVirtual: 20,
    pricing: 15,
    creativeScenic: 10,
    responsiveness: 7,
    sustainabilityDei: 3,
  },
  evaluationMatrixConfirmed: false,
  sustainabilityDeiNotes: "",
  vendorQuestionsDueDate: "",
  responseToVendorQuestionsDate: "",
  proposalSubmissionDueDate: "",
  shortlistNotificationDate: "",
  vendorPresentationOpportunity: "",
  vendorPresentationDate: "",
  vendorSelectionDate: "",
  decisionDate: "",
  competitiveBid: "",
  numberOfProposals: "",
  scoringNotes: "",
  callWithDxgProducer: "",
  howDidYouHear: "",
  howDidYouHearOther: "",
  ...overrides,
} as BudgetData);

const renderStep = (
  data: BudgetData,
  onChange = jest.fn(),
  event: { eventFormat?: string; hasScenicOnAnyRoom?: boolean; contentServicesNeeded?: string } = {},
) => {
  render(
    <BudgetProposalPreferences
      data={data}
      onChange={onChange}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      proposalSettings={settings}
      {...event}
    />,
  );
  return onChange;
};

describe("evaluation weightings", () => {
  test("the shipped defaults are presented as a suggestion, not the planner's choice", () => {
    // Vendors are scored on these numbers, so pre-populated weights must not
    // read as decisions the planner made.
    renderStep(budget());
    expect(screen.getByText(/suggested weightings/i)).toBeInTheDocument();
    expect(screen.queryByText(/Weightings confirmed/i)).not.toBeInTheDocument();
  });

  test("confirming the suggestion records the planner's acceptance", async () => {
    const user = userEvent.setup();
    const onChange = renderStep(budget());
    await user.click(screen.getByRole("button", { name: /Use these weightings/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ evaluationMatrixConfirmed: true }),
    );
  });

  test("rows hidden for the event carry no weight into what is saved", async () => {
    // Only the visible rows have to total 100, so a hidden row's shipped
    // default would otherwise be scored as weight the planner never saw.
    const user = userEvent.setup();
    const onChange = renderStep(budget(), jest.fn(), { eventFormat: "In-Person" });
    await user.click(screen.getByRole("button", { name: /Use these weightings/i }));
    expect(onChange).toHaveBeenCalledWith({
      evaluationMatrix: expect.objectContaining({ hybridVirtual: 0, creativeScenic: 0, technicalApproach: 25 }),
      evaluationMatrixConfirmed: true,
    });

    onChange.mockClear();
    await user.type(screen.getAllByRole("spinbutton")[0], "5");
    expect(onChange).toHaveBeenLastCalledWith({
      evaluationMatrix: expect.objectContaining({ hybridVirtual: 0, creativeScenic: 0 }),
      evaluationMatrixConfirmed: true,
    });
  });

  test("rows the event uses keep their weight", async () => {
    const user = userEvent.setup();
    const onChange = renderStep(budget(), jest.fn(), { eventFormat: "Hybrid", hasScenicOnAnyRoom: true });
    await user.click(screen.getByRole("button", { name: /Use these weightings/i }));
    expect(onChange).toHaveBeenCalledWith({
      evaluationMatrix: expect.objectContaining({ hybridVirtual: 20, creativeScenic: 10 }),
      evaluationMatrixConfirmed: true,
    });
  });

  test("adjusting a weight counts as accepting the weightings", async () => {
    const user = userEvent.setup();
    const onChange = renderStep(budget());
    const weights = screen.getAllByRole("spinbutton");
    await user.type(weights[0], "5");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ evaluationMatrixConfirmed: true }),
    );
  });

  test("an accepted matrix stops asking and says it will be published", () => {
    renderStep(budget({ evaluationMatrixConfirmed: true }));
    expect(screen.getByText(/Weightings confirmed/i)).toBeInTheDocument();
    expect(screen.queryByText(/suggested weightings/i)).not.toBeInTheDocument();
  });
});

describe("producer consultation guidance", () => {
  test("explains the value of a producer call before venue contracting", () => {
    renderStep(budget());

    const fieldLabel = screen.getByText(
      /Setup a call with a DXG producer helps clarify requirements, improve vendor responses, and advise on negotiation tactics with venues prior to signing an agreement\?/i,
    ).closest("label");
    expect(fieldLabel).not.toBeNull();
    expect(fieldLabel?.closest("[data-assistant-field-key]")).toHaveAttribute(
      "data-assistant-field-key",
      "/content/budgetPreferences/producerCallRequested",
    );
  });
});

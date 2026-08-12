import { render, screen, within } from "@testing-library/react";
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

const renderStep = (data: BudgetData, onChange = jest.fn()) => {
  render(
    <BudgetProposalPreferences
      data={data}
      onChange={onChange}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      proposalSettings={settings}
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
    expect(onChange).toHaveBeenCalledWith({ evaluationMatrixConfirmed: true });
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

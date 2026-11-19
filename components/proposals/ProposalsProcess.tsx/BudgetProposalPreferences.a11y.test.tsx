import { render, screen, within } from "@testing-library/react";

import type { BudgetData, ProposalSettings } from "../AddNewProposal";
import { buttonsInsideLabels, danglingReferences, duplicateIds } from "./a11yHelpers";
import BudgetProposalPreferences from "./BudgetProposalPreferences";

const settings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: { proposalLanguage: "English", defaultCurrency: "USD", priceSeparator: ",", decimalPrecision: "2", dateFormat: "MM-dd-yyyy", expiryDate: "7 days" },
} as unknown as ProposalSettings;

const budget = (overrides: Partial<BudgetData> = {}): BudgetData => ({
  estimatedAvBudget: "", budgetFlexibility: "", proposalFormatPreferences: [],
  evaluationMatrix: { technicalApproach: 25, crewExperience: 20, hybridVirtual: 20, pricing: 15, creativeScenic: 10, responsiveness: 7, sustainabilityDei: 3 },
  evaluationMatrixConfirmed: false, sustainabilityDeiNotes: "", vendorQuestionsDueDate: "", responseToVendorQuestionsDate: "",
  proposalSubmissionDueDate: "", shortlistNotificationDate: "", vendorPresentationOpportunity: "", vendorPresentationDate: "",
  vendorSelectionDate: "", decisionDate: "", competitiveBid: "", numberOfProposals: "", scoringNotes: "", callWithDxgProducer: "",
  howDidYouHear: "", howDidYouHearOther: "", ...overrides,
});

const renderStep = (overrides: Partial<BudgetData> = {}, mode: "basic" | "advanced" = "advanced", showErrors = true) =>
  render(
    <BudgetProposalPreferences
      data={budget(overrides)}
      onChange={jest.fn()}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors={showErrors}
      proposalSettings={settings}
      eventFormat="Hybrid"
      hasScenicOnAnyRoom
      hasLedWallOnAnyRoom
      contentServicesNeeded="YES"
      venueName="Hall"
      eventStartDate="2027-03-10"
      mode={mode}
    />,
  );

describe("BudgetProposalPreferences accessibility wiring", () => {
  test("named groups and selects for the choice questions", () => {
    renderStep({ budgetFlexibility: "Firm" });
    expect(screen.getByRole("group", { name: /Estimated AV Budget Range/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Investment Flexibility/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Proposal Format Requested/ })).toBeInTheDocument();
    for (const name of [/Will Vendors Be Given an Opportunity/, /Competitive Bid/, /Setup a call with an RFPilot producer/]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("combobox", { name: /How did you hear about this tool/ })).toBeInTheDocument();
  });

  test("each evaluation weight input is named after its criterion", () => {
    renderStep();
    const weights = screen.getAllByRole("spinbutton");
    expect(weights.length).toBeGreaterThanOrEqual(5);
    for (const weight of weights) expect(weight).toHaveAccessibleName();
    expect(screen.getByRole("spinbutton", { name: /Technical Approach/i })).toHaveValue(25);
  });

  test("text areas and conditional sub-fields are labelled", () => {
    renderStep({ competitiveBid: "YES", howDidYouHear: "Other" });
    expect(screen.getByRole("textbox", { name: /^Scoring Notes/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Sustainability & DEI Practices/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/How many vendors are being solicited/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Please specify/)).toBeInTheDocument();
  });

  test.each([["advanced", true], ["basic", true], ["advanced", false]] as const)(
    "no dangling references, duplicate ids or buttons inside labels (%s, errors=%s)",
    (mode, showErrors) => {
      renderStep({ competitiveBid: "YES", howDidYouHear: "Other" }, mode, showErrors);
      expect(danglingReferences()).toEqual([]);
      expect(duplicateIds()).toEqual([]);
      expect(buttonsInsideLabels()).toBe(0);
    },
  );

  test("the budget tier group exposes its tiers", () => {
    renderStep();
    const group = screen.getByRole("group", { name: /Estimated AV Budget Range/ });
    expect(within(group).getAllByRole("button").length + within(group).queryAllByRole("radio").length).toBeGreaterThan(0);
  });
});

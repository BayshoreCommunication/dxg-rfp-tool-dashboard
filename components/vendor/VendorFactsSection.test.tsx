import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import VendorFactsSection from "./VendorFactsSection";
import {
  createVendorIntelligenceAction,
  getLatestVendorIntelligenceAction,
  reviewVendorIntelligenceAction,
  type VendorIntelligenceResult,
} from "@/app/actions/vendorIntelligence";

jest.mock("@/app/actions/vendorIntelligence", () => ({
  createVendorIntelligenceAction: jest.fn(),
  getLatestVendorIntelligenceAction: jest.fn(),
  reviewVendorIntelligenceAction: jest.fn(),
}));

const latest = getLatestVendorIntelligenceAction as jest.MockedFunction<typeof getLatestVendorIntelligenceAction>;
const create = createVendorIntelligenceAction as jest.MockedFunction<typeof createVendorIntelligenceAction>;
const review = reviewVendorIntelligenceAction as jest.MockedFunction<typeof reviewVendorIntelligenceAction>;
const completed: VendorIntelligenceResult = {
  run: { runId: "run-1", jobId: "job-1", requirementSetId: "set-1", status: "succeeded", requirementCount: 1, mappedRequirementCount: 1, factCount: 2, contradictionCount: 1, warnings: [], safeErrorCode: null, createdAt: "2026-08-12T10:00:00Z", completedAt: "2026-08-12T10:01:00Z" },
  mappings: [{ mappingId: "mapping-1", requirementId: "requirement-1", requirementTitle: "Provide a complete staffing plan", requirementKind: "staffing", mandatory: true, relationship: "partially_supports", confidence: 0.78, ambiguityReasons: ["Shift coverage is unclear"], evidence: [{ fragmentId: "fragment-1", content: "Six technicians are included.", locator: { page: 7 }, sourceLabel: "Northstar.pdf" }] }],
  facts: [
    { factId: "fact-1", factKey: "commercial.total", family: "commercial", factType: "commercial_total", statement: "The proposal states a total of USD 120,000.", valueKind: "money", typedValue: { kind: "money", number: 120000, currency: "USD" }, normalizedValue: "USD 120000", unit: null, currency: "USD", explicitness: "explicit", confidence: 0.98, contradictionGroup: "contradiction:1234567890abcdef", citations: [{ fragmentId: "fragment-2", content: "Proposal total USD 120,000", locator: { page: 20 }, sourceLabel: "Northstar.pdf", role: "supports" }] },
    { factId: "fact-2", factKey: "commercial.total", family: "commercial", factType: "commercial_total", statement: "A revised page states a total of USD 128,000.", valueKind: "money", typedValue: { kind: "money", number: 128000, currency: "USD" }, normalizedValue: "USD 128000", unit: null, currency: "USD", explicitness: "explicit", confidence: 0.94, contradictionGroup: "contradiction:1234567890abcdef", citations: [{ fragmentId: "fragment-3", content: "Revised total USD 128,000", locator: { page: 22 }, sourceLabel: "Northstar.pdf", role: "supports" }] },
  ],
  reviews: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  latest.mockResolvedValue({ success: true, data: completed });
  create.mockResolvedValue({ success: true, data: completed.run });
  review.mockResolvedValue({ success: true, data: { reviewId: "review-1" } });
});

test("renders requirement relationships with inspectable source locations", async () => {
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  expect(await screen.findByText("Provide a complete staffing plan")).toBeInTheDocument();
  expect(screen.getByText("Partly answered")).toBeInTheDocument();
  // Quotes are no longer shown on the response page; they live in the comparison grid.
  expect(screen.queryByText(/See where/)).not.toBeInTheDocument();
  expect(screen.queryByText("Six technicians are included.")).not.toBeInTheDocument();
});

test("preserves contradictory facts and supports append-only correction review", async () => {
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide a complete staffing plan");
  fireEvent.click(screen.getByRole("tab", { name: "Stated values" }));
  expect(screen.getByText("Conflicting values")).toBeInTheDocument();
  expect(screen.getByText(/gives 2 different answers for the same item/)).toBeInTheDocument();
  expect(screen.getByText("$120,000")).toBeInTheDocument();
  expect(screen.getByText("$128,000")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Disagree with this?" })[0]);
  expect(screen.getByText(/Remove this value. It will not be used in scoring./)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Correct" }));
  fireEvent.change(screen.getByLabelText("Corrected value"), { target: { value: "USD 125000" } });
  fireEvent.click(screen.getByRole("button", { name: "Save correction" }));
  await waitFor(() => expect(review).toHaveBeenCalledWith(
    "proposal", "submission", "version", "run-1",
    expect.objectContaining({ targetType: "fact", targetId: "fact-1", decision: "corrected", correctedPayload: { normalizedValue: "USD 125000", typedValue: { kind: "money", number: 125000, currency: "USD" } } }),
    expect.any(String),
  ));
});

test("rejects a correction that does not match the extracted fact type", async () => {
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide a complete staffing plan");
  fireEvent.click(screen.getByRole("tab", { name: "Stated values" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Disagree with this?" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Correct" }));
  fireEvent.change(screen.getByLabelText("Corrected value"), { target: { value: "not a price" } });
  fireEvent.click(screen.getByRole("button", { name: "Save correction" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/does not match this fact’s type/i);
  expect(review).not.toHaveBeenCalled();
});

test("explains that intelligence cannot make an award decision", async () => {
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  expect(await screen.findByText(/Nothing here ranks or picks a winner/)).toBeInTheDocument();
});

test("does not show a read-problem banner for partial coverage; next steps stay available", async () => {
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide a complete staffing plan");
  expect(screen.queryByText(/could not be read/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Source coverage is incomplete/)).not.toBeInTheDocument();
  // Next steps stay available because the backend allows evaluation here.
  expect(screen.getByRole("link", { name: /Compare all vendors/ })).toBeInTheDocument();
});

test("sorts requirements into answered, partly answered and not answered columns", async () => {
  latest.mockResolvedValue({
    success: true,
    data: {
      ...completed,
      mappings: [
        { ...completed.mappings[0], mappingId: "m-answered", requirementTitle: "Provide load-in schedule", relationship: "supports", mandatory: false, confidence: 0.95 },
        { ...completed.mappings[0], mappingId: "m-partial", requirementTitle: "Provide a complete staffing plan", relationship: "partially_supports" },
        { ...completed.mappings[0], mappingId: "m-conflict", requirementTitle: "State the total price", relationship: "contradicts" },
        { ...completed.mappings[0], mappingId: "m-missing", requirementTitle: "Provide closed captions", relationship: "none", evidence: [] },
      ],
    },
  });
  render(<VendorFactsSection proposalId="p" submissionId="s" versionId="v" />);
  const answered = (await screen.findByRole("heading", { name: "Answered 1" })).closest("section")!;
  const partly = screen.getByRole("heading", { name: "Partly answered 2" }).closest("section")!;
  const missing = screen.getByRole("heading", { name: "Not answered 1" }).closest("section")!;
  expect(within(answered).getByText("Provide load-in schedule")).toBeInTheDocument();
  expect(within(partly).getByText("Provide a complete staffing plan")).toBeInTheDocument();
  expect(within(partly).getByText("State the total price")).toBeInTheDocument();
  expect(within(missing).getByText("Provide closed captions")).toBeInTheDocument();
  // The column already says the status; a chip is shown only where the exact status differs.
  expect(within(answered).queryByText("Answered", { selector: "span" })).not.toBeInTheDocument();
  expect(within(partly).getByText("Conflicting answers")).toBeInTheDocument();
  expect(screen.queryByText(/The vendor answered this requirement and we can show you where/)).not.toBeInTheDocument();
  expect(screen.getByText(/Read the quotes and decide whether the rest matters/)).toBeInTheDocument();
  expect(within(missing).queryByText(/Nothing in this response answers/)).not.toBeInTheDocument();
});

test("lets a planner correct a requirement's answer status using the cited evidence", async () => {
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide a complete staffing plan");
  expect(screen.getByRole("tab", { name: "Requirements" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText(/Each thing you asked for/)).toBeInTheDocument();
  expect(screen.queryByText(/Low AI confidence/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Disagree with this?" }));
  expect(screen.getByText("Treat this requirement as not answered by the vendor.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Correct" }));
  fireEvent.change(screen.getByLabelText("Corrected status"), { target: { value: "supports" } });
  fireEvent.click(screen.getByRole("button", { name: "Save correction" }));
  await waitFor(() => expect(review).toHaveBeenCalledWith(
    "proposal", "submission", "version", "run-1",
    expect.objectContaining({ targetType: "mapping", targetId: "mapping-1", decision: "corrected", correctedPayload: { relationship: "supports", fragmentIds: ["fragment-1"] } }),
    expect.any(String),
  ));
});

test("explains a failed load in plain words and offers a retry", async () => {
  latest
    .mockResolvedValueOnce({ success: false, code: "NETWORK_ERROR", message: "Vendor intelligence operation failed. (Connection terminated due to connection timeout)" })
    .mockResolvedValueOnce({ success: true, data: completed });
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  expect(await screen.findByText("Could not load the proposal intelligence analysis.")).toBeInTheDocument();
  expect(screen.getByText(/could not reach its database or API/)).toBeInTheDocument();
  expect(screen.queryByText(/Connection terminated/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Provide a complete staffing plan")).toBeInTheDocument();
});

test("opens with a plain-language purpose, a verdict sentence, and next steps", async () => {
  latest.mockResolvedValue({
    success: true,
    data: {
      ...completed,
      mappings: [
        { ...completed.mappings[0], mappingId: "m-answered", requirementTitle: "Provide load-in schedule", relationship: "supports", mandatory: false, confidence: 0.95 },
        { ...completed.mappings[0], mappingId: "m-partial", requirementTitle: "Provide a complete staffing plan", relationship: "partially_supports" },
        { ...completed.mappings[0], mappingId: "m-missing", requirementTitle: "Provide closed captions", relationship: "none", evidence: [], mandatory: true },
      ],
    },
  });
  render(<VendorFactsSection proposalId="proposal" proposalTitle="Annual Summit" vendorName="Northstar AV" vendorEmail="bids@northstar.example" submissionId="submission" versionId="version" />);
  expect(await screen.findByRole("heading", { name: "How Northstar AV answered your requirements" })).toBeInTheDocument();
  expect(screen.getByText(/Use this to see what Northstar AV left out/)).toBeInTheDocument();
  expect(await screen.findByTestId("requirements-verdict")).toHaveTextContent("1 of 3 requirements answered. 1 partly answered, 1 not answered, including 1 mandatory.");
  // Engine telemetry is gone.
  expect(screen.queryByText("Mapped")).not.toBeInTheDocument();
  expect(screen.queryByText("Analysis up to date")).not.toBeInTheDocument();
  // Each requirement sits in the column for its outcome.
  expect(within(screen.getByRole("heading", { name: "Not answered 1" }).closest("section")!).getByText("Provide closed captions")).toBeInTheDocument();
  // Next steps name the vendor and prefill the email.
  const next = screen.getByLabelText("What to do next");
  expect(next).toHaveTextContent(/Northstar AV left 2 requirements unanswered or only partly answered/);
  const ask = screen.getByRole("link", { name: /Ask Northstar AV about the 2 gaps/ });
  const href = decodeURIComponent((ask.getAttribute("href") ?? "").replace(/\+/g, " "));
  // Opens the composer as a one-to-one question, not a proposal campaign.
  expect(href).toContain("/email/send-email?mode=question&proposalId=proposal");
  expect(href).toContain("vendor=Northstar AV");
  expect(href).toContain("to=bids@northstar.example");
  expect(href).toContain("- Provide closed captions");
  expect(screen.queryByRole("link", { name: /Score this response/ })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Compare all vendors/ })).toHaveAttribute("href", "/proposals/proposal/intelligence");
});

test("an unavailable source keeps the vendor out of the comparison, said once in next steps", async () => {
  latest.mockResolvedValue({ success: true, data: { ...completed, run: { ...completed.run, warnings: [
    { code: "PAGE_COVERAGE_INCOMPLETE", sourceLabel: "Technical.pdf", message: "A page could not be extracted with OCR." },
    { code: "SOURCE_UNAVAILABLE", sourceLabel: "Technical.pdf", message: "This source was not available to proposal intelligence." },
  ] } } });
  render(<VendorFactsSection proposalId="proposal" proposalTitle="Annual Summit" vendorName="Northstar AV" vendorEmail="bids@northstar.example" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide a complete staffing plan");
  expect(screen.queryByText(/could not be used by the analysis/)).not.toBeInTheDocument();
  expect(screen.getByLabelText("What to do next")).toHaveTextContent(/Resolve the unavailable file above first/);
  expect(screen.queryByRole("link", { name: /Compare all vendors/ })).not.toBeInTheDocument();
});

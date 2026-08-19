import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  expect(screen.getByText("Partially Supports")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Show cited evidence (1)"));
  expect(screen.getByText("Northstar.pdf · page 7")).toBeInTheDocument();
  expect(screen.getByText("Six technicians are included.")).toBeInTheDocument();
});

test("preserves contradictory facts and supports append-only correction review", async () => {
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide a complete staffing plan");
  fireEvent.click(screen.getByRole("button", { name: "Typed facts" }));
  expect(screen.getAllByText("Contradiction")).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Correct" })[0]);
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
  fireEvent.click(screen.getByRole("button", { name: "Typed facts" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Correct" })[0]);
  fireEvent.change(screen.getByLabelText("Corrected value"), { target: { value: "not a price" } });
  fireEvent.click(screen.getByRole("button", { name: "Save correction" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/does not match this fact’s type/i);
  expect(review).not.toHaveBeenCalled();
});

test("explains that intelligence cannot make an award decision", async () => {
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  expect(await screen.findByText(/It does not rank, shortlist, or select the vendor/)).toBeInTheDocument();
});

test("makes incomplete source coverage visible and explains the evaluation block", async () => {
  latest.mockResolvedValue({ success: true, data: { ...completed, run: { ...completed.run, warnings: [{ code: "SOURCE_COVERAGE_INCOMPLETE", sourceLabel: "Technical.pdf", message: "This source was only partially readable." }] } } });
  render(<VendorFactsSection proposalId="proposal" submissionId="submission" versionId="version" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/evaluation and vendor comparison are blocked/i);
  expect(screen.getByRole("alert")).toHaveTextContent(/Technical\.pdf: This source was only partially readable/i);
});

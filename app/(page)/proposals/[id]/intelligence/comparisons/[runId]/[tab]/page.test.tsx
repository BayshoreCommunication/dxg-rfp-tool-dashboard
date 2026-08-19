import { render, screen } from "@testing-library/react";

const getProposal = jest.fn();
const getWorkspace = jest.fn();
const listComparisons = jest.fn();
const notFound = jest.fn(() => { throw new Error("NEXT_NOT_FOUND"); });

jest.mock("@/app/actions/proposals", () => ({ getProposalByIdAction: (...args: unknown[]) => getProposal(...args) }));
jest.mock("@/app/actions/comparisonOrchestration", () => ({
  getComparisonWorkspaceAction: (...args: unknown[]) => getWorkspace(...args),
  listComparisonsAction: (...args: unknown[]) => listComparisons(...args),
}));
jest.mock("next/navigation", () => ({ notFound }));
jest.mock("@/components/proposalIntelligence/ProposalIntelligenceWorkspace", () => ({
  __esModule: true,
  default: () => <div data-testid="workspace">workspace</div>,
}));

const id = "abc123abc123abc123abc123";
const runId = "019ff44e-6fd9-7450-98a7-3ba8e912e61a";
type PageType = (props: { params: Promise<{ id: string; runId: string; tab: string }> }) => Promise<React.ReactElement>;
const loadPage = async () => (await import("./page")).default as PageType;

beforeEach(() => {
  jest.clearAllMocks();
  getProposal.mockResolvedValue({ success: true, data: { event: { eventName: "Conference" } } });
  listComparisons.mockResolvedValue({ success: true, data: [] });
});

test("shows a recoverable service state instead of a false not-found page", async () => {
  getWorkspace.mockResolvedValue({ success: false, code: "NETWORK_ERROR", message: "The comparison service could not be reached." });
  const Page = await loadPage();
  render(await Page({ params: Promise.resolve({ id, runId, tab: "overview" }) }));
  expect(screen.getByRole("heading", { name: "Comparison workspace is temporarily unavailable" })).toBeInTheDocument();
  expect(screen.getByText(/saved comparison has not been deleted or replaced/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", `/proposals/${id}/intelligence/comparisons/${runId}/overview`);
  expect(notFound).not.toHaveBeenCalled();
});

test("preserves a true comparison not-found response", async () => {
  getWorkspace.mockResolvedValue({ success: false, code: "COMPARISON_NOT_FOUND", message: "This comparison could not be found." });
  const Page = await loadPage();
  await expect(Page({ params: Promise.resolve({ id, runId, tab: "overview" }) })).rejects.toThrow("NEXT_NOT_FOUND");
});

import { render, screen } from "@testing-library/react";

const getResponses = jest.fn();
const getProposal = jest.fn();
const getExtractions = jest.fn();
const getIntelligence = jest.fn();
jest.mock("@/app/actions/vendorResponse", () => ({
  getVendorResponsesAction: (...args: unknown[]) => getResponses(...args),
}));
jest.mock("@/app/actions/proposals", () => ({
  getProposalByIdAction: (...args: unknown[]) => getProposal(...args),
}));
jest.mock("@/app/actions/evidenceExtraction", () => ({
  getEvidenceExtractionsAction: (...args: unknown[]) => getExtractions(...args),
}));
jest.mock("@/app/actions/vendorIntelligence", () => ({
  getLatestVendorIntelligenceAction: (...args: unknown[]) => getIntelligence(...args),
}));
jest.mock("@/components/vendor/ProposalResponseCards", () => ({
  __esModule: true,
  default: ({ proposalTitle, responses }: { proposalTitle: string; responses: unknown[] }) => (
    <div data-testid="response-cards">{proposalTitle}:{responses.length}</div>
  ),
}));

const response = (id: string) => ({
  _id: id,
  proposalId: "proposal-1",
  proposalOwnerId: "owner-1",
  proposalTitle: "Annual Summit",
  vendorName: id,
  submittedBy: id,
  email: `${id}@example.com`,
  message: "Response",
  documents: [],
  isRead: true,
  createdAt: "2026-08-10T10:00:00.000Z",
  updatedAt: "2026-08-10T10:00:00.000Z",
  submissionId: `submission-${id}`,
  currentVersionId: `version-${id}`,
});

beforeEach(() => {
  jest.clearAllMocks();
  getProposal.mockResolvedValue({ success: true, data: { event: { eventName: "Annual Summit" } } });
  getExtractions.mockResolvedValue({ success: true, data: { status: "ready", runs: [] } });
  getIntelligence.mockResolvedValue({ success: false, code: "INTELLIGENCE_RUN_NOT_FOUND", message: "Not generated" });
});

it("loads every page of the opened proposal and its current-version summaries", async () => {
  getResponses
    .mockResolvedValueOnce({ success: true, data: [response("vendor-1")], pagination: { total: 2, page: 1, limit: 100, totalPages: 2 } })
    .mockResolvedValueOnce({ success: true, data: [response("vendor-2")], pagination: { total: 2, page: 2, limit: 100, totalPages: 2 } });
  const Page = (await import("./page")).default;
  render(await Page({ params: Promise.resolve({ proposalId: "proposal-1" }) }));

  expect(getResponses).toHaveBeenNthCalledWith(1, { page: 1, limit: 100, proposalId: "proposal-1" });
  expect(getResponses).toHaveBeenNthCalledWith(2, { page: 2, limit: 100, proposalId: "proposal-1" });
  expect(getExtractions).toHaveBeenCalledTimes(2);
  expect(getIntelligence).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId("response-cards")).toHaveTextContent("Annual Summit:2");
});

it("keeps legacy responses visible without requesting unavailable version intelligence", async () => {
  const legacy = {
    ...response("legacy"),
    submissionId: undefined,
    currentVersionId: undefined,
  };
  getResponses.mockResolvedValue({ success: true, data: [legacy], pagination: { total: 1, totalPages: 1 } });
  const Page = (await import("./page")).default;
  render(await Page({ params: Promise.resolve({ proposalId: "proposal-1" }) }));

  expect(getExtractions).not.toHaveBeenCalled();
  expect(getIntelligence).not.toHaveBeenCalled();
  expect(screen.getByTestId("response-cards")).toHaveTextContent("Annual Summit:1");
});

it("shows a recoverable error instead of a partial list when any response page fails", async () => {
  getResponses
    .mockResolvedValueOnce({ success: true, data: [response("vendor-1")], pagination: { total: 2, totalPages: 2 } })
    .mockResolvedValueOnce({ success: false, message: "Service unavailable" });
  const Page = (await import("./page")).default;
  render(await Page({ params: Promise.resolve({ proposalId: "proposal-1" }) }));

  expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable");
  expect(screen.getByRole("link", { name: "Return to proposals" })).toHaveAttribute("href", "/vendor-responses");
  expect(getExtractions).not.toHaveBeenCalled();
});

import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import type { ResponseCardSummary } from "@/lib/vendorResponses/responseCardSummary";
import { render, screen, within } from "@testing-library/react";
import ProposalResponseCards from "./ProposalResponseCards";

const response = (id: string, vendorName: string): VendorResponseItem => ({
  _id: id,
  proposalId: "proposal-1",
  proposalOwnerId: "owner-1",
  proposalTitle: "Annual Summit",
  vendorName,
  submittedBy: vendorName,
  email: `${id}@example.com`,
  message: "Response",
  documents: [
    { name: `${id}-technical.pdf`, url: "https://files.example.com/technical.pdf" },
    { name: `${id}-pricing.xlsx`, url: "" },
  ],
  isRead: true,
  createdAt: "2026-08-10T10:00:00.000Z",
  updatedAt: "2026-08-10T10:00:00.000Z",
  submissionId: `submission-${id}`,
  currentVersionId: `version-${id}`,
});

const summary = (overrides: Partial<ResponseCardSummary> = {}): ResponseCardSummary => ({
  extractionStatus: "ready",
  intelligenceStatus: "ready",
  headlineFacts: [{
    factId: "fact-1",
    label: "Total cost",
    value: "USD 125000",
    explicitness: "explicit",
    source: { fragmentId: "fragment-1", content: "Total: USD 125,000", locator: { page: 2 }, sourceLabel: "pricing.pdf" },
  }],
  requiredFields: { total: 3, present: 2, missing: 1, conflicts: 0, missingTitles: ["Insurance"], conflictTitles: [] },
  contradictionCount: 0,
  isComparable: true,
  needsAttention: true,
  ...overrides,
});

it("renders response cards in the required information order with auditable values and every attachment", () => {
  const item = response("response-1", "Northstar AV");
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={[item]}
      summaries={{ [item._id]: summary() }}
    />,
  );

  const card = screen.getByRole("article");
  const text = card.textContent ?? "";
  expect(text.indexOf("Northstar AV")).toBeLessThan(text.indexOf("USD 125000"));
  expect(text.indexOf("USD 125000")).toBeLessThan(text.indexOf("Required-field completeness"));
  expect(text.indexOf("Required-field completeness")).toBeLessThan(text.indexOf("Source attachments"));
  expect(within(card).getByText("pricing.pdf")).toBeInTheDocument();
  expect(within(card).getByText("page 2")).toBeInTheDocument();
  expect(within(card).getByText("response-1-technical.pdf")).toBeInTheDocument();
  expect(within(card).getByText("response-1-pricing.xlsx")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Proposal Intelligence" })).toBeDisabled();
  expect(screen.getByText(/1 currently qualifies/)).toBeInTheDocument();
});

it("enables Proposal Intelligence when two responses are comparable", () => {
  const first = response("response-1", "Northstar AV");
  const second = response("response-2", "Civic Events");
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={[first, second]}
      summaries={{ [first._id]: summary(), [second._id]: summary({ needsAttention: false }) }}
    />,
  );

  expect(screen.getByRole("link", { name: /Proposal Intelligence/ })).toHaveAttribute(
    "href",
    "/proposals/proposal-1/intelligence",
  );
  expect(screen.getByText("2 responses")).toBeInTheDocument();
  expect(screen.getByText("1 requiring attention")).toBeInTheDocument();
});

it("offers the invitation action in the real empty state", () => {
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={[]}
      summaries={{}}
    />,
  );

  expect(screen.getByText("Responses will appear here")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Invite vendors" })).toHaveAttribute(
    "href",
    "/email/send-email?proposalId=proposal-1",
  );
  expect(screen.queryByText("Compare these responses")).not.toBeInTheDocument();
});


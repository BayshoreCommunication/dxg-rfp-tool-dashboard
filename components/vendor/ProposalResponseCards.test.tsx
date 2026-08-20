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

it("renders compact response cards with auditable commercial totals, attachments, and attention flags", () => {
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
  expect(within(card).getByText("Commercial total")).toBeInTheDocument();
  expect(within(card).getByText("$125,000")).toBeInTheDocument();
  expect(within(card).getByText("Attachments")).toBeInTheDocument();
  expect(within(card).getByRole("link", { name: "response-1-technical.pdf" })).toHaveAttribute(
    "title",
    "response-1-technical.pdf",
  );
  expect(within(card).getByText("+1 more file")).toBeInTheDocument();
  expect(within(card).queryByText(/View total source/i)).not.toBeInTheDocument();
  expect(within(card).getByText("Not stated: Insurance")).toBeInTheDocument();
  expect(within(card).getByText("View all 2 attachments")).toBeInTheDocument();
  expect(within(card).getByText("response-1-pricing.xlsx")).toBeInTheDocument();
  expect(within(card).getByRole("link", { name: "View full response" })).toHaveAttribute(
    "href",
    "/vendor-responses/response-1",
  );
  expect(screen.getByRole("link", { name: "Back to responses" })).toHaveAttribute(
    "href",
    "/vendor-responses",
  );
  const overview = screen.getByLabelText("Proposal response overview");
  expect(within(overview).getByText("1 more readable response needed")).toBeInTheDocument();
  expect(within(overview).getByRole("link", { name: "Invite another vendor" })).toHaveAttribute(
    "href",
    "/email/send-email?proposalId=proposal-1",
  );
});

it("directs a single unreadable response to its issues", () => {
  const item = response("response-1", "Northstar AV");
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={[item]}
      summaries={{ [item._id]: summary({ isComparable: false }) }}
    />,
  );

  const overview = screen.getByLabelText("Proposal response overview");
  expect(within(overview).getByText("Resolve response issues to unlock comparison")).toBeInTheDocument();
  expect(within(overview).getByRole("link", { name: /Review response issues/ })).toHaveAttribute(
    "href",
    "/vendor-responses/response-1",
  );
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
  const overview = screen.getByLabelText("Proposal response overview");
  expect(within(overview).getByRole("link", { name: /Proposal Intelligence/ })).toBeInTheDocument();
  expect(screen.queryByText("Compare these responses")).not.toBeInTheDocument();
  expect(screen.queryByText("2 responses")).not.toBeInTheDocument();
  expect(screen.queryByText("1 requiring attention")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Annual Summit" })).toHaveClass(
    "text-2xl",
    "!font-semibold",
  );
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

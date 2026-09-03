import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import type { ResponseCardSummary } from "@/lib/vendorResponses/responseCardSummary";
import { render, screen, within } from "@testing-library/react";
import ProposalResponseCards from "./ProposalResponseCards";

// The manual-entry dialog pulls in the server action module; the action itself
// is covered by its own suite.
jest.mock("@/app/actions/vendorResponse", () => ({
  createManualVendorResponseAction: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

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

const pricingSource = { fragmentId: "fragment-1", content: "Total: USD 125,000", locator: { page: 2 }, sourceLabel: "pricing.pdf" };
const statedTotal = (amount: number): Extract<ResponseCardSummary["commercialTotal"], { status: "stated" }> =>
  ({ status: "stated", factId: "fact-1", amount, currency: "USD", source: pricingSource, confirmed: false, otherTotals: 0 });

const summary = (overrides: Partial<ResponseCardSummary> = {}): ResponseCardSummary => ({
  extractionStatus: "ready",
  intelligenceStatus: "ready",
  headlineFacts: [],
  commercialTotal: statedTotal(125000),
  requiredFields: { total: 3, present: 2, missing: 1, conflicts: 0, missingTitles: ["Insurance"], conflictTitles: [] },
  requirementCoverage: { total: 3, answered: 2, partlyAnswered: 0, notAnswered: 1, conflicting: 0, mandatoryNotAnswered: 1 },
  comparisonBlocked: null,
  partialSources: false,
  contradictionCount: 0,
  isComparable: true,
  needsAttention: true,
  ...overrides,
});

it("renders compact response cards with auditable commercial totals, attachments, and a plain overview", () => {
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
  expect(within(card).getByText("Total cost")).toBeInTheDocument();
  expect(within(card).getByText("$125,000")).toBeInTheDocument();
  expect(within(card).getByText("Attachments")).toBeInTheDocument();
  expect(within(card).getByRole("link", { name: "response-1-technical.pdf" })).toHaveAttribute(
    "title",
    "response-1-technical.pdf",
  );
  expect(within(card).getByText("+1 more file")).toBeInTheDocument();
  expect(within(card).queryByText(/View total source/i)).not.toBeInTheDocument();
  expect(
    within(card).getByText("2 of 3 requirements answered. 1 not answered. 1 mandatory requirement is unanswered."),
  ).toBeInTheDocument();
  expect(within(card).queryByText("Attention flags")).not.toBeInTheDocument();
  expect(within(card).queryByText("Not stated: Insurance")).not.toBeInTheDocument();
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

it("offers manual entry alongside the invitation in the empty state", () => {
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={[]}
      summaries={{}}
    />,
  );

  expect(
    screen.getByRole("button", { name: /Add response manually/ }),
  ).toBeInTheDocument();
});

const manualEntryButton = () =>
  screen.getByRole("button", { name: /Add response manually/ });

const manualEntryPrecedesCards = () =>
  Boolean(
    manualEntryButton().compareDocumentPosition(screen.getAllByRole("article")[0]) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  );

const renderWithResponses = (count: number) => {
  const items = Array.from({ length: count }, (_, index) =>
    response(`response-${index + 1}`, `Vendor ${index + 1}`),
  );
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={items}
      summaries={Object.fromEntries(items.map((item) => [item._id, summary()]))}
    />,
  );
};

it.each([1, 2])(
  "puts manual entry above the row while %i card(s) leave room beside them",
  (count) => {
    renderWithResponses(count);

    const section = screen.getByLabelText("Submitted vendor responses");
    expect(within(section).getByRole("button", { name: /Add response manually/ })).toBeInTheDocument();
    expect(manualEntryPrecedesCards()).toBe(true);
  },
);

it("drops manual entry below a full row of three cards", () => {
  renderWithResponses(3);

  const section = screen.getByLabelText("Submitted vendor responses");
  expect(within(section).getByRole("button", { name: /Add response manually/ })).toBeInTheDocument();
  expect(manualEntryPrecedesCards()).toBe(false);
});

it("keeps manual entry out of the proposal header", () => {
  renderWithResponses(2);

  const overview = screen.getByLabelText("Proposal response overview");
  expect(
    within(overview).queryByRole("button", { name: /Add response manually/ }),
  ).not.toBeInTheDocument();
});

it("tells the planner when a response is left out of the comparison and shows the stated price range", () => {
  const readable = response("response-1", "Northstar AV");
  const partial = response("response-2", "Civic Events");
  const cheapest = response("response-3", "Harbor Productions");
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={[readable, partial, cheapest]}
      summaries={{
        [readable._id]: summary({ requirementCoverage: { total: 20, answered: 20, partlyAnswered: 0, notAnswered: 0, conflicting: 0, mandatoryNotAnswered: 0 } }),
        [partial._id]: summary({
          extractionStatus: "partial",
          partialSources: true,
          commercialTotal: statedTotal(208601.5),
        }),
        [cheapest._id]: summary({
          commercialTotal: statedTotal(100180),
        }),
      }}
    />,
  );

  const cards = screen.getAllByRole("article");
  expect(within(cards[0]).getByText("All 20 requirements answered.")).toBeInTheDocument();
  expect(within(cards[1]).getByText("Some pages unread")).toBeInTheDocument();
  expect(within(cards[1]).getByText(/Some pages could not be read, so its findings may be incomplete/)).toBeInTheDocument();
  expect(within(cards[1]).queryByText(/Left out of the vendor comparison/)).not.toBeInTheDocument();
  expect(within(cards[1]).queryByText("Attention flags")).not.toBeInTheDocument();
  expect(within(cards[2]).getByText("Lowest stated total")).toBeInTheDocument();
  expect(within(cards[0]).queryByText("Lowest stated total")).not.toBeInTheDocument();
  const overview = screen.getByLabelText("Proposal response overview");
  expect(within(overview).getByText(/Stated totals range from \$100,180 to \$208,601\.50\./)).toBeInTheDocument();
  // A partially readable response is still comparable; the caveat is on its card.
  expect(within(overview).getByRole("link", { name: "Proposal Intelligence" })).toHaveAttribute(
    "href",
    "/proposals/proposal-1/intelligence",
  );
});

it("withholds a price and the lowest badge when a response states several different totals", () => {
  const clear = response("response-1", "Northstar AV");
  const other = response("response-2", "Civic Events");
  const ambiguous = response("response-3", "Digital Experience Group");
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={[clear, other, ambiguous]}
      summaries={{
        [clear._id]: summary({ commercialTotal: statedTotal(208601.5) }),
        [other._id]: summary({ commercialTotal: statedTotal(208700) }),
        [ambiguous._id]: summary({
          commercialTotal: {
            status: "needs_confirmation",
            candidates: [
              { factId: "proposal", amount: 207055, currency: "USD", label: "Total pricing", source: pricingSource },
              { factId: "equipment", amount: 100180, currency: "USD", label: "Equipment total", source: pricingSource },
            ],
          },
        }),
      }}
    />,
  );
  const cards = screen.getAllByRole("article");
  expect(within(cards[2]).getByText("Needs confirmation")).toBeInTheDocument();
  expect(within(cards[2]).getByText(/The files list 2 different totals, \$100,180 to \$207,055\./)).toBeInTheDocument();
  expect(within(cards[2]).getByRole("link", { name: "Confirm which applies" })).toHaveAttribute("href", "/vendor-responses/response-3");
  expect(within(cards[2]).queryByText("Lowest stated total")).not.toBeInTheDocument();
  expect(within(cards[0]).getByText("Lowest stated total")).toBeInTheDocument();
  const overview = screen.getByLabelText("Proposal response overview");
  expect(within(overview).getByText(/Stated totals range from \$208,601\.50 to \$208,700 across 2 of 3 responses\./)).toBeInTheDocument();
  expect(within(overview).getByText("1 response lists more than one total and needs confirmation.")).toBeInTheDocument();
});

it("says when a planner confirmed a total over the other figures in the files", () => {
  const item = response("response-1", "Digital Experience Group");
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={[item]}
      summaries={{ [item._id]: summary({ commercialTotal: { ...statedTotal(207055), confirmed: true, otherTotals: 3 } }) }}
    />,
  );
  const card = screen.getByRole("article");
  expect(within(card).getByText("$207,055")).toBeInTheDocument();
  expect(within(card).getByText("Confirmed by you over 3 other stated totals")).toBeInTheDocument();
});

it("names a response that is left out of the comparison because a source was unavailable", () => {
  const item = response("response-1", "Northstar AV");
  render(
    <ProposalResponseCards
      proposalId="proposal-1"
      proposalTitle="Annual Summit"
      responses={[item]}
      summaries={{ [item._id]: summary({ comparisonBlocked: "source_unavailable", isComparable: false }) }}
    />,
  );
  expect(screen.getByText(/Left out of the vendor comparison because a file could not be made available/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Review response issues" })).toHaveAttribute("href", "/vendor-responses/response-1");
});

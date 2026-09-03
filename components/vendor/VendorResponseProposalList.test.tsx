import { render, screen } from "@testing-library/react";
import VendorResponseProposalList from "./VendorResponseProposalList";

const data = {
  proposals: [
    {
      proposalId: "proposal/one",
      proposalTitle: "Annual Summit",
      responseCount: 4,
      unreadCount: 2,
      latestResponseAt: "2026-08-16T10:00:00.000Z",
      latestVendorName: "Apex Events",
    },
    {
      proposalId: "proposal-two",
      proposalTitle: "Leadership Retreat",
      responseCount: 1,
      unreadCount: 0,
      latestResponseAt: "2026-08-15T10:00:00.000Z",
      latestVendorName: "Northstar",
    },
  ],
  pagination: { total: 2, page: 1, limit: 12, totalPages: 1 },
  responseCount: 5,
  unreadCount: 2,
};

it("presents vendor responses under their proposals with accurate status", () => {
  render(<VendorResponseProposalList data={data} search="" />);

  expect(screen.getByRole("heading", { name: "Vendor Responses" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Annual Summit" })).toBeInTheDocument();
  expect(screen.getByText("2 new")).toBeInTheDocument();
  expect(screen.getByText("Nothing new")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "View 4 responses for Annual Summit" }),
  ).toHaveAttribute("href", "/vendor-responses/proposals/proposal%2Fone");
});

it("explains when a proposal search has no response groups", () => {
  render(
    <VendorResponseProposalList
      data={{ ...data, proposals: [], pagination: { ...data.pagination, total: 0 } }}
      search="missing"
    />,
  );
  expect(screen.getByText("No matching proposals")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute(
    "href",
    "/vendor-responses",
  );
});

it("fails visibly instead of presenting an empty inbox on a service error", () => {
  render(
    <VendorResponseProposalList
      data={null}
      errorMessage="Service unavailable"
      search=""
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable");
});

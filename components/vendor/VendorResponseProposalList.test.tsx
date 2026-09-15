import { deleteSelectedVendorResponsesAction } from "@/app/actions/vendorResponse";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VendorResponseProposalList from "./VendorResponseProposalList";

jest.mock("@/app/actions/vendorResponse", () => ({
  deleteSelectedVendorResponsesAction: jest.fn(),
  deleteVendorResponseAction: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const data = {
  proposals: [
    {
      proposalId: "proposal/one",
      proposalTitle: "Annual Summit",
      responseCount: 4,
      responseIds: [
        "64b7f1012f9f4a0012ab3401",
        "64b7f1012f9f4a0012ab3402",
        "64b7f1012f9f4a0012ab3403",
        "64b7f1012f9f4a0012ab3404",
      ],
      unreadCount: 2,
      latestResponseAt: "2026-08-16T10:00:00.000Z",
      latestVendorName: "Apex Events",
    },
    {
      proposalId: "proposal-two",
      proposalTitle: "Leadership Retreat",
      responseCount: 1,
      responseIds: ["64b7f1012f9f4a0012ab3405"],
      unreadCount: 0,
      latestResponseAt: "2026-08-15T10:00:00.000Z",
      latestVendorName: "Northstar",
    },
  ],
  pagination: { total: 2, page: 1, limit: 12, totalPages: 1 },
  responseCount: 5,
  unreadCount: 2,
};

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn() },
}));

it("presents vendor responses under their proposals with accurate status", () => {
  render(<VendorResponseProposalList data={data} search="" />);

  expect(screen.getByRole("heading", { name: "Vendor Responses" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Annual Summit" })).toBeInTheDocument();
  expect(screen.getByText("2 new")).toBeInTheDocument();
  expect(screen.getByText("Nothing new")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "View 4 responses for Annual Summit" }),
  ).toHaveAttribute("href", "/vendor-responses/proposals/proposal%2Fone");
  expect(screen.queryByRole("button", { name: /Delete all responses/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Select responses" })).toBeInTheDocument();
});

it("deletes responses only from the proposal groups the planner selects", async () => {
  const user = userEvent.setup();
  jest.mocked(deleteSelectedVendorResponsesAction).mockResolvedValue({
    success: true,
    message: "4 vendor responses deleted",
    deletedCount: 4,
  });
  render(<VendorResponseProposalList data={data} search="" />);

  await user.click(screen.getByRole("button", { name: "Select responses" }));
  expect(screen.getByText("0 selected")).toBeInTheDocument();
  await user.click(
    screen.getByRole("checkbox", {
      name: "Select 4 responses for Annual Summit",
    }),
  );
  expect(screen.getByText("1 selected")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Delete selected (4)" }));
  await user.click(screen.getByRole("button", { name: "Delete 4 responses" }));

  await waitFor(() =>
    expect(deleteSelectedVendorResponsesAction).toHaveBeenCalledWith(
      data.proposals[0].responseIds,
    ),
  );
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

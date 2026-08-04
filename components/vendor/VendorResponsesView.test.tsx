import { fireEvent, render, screen } from "@testing-library/react";
import VendorResponsesView from "./VendorResponsesView";

const push = jest.fn();
let currentSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

jest.mock("@/app/actions/vendorResponse", () => ({
  markVendorResponseReadAction: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("./VendorAnalysisSection", () => ({
  __esModule: true,
  default: () => <div data-testid="vendor-analysis" />,
}));

const response = {
  _id: "response-1",
  proposalId: "proposal-1",
  proposalOwnerId: "owner-1",
  proposalTitle: "Annual Summit",
  vendorName: "Apex Events",
  submittedBy: "Alex Morgan",
  email: "alex@apex.example",
  message: "Our proposal is ready for review.",
  documents: [],
  isRead: false,
  createdAt: "2026-08-04T10:30:00.000Z",
  updatedAt: "2026-08-04T10:30:00.000Z",
};

const renderView = () =>
  render(
    <VendorResponsesView
      initialResponses={[response]}
      initialUnreadCount={1}
      currentPage={1}
      totalPages={1}
      totalCount={1}
    />,
  );

beforeEach(() => {
  push.mockClear();
  currentSearch = "";
});

it("enables unread-only mode and resets pagination", () => {
  currentSearch = "page=3";
  renderView();

  fireEvent.click(screen.getByRole("button", { name: "Unread only" }));

  expect(push).toHaveBeenCalledWith(
    "/vendor-responses?page=1&unreadOnly=true",
  );
});

it("returns from unread-only mode to all responses", () => {
  currentSearch = "page=1&unreadOnly=true";
  renderView();

  fireEvent.click(screen.getByRole("button", { name: "Show all" }));

  expect(push).toHaveBeenCalledWith(
    "/vendor-responses?page=1&unreadOnly=false",
  );
});

it("renders real response content without a demo label", () => {
  renderView();

  expect(screen.getAllByText("Apex Events")).toHaveLength(2);
  expect(screen.getAllByText("Our proposal is ready for review.")).toHaveLength(2);
  expect(screen.queryByText("Demo")).not.toBeInTheDocument();
});

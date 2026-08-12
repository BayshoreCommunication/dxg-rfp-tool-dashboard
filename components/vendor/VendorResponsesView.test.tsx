import { markVendorResponseReadAction } from "@/app/actions/vendorResponse";
import { VENDOR_UNREAD_COUNT_CHANGED_EVENT } from "@/lib/vendorResponses/unreadEvents";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

jest.mock("./VendorExtractionSection", () => ({
  __esModule: true,
  default: () => <div data-testid="vendor-extraction" />,
}));

jest.mock("./VendorFactsSection", () => ({
  __esModule: true,
  default: () => <div data-testid="vendor-facts" />,
}));

jest.mock("./VendorEvaluationSection", () => ({
  __esModule: true,
  default: () => <div data-testid="vendor-evaluation" />,
}));

jest.mock("./VendorComparisonPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="vendor-comparison" />,
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
  currentVersionNumber: 2,
  versionReceivedAt: "2026-08-05T11:45:00.000Z",
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
  jest.clearAllMocks();
  push.mockClear();
  currentSearch = "";
});

it("marks the initially opened response as read and publishes the new unread count", async () => {
  const unreadCountChanged = jest.fn();
  window.addEventListener(
    VENDOR_UNREAD_COUNT_CHANGED_EVENT,
    unreadCountChanged,
  );

  renderView();

  await waitFor(() => {
    expect(markVendorResponseReadAction).toHaveBeenCalledWith("response-1");
    expect(unreadCountChanged).toHaveBeenCalledTimes(1);
  });

  expect((unreadCountChanged.mock.calls[0][0] as CustomEvent).detail).toEqual({
    count: 0,
  });
  expect(screen.queryByText(/1 unread/)).not.toBeInTheDocument();

  window.removeEventListener(
    VENDOR_UNREAD_COUNT_CHANGED_EVENT,
    unreadCountChanged,
  );
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
  expect(screen.getByText("Version 2")).toBeInTheDocument();
});

it("shows a meaningful empty state when no vendor has responded", () => {
  render(
    <VendorResponsesView
      initialResponses={[]}
      initialUnreadCount={0}
      currentPage={1}
      totalPages={1}
      totalCount={0}
    />,
  );

  expect(screen.getByText("No vendor responses yet")).toBeInTheDocument();
  expect(
    screen.getByText(
      "When a vendor submits a proposal response, it will appear here for you to review.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Responses will appear here")).toBeInTheDocument();
});

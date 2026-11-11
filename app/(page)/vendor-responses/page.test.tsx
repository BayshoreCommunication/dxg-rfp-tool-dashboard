import { render, screen } from "@testing-library/react";

const getProposalSummaries = jest.fn();
jest.mock("@/app/actions/vendorResponse", () => ({
  getVendorResponseProposalsAction: (...args: unknown[]) =>
    getProposalSummaries(...args),
}));
const planLockedScreen = jest.fn();
jest.mock("@/components/entitlements/planGate", () => ({
  planLockedScreen: (...args: unknown[]) => planLockedScreen(...args),
  planLockedRefusal: jest.fn(async () => null),
}));
jest.mock("@/components/vendor/VendorResponseProposalList", () => ({
  __esModule: true,
  default: ({ search }: { search: string }) => (
    <div data-testid="proposal-list">{search}</div>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
  planLockedScreen.mockResolvedValue(null);
});

it("shows the locked state and never asks for responses when the plan doesn't include them", async () => {
  planLockedScreen.mockResolvedValue(<div data-testid="plan-locked" />);
  const Page = (await import("./page")).default;
  render(await Page({ searchParams: Promise.resolve({}) }));

  expect(planLockedScreen).toHaveBeenCalledWith("vendorResponses", expect.objectContaining({ backHref: "/dashboard" }));
  expect(screen.getByTestId("plan-locked")).toBeInTheDocument();
  expect(screen.queryByTestId("proposal-list")).not.toBeInTheDocument();
  expect(getProposalSummaries).not.toHaveBeenCalled();
});

it("loads proposal summaries rather than a flat page of responses", async () => {
  getProposalSummaries.mockResolvedValue({
    success: true,
    data: {
      proposals: [],
      pagination: { total: 0, page: 2, limit: 12, totalPages: 0 },
      responseCount: 0,
      unreadCount: 0,
    },
  });
  const Page = (await import("./page")).default;
  render(
    await Page({
      searchParams: Promise.resolve({ page: "2", search: " Summit " }),
    }),
  );

  expect(getProposalSummaries).toHaveBeenCalledWith({
    page: 2,
    search: "Summit",
  });
  expect(screen.getByTestId("proposal-list")).toHaveTextContent("Summit");
});

it("normalizes an invalid proposal page to the first page", async () => {
  getProposalSummaries.mockResolvedValue({
    success: true,
    data: {
      proposals: [],
      pagination: { total: 0, page: 1, limit: 12, totalPages: 0 },
      responseCount: 0,
      unreadCount: 0,
    },
  });
  const Page = (await import("./page")).default;
  render(
    await Page({
      searchParams: Promise.resolve({ page: "not-a-number" }),
    }),
  );
  expect(getProposalSummaries).toHaveBeenCalledWith({ page: 1, search: "" });
});

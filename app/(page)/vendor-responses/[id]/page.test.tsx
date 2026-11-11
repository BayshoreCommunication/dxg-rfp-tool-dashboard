import { render, screen } from "@testing-library/react";

const getDetail = jest.fn();
// ORG-602: the plan includes everything in these tests; the locked states are covered in
// components/entitlements/planGate.test.tsx and e2e/plan-locked-states.spec.ts.
jest.mock("@/components/entitlements/planGate", () => ({
  planLockedScreen: jest.fn(async () => null),
  loadRfpUsage: jest.fn(async () => null),
}));
jest.mock("@/app/actions/vendorResponse", () => ({
  getVendorSubmissionDetailAction: (...args: unknown[]) => getDetail(...args),
}));
jest.mock("@/components/vendor/VendorResponseDetailWorkspace", () => ({
  __esModule: true,
  default: ({ detail }: { detail: { response: { vendorName: string } } }) => (
    <div data-testid="detail-workspace">{detail.response.vendorName}</div>
  ),
}));

type DetailPage = (props: {
  params: Promise<{ id: string }>;
}) => Promise<React.ReactElement>;

beforeEach(() => jest.clearAllMocks());

it("loads a real deep-linked response workspace instead of redirecting to the inbox", async () => {
  getDetail.mockResolvedValue({
    success: true,
    data: {
      response: { vendorName: "Apex Events" },
      submission: null,
      versions: [],
    },
  });
  const Page = (await import("./page")).default as DetailPage;
  render(await Page({ params: Promise.resolve({ id: "response-1" }) }));
  expect(getDetail).toHaveBeenCalledWith("response-1");
  expect(screen.getByTestId("detail-workspace")).toHaveTextContent(
    "Apex Events",
  );
});

it("provides a safe recovery route when a response is unavailable", async () => {
  getDetail.mockResolvedValue({
    success: false,
    message: "Vendor response was not found.",
  });
  const Page = (await import("./page")).default as DetailPage;
  render(await Page({ params: Promise.resolve({ id: "missing" }) }));
  expect(screen.getByRole("alert")).toHaveTextContent("Response unavailable");
  expect(
    screen.getByRole("link", { name: "Return to vendor responses" }),
  ).toHaveAttribute("href", "/vendor-responses");
});

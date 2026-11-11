import { render, screen } from "@testing-library/react";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/app/actions/entitlements", () => ({ getEntitlementsAction: jest.fn() }));
jest.mock("@/app/actions/proposals", () => ({ getProposalByIdAction: jest.fn() }));
jest.mock("@/app/actions/rfpDashboard", () => ({ getDashboardRfpSummaryAction: jest.fn() }));

import { getEntitlementsAction } from "@/app/actions/entitlements";
import { getProposalByIdAction } from "@/app/actions/proposals";
import { getDashboardRfpSummaryAction } from "@/app/actions/rfpDashboard";
import { toEntitlements } from "@/lib/entitlements/entitlements";
import { loadRfpUsage, planLockedRefusal, planLockedScreen } from "./planGate";

const mockedPlan = jest.mocked(getEntitlementsAction);
const mockedRfp = jest.mocked(getProposalByIdAction);
const mockedSummary = jest.mocked(getDashboardRfpSummaryAction);

const RFP = "a".repeat(24);
const plan = (features: boolean, created = 1, limit: number | null = 2) =>
  mockedPlan.mockResolvedValue({
    success: true,
    message: "OK",
    data: toEntitlements({
      plan: features ? "full_access" : "free_trial",
      exempt: false,
      proposals: { created, limit, remaining: limit === null ? null : Math.max(0, limit - created), canCreate: limit === null || created < limit },
      features: { vendorResponses: features, proposalIntelligence: features },
    }),
  });
const back = { backHref: "/dashboard", backLabel: "Back to the dashboard" };

beforeEach(() => {
  jest.clearAllMocks();
  mockedSummary.mockResolvedValue({ success: true, message: "OK", data: { responsesReceived: 4 } as never });
  mockedRfp.mockResolvedValue({ success: true, data: { event: { eventName: "Annual Sales Kickoff" }, lifecycle: { vendorsResponded: 3 } } });
});

describe("planLockedScreen (ORG-602)", () => {
  it("is null when the plan includes the feature, and asks for nothing else", async () => {
    plan(true, 7, null);
    expect(await planLockedScreen("vendorResponses", back)).toBeNull();
    expect(await planLockedScreen("proposalIntelligence", { ...back, rfpId: RFP })).toBeNull();
    expect(mockedSummary).not.toHaveBeenCalled();
    expect(mockedRfp).not.toHaveBeenCalled();
  });

  it("is null when the plan can't be read: the backend decides", async () => {
    mockedPlan.mockResolvedValue({ success: false, message: "The request failed.", status: 500 });
    expect(await planLockedScreen("vendorResponses", back)).toBeNull();
    mockedPlan.mockResolvedValue({ success: true, message: "OK", data: null });
    expect(await planLockedScreen("vendorResponses", back)).toBeNull();
  });

  it("locked vendor responses: the count across the member's RFPs and a way to upgrade", async () => {
    plan(false);
    render(<>{await planLockedScreen("vendorResponses", back)}</>);

    const locked = screen.getByTestId("plan-locked");
    expect(locked).toHaveAttribute("data-feature", "vendorResponses");
    expect(screen.getByRole("heading", { level: 1, name: "Vendor responses aren't included in your plan" })).toBeInTheDocument();
    expect(screen.getByTestId("plan-locked-count")).toHaveTextContent("4 vendor responses received on your RFPs");
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/support");
    expect(screen.getByRole("link", { name: "Back to the dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(locked).not.toHaveTextContent(/proposal/i);
    expect(mockedRfp).not.toHaveBeenCalled();
  });

  it("locked RFP intelligence on one RFP: that RFP's own count and title", async () => {
    plan(false);
    render(<>{await planLockedScreen("proposalIntelligence", { rfpId: RFP, backHref: "/proposals", backLabel: "Back to RFPs" })}</>);

    expect(screen.getByRole("heading", { level: 1, name: "RFP intelligence isn't included in your plan" })).toBeInTheDocument();
    expect(screen.getByText("Annual Sales Kickoff")).toBeInTheDocument();
    expect(screen.getByTestId("plan-locked-count")).toHaveTextContent("3 vendor responses received on this RFP");
    expect(mockedRfp).toHaveBeenCalledWith(RFP);
    expect(mockedSummary).not.toHaveBeenCalled();
  });

  it("leaves the count out when the member can't read that RFP", async () => {
    plan(false);
    mockedRfp.mockResolvedValue({ success: false, status: 404, message: "Not found" });
    render(<>{await planLockedScreen("vendorResponses", { ...back, rfpId: RFP })}</>);
    expect(screen.getByTestId("plan-locked")).toBeInTheDocument();
    expect(screen.queryByTestId("plan-locked-count")).not.toBeInTheDocument();

    mockedRfp.mockClear();
    render(<>{await planLockedScreen("vendorResponses", { ...back, rfpId: "not-an-id" })}</>);
    expect(mockedRfp).not.toHaveBeenCalled();
  });
});

describe("planLockedRefusal", () => {
  it("is the locked state when the backend refused a read for the plan, and null otherwise", async () => {
    expect(await planLockedRefusal("vendorResponses", [{ success: true, data: [] }, { success: false, code: "NOT_FOUND", message: "x" }, null], back)).toBeNull();

    const refusal = { success: false, code: "PLAN_FEATURE_LOCKED", message: "Vendor responses aren't included in your plan. Contact us to upgrade." };
    render(<>{await planLockedRefusal("vendorResponses", [{ success: true }, refusal], back)}</>);
    expect(screen.getByTestId("plan-locked")).toHaveTextContent("Vendor responses · Your plan");
    expect(screen.getByTestId("plan-locked-count")).toHaveTextContent("4 vendor responses received on your RFPs");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("loadRfpUsage", () => {
  it("is the counter on a limited plan and null otherwise", async () => {
    plan(false, 2, 2);
    expect(await loadRfpUsage()).toEqual({ used: 2, limit: 2, atLimit: true, planName: "Free trial", onPlan: "on the free trial" });
    plan(true, 9, null);
    expect(await loadRfpUsage()).toBeNull();
    mockedPlan.mockResolvedValue({ success: false, message: "Network error", code: "NETWORK_ERROR" });
    expect(await loadRfpUsage()).toBeNull();
  });
});

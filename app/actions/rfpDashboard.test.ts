/** @jest-environment node */

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { getDashboardRfpSummaryAction, listDashboardRfpsAction } from "./rfpDashboard";

const mockedFetch = jest.mocked(authenticatedBackendFetch);

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, headers: new Headers(), json: async () => body }) as unknown as Response;

const calledPath = () => String(mockedFetch.mock.calls[0][0]).replace(/^https?:\/\/[^/]+/, "");

describe("dashboard RFP actions (ORG-402 over the ORG-401 endpoints)", () => {
  beforeEach(() => mockedFetch.mockReset());

  test("the list goes to the scoped endpoint with its filters", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, {
      success: true,
      data: { items: [{ id: "a".repeat(24), eventName: "Sales Kickoff", stage: "sent", vendorsInvited: 4, vendorsResponded: 1 }], pagination: { total: 1, page: 1, limit: 25, totalPages: 1 } },
    }));
    const result = await listDashboardRfpsAction({ stage: "sent", owner: "b".repeat(24), page: "1" });
    expect(calledPath()).toBe(`/api/v1/rfps?stage=sent&owner=${"b".repeat(24)}&page=1`);
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-store" });
    expect(result.success).toBe(true);
    expect(result.data?.items[0]).toMatchObject({ eventName: "Sales Kickoff", stage: "sent", vendorsResponded: 1 });
  });

  test("the summary goes to the summary endpoint with the same filters", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { total: 3, activeRfps: 2, responsesReceived: 5, awardedThisQuarter: 1, byStage: { sent: 2, awarded: 1 } } }));
    const result = await getDashboardRfpSummaryAction({ stage: "sent", venueCity: "New York" });
    expect(calledPath()).toBe("/api/v1/rfps/summary?stage=sent&venueCity=New+York");
    expect(result.data).toMatchObject({ activeRfps: 2, responsesReceived: 5, awardedThisQuarter: 1 });
  });

  test("another organization's data is a 404 the caller can show, not a crash", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(404, { success: false, code: "NOT_FOUND", message: "Not found" }));
    const result = await listDashboardRfpsAction({ team: "c".repeat(24) });
    expect(result).toMatchObject({ success: false, status: 404, code: "NOT_FOUND" });
    expect(result.data).toBeUndefined();
  });

  test("an invalid filter comes back with its code", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(400, { success: false, code: "DASHBOARD_FILTER_INVALID", message: "owner must be a user id" }));
    expect(await getDashboardRfpSummaryAction({ owner: "x" })).toMatchObject({ success: false, status: 400, code: "DASHBOARD_FILTER_INVALID" });
  });

  test("a network failure is reported, not thrown", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("socket hang up"));
    expect(await listDashboardRfpsAction()).toMatchObject({ success: false, code: "NETWORK_ERROR" });
    expect(calledPath()).toBe("/api/v1/rfps");
  });
});

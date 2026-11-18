/** @jest-environment node */

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { getDashboardOverviewAction } from "./overview";

const mockedFetch = jest.mocked(authenticatedBackendFetch);

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, headers: new Headers(), json: async () => body }) as unknown as Response;

describe("dashboard overview action (the member's own totals)", () => {
  beforeEach(() => mockedFetch.mockReset());

  test("reads the totals from the overview endpoint, uncached", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, {
      success: true,
      data: { totals: { totalProposals: 6, totalEmailSent: 22, totalEmailClicked: 14, totalProposalViews: 1234 }, latestProposals: [{ _id: "a".repeat(24) }] },
    }));
    const result = await getDashboardOverviewAction();
    expect(String(mockedFetch.mock.calls[0][0]).replace(/^https?:\/\/[^/]+/, "")).toBe("/api/dashboard/overview");
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-store" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ totalProposals: 6, totalEmailSent: 22, totalEmailClicked: 14, totalProposalViews: 1234 });
  });

  test("a refusal, a server error and a network failure come back as failures, never as zeros", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(500, { success: false, message: "Error fetching dashboard overview" }));
    expect(await getDashboardOverviewAction()).toMatchObject({ success: false, status: 500 });
    mockedFetch.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    const down = await getDashboardOverviewAction();
    expect(down).toMatchObject({ success: false, code: "NETWORK_ERROR" });
    expect(down.data).toBeUndefined();
  });

  test("an answer without totals carries no data", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, { success: true, data: {} }));
    expect((await getDashboardOverviewAction()).data).toBeNull();
  });
});

/** @jest-environment node */

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import {
  createSupportGrantAction,
  getSupportGrantAction,
  listSupportGrantsAction,
  revokeSupportGrantAction,
  searchGrantableRfpsAction,
} from "./supportGrants";

const mockedFetch = jest.mocked(authenticatedBackendFetch);

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  }) as unknown as Response;

const future = new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString();
const grant = {
  id: "g1", scope: "organization", rfp: null, reason: null, status: "active",
  grantedBy: { id: "u1", name: "Olivia Owner" }, createdAt: new Date().toISOString(), expiresAt: future,
  revokedAt: null, revokedBy: null, activity: { useCount: 0, lastUsedAt: null },
};

const lastCall = () => {
  const [url, init] = mockedFetch.mock.calls.at(-1) as [string, RequestInit];
  return { url: String(url), method: init.method, body: init.body ? JSON.parse(String(init.body)) : undefined };
};

describe("support grant actions (ORG-405)", () => {
  beforeEach(() => mockedFetch.mockReset());

  test("lists a page of the organization's grants", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { grants: [grant], pagination: { page: 2, perPage: 50, total: 51, totalPages: 2 } } }));
    const result = await listSupportGrantsAction(2);
    expect(lastCall()).toMatchObject({ url: expect.stringMatching(/\/api\/v1\/organization\/support-grants\?page=2$/), method: "GET" });
    expect(result).toMatchObject({ success: true, data: { page: 2, totalPages: 2, total: 51 } });
    expect(result.data?.grants[0]).toMatchObject({ id: "g1", scope: "organization", status: "active" });
  });

  test("a role that isn't Owner or Admin gets the backend's plain 403 back", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(403, { success: false, message: "Forbidden" }));
    const result = await listSupportGrantsAction();
    expect(result).toMatchObject({ success: false, status: 403 });
    expect(result.code).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  test("an answer that can't be read is a failure, not an empty list", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { rows: [] } }));
    expect(await listSupportGrantsAction()).toMatchObject({ success: false, code: "INVALID_RESPONSE" });
  });

  test("grants the whole organization when no RFP is given, with the chosen expiry", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(201, { success: true, data: grant }));
    const result = await createSupportGrantAction({ proposalId: null, expiresInDays: 7, reason: "   " });
    expect(lastCall()).toEqual({ url: expect.stringMatching(/\/api\/v1\/organization\/support-grants$/), method: "POST", body: { expiresInDays: 7 } });
    expect(result).toMatchObject({ success: true, data: { id: "g1", scope: "organization" } });
  });

  test("grants one RFP with a reason, and surfaces the backend's refusals", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(201, { success: true, data: { ...grant, scope: "rfp", rfp: { id: "p1", title: "Gala" } } }));
    const created = await createSupportGrantAction({ proposalId: "p1", expiresInDays: 30, reason: " Ticket 4821 " });
    expect(lastCall().body).toEqual({ proposalId: "p1", expiresInDays: 30, reason: "Ticket 4821" });
    expect(created.data).toMatchObject({ scope: "rfp", rfp: { id: "p1", title: "Gala" } });

    mockedFetch.mockResolvedValueOnce(jsonResponse(404, { success: false, code: "PROPOSAL_NOT_FOUND", message: "RFP not found." }));
    expect(await createSupportGrantAction({ proposalId: "other-org", expiresInDays: 7 })).toMatchObject({ success: false, status: 404, code: "PROPOSAL_NOT_FOUND" });

    mockedFetch.mockResolvedValueOnce(jsonResponse(400, { success: false, code: "INVALID_GRANT_EXPIRY", message: "x" }));
    expect(await createSupportGrantAction({ expiresInDays: 45 })).toMatchObject({ success: false, status: 400, code: "INVALID_GRANT_EXPIRY" });
  });

  test("reads one grant with its Support activity; another organization's grant is a 404", async () => {
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: { ...grant, events: [{ at: new Date().toISOString(), agent: { id: "64f0c0ffee0000000000ab12", label: "RFPilot Support" }, operation: "rfp.list", rfp: null }] } }),
    );
    const detail = await getSupportGrantAction("g 1/x");
    expect(lastCall().url).toMatch(/\/support-grants\/g%201%2Fx$/);
    expect(detail.data?.events).toEqual([expect.objectContaining({ operation: "rfp.list", agentReference: "00AB12" })]);

    mockedFetch.mockResolvedValueOnce(jsonResponse(404, { success: false, code: "SUPPORT_GRANT_NOT_FOUND", message: "Support access grant not found." }));
    expect(await getSupportGrantAction("foreign")).toMatchObject({ success: false, status: 404, code: "SUPPORT_GRANT_NOT_FOUND" });
  });

  test("revokes a grant, and reports one that already expired", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ...grant, status: "revoked", revokedAt: new Date().toISOString(), revokedBy: { id: "u1", name: "Olivia Owner" } } }));
    const revoked = await revokeSupportGrantAction("g1");
    expect(lastCall()).toMatchObject({ url: expect.stringMatching(/\/support-grants\/g1\/revoke$/), method: "POST" });
    expect(revoked.data).toMatchObject({ status: "revoked", revokedBy: { name: "Olivia Owner" } });

    mockedFetch.mockResolvedValueOnce(jsonResponse(409, { success: false, code: "SUPPORT_GRANT_EXPIRED", message: "This support access has already expired." }));
    expect(await revokeSupportGrantAction("g1")).toMatchObject({ success: false, status: 409, code: "SUPPORT_GRANT_EXPIRED" });
  });

  test("the RFP picker searches the scoped dashboard list across every stage", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { items: [{ id: "p1", eventName: "Gala", ownerName: "Paul Planner" }], pagination: {} } }));
    const result = await searchGrantableRfpsAction("  gala ");
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe("/api/v1/rfps");
    expect(url.searchParams.get("search")).toBe("gala");
    expect(url.searchParams.get("stage")).toContain("archived");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(result.data).toEqual([{ id: "p1", title: "Gala", ownerName: "Paul Planner" }]);

    mockedFetch.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { items: [] } }));
    await searchGrantableRfpsAction("");
    expect(new URL(lastCall().url).searchParams.has("search")).toBe(false);
  });
});

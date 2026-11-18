/** @jest-environment node */

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { exportAuditLogAction, getAuditFilterOptionsAction, listAuditEventsAction } from "./auditLog";

const mockedFetch = jest.mocked(authenticatedBackendFetch);

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, headers: new Headers(), json: async () => body }) as unknown as Response;
const csvResponse = (csv: string, headers: Record<string, string> = {}) =>
  ({ ok: true, status: 200, headers: new Headers(headers), text: async () => csv, json: async () => { throw new Error("not json"); } }) as unknown as Response;

const urlOf = (call: number) => String(mockedFetch.mock.calls[call][0]);

describe("audit log actions", () => {
  beforeEach(() => mockedFetch.mockReset());

  test("the list sends the filters and the cursor, and parses the page", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { events: [{ id: "e1", occurredAt: "2026-11-10T08:30:00.000Z", label: "Signed in" }], nextCursor: "next" } }));
    const result = await listAuditEventsAction({ actor: "u1", category: "sign_in", from: "2026-11-03T00:00:00.000Z" }, "cur");
    expect(urlOf(0)).toMatch(/\/api\/v1\/organization\/audit-events\?actor=u1&category=sign_in&from=2026-11-03T00%3A00%3A00\.000Z&cursor=cur$/);
    expect(result.success).toBe(true);
    expect(result.data?.events).toHaveLength(1);
    expect(result.data?.nextCursor).toBe("next");
  });

  test("a refusal keeps the status and code so the page can turn a 403 into not-found", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(403, { success: false, message: "Forbidden" }));
    const result = await listAuditEventsAction();
    expect(urlOf(0)).toMatch(/\/audit-events$/);
    expect(result).toMatchObject({ success: false, status: 403 });
    mockedFetch.mockResolvedValue(jsonResponse(400, { success: false, code: "AUDIT_FILTER_INVALID", message: "bad" }));
    expect(await listAuditEventsAction({ action: "x" })).toMatchObject({ success: false, status: 400, code: "AUDIT_FILTER_INVALID" });
  });

  // Owner decisions, 2026-11-17: RFPilot Support access events and all other RFPilot staff
  // activity are not shown to customers.
  const planChange = (id: string) => ({ id, occurredAt: "2026-11-10T08:30:00.000Z", action: "organization.plan_changed", label: "Plan changed by RFPilot Support", category: "settings", actor: { kind: "support", id: "a1", name: "RFPilot Support" }, details: { fromPlan: "free_trial", toPlan: "full_access" } });

  const at = "2026-11-10T08:30:00.000Z";
  const supportUse = (id: string) => ({ id, occurredAt: at, action: "support_access.used", label: "Support access used", category: "support_access", actor: { kind: "support", id: "a1" }, details: { grantId: "g1" } });
  const signedIn = (id: string) => ({ id, occurredAt: at, action: "auth.session.created", label: "Signed in", category: "sign_in" });

  test("the list leaves out Support access events the backend still returns", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { events: [supportUse("s1"), signedIn("e1"), planChange("s2")], nextCursor: "next" } }));
    const result = await listAuditEventsAction();
    expect(result.data?.events.map((event) => event.id)).toEqual(["e1"]);
    expect(result.data?.nextCursor).toBe("next");
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  test("a page holding only staff or Support access events is skipped, so the list never reads as empty while older activity follows", async () => {
    mockedFetch
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { events: [supportUse("s1")], nextCursor: "c2" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { events: [planChange("s2")], nextCursor: "c3" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { events: [signedIn("e1")], nextCursor: null } }));
    const result = await listAuditEventsAction({ category: "settings" });
    expect(result.data).toMatchObject({ events: [{ id: "e1" }], nextCursor: null });
    expect([urlOf(0), urlOf(1), urlOf(2)].map((url) => url.split("?")[1])).toEqual(["category=settings", "category=settings&cursor=c2", "category=settings&cursor=c3"]);
  });

  test("skipping stops: at the last page, after a few empty pages, and on an error", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { events: [supportUse("s1")], nextCursor: null } }));
    expect((await listAuditEventsAction()).data).toEqual({ events: [], nextCursor: null });
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    mockedFetch.mockReset();
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { events: [supportUse("s1")], nextCursor: "more" } }));
    expect((await listAuditEventsAction()).data).toEqual({ events: [], nextCursor: "more" });
    // Bounded: the first request and ten more.
    expect(mockedFetch).toHaveBeenCalledTimes(11);

    mockedFetch.mockReset();
    mockedFetch
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { events: [supportUse("s1")], nextCursor: "c2" } }))
      .mockResolvedValueOnce(jsonResponse(429, { success: false, message: "Too many requests" }));
    expect(await listAuditEventsAction()).toMatchObject({ success: false, status: 429 });
  });

  test("the export leaves out staff and Support access rows and counts the rest", async () => {
    const header = '"Time (UTC)","Action","Category","Result","Actor","Actor email","Actor type","Target type","Target","Reason","Details","Event ID"';
    const kept = '"t","Signed in","Sign-in","created","Olivia Owner","owner@example.com","member","refresh_session","","authentication_succeeded","","e1"';
    const hidden = '"t","Support access used","RFPilot Support access","allowed","RFPilot Support","","support","proposal","p1","rfp.read","operation: rfp.read; grantId: g1","s1"';
    const staff = '"t","Plan changed by RFPilot Support","Organization settings","allowed","RFPilot Support","","support","organization","o1","staff_plan_change","fromPlan: free_trial; toPlan: full_access","s2"';
    mockedFetch.mockResolvedValue(csvResponse(`${header}\r\n${hidden}\r\n${kept}\r\n${staff}\r\n`, { "X-Audit-Export-Rows": "3", "X-Audit-Export-Truncated": "false" }));
    const result = await exportAuditLogAction();
    expect(result.data?.csv).toBe(`${header}\r\n${kept}\r\n`);
    expect(result.data?.rows).toBe(1);

    // Nothing left: zero rows, so the screen can say so instead of handing over an empty file.
    mockedFetch.mockResolvedValue(csvResponse(`${header}\r\n${hidden}\r\n${staff}\r\n`, { "X-Audit-Export-Rows": "2" }));
    expect((await exportAuditLogAction()).data).toMatchObject({ csv: `${header}\r\n`, rows: 0 });

    // Without a usable row-count header the rows are counted from the parsed file, not its lines.
    mockedFetch.mockResolvedValue(csvResponse('"Time (UTC)","Actor"\r\n"t","Olivia\r\nOwner"\r\n', { "X-Audit-Export-Rows": "many" }));
    expect((await exportAuditLogAction()).data?.rows).toBe(1);
  });

  test("filter options are parsed defensively", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { categories: [{ key: "teams", label: "Teams", actions: [] }] } }));
    const result = await getAuditFilterOptionsAction();
    expect(urlOf(0)).toMatch(/\/audit-events\/filters$/);
    expect(result.data?.categories).toEqual([{ key: "teams", label: "Teams", actions: [] }]);
  });

  test("the export uses the same filters as the list, without a cursor", async () => {
    mockedFetch.mockResolvedValue(csvResponse('"Time (UTC)","Actor"\r\n"t","Olivia"\r\n', { "X-Audit-Export-Rows": "1", "X-Audit-Export-Truncated": "false" }));
    const query = { actor: "u1", action: "auth.login.failed", to: "2026-11-06T00:00:00.000Z" };
    const result = await exportAuditLogAction(query);
    await listAuditEventsAction(query);
    expect(urlOf(0).replace("/export", "")).toBe(urlOf(1));
    expect(urlOf(0)).not.toMatch(/cursor|organization(Id)?=/);
    expect(result.data).toMatchObject({ rows: 1, truncated: false });
    expect(result.data?.fileName).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test("the export neutralizes formula cells even if the backend did not", async () => {
    mockedFetch.mockResolvedValue(csvResponse('"Time (UTC)","Actor"\r\n"t","=HYPERLINK(""http://evil.test"")"\r\n"t","@x"\r\n', { "X-Audit-Export-Truncated": "true" }));
    const result = await exportAuditLogAction();
    expect(result.data?.csv).toBe('"Time (UTC)","Actor"\r\n"t","\'=HYPERLINK(""http://evil.test"")"\r\n"t","\'@x"\r\n');
    // No row-count header: counted from the file.
    expect(result.data?.rows).toBe(2);
    expect(result.data?.truncated).toBe(true);
  });

  test("a failed export reports the status and never returns a file", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(429, { success: false, message: "Too many requests" }));
    expect(await exportAuditLogAction()).toMatchObject({ success: false, status: 429 });
    mockedFetch.mockResolvedValue(jsonResponse(403, { success: false }));
    const refused = await exportAuditLogAction();
    expect(refused.success).toBe(false);
    expect(refused.data).toBeUndefined();
    mockedFetch.mockRejectedValue(new Error("socket hang up"));
    expect(await exportAuditLogAction()).toMatchObject({ success: false, code: "NETWORK_ERROR" });
  });
});

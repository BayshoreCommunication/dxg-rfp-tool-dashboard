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

  test("filter options are parsed defensively", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { categories: [{ key: "teams", label: "Teams", actions: [] }] } }));
    const result = await getAuditFilterOptionsAction();
    expect(urlOf(0)).toMatch(/\/audit-events\/filters$/);
    expect(result.data?.categories).toEqual([{ key: "teams", label: "Teams", actions: [] }]);
  });

  test("the export uses the same filters as the list, without a cursor", async () => {
    mockedFetch.mockResolvedValue(csvResponse('"Time (UTC)","Actor"\r\n"t","Olivia"\r\n', { "X-Audit-Export-Rows": "1", "X-Audit-Export-Truncated": "false" }));
    const query = { actor: "support", action: "support_access.used", to: "2026-11-06T00:00:00.000Z" };
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

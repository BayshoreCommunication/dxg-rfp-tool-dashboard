"use server";

import {
  auditQueryString,
  exportFileName,
  neutralizeCsv,
  toAuditFilterOptions,
  toAuditPage,
  withoutHiddenRows,
  type AuditFilterOptions,
  type AuditPage,
  type AuditQuery,
} from "@/components/organization/audit/auditLogModel";
import { BACKEND_URL as API_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { orgRequest, type OrgActionResult } from "./organizationApi";

// ORG-407 organization audit log (backend routes/auditLogRoute.ts, Owner/Admin only). The
// organization is the signed-in member's own; nothing sent from here can name another one.

const BASE = "/api/v1/organization/audit-events";

// RFPilot staff and Support access events are dropped from every page (toAuditPage). A page that
// held nothing else would read as "no activity" although older events follow, so the next pages
// are fetched until one has something to show, the log ends or a request fails. Bounded: at most
// this many extra requests; after that the screen says so and offers "Load more".
const EMPTY_PAGE_SKIPS = 10;

export async function listAuditEventsAction(query: AuditQuery = {}, cursor?: string | null): Promise<OrgActionResult<AuditPage>> {
  let next = cursor;
  for (let skipped = 0; ; skipped += 1) {
    const result = await orgRequest(`${BASE}${auditQueryString(query, next ? { cursor: next } : {})}`, {}, (payload) => toAuditPage(payload.data));
    const page = result.success ? result.data : undefined;
    if (!page || page.events.length > 0 || !page.nextCursor || skipped >= EMPTY_PAGE_SKIPS) return result;
    next = page.nextCursor;
  }
}

export async function getAuditFilterOptionsAction(): Promise<OrgActionResult<AuditFilterOptions>> {
  return orgRequest(`${BASE}/filters`, {}, (payload) => toAuditFilterOptions(payload.data));
}

export type AuditExport = { csv: string; fileName: string; rows: number; truncated: boolean };

// The export takes the same filters as the list, so the file holds what the screen shows
// (without paging), from the same organization. The backend writes the file; RFPilot staff and
// Support access rows are taken out of it here (withoutHiddenRows), as they are from the list.
export async function exportAuditLogAction(query: AuditQuery = {}): Promise<OrgActionResult<AuditExport>> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}${BASE}/export${auditQueryString(query)}`, { method: "GET", cache: "no-store" });
    if (!res.ok) {
      const payload = ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>;
      return {
        success: false,
        status: res.status,
        code: typeof payload.code === "string" ? payload.code : undefined,
        message: typeof payload.message === "string" ? payload.message : "The export failed.",
      };
    }
    const narrowed = withoutHiddenRows(neutralizeCsv(await res.text()));
    const csv = narrowed.csv;
    const rowsHeader = res.headers?.get?.("X-Audit-Export-Rows");
    // The backend's count stands only when no row was taken out and the header is a number;
    // otherwise the rows are counted from the parsed file.
    const counted = rowsHeader ? Number(rowsHeader) : Number.NaN;
    const rows = narrowed.removed === 0 && Number.isFinite(counted) && counted >= 0 ? counted : narrowed.rows;
    return {
      success: true,
      status: res.status,
      message: "OK",
      data: {
        csv,
        fileName: exportFileName(),
        rows,
        truncated: res.headers?.get?.("X-Audit-Export-Truncated") === "true",
      },
    };
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error && error.message ? error.message : "Network error", code: "NETWORK_ERROR" };
  }
}

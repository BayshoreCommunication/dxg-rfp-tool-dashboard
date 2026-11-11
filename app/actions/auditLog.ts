"use server";

import {
  auditQueryString,
  exportFileName,
  neutralizeCsv,
  toAuditFilterOptions,
  toAuditPage,
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

export async function listAuditEventsAction(query: AuditQuery = {}, cursor?: string | null): Promise<OrgActionResult<AuditPage>> {
  return orgRequest(`${BASE}${auditQueryString(query, cursor ? { cursor } : {})}`, {}, (payload) => toAuditPage(payload.data));
}

export async function getAuditFilterOptionsAction(): Promise<OrgActionResult<AuditFilterOptions>> {
  return orgRequest(`${BASE}/filters`, {}, (payload) => toAuditFilterOptions(payload.data));
}

export type AuditExport = { csv: string; fileName: string; rows: number; truncated: boolean };

// The export takes the same filters as the list, so the file holds what the screen shows
// (without paging), from the same organization.
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
    const csv = neutralizeCsv(await res.text());
    const rows = Number(res.headers?.get?.("X-Audit-Export-Rows"));
    return {
      success: true,
      status: res.status,
      message: "OK",
      data: {
        csv,
        fileName: exportFileName(),
        rows: Number.isFinite(rows) && rows >= 0 ? rows : Math.max(0, csv.trimEnd().split("\r\n").length - 1),
        truncated: res.headers?.get?.("X-Audit-Export-Truncated") === "true",
      },
    };
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error && error.message ? error.message : "Network error", code: "NETWORK_ERROR" };
  }
}

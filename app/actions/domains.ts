"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

/* ORG-305 verified domains, Owner/Admin only, under /api/organization/domains. */

export type DomainStatus = "pending" | "verified" | "unverified";

export type OrganizationDomain = {
  id: string;
  domain: string;
  status: DomainStatus;
  method: "dns_txt" | "admin_email" | null;
  verification: { type: "TXT"; name: string; value: string };
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  lastCheckOutcome: string | null;
  nextCheckAt: string | null;
  createdAt: string | null;
};

export type DomainResult<T> = {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  status?: number;
};

type Body = Record<string, unknown> & { success?: boolean; message?: string; code?: string };

const base = `${BACKEND_URL}/api/organization/domains`;

const call = async <T,>(
  path: string,
  init: RequestInit,
  pick: (body: Body) => T,
): Promise<DomainResult<T>> => {
  try {
    const response = await authenticatedBackendFetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const body = ((await response.json().catch(() => null)) ?? {}) as Body;
    if (!response.ok || body.success === false) {
      return { success: false, message: body.message || "Request failed", code: body.code, status: response.status };
    }
    return { success: true, message: body.message || "OK", data: pick(body), status: response.status };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error && error.message ? error.message : "Network error",
    };
  }
};

const toDomain = (raw: unknown): OrganizationDomain => {
  const d = (raw ?? {}) as Record<string, unknown>;
  const v = (d.verification ?? {}) as Record<string, unknown>;
  const date = (value: unknown) => (value ? String(value) : null);
  return {
    id: String(d.id ?? ""),
    domain: String(d.domain ?? ""),
    status: (d.status as DomainStatus) ?? "pending",
    method: (d.method as OrganizationDomain["method"]) ?? null,
    verification: { type: "TXT", name: String(v.name ?? d.domain ?? ""), value: String(v.value ?? "") },
    verifiedAt: date(d.verifiedAt),
    lastCheckedAt: date(d.lastCheckedAt),
    lastCheckOutcome: d.lastCheckOutcome ? String(d.lastCheckOutcome) : null,
    nextCheckAt: date(d.nextCheckAt),
    createdAt: date(d.createdAt),
  };
};

export async function listDomainsAction(): Promise<DomainResult<OrganizationDomain[]>> {
  return call("", { method: "GET" }, (b) => (Array.isArray(b.domains) ? b.domains.map(toDomain) : []));
}

export async function addDomainAction(domain: string): Promise<DomainResult<OrganizationDomain>> {
  return call("", { method: "POST", body: JSON.stringify({ domain }) }, (b) => toDomain(b.domain));
}

export async function checkDomainAction(id: string): Promise<DomainResult<OrganizationDomain>> {
  return call(`/${encodeURIComponent(id)}/check`, { method: "POST", body: "{}" }, (b) => toDomain(b.domain));
}

export async function removeDomainAction(id: string): Promise<DomainResult<null>> {
  return call(`/${encodeURIComponent(id)}`, { method: "DELETE" }, () => null);
}

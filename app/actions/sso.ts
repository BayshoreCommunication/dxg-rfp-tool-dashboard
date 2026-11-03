"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

/* Company single sign-on (OIDC) for the organization, Owner/Admin only, under
   /api/organization/sso. The client secret is write-only: the backend only
   ever says whether one is stored. */

export type SsoConnectionStatus = "draft" | "active";

export type SsoConnection = {
  issuer: string;
  clientId: string;
  hasClientSecret: boolean;
  domains: string[];
  status: SsoConnectionStatus;
  lastTestedAt: string | null;
  lastTestOutcome: string | null;
  version: number | null;
  updatedAt: string | null;
};

export type SsoSettings = {
  connection: SsoConnection | null;
  requireSso: boolean;
  redirectUri: string;
  verifiedDomains: string[];
};

export type SsoCheckResult = {
  ok: boolean;
  issuer: string | null;
  authorizationEndpoint: string | null;
  problems: string[];
};

export type SsoResult<T> = {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  status?: number;
};

type Body = Record<string, unknown> & { success?: boolean; message?: string; code?: string };

const base = `${BACKEND_URL}/api/organization/sso`;

const call = async <T,>(
  path: string,
  init: RequestInit,
  pick: (body: Body) => T,
): Promise<SsoResult<T>> => {
  try {
    const response = await authenticatedBackendFetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const body = ((await response.json().catch(() => null)) ?? {}) as Body;
    if (!response.ok || body.success === false) {
      return {
        success: false,
        message: body.message || "Request failed",
        code: typeof body.code === "string" ? body.code : undefined,
        status: response.status,
      };
    }
    return { success: true, message: body.message || "OK", data: pick(body), status: response.status };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error && error.message ? error.message : "Network error",
    };
  }
};

const text = (value: unknown) => (typeof value === "string" && value ? value : null);
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const toConnection = (raw: unknown): SsoConnection | null => {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  return {
    issuer: String(c.issuer ?? ""),
    clientId: String(c.clientId ?? ""),
    hasClientSecret: c.hasClientSecret === true,
    domains: strings(c.domains),
    status: c.status === "active" ? "active" : "draft",
    lastTestedAt: text(c.lastTestedAt),
    lastTestOutcome: text(c.lastTestOutcome),
    version: typeof c.version === "number" ? c.version : null,
    updatedAt: text(c.updatedAt),
  };
};

export async function getSsoSettingsAction(): Promise<SsoResult<SsoSettings>> {
  return call("", { method: "GET" }, (b) => ({
    connection: toConnection(b.connection),
    requireSso: b.requireSso === true,
    redirectUri: String(b.redirectUri ?? ""),
    verifiedDomains: strings(b.verifiedDomains),
  }));
}

export async function saveSsoConnectionAction(input: {
  issuer: string;
  clientId: string;
  // Left out to keep the stored secret.
  clientSecret?: string;
  domains: string[];
  version?: number | null;
}): Promise<SsoResult<SsoConnection | null>> {
  const body: Record<string, unknown> = {
    issuer: input.issuer,
    clientId: input.clientId,
    domains: input.domains,
  };
  if (input.clientSecret) body.clientSecret = input.clientSecret;
  if (typeof input.version === "number") body.version = input.version;
  return call("", { method: "PUT", body: JSON.stringify(body) }, (b) => toConnection(b.connection));
}

export async function checkSsoConnectionAction(): Promise<SsoResult<SsoCheckResult>> {
  return call("/test", { method: "POST", body: "{}" }, (b) => ({
    ok: b.ok === true,
    issuer: text(b.issuer),
    authorizationEndpoint: text(b.authorizationEndpoint),
    problems: strings(b.problems),
  }));
}

export async function setSsoStatusAction(
  status: SsoConnectionStatus,
): Promise<SsoResult<SsoConnection | null>> {
  return call("/status", { method: "PUT", body: JSON.stringify({ status }) }, (b) =>
    toConnection(b.connection),
  );
}

export async function setRequireSsoAction(
  requireSso: boolean,
): Promise<SsoResult<{ requireSso: boolean; signedOutMembers: number }>> {
  return call("/require", { method: "PUT", body: JSON.stringify({ requireSso }) }, (b) => ({
    requireSso: b.requireSso === true,
    signedOutMembers: typeof b.signedOutMembers === "number" ? b.signedOutMembers : 0,
  }));
}

export async function deleteSsoConnectionAction(): Promise<SsoResult<null>> {
  return call("", { method: "DELETE" }, () => null);
}

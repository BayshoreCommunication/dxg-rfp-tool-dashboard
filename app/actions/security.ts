"use server";

import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

/* ORG-303 (my two-factor) and ORG-304 (organization "require 2FA", member reset).
   Every result is { success, message, data } plus the backend `code` and HTTP
   `status` so the UI can turn them into human messages. */

export type SecurityResult<T> = {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  status?: number;
};

export type TwoFactorStatus = {
  enabled: boolean;
  pendingEnrolment: boolean;
  recoveryCodesRemaining: number;
  requiredByOrganization: boolean;
};

export type TwoFactorEnrolment = { otpauthUri: string; secret: string };

export type OrganizationSecurity = {
  requireTwoFactor: boolean;
  activeMembers: number;
  membersWithoutTwoFactor: number;
};

export type SecurityMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string | null;
  status: string;
};

type Body = Record<string, unknown> & { success?: boolean; message?: string; code?: string };

const call = async <T,>(
  path: string,
  init: RequestInit,
  pick: (body: Body) => T,
): Promise<SecurityResult<T>> => {
  try {
    const response = await authenticatedBackendFetch(`${BACKEND_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const body = ((await response.json().catch(() => null)) ?? {}) as Body;
    if (!response.ok || body.success === false) {
      return {
        success: false,
        message: body.message || "Request failed",
        code: body.code,
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

const post = (body?: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body ?? {}),
});

/* ── My two-factor ─────────────────────────────── */

export async function getTwoFactorStatusAction(): Promise<SecurityResult<TwoFactorStatus>> {
  return call("/api/auth/2fa/status", { method: "GET" }, (b) => ({
    enabled: Boolean(b.enabled),
    pendingEnrolment: Boolean(b.pendingEnrolment),
    recoveryCodesRemaining: Number(b.recoveryCodesRemaining ?? 0),
    requiredByOrganization: Boolean(b.requiredByOrganization),
  }));
}

export async function startTwoFactorEnrolmentAction(): Promise<SecurityResult<TwoFactorEnrolment>> {
  return call("/api/auth/2fa/enrol/start", post(), (b) => ({
    otpauthUri: String(b.otpauthUri ?? ""),
    secret: String(b.secret ?? ""),
  }));
}

export async function confirmTwoFactorEnrolmentAction(
  code: string,
): Promise<SecurityResult<{ recoveryCodes: string[] }>> {
  return call("/api/auth/2fa/enrol/confirm", post({ code }), (b) => ({
    recoveryCodes: Array.isArray(b.recoveryCodes) ? (b.recoveryCodes as string[]) : [],
  }));
}

export async function disableTwoFactorAction(input: {
  password?: string;
  code?: string;
  recoveryCode?: string;
}): Promise<SecurityResult<null>> {
  const payload: Record<string, string> = {};
  if (input.password) payload.password = input.password;
  if (input.code) payload.code = input.code;
  if (input.recoveryCode) payload.recoveryCode = input.recoveryCode;
  return call("/api/auth/2fa/disable", post(payload), () => null);
}

export async function regenerateRecoveryCodesAction(input: {
  code?: string;
  recoveryCode?: string;
}): Promise<SecurityResult<{ recoveryCodes: string[] }>> {
  return call("/api/auth/2fa/recovery-codes", post(input), (b) => ({
    recoveryCodes: Array.isArray(b.recoveryCodes) ? (b.recoveryCodes as string[]) : [],
  }));
}

/* ── Organization security (Owner/Admin) ───────── */

/** 403 here means the signed-in member isn't an Owner or Admin. */
export async function getOrganizationSecurityAction(): Promise<SecurityResult<OrganizationSecurity>> {
  return call("/api/organization/security", { method: "GET" }, (b) => ({
    requireTwoFactor: Boolean(b.requireTwoFactor),
    activeMembers: Number(b.activeMembers ?? 0),
    membersWithoutTwoFactor: Number(b.membersWithoutTwoFactor ?? 0),
  }));
}

export async function updateOrganizationSecurityAction(
  requireTwoFactor: boolean,
): Promise<SecurityResult<{ requireTwoFactor: boolean; signedOutMembers: number }>> {
  return call(
    "/api/organization/security",
    { method: "PUT", body: JSON.stringify({ requireTwoFactor }) },
    (b) => ({
      requireTwoFactor: Boolean(b.requireTwoFactor),
      signedOutMembers: Number(b.signedOutMembers ?? 0),
    }),
  );
}

export async function resetMemberTwoFactorAction(
  userId: string,
): Promise<SecurityResult<{ wasEnrolled: boolean; revokedSessions: number }>> {
  return call(
    `/api/organization/members/${encodeURIComponent(userId)}/two-factor/reset`,
    post(),
    (b) => ({
      wasEnrolled: Boolean(b.wasEnrolled),
      revokedSessions: Number(b.revokedSessions ?? 0),
    }),
  );
}

/** Active members for the reset picker, plus the signed-in user's id and role. */
export async function listSecurityMembersAction(): Promise<
  SecurityResult<{ members: SecurityMember[]; me: { userId: string | null; role: string | null } }>
> {
  const session = await auth();
  const myId = session?.user?._id ?? session?.user?.id ?? null;
  return call("/api/organization/members?status=active", { method: "GET" }, (b) => {
    const data = (b.data ?? {}) as { members?: SecurityMember[] };
    const members = (data.members ?? []).map((m) => ({
      userId: String(m.userId),
      name: m.name ?? null,
      email: m.email ?? null,
      role: m.role ?? null,
      status: String(m.status ?? ""),
    }));
    const mine = members.find((m) => m.userId === myId);
    return { members, me: { userId: myId, role: mine?.role ?? null } };
  });
}

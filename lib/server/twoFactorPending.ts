import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { decode, encode } from "next-auth/jwt";

import type {
  PendingTwoFactorView,
  SecondFactorStep,
  TwoFactorNextStep,
} from "@/lib/auth/twoFactor";
import {
  POST_SIGN_IN_NOTICE_COOKIE,
  type PostSignInNotice,
} from "@/lib/auth/postSignInNotice";

/* Server-only state for sign-in steps that span more than one request.

   - The pending second factor (challenge token from /api/auth/login, the
     Google callback or an invitation accept) is kept in an encrypted,
     httpOnly cookie. It never goes to the browser's JS or into a URL.
   - The invitation token for "Continue with Google" is parked the same way
     while the browser is away at Google.
   - Values only the authorize() call sees (recovery codes, for instance) are
     handed back to the server action that called signIn() through
     AsyncLocalStorage, since NextAuth's signIn() returns only a URL. */

const PENDING_COOKIE = "rfpilot-2fa-pending";
const PENDING_SALT = "rfpilot.2fa-pending";
const GOOGLE_INVITE_COOKIE = "rfpilot-invite-google";
const GOOGLE_INVITE_SALT = "rfpilot.invite-google";
const MAX_PENDING_SECONDS = 15 * 60;
const GOOGLE_INVITE_SECONDS = 10 * 60;

const authSecret = () => {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return secret;
};

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/* ───────── Pending second factor ───────── */

export type PendingTwoFactor = SecondFactorStep & {
  // Remember-me choice from the password form; OAuth sign-ins always remember.
  rememberMe: boolean;
  // Set when the sign-in came from accepting an invitation.
  welcomeOrganization?: string;
};

export async function storePendingTwoFactor(pending: PendingTwoFactor) {
  const maxAge = Math.max(
    30,
    Math.min(
      MAX_PENDING_SECONDS,
      Math.floor((pending.expiresAt - Date.now()) / 1000),
    ),
  );
  const value = await encode({
    token: { ...pending },
    secret: authSecret(),
    salt: PENDING_SALT,
    maxAge,
  });
  (await cookies()).set(PENDING_COOKIE, value, cookieOptions(maxAge));
}

export async function readPendingTwoFactor(): Promise<PendingTwoFactor | null> {
  const raw = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!raw) return null;
  try {
    const token = await decode({ token: raw, secret: authSecret(), salt: PENDING_SALT });
    if (!token) return null;
    const nextStep = token.nextStep as TwoFactorNextStep;
    const expiresAt = Number(token.expiresAt);
    if (
      typeof token.challengeToken !== "string" ||
      (nextStep !== "two_factor_challenge" && nextStep !== "two_factor_enrolment") ||
      !Number.isFinite(expiresAt) ||
      Date.now() >= expiresAt
    ) {
      return null;
    }
    return {
      challengeToken: token.challengeToken,
      nextStep,
      expiresAt,
      rememberMe: token.rememberMe === true,
      welcomeOrganization:
        typeof token.welcomeOrganization === "string"
          ? token.welcomeOrganization
          : undefined,
    };
  } catch {
    return null;
  }
}

export async function clearPendingTwoFactor() {
  (await cookies()).delete(PENDING_COOKIE);
}

export const pendingView = (pending: PendingTwoFactor): PendingTwoFactorView => ({
  nextStep: pending.nextStep,
  expiresAt: pending.expiresAt,
});

/* ───────── Invitation parked during Google sign-in ───────── */

export type GoogleInvitation = { token: string; organizationName: string };

export async function storeGoogleInvitation(invitation: GoogleInvitation) {
  const value = await encode({
    token: { ...invitation },
    secret: authSecret(),
    salt: GOOGLE_INVITE_SALT,
    maxAge: GOOGLE_INVITE_SECONDS,
  });
  (await cookies()).set(
    GOOGLE_INVITE_COOKIE,
    value,
    cookieOptions(GOOGLE_INVITE_SECONDS),
  );
}

/* Read once: the cookie is cleared whether or not the accept succeeds. */
export async function takeGoogleInvitation(): Promise<GoogleInvitation | null> {
  const jar = await cookies();
  const raw = jar.get(GOOGLE_INVITE_COOKIE)?.value;
  if (!raw) return null;
  jar.delete(GOOGLE_INVITE_COOKIE);
  try {
    const token = await decode({ token: raw, secret: authSecret(), salt: GOOGLE_INVITE_SALT });
    if (!token || typeof token.token !== "string") return null;
    return {
      token: token.token,
      organizationName:
        typeof token.organizationName === "string" ? token.organizationName : "",
    };
  } catch {
    return null;
  }
}

/* ───────── One-shot notice for the dashboard ───────── */

export async function setPostSignInNotice(notice: PostSignInNotice) {
  (await cookies()).set(
    POST_SIGN_IN_NOTICE_COOKIE,
    encodeURIComponent(JSON.stringify(notice)),
    // Read by the dashboard's client component, so not httpOnly. It carries
    // nothing secret: an organization name or a count.
    {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    },
  );
}

/* ───────── authorize() → server action hand-back ───────── */

export type SignInOutcome = {
  twoFactor?: PendingTwoFactorView;
  recoveryCodes?: string[];
  recoveryCodesRemaining?: number;
  welcomeOrganization?: string;
};

const outcomeStore = new AsyncLocalStorage<SignInOutcome>();

export async function captureSignInOutcome<T>(
  run: () => Promise<T>,
): Promise<{ outcome: SignInOutcome } & ({ result: T; error?: undefined } | { result?: undefined; error: unknown })> {
  const outcome: SignInOutcome = {};
  try {
    const result = await outcomeStore.run(outcome, run);
    return { outcome, result };
  } catch (error) {
    return { outcome, error };
  }
}

export function reportSignInOutcome(patch: SignInOutcome) {
  const outcome = outcomeStore.getStore();
  if (outcome) Object.assign(outcome, patch);
}

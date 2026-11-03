import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import {
  AUTH_API_ORIGIN,
  authBffHeaders,
  BACKEND_REFRESH_COMMAND,
  BACKEND_REFRESH_HANDOFF,
  backendRefreshCoordinator,
  fetchWithTimeout,
  verifyBackendRefreshCommand,
} from "@/lib/authRefresh";
import {
  expireBackendSession,
  readJwtExpiresAt,
  SESSION_EXPIRED_ERROR,
} from "@/lib/authTokenState";
import {
  readSecondFactorStep,
  TWO_FACTOR_REQUIRED_CODE,
  twoFactorErrorRequiresRestart,
} from "@/lib/auth/twoFactor";
import { sanitizeHandoff } from "@/lib/auth/sso";
import { COMPANY_NAMED_UPDATE, readNeedsCompanyName } from "@/lib/auth/companyName";
import {
  clearPendingTwoFactor,
  readPendingTwoFactor,
  reportSignInOutcome,
  setPostSignInNotice,
  storePendingTwoFactor,
  takeGoogleInvitation,
} from "@/lib/server/twoFactorPending";
import { takeSsoBind } from "@/lib/server/ssoBind";

class DashboardCredentialsSignin extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

// A sign-in made with rememberMe false ends this long after sign-in (enforced
// in the jwt callback). Google, Microsoft and company SSO sign-ins always get
// the full session.maxAge (30 days); the short form is kept for 2FA steps
// still pending from before password sign-in was removed.
const SHORT_SESSION_MS = 24 * 60 * 60 * 1000;

type SignInProvider = "google" | "two-factor" | "sso";

const logSignInFailure = (
  provider: SignInProvider,
  email: unknown,
  reason: string,
  detail?: Record<string, unknown>,
) => {
  console.error(
    `[auth][${provider}] sign-in failed for ${String(email)}: ${reason}`,
    detail ?? "",
  );
};

type BackendBody = Record<string, unknown> & {
  user?: { _id?: string; email?: string; name?: string; avatar?: string };
};

// Login answers with `errorCode`; the 2FA and invitation endpoints with `code`.
const backendErrorCode = (data: BackendBody, status: number, fallback: string) =>
  typeof data?.errorCode === "string"
    ? data.errorCode
    : typeof data?.code === "string"
      ? data.code
      : status === 429
        ? "RATE_LIMITED"
        : fallback;

const hasBackendSession = (data: BackendBody) =>
  Boolean(data?.user?._id) &&
  Boolean(data?.accessToken) &&
  typeof data?.refreshToken === "string";

const sessionShapeDetail = (data: BackendBody) => ({
  hasUserId: Boolean(data?.user?._id),
  hasAccessToken: Boolean(data?.accessToken),
  hasRefreshToken: typeof data?.refreshToken === "string",
});

// The NextAuth user built from any backend response that issued a session
// (login, google, 2FA challenge/enrolment confirm, invitation accept).
const sessionUser = (data: BackendBody, rememberMe: boolean) => ({
  id: data.user!._id,
  _id: data.user!._id,
  email: data.user!.email,
  name: data.user!.name,
  avatar: data.user!.avatar,
  accessToken: data.accessToken,
  accessTokenExpiresAt: data.tokenExpiresAt,
  refreshToken: data.refreshToken,
  refreshTokenExpiresAt: data.refreshExpiresAt,
  sessionId: data.sessionId,
  ...(rememberMe ? {} : { sessionDeadline: Date.now() + SHORT_SESSION_MS }),
}) as Record<string, unknown>;

const postToBackend = async (path: string, body: Record<string, unknown>) => {
  const response = await fetchWithTimeout(`${AUTH_API_ORIGIN}${path}`, {
    method: "POST",
    headers: authBffHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as BackendBody;
  return { response, data };
};

// Park the challenge server-side and stop this sign-in. The server action that
// called signIn() reads `twoFactor` from the outcome and shows the code step.
const stopAtSecondFactor = async (
  data: BackendBody,
  options: { rememberMe: boolean; welcomeOrganization?: string },
) => {
  const step = readSecondFactorStep(data);
  if (!step) return;
  await storePendingTwoFactor({ ...step, ...options });
  reportSignInOutcome({
    twoFactor: { nextStep: step.nextStep, expiresAt: step.expiresAt },
  });
  throw new DashboardCredentialsSignin(TWO_FACTOR_REQUIRED_CODE);
};

const unreachable = (
  provider: SignInProvider,
  email: unknown,
  path: string,
  error: unknown,
): never => {
  if (error instanceof CredentialsSignin) throw error;
  logSignInFailure(provider, email, "auth backend unreachable", {
    url: `${AUTH_API_ORIGIN}${path}`,
    error: error instanceof Error ? error.message : String(error),
  });
  throw new DashboardCredentialsSignin("server_unavailable");
};

export const { auth, signIn, signOut, handlers, unstable_update } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  logger: {
    error(error) {
      // Failed credential logins and google sign-in denials are expected and
      // already logged with full context (status, errorCode, message) by
      // logSignInFailure — skip Auth.js's generic stack traces for those.
      // AccessDenied is thrown whenever the signIn callback returns false,
      // which this app only does on google failures (each path logs first).
      if (error instanceof CredentialsSignin) return;
      if ((error as { type?: string }).type === "AccessDenied") return;
      console.error(`[auth][error] ${error.name}: ${error.message}`);
      const cause = error.cause as { err?: unknown } | undefined;
      if (cause?.err instanceof Error) {
        console.error(`[auth][cause]:`, cause.err.stack);
      } else if (error.stack) {
        console.error(error.stack);
      }
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    // Second step of a sign-in that stopped at 2FA. The challenge token is
    // read from the encrypted pending cookie, never from the request.
    Credentials({
      id: "two-factor",
      name: "Two-factor",
      credentials: {
        mode: { label: "Mode", type: "text" },
        code: { label: "Code", type: "text" },
        recoveryCode: { label: "Recovery code", type: "text" },
      },
      async authorize(credentials) {
        const pending = await readPendingTwoFactor();
        if (!pending) {
          throw new DashboardCredentialsSignin("TWO_FACTOR_CHALLENGE_INVALID");
        }
        const enrolling = pending.nextStep === "two_factor_enrolment";
        if ((credentials?.mode === "enrol") !== enrolling) {
          throw new DashboardCredentialsSignin("TWO_FACTOR_CHALLENGE_INVALID");
        }
        const code = typeof credentials?.code === "string" ? credentials.code : "";
        const recoveryCode =
          typeof credentials?.recoveryCode === "string" ? credentials.recoveryCode : "";
        const path = enrolling
          ? "/api/auth/2fa/enrolment/confirm"
          : "/api/auth/2fa/challenge";
        const body: Record<string, unknown> = { challengeToken: pending.challengeToken };
        if (!enrolling && recoveryCode) body.recoveryCode = recoveryCode;
        else body.code = code;

        try {
          const { response, data } = await postToBackend(path, body);
          if (!response.ok) {
            const errorCode = backendErrorCode(data, response.status, "TWO_FACTOR_ERROR");
            logSignInFailure("two-factor", "<pending challenge>", "backend rejected code", {
              status: response.status,
              errorCode,
              step: pending.nextStep,
            });
            if (twoFactorErrorRequiresRestart(errorCode)) await clearPendingTwoFactor();
            throw new DashboardCredentialsSignin(errorCode);
          }
          if (!hasBackendSession(data)) {
            logSignInFailure(
              "two-factor",
              "<pending challenge>",
              "backend response missing user/accessToken/refreshToken",
              sessionShapeDetail(data),
            );
            throw new DashboardCredentialsSignin("TWO_FACTOR_ERROR");
          }
          await clearPendingTwoFactor();
          reportSignInOutcome({
            recoveryCodes: Array.isArray(data.recoveryCodes)
              ? data.recoveryCodes.filter((value): value is string => typeof value === "string")
              : undefined,
            recoveryCodesRemaining:
              typeof data.recoveryCodesRemaining === "number"
                ? data.recoveryCodesRemaining
                : undefined,
            welcomeOrganization: pending.welcomeOrganization,
          });
          return sessionUser(data, pending.rememberMe);
        } catch (error) {
          return unreachable("two-factor", "<pending challenge>", path, error);
        }
      },
    }),
    // Microsoft and company SSO (tasks/2026-11-04-sso D2). The backend's
    // callback sent the browser to /sso/complete?handoff=…; trade the handoff
    // plus the bind cookie set by /api/sso/start for a session. The handoff
    // is single use and short-lived; neither value is logged.
    Credentials({
      id: "sso",
      name: "Single sign-on",
      credentials: {
        handoff: { label: "Handoff", type: "text" },
      },
      async authorize(credentials) {
        const handoff = sanitizeHandoff(credentials?.handoff);
        // Cleared here whatever happens next.
        const bind = await takeSsoBind();
        if (!handoff) throw new DashboardCredentialsSignin("SSO_HANDOFF_INVALID");
        if (!bind) {
          logSignInFailure("sso", "<sso handoff>", "bind cookie missing or malformed");
          throw new DashboardCredentialsSignin("SSO_BIND_MISSING");
        }
        const path = "/api/auth/sso/exchange";

        try {
          const { response, data } = await postToBackend(path, { handoff, bind });
          if (!response.ok) {
            const errorCode = backendErrorCode(data, response.status, "SSO_HANDOFF_INVALID");
            logSignInFailure("sso", "<sso handoff>", "backend refused sso exchange", {
              status: response.status,
              errorCode,
            });
            throw new DashboardCredentialsSignin(errorCode);
          }
          // Microsoft only: company sign-ins never ask for our second factor.
          // Same as the Google path, OAuth sign-ins always remember.
          await stopAtSecondFactor(data, { rememberMe: true });
          if (!hasBackendSession(data)) {
            logSignInFailure(
              "sso",
              "<sso handoff>",
              "backend response missing user/accessToken/refreshToken",
              sessionShapeDetail(data),
            );
            throw new DashboardCredentialsSignin("SSO_HANDOFF_INVALID");
          }
          return sessionUser(data, true);
        } catch (error) {
          return unreachable("sso", "<sso handoff>", path, error);
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as
          | { email?: string; name?: string; picture?: string }
          | undefined;
        const email = googleProfile?.email || user?.email;

        if (!email) {
          logSignInFailure(
            "google",
            "<missing email>",
            "google profile did not include an email address",
          );
          return false;
        }

        // "Continue with Google" on /invite/[token] parks the invitation in an
        // encrypted cookie before leaving for Google; accept it here instead
        // of a plain Google sign-in. Failures go back to the invite page,
        // the same path the invitation email links to.
        const invitation = await takeGoogleInvitation();
        const path = invitation
          ? "/api/v1/invitations/accept/google"
          : "/api/auth/google";
        const backToSignIn = (code: string) =>
          `/sign-in?error=${encodeURIComponent(code)}`;
        const backToInvite = (code: string) =>
          `/invite/${encodeURIComponent(invitation!.token)}?error=${encodeURIComponent(code)}`;

        try {
          const { response, data } = await postToBackend(
            path,
            invitation
              ? { token: invitation.token, idToken: account.id_token || "" }
              : { idToken: account.id_token || "" },
          );
          if (!response.ok) {
            const errorCode = backendErrorCode(data, response.status, "google");
            logSignInFailure(
              "google",
              email,
              invitation
                ? "backend refused google invitation accept"
                : "backend rejected google login",
              {
                status: response.status,
                errorCode,
                message: data?.message,
              },
            );
            // e.g. SSO_REQUIRED: the sign-in page shows a message for it.
            return invitation ? backToInvite(errorCode) : backToSignIn(errorCode);
          }

          // ORG-303/304: Google proved the identity; the second factor is
          // still to come. Continue on the sign-in page's code step.
          const step = readSecondFactorStep(data);
          if (step) {
            await storePendingTwoFactor({
              ...step,
              rememberMe: true,
              welcomeOrganization: invitation?.organizationName || undefined,
            });
            return "/sign-in?step=two-factor";
          }

          if (!hasBackendSession(data)) {
            logSignInFailure(
              "google",
              email,
              "backend response missing user/accessToken/refreshToken",
              sessionShapeDetail(data),
            );
            return invitation ? backToInvite("INVITATION_ERROR") : false;
          }

          Object.assign(user, sessionUser(data, true));
          if (invitation?.organizationName) {
            await setPostSignInNotice({
              type: "welcome",
              organizationName: invitation.organizationName,
            });
          }
        } catch (error) {
          logSignInFailure("google", email, "auth backend unreachable", {
            url: `${AUTH_API_ORIGIN}${path}`,
            error: error instanceof Error ? error.message : String(error),
          });
          return invitation
            ? backToInvite("server_unavailable")
            : backToSignIn("server_unavailable");
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const needsCompanyName = await readNeedsCompanyName(user.accessToken);
        return { ...token, ...user, needsCompanyName, authError: undefined };
      }
      const nextToken = { ...token };
      delete nextToken[BACKEND_REFRESH_HANDOFF];
      if (
        trigger === "update" &&
        (session as Record<string, unknown> | undefined)?.[COMPANY_NAMED_UPDATE] === true
      ) {
        delete nextToken.needsCompanyName;
      }
      // A rejected refresh token is terminal. Keep the marker until the user
      // signs in again instead of calling the refresh endpoint on every request.
      if (nextToken.authError === SESSION_EXPIRED_ERROR) return nextToken;
      // "Remember me" left unticked: the sign-in stamped a deadline; past it,
      // end the session even though the cookie itself lives session.maxAge.
      if (
        typeof nextToken.sessionDeadline === "number" &&
        Date.now() >= nextToken.sessionDeadline
      ) {
        return expireBackendSession(nextToken);
      }
      if (typeof nextToken.refreshToken !== "string") {
        const legacyExpiresAt =
          typeof nextToken.accessTokenExpiresAt === "number"
            ? nextToken.accessTokenExpiresAt
            : readJwtExpiresAt(nextToken.accessToken);
        if (
          typeof nextToken.accessToken === "string" &&
          legacyExpiresAt &&
          Date.now() < legacyExpiresAt
        ) {
          return { ...nextToken, accessTokenExpiresAt: legacyExpiresAt };
        }
        return expireBackendSession(nextToken);
      }
      if (
        typeof nextToken.refreshTokenExpiresAt === "number" &&
        Date.now() >= nextToken.refreshTokenExpiresAt
      ) {
        return expireBackendSession(nextToken);
      }
      const sessionId =
        typeof nextToken.sessionId === "string" ? nextToken.sessionId : "";
      const forceRefresh =
        trigger === "update" &&
        Boolean(sessionId) &&
        (await verifyBackendRefreshCommand(
          (session as Record<string, unknown> | undefined)?.[
            BACKEND_REFRESH_COMMAND
          ],
          sessionId,
        ));
      if (!forceRefresh) return nextToken;

      const refreshed = await backendRefreshCoordinator.refresh(nextToken);
      if (
        typeof refreshed.accessToken === "string" &&
        typeof refreshed.refreshToken === "string" &&
        refreshed.authError === undefined
      ) {
        return Object.assign(refreshed, {
          [BACKEND_REFRESH_HANDOFF]: true,
        });
      }
      return refreshed;
    },
    async session({ session, token }) {
      if (token) {
        Object.assign(session.user, {
          id: token.id || token.sub,
          _id: token._id || token.sub,
          name: token.name,
          email: token.email,
          avatar: token.avatar,
        });
        Object.assign(session, {
          authError: token.authError,
          backendAccessExpired:
            typeof token.accessTokenExpiresAt === "number" &&
            Date.now() >= token.accessTokenExpiresAt,
          needsCompanyName: token.needsCompanyName === true,
        });
        if (token[BACKEND_REFRESH_HANDOFF] === true) {
          Object.assign(session, {
            [BACKEND_REFRESH_HANDOFF]: {
              accessToken: token.accessToken,
              accessTokenExpiresAt: token.accessTokenExpiresAt,
              refreshToken: token.refreshToken,
              refreshTokenExpiresAt: token.refreshTokenExpiresAt,
              sessionId: token.sessionId,
            },
          });
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
});

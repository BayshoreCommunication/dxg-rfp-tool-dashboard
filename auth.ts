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

class DashboardCredentialsSignin extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

const logSignInFailure = (
  provider: "credentials" | "google",
  email: unknown,
  reason: string,
  detail?: Record<string, unknown>,
) => {
  console.error(
    `[auth][${provider}] sign-in failed for ${String(email)}: ${reason}`,
    detail ?? "",
  );
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
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          logSignInFailure(
            "credentials",
            credentials?.email ?? "<missing email>",
            "email or password missing from request",
          );
          return null;
        }

        try {
          const response = await fetchWithTimeout(
            `${AUTH_API_ORIGIN}/api/auth/login`,
            {
              method: "POST",
              headers: authBffHeaders(),
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            },
          );

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            const errorCode =
              typeof data?.errorCode === "string"
                ? data.errorCode
                : "credentials";
            logSignInFailure(
              "credentials",
              credentials.email,
              "backend rejected login",
              {
                status: response.status,
                errorCode,
                message: data?.message,
              },
            );
            throw new DashboardCredentialsSignin(errorCode);
          }
          if (
            !data?.user?._id ||
            !data?.accessToken ||
            typeof data?.refreshToken !== "string"
          ) {
            logSignInFailure(
              "credentials",
              credentials.email,
              "backend response missing user/accessToken/refreshToken",
              {
                hasUserId: Boolean(data?.user?._id),
                hasAccessToken: Boolean(data?.accessToken),
                hasRefreshToken: typeof data?.refreshToken === "string",
              },
            );
            return null;
          }

          return {
            id: data.user._id,
            _id: data.user._id,
            email: data.user.email,
            name: data.user.name,
            avatar: data.user.avatar,
            accessToken: data.accessToken,
            accessTokenExpiresAt: data.tokenExpiresAt,
            refreshToken: data.refreshToken,
            refreshTokenExpiresAt: data.refreshExpiresAt,
            sessionId: data.sessionId,
          } as Record<string, unknown>;
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          logSignInFailure(
            "credentials",
            credentials.email,
            "auth backend unreachable",
            {
              url: `${AUTH_API_ORIGIN}/api/auth/login`,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          throw new DashboardCredentialsSignin("server_unavailable");
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

        try {
          const response = await fetchWithTimeout(
            `${AUTH_API_ORIGIN}/api/auth/google`,
            {
              method: "POST",
              headers: authBffHeaders(),
              body: JSON.stringify({
                idToken: account.id_token || "",
              }),
            },
          );

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            logSignInFailure("google", email, "backend rejected google login", {
              status: response.status,
              errorCode: data?.errorCode,
              message: data?.message,
            });
            return false;
          }

          if (
            !data?.user?._id ||
            !data?.accessToken ||
            typeof data?.refreshToken !== "string"
          ) {
            logSignInFailure(
              "google",
              email,
              "backend response missing user/accessToken/refreshToken",
              {
                hasUserId: Boolean(data?.user?._id),
                hasAccessToken: Boolean(data?.accessToken),
                hasRefreshToken: typeof data?.refreshToken === "string",
              },
            );
            return false;
          }

          Object.assign(user, {
            id: data.user._id,
            _id: data.user._id,
            name: data.user.name,
            email: data.user.email,
            avatar: data.user.avatar,
            accessToken: data.accessToken,
            accessTokenExpiresAt: data.tokenExpiresAt,
            refreshToken: data.refreshToken,
            refreshTokenExpiresAt: data.refreshExpiresAt,
            sessionId: data.sessionId,
          });
        } catch (error) {
          logSignInFailure("google", email, "auth backend unreachable", {
            url: `${AUTH_API_ORIGIN}/api/auth/google`,
            error: error instanceof Error ? error.message : String(error),
          });
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        return { ...token, ...user, authError: undefined };
      }
      const nextToken = { ...token };
      delete nextToken[BACKEND_REFRESH_HANDOFF];
      // A rejected refresh token is terminal. Keep the marker until the user
      // signs in again instead of calling the refresh endpoint on every request.
      if (nextToken.authError === SESSION_EXPIRED_ERROR) return nextToken;
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

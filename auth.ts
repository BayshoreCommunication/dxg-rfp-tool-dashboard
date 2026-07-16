import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { BACKEND_URL } from "@/lib/config";

// Strip a trailing "/api" segment once at module load — avoids repeated string
// manipulation on every login attempt.
const API_ORIGIN = BACKEND_URL.endsWith("/api")
  ? BACKEND_URL.slice(0, -4)
  : BACKEND_URL;

// Default timeout (ms) for backend auth requests. Prevents indefinite hangs
// caused by Vercel cold-starts or slow networks.
const AUTH_FETCH_TIMEOUT_MS = 8000;
const bffHeaders = () => ({
  "Content-Type": "application/json",
  "x-rfpilot-bff-key": process.env.BFF_SHARED_SECRET || "",
});

async function refreshBackendAccessToken(token: Record<string, unknown>) {
  if (!token.refreshToken) return { ...token, authError: "RefreshAccessTokenError" };
  try {
    const response = await fetchWithTimeout(`${API_ORIGIN}/api/auth/refresh`, {
      method: "POST",
      headers: bffHeaders(),
      body: JSON.stringify({ refreshToken: token.refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Backend refresh rejected");
    const data = await response.json();
    return {
      ...token,
      accessToken: data.accessToken,
      accessTokenExpiresAt: data.tokenExpiresAt,
      refreshToken: data.refreshToken,
      refreshTokenExpiresAt: data.refreshExpiresAt,
      sessionId: data.sessionId,
      authError: undefined,
    };
  } catch {
    return { ...token, authError: "RefreshAccessTokenError" };
  }
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = AUTH_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
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
          return null;
        }

        try {
          const response = await fetchWithTimeout(
            `${API_ORIGIN}/api/auth/login`,
            {
              method: "POST",
              headers: bffHeaders(),
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            },
          );

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          if (!data?.user?._id || !data?.accessToken) {
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
        } catch {
          return null;
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
          return false;
        }

        try {
          const response = await fetchWithTimeout(
            `${API_ORIGIN}/api/auth/google`,
            {
              method: "POST",
              headers: bffHeaders(),
              body: JSON.stringify({
                idToken: account.id_token || "",
              }),
            },
          );

          if (!response.ok) {
            return false;
          }

          const data = await response.json();
          if (!data?.user?._id || !data?.accessToken) {
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
        } catch {
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        return { ...token, ...user };
      }
      if (typeof token.accessTokenExpiresAt === "number" &&
          Date.now() < token.accessTokenExpiresAt - 60_000) return token;
      return refreshBackendAccessToken(token);
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
        Object.assign(session, { authError: token.authError });
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

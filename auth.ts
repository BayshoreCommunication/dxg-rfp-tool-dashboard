import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export const { auth, signIn, signOut, handlers } = NextAuth({
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

        const baseUrl =
          process.env.BACKEND_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          "http://localhost:5000";
        const apiUrl = baseUrl.endsWith("/api")
          ? baseUrl.slice(0, -4)
          : baseUrl;

        try {
          const response = await fetch(`${apiUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

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

        const baseUrl =
          process.env.BACKEND_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          "http://localhost:5000";
        const apiUrl = baseUrl.endsWith("/api")
          ? baseUrl.slice(0, -4)
          : baseUrl;

        try {
          const response = await fetch(`${apiUrl}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              name: googleProfile?.name || user?.name || "",
              avatar: googleProfile?.picture || user?.image || "",
              googleId: account.providerAccountId || "",
            }),
          });

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
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = token as any;
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

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
        console.log("🔑 [authorize] Starting authorization...");

        if (!credentials?.email || !credentials.password) {
          console.log("❌ [authorize] Missing email or password");
          return null;
        }

        console.log("👤 [authorize] Email:", credentials.email);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          console.error(
            "❌ [authorize] API URL is not defined in environment variables.",
          );
          return null;
        }

        console.log("🌐 [authorize] API URL:", apiUrl);

        try {
          console.log("📡 [authorize] Sending request to backend...");
          // Updated endpoint to match backend/routes/auth.py
          const response = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });

          console.log(
            "📥 [authorize] Response status:",
            response.status,
            response.statusText,
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(
              "❌ [authorize] Login failed:",
              errorData.detail || "Invalid credentials",
            );
            return null;
          }

          const data = await response.json();
          // Backend returns { access_token, token_type, user: { ... } }
          console.log("✅ [authorize] Backend response received:", {
            hasUser: !!data.user,
            hasToken: !!data.access_token,
            email: data.user?.email,
          });

          if (!data.user?._id || !data.access_token) {
            console.error(
              "❌ [authorize] Incomplete user data received from server",
            );
            return null;
          }

          const userObject: Record<string, unknown> = {
            id: data.user._id,
            _id: data.user._id,
            email: data.user.email,
            name: data.user.name,
            organization_name: data.user.organization_name,
            company_organization_type: data.user.company_organization_type,
            website: data.user.website,
            has_paid_subscription: data.user.has_paid_subscription,
            accessToken: data.access_token,
          };

          // Only add organization if it exists in response
          if (data.organization) {
            userObject.organization = data.organization;
            console.log("✅ [authorize] Organization data included:", {
              orgId: data.organization.id,
              orgName: data.organization.name,
            });
          }

          console.log("✅ [authorize] Returning user object:", {
            id: userObject.id,
            email: userObject.email,
            hasOrganization: !!userObject.organization,
          });

          return userObject;
        } catch (error) {
          console.error("💥 [authorize] Exception:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google" && profile?.email) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        console.log("check google provide logiin here for test");

        if (!apiUrl) {
          console.error("API URL is not defined");
          return false;
        }

        try {
          console.log("🔄 [Google signIn] Syncing with backend...");

          // Sync user with backend
          // Updated endpoint to match backend/routes/auth.py
          const response = await fetch(`${apiUrl}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              google_id: account.providerAccountId, // Backend expects google_id
              email: profile.email,
              name: profile.name,
              avatar: (profile as any).picture,
            }),
          });

          if (!response.ok) {
            console.error("Failed to sync Google user with backend");
            return false;
          }

          const data = await response.json();
          console.log("✅ [Google signIn] Backend sync successful");

          // Attach backend user data and token to the user object
          // Backend returns { access_token, token_type, user: { ... }, organization?: { ... } }
          if (data.user && data.access_token) {
            const userData: Record<string, unknown> = {
              accessToken: data.access_token,
              _id: data.user._id,
              organization_name: data.user.organization_name,
              company_organization_type: data.user.company_organization_type,
              website: data.user.website,
              has_paid_subscription: data.user.has_paid_subscription,
              // Store redirect path based on subscription
              redirectTo: data.user.has_paid_subscription
                ? "/dashboard"
                : "/pricing", // Adjusted logic based on subscription flag
            };

            // Only add organization if it exists in response
            if (data.organization) {
              userData.organization = data.organization;
              console.log("✅ [Google signIn] Organization data included:", {
                orgId: data.organization.id,
                orgName: data.organization.name,
              });
            }

            Object.assign(user, userData);

            console.log(
              "📍 [Google signIn] Redirect path:",
              data.user.has_paid_subscription ? "/dashboard" : "/pricing",
            );
          }
        } catch (error) {
          console.error("Error syncing Google user:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      try {
        console.log(
          "🎫 [jwt callback] Called with user:",
          user ? "present" : "not present",
        );

        if (user) {
          console.log("✅ [jwt callback] Adding user to token:", {
            id: (user as any).id || (user as any)._id,
            email: (user as any).email,
          });
          return { ...token, ...user };
        }

        console.log("📋 [jwt callback] Returning existing token");
        return token;
      } catch (error) {
        console.error("💥 [jwt callback] Error:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        console.log("🔐 [session callback] Creating session with token");

        if (token) {
          session.user = token as any;
          console.log("✅ [session callback] Session user:", {
            id: (session.user as any).id || (session.user as any)._id,
            email: (session.user as any).email,
          });
        }

        return session;
      } catch (error) {
        console.error("💥 [session callback] Error:", error);
        return session;
      }
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      _id?: string;
      avatar?: string;
    };
    authError?: string;
    backendAccessExpired?: boolean;
    /** The organization still has its sign-up placeholder name and the user may rename it. */
    needsCompanyName?: boolean;
  }

  interface User {
    _id?: string;
    avatar?: string;
    accessToken?: string;
    accessTokenExpiresAt?: number;
    refreshToken?: string;
    refreshTokenExpiresAt?: number;
    sessionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    _id?: string;
    avatar?: string;
    accessToken?: string;
    accessTokenExpiresAt?: number;
    refreshToken?: string;
    refreshTokenExpiresAt?: number;
    sessionId?: string;
    authError?: string;
    needsCompanyName?: boolean;
  }
}

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      _id?: string;
      avatar?: string;
    };
    authError?: string;
    /** Set with authError when RFPilot paused the member's organization. */
    authEndReason?: string;
    backendAccessExpired?: boolean;
    /** The organization hasn't finished onboarding and this user (Owner or Admin) can finish it. */
    needsOnboarding?: boolean;
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
    authEndReason?: string;
    needsOnboarding?: boolean;
  }
}

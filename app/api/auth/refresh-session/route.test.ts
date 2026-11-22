/** @jest-environment node */

jest.mock("server-only", () => ({}));
const mockForceRefresh = jest.fn();
jest.mock("@/lib/server/backendClient", () => ({
  forceRefreshBackendSession: () => mockForceRefresh(),
}));
const mockGetBackendSession = jest.fn();
jest.mock("@/lib/server/backendSession", () => ({
  getBackendSession: () => mockGetBackendSession(),
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

const request = (returnTo = "/proposals?tab=open") =>
  new NextRequest(
    `http://localhost:3000/api/auth/refresh-session?returnTo=${encodeURIComponent(returnTo)}`,
  );

const state = (overrides: Record<string, unknown>) => ({
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshToken: null,
  refreshTokenExpiresAt: null,
  sessionId: null,
  expired: false,
  retryableError: false,
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe("refresh-session route", () => {
  it("returns to the page after a refresh", async () => {
    mockForceRefresh.mockResolvedValue(state({ accessToken: "new" }));
    const response = await GET(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/proposals?tab=open");
  });

  it("sends a session the block ended to the organization-blocked exit", async () => {
    mockForceRefresh.mockResolvedValue(null);
    mockGetBackendSession.mockResolvedValue(state({ expired: true, organizationBlocked: true }));
    const response = await GET(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/api/auth/organization-blocked");
  });

  it("keeps the quiet sign-in redirect for any other ended session", async () => {
    mockForceRefresh.mockResolvedValue(null);
    mockGetBackendSession.mockResolvedValue(state({ expired: true, organizationBlocked: false }));
    const response = await GET(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "/sign-in?callbackUrl=%2Fproposals%3Ftab%3Dopen&reason=session-expired",
    );
  });

  it("asks to retry when the refresh is only temporarily unavailable", async () => {
    mockForceRefresh.mockResolvedValue(null);
    mockGetBackendSession.mockResolvedValue(state({ retryableError: true }));
    const response = await GET(request());
    expect(response.status).toBe(503);
  });
});

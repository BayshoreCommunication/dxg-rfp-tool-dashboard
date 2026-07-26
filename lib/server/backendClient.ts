import "server-only";

import { unstable_update } from "@/auth";
import {
  BACKEND_REFRESH_COMMAND,
  BACKEND_REFRESH_HANDOFF,
  backendRefreshCoordinator,
  createBackendRefreshCommand,
} from "@/lib/authRefresh";
import {
  hasExpiredBackendSession,
  hasRetryableBackendSessionError,
} from "@/lib/authTokenState";
import {
  getBackendSession,
  type BackendSession,
} from "@/lib/server/backendSession";

type BackendClientDependencies = {
  readSession: () => Promise<BackendSession>;
  forceRefresh: () => Promise<BackendSession | null>;
  fetcher: typeof fetch;
};

type SessionRefreshOperation = () => Promise<BackendSession | null>;
type SessionRefreshFlights = Map<string, Promise<BackendSession | null>>;

export function createSessionRefreshSingleFlight(
  inFlight: SessionRefreshFlights = new Map(),
) {
  return (
    sessionId: string,
    operation: SessionRefreshOperation,
  ): Promise<BackendSession | null> => {
    const current = inFlight.get(sessionId);
    if (current) return current;

    const pending = operation().finally(() => {
      if (inFlight.get(sessionId) === pending) inFlight.delete(sessionId);
    });
    inFlight.set(sessionId, pending);
    return pending;
  };
}

const sharedSessionRefreshFlights = () => {
  const root = globalThis as typeof globalThis & {
    __rfpilotDashboardSessionRefreshFlights?: SessionRefreshFlights;
  };
  return (root.__rfpilotDashboardSessionRefreshFlights ??= new Map());
};

const runSessionRefreshSingleFlight = createSessionRefreshSingleFlight(
  sharedSessionRefreshFlights(),
);

export type AuthenticatedFetchOptions = {
  retryOnUnauthorized?: boolean;
};

const authenticationRequiredResponse = () =>
  Response.json(
    {
      success: false,
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required",
    },
    { status: 401 },
  );

const withBearer = (init: RequestInit | undefined, accessToken: string) => {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return { ...init, headers, cache: init?.cache ?? "no-store" } satisfies RequestInit;
};

export function createAuthenticatedBackendClient(
  dependencies: BackendClientDependencies,
) {
  return async (
    input: string | URL,
    init?: RequestInit,
    options: AuthenticatedFetchOptions = {},
  ): Promise<Response> => {
    let session = await dependencies.readSession();
    let refreshAttempted = false;
    const accessTokenExpired =
      typeof session.accessTokenExpiresAt === "number" &&
      Date.now() >= session.accessTokenExpiresAt;

    if (
      (!session.accessToken || accessTokenExpired) &&
      session.refreshToken &&
      !session.expired
    ) {
      refreshAttempted = true;
      session = (await dependencies.forceRefresh()) ?? session;
    }
    if (!session.accessToken) return authenticationRequiredResponse();

    const firstResponse = await dependencies.fetcher(
      input,
      withBearer(init, session.accessToken),
    );
    if (
      firstResponse.status !== 401 ||
      options.retryOnUnauthorized === false ||
      refreshAttempted
    ) {
      return firstResponse;
    }

    refreshAttempted = true;
    const nextSession = await dependencies.forceRefresh();
    if (
      !nextSession?.accessToken ||
      nextSession.accessToken === session.accessToken
    ) {
      return firstResponse;
    }

    await firstResponse.body?.cancel().catch(() => undefined);
    return dependencies.fetcher(
      input,
      withBearer(init, nextSession.accessToken),
    );
  };
}

const backendSessionFromToken = (
  token: Record<string, unknown> | null,
): BackendSession | null => {
  if (
    typeof token?.accessToken !== "string" ||
    typeof token.accessTokenExpiresAt !== "number" ||
    typeof token.refreshToken !== "string" ||
    typeof token.refreshTokenExpiresAt !== "number" ||
    typeof token.sessionId !== "string"
  ) {
    return null;
  }
  return {
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    refreshToken: token.refreshToken,
    refreshTokenExpiresAt: token.refreshTokenExpiresAt,
    sessionId: token.sessionId,
    expired: false,
    retryableError: false,
  };
};

export async function forceRefreshBackendSession(): Promise<BackendSession | null> {
  const previous = await getBackendSession();
  if (!previous.sessionId || !previous.refreshToken || previous.expired) {
    return null;
  }
  return runSessionRefreshSingleFlight(previous.sessionId, async () => {
    try {
      const command = await createBackendRefreshCommand(previous.sessionId!);
      const session = await unstable_update({
        [BACKEND_REFRESH_COMMAND]: command,
      } as never);
      const state = session as Record<string, unknown> | null;
      if (
        !state ||
        hasExpiredBackendSession(state) ||
        hasRetryableBackendSessionError(state)
      ) {
        return null;
      }

      const responseHandoff = backendSessionFromToken(
        state[BACKEND_REFRESH_HANDOFF] as Record<string, unknown> | null,
      );
      if (responseHandoff) return responseHandoff;

      const handoff = backendSessionFromToken(
        backendRefreshCoordinator.getLatest(previous.sessionId!),
      );
      if (handoff) return handoff;

      const persisted = await getBackendSession();
      return persisted.accessToken &&
        persisted.accessToken !== previous.accessToken &&
        !persisted.expired
        ? persisted
        : null;
    } catch {
      return null;
    }
  });
}

export const authenticatedBackendFetch = createAuthenticatedBackendClient({
  readSession: getBackendSession,
  forceRefresh: forceRefreshBackendSession,
  fetcher: fetch,
});

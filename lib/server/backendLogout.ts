import "server-only";

import {
  AUTH_API_ORIGIN,
  authBffHeaders,
  fetchWithTimeout,
} from "@/lib/authRefresh";
import {
  getBackendSession,
  type BackendSession,
} from "@/lib/server/backendSession";

type BackendSessionRevokerDependencies = {
  readSession: () => Promise<BackendSession>;
  fetcher: typeof fetch;
};

export function createBackendSessionRevoker(
  dependencies: BackendSessionRevokerDependencies,
) {
  return async (): Promise<boolean> => {
    const session = await dependencies.readSession();

    if (session.refreshToken) {
      const response = await fetchWithTimeout(
        `${AUTH_API_ORIGIN}/api/auth/logout-session`,
        {
          method: "POST",
          headers: authBffHeaders(),
          body: JSON.stringify({ refreshToken: session.refreshToken }),
          cache: "no-store",
        },
        undefined,
        dependencies.fetcher,
      );
      return response.ok;
    }

    if (session.accessToken) {
      const response = await dependencies.fetcher(
        `${AUTH_API_ORIGIN}/api/auth/logout`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.accessToken}` },
          cache: "no-store",
        },
      );
      return response.ok;
    }

    return true;
  };
}

export const revokeCurrentBackendSession = createBackendSessionRevoker({
  readSession: getBackendSession,
  fetcher: fetch,
});

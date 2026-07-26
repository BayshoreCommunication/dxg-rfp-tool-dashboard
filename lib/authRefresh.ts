import { BACKEND_URL } from "@/lib/config";
import {
  expireBackendSession,
  REFRESH_RETRY_ERROR,
  type AuthToken,
} from "@/lib/authTokenState";

export const AUTH_API_ORIGIN = BACKEND_URL.endsWith("/api")
  ? BACKEND_URL.slice(0, -4)
  : BACKEND_URL;

export const AUTH_FETCH_TIMEOUT_MS = 8_000;
export const BACKEND_REFRESH_COMMAND = "backendRefreshCommand";
export const BACKEND_REFRESH_HANDOFF = "backendRefreshHandoff";

const defaultFetcher: typeof fetch = (...args) => globalThis.fetch(...args);

export const authBffHeaders = () => {
  const sharedSecret = process.env.BFF_SHARED_SECRET?.trim();
  if (!sharedSecret) {
    throw new Error("BFF_SHARED_SECRET is required for backend sessions");
  }
  return {
    "Content-Type": "application/json",
    "x-rfpilot-bff-key": sharedSecret,
  };
};

type BackendRefreshCommand = {
  sessionId: string;
  issuedAt: number;
  nonce: string;
  signature: string;
};

const commandPayload = (
  command: Omit<BackendRefreshCommand, "signature">,
) =>
  JSON.stringify([
    command.sessionId,
    command.issuedAt,
    command.nonce,
  ]);

const hmacKey = async () => {
  const secret = process.env.BFF_SHARED_SECRET?.trim();
  if (!secret) {
    throw new Error("BFF_SHARED_SECRET is required for backend sessions");
  }
  return globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
};

const toHex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

const fromHex = (value: string): Uint8Array<ArrayBuffer> | null => {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
};

export async function createBackendRefreshCommand(
  sessionId: string,
): Promise<BackendRefreshCommand> {
  const unsigned = {
    sessionId,
    issuedAt: Date.now(),
    nonce: globalThis.crypto.randomUUID(),
  };
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(commandPayload(unsigned)),
  );
  return { ...unsigned, signature: toHex(signature) };
}

export async function verifyBackendRefreshCommand(
  value: unknown,
  expectedSessionId: string,
): Promise<boolean> {
  if (!value || typeof value !== "object") return false;
  const command = value as Record<string, unknown>;
  if (
    command.sessionId !== expectedSessionId ||
    typeof command.issuedAt !== "number" ||
    typeof command.nonce !== "string" ||
    typeof command.signature !== "string" ||
    Math.abs(Date.now() - command.issuedAt) > 30_000
  ) {
    return false;
  }
  const signature = fromHex(command.signature);
  if (!signature) return false;
  try {
    return globalThis.crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      signature,
      new TextEncoder().encode(
        commandPayload({
          sessionId: command.sessionId,
          issuedAt: command.issuedAt,
          nonce: command.nonce,
        }),
      ),
    );
  } catch {
    return false;
  }
}

export function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = AUTH_FETCH_TIMEOUT_MS,
  fetcher: typeof fetch = defaultFetcher,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetcher(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
}

type RefreshResponse = {
  accessToken: string;
  tokenExpiresAt: number;
  refreshToken: string;
  refreshExpiresAt: number;
  sessionId: string;
};

const parseRefreshResponse = (value: unknown): RefreshResponse | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.accessToken !== "string" ||
    typeof data.tokenExpiresAt !== "number" ||
    typeof data.refreshToken !== "string" ||
    typeof data.refreshExpiresAt !== "number" ||
    typeof data.sessionId !== "string"
  ) {
    return null;
  }
  return {
    accessToken: data.accessToken,
    tokenExpiresAt: data.tokenExpiresAt,
    refreshToken: data.refreshToken,
    refreshExpiresAt: data.refreshExpiresAt,
    sessionId: data.sessionId,
  };
};

type RefreshCoordinatorOptions = {
  fetcher?: typeof fetch;
  now?: () => number;
  shared?: boolean;
};

type RefreshRegistry = {
  inFlight: Map<string, Promise<AuthToken>>;
  latest: Map<string, { token: AuthToken; availableUntil: number }>;
};

const sharedRefreshRegistry = () => {
  const root = globalThis as typeof globalThis & {
    __rfpilotDashboardRefreshRegistry?: RefreshRegistry;
  };
  return (root.__rfpilotDashboardRefreshRegistry ??= {
    inFlight: new Map(),
    latest: new Map(),
  });
};

export function createBackendRefreshCoordinator(
  options: RefreshCoordinatorOptions = {},
) {
  const fetcher = options.fetcher ?? defaultFetcher;
  const now = options.now ?? Date.now;
  const registry = options.shared
    ? sharedRefreshRegistry()
    : { inFlight: new Map(), latest: new Map() };
  const { inFlight, latest } = registry;
  const latestHandoffMs = 10_000;

  const rememberLatest = (key: string, token: AuthToken) => {
    for (const [entryKey, entry] of latest) {
      if (now() >= entry.availableUntil) latest.delete(entryKey);
    }
    if (
      typeof token.accessToken === "string" &&
      typeof token.refreshToken === "string" &&
      typeof token.sessionId === "string" &&
      token.authError === undefined
    ) {
      latest.set(key, {
        token: { ...token },
        availableUntil: now() + latestHandoffMs,
      });
    }
  };

  const rotate = async (token: AuthToken): Promise<AuthToken> => {
    if (
      typeof token.refreshToken !== "string" ||
      (typeof token.refreshTokenExpiresAt === "number" &&
        now() >= token.refreshTokenExpiresAt)
    ) {
      return expireBackendSession(token);
    }

    try {
      const response = await fetchWithTimeout(
        `${AUTH_API_ORIGIN}/api/auth/refresh`,
        {
          method: "POST",
          headers: authBffHeaders(),
          body: JSON.stringify({ refreshToken: token.refreshToken }),
          cache: "no-store",
        },
        AUTH_FETCH_TIMEOUT_MS,
        fetcher,
      );

      if (response.status === 401 || response.status === 403) {
        return expireBackendSession(token);
      }
      if (!response.ok) {
        return { ...token, authError: REFRESH_RETRY_ERROR };
      }

      const data = parseRefreshResponse(await response.json());
      if (!data) return expireBackendSession(token);

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
      return { ...token, authError: REFRESH_RETRY_ERROR };
    }
  };

  const refresh = (token: AuthToken): Promise<AuthToken> => {
    const key =
      typeof token.sessionId === "string"
        ? token.sessionId
        : typeof token.refreshToken === "string"
          ? token.refreshToken
          : "";
    if (!key) return Promise.resolve(expireBackendSession(token));

    const recent = getLatest(key);
    if (
      recent &&
      typeof token.refreshToken === "string" &&
      token.refreshToken !== recent.refreshToken
    ) {
      return Promise.resolve(recent);
    }

    const current = inFlight.get(key);
    if (current) return current;

    const pending = rotate(token)
      .then((result) => {
        rememberLatest(key, result);
        return result;
      })
      .finally(() => {
        if (inFlight.get(key) === pending) inFlight.delete(key);
      });
    inFlight.set(key, pending);
    return pending;
  };

  const getLatest = (key: string): AuthToken | null => {
    const entry = latest.get(key);
    if (!entry) return null;
    if (now() >= entry.availableUntil) {
      latest.delete(key);
      return null;
    }
    return { ...entry.token };
  };

  return { refresh, getLatest };
}

export const backendRefreshCoordinator = createBackendRefreshCoordinator({
  shared: true,
});

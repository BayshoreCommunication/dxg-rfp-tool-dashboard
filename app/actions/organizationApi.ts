import { BACKEND_URL as API_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

// Shared plumbing for the organization server actions (members, teams, invitations). Not a
// "use server" module: it only exports helpers the action files call.

export type OrgActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  // Backend error code and HTTP status, so the UI can map them to human messages.
  code?: string;
  status?: number;
  // Extra fields the backend sends with a refusal (ownedRfpCount, retryAfterSeconds, remaining…).
  details?: Record<string, unknown>;
};

const NON_DETAIL_KEYS = new Set(["success", "code", "message", "data"]);

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Network error";

export async function orgRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
  pick: (payload: Record<string, unknown>) => T = (payload) => payload.data as T,
): Promise<OrgActionResult<T>> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const payload = ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    if (!res.ok) {
      const details: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(payload)) {
        if (!NON_DETAIL_KEYS.has(key)) details[key] = value;
      }
      const retryAfter = Number(res.headers?.get?.("Retry-After"));
      if (Number.isFinite(retryAfter) && retryAfter > 0 && details.retryAfterSeconds === undefined) {
        details.retryAfterSeconds = retryAfter;
      }
      return {
        success: false,
        status: res.status,
        code: typeof payload.code === "string" ? payload.code : undefined,
        message: typeof payload.message === "string" ? payload.message : "The request failed.",
        details,
      };
    }
    return {
      success: true,
      status: res.status,
      message: typeof payload.message === "string" ? payload.message : "OK",
      data: pick(payload),
    };
  } catch (error: unknown) {
    return { success: false, message: errorMessage(error), code: "NETWORK_ERROR" };
  }
}

export const segment = (value: string) => encodeURIComponent(value);

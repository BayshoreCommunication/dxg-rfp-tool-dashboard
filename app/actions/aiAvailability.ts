"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

export type AiUnavailableReason =
  | "PILOT_DISABLED"
  | "KILL_SWITCH"
  | "CREDENTIAL_MISSING"
  | "PROVIDER_UNAVAILABLE";

export type AiAvailability = {
  available: boolean;
  reason: AiUnavailableReason | null;
  since: string | null;
  checkedAt: string;
};

/* Whether live AI can serve a request right now. The composer asks before
   letting a planner send, because every path out of it (chat reply, requirement
   extraction, draft) is a provider call.

   This must never be the reason someone cannot work: any failure to read the
   signal resolves to available, so a real attempt produces the real error
   instead of the UI inventing an outage. */
export const getAiAvailabilityAction = async (): Promise<AiAvailability> => {
  try {
    const response = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/v1/ai/availability`,
      { cache: "no-store", headers: { "X-Correlation-ID": crypto.randomUUID() } },
    );
    if (!response.ok) return optimistic();
    const body = await response.json().catch(() => ({}));
    const data = body?.data;
    if (!data || typeof data.available !== "boolean") return optimistic();
    return {
      available: data.available,
      reason: data.reason ?? null,
      since: typeof data.since === "string" ? data.since : null,
      checkedAt: typeof data.checkedAt === "string" ? data.checkedAt : new Date().toISOString(),
    };
  } catch {
    return optimistic();
  }
};

const optimistic = (): AiAvailability => ({
  available: true,
  reason: null,
  since: null,
  checkedAt: new Date().toISOString(),
});

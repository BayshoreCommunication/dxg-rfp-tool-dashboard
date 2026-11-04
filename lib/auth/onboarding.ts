import { AUTH_API_ORIGIN, fetchWithTimeout } from "@/lib/authRefresh";

/* Every new organization starts onboarding (ORG-301): company details → plan →
   invite the team (optional). Until it is done the proxy sends the Owner or an
   Admin to ONBOARDING_PATH. Any failure here means "don't send": onboarding must
   never block a sign-in. */

export const ONBOARDING_PATH = "/welcome";
// Sent with unstable_update when onboarding finishes, to clear the flag.
export const ONBOARDING_DONE_UPDATE = "onboardingDone";

export const ONBOARDING_STEPS = ["details", "plan", "team", "done"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const isOnboardingStep = (value: unknown): value is OnboardingStep =>
  ONBOARDING_STEPS.includes(value as OnboardingStep);

export async function readNeedsOnboarding(
  accessToken: unknown,
  fetcher: typeof fetchWithTimeout = fetchWithTimeout,
): Promise<boolean> {
  if (typeof accessToken !== "string" || !accessToken) return false;
  try {
    const response = await fetcher(`${AUTH_API_ORIGIN}/api/organization/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return isOnboardingStep(body?.onboardingStep) && body.onboardingStep !== "done" && body?.canManage === true;
  } catch {
    return false;
  }
}

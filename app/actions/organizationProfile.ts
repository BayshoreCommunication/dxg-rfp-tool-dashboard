"use server";

import { unstable_update } from "@/auth";
import { isOnboardingStep, ONBOARDING_DONE_UPDATE, type OnboardingStep } from "@/lib/auth/onboarding";
import { orgRequest } from "./organizationApi";

/* The organization profile and onboarding (ORG-301), under /api/organization.
   Finishing onboarding also clears the session's needsOnboarding so the proxy
   stops sending the Owner to /welcome. */

export type OrganizationType = "corporate" | "association" | "agency" | "venue" | "government" | "other";

export type OrganizationProfile = {
  name: string;
  type: OrganizationType | null;
  industry: string | null;
  country: string | null;
  timeZone: string | null;
  eventsPerYear: number | null;
  plan: string;
  onboardingStep: OnboardingStep;
  canManage: boolean;
};

export type OrganizationDetailsInput = {
  name: string;
  type: OrganizationType | "";
  industry: string;
  country: string;
  timeZone: string;
  eventsPerYear: string;
};

const text = (value: unknown) => (typeof value === "string" && value ? value : null);

const toProfile = (payload: Record<string, unknown>): OrganizationProfile => ({
  name: String(payload.name ?? ""),
  type: text(payload.type) as OrganizationType | null,
  industry: text(payload.industry),
  country: text(payload.country),
  timeZone: text(payload.timeZone),
  eventsPerYear: typeof payload.eventsPerYear === "number" ? payload.eventsPerYear : null,
  plan: String(payload.plan ?? "free_trial"),
  // An older backend without onboarding: treat as done so nobody is stuck.
  onboardingStep: isOnboardingStep(payload.onboardingStep) ? payload.onboardingStep : "done",
  canManage: payload.canManage === true,
});

export async function getOrganizationProfileAction() {
  return orgRequest<OrganizationProfile>("/api/organization/profile", {}, toProfile);
}

export async function saveOrganizationDetailsAction(input: OrganizationDetailsInput) {
  const events = input.eventsPerYear.trim();
  return orgRequest<OrganizationProfile>(
    "/api/organization/profile",
    {
      method: "PUT",
      body: {
        name: input.name,
        type: input.type || null,
        industry: input.industry.trim() || null,
        country: input.country || null,
        timeZone: input.timeZone || null,
        eventsPerYear: events ? Number(events) : null,
      },
    },
    toProfile,
  );
}

export async function chooseOnboardingPlanAction(plan: string) {
  return orgRequest<OrganizationProfile>(
    "/api/organization/onboarding/plan",
    { method: "POST", body: { plan } },
    toProfile,
  );
}

export async function completeOnboardingAction() {
  const result = await orgRequest<OrganizationProfile>(
    "/api/organization/onboarding/complete",
    { method: "POST", body: {} },
    toProfile,
  );
  if (result.success) {
    await unstable_update({ [ONBOARDING_DONE_UPDATE]: true } as never);
  }
  return result;
}

/* The session still says "onboarding" but the backend disagrees (finished on
   another device, or this user can't manage it). Clear the flag so the proxy
   stops sending them to /welcome. */
export async function leaveOnboardingAction() {
  await unstable_update({ [ONBOARDING_DONE_UPDATE]: true } as never);
}

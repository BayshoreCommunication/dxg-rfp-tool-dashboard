import "server-only";

import type { ReactNode } from "react";
import { getEntitlementsAction } from "@/app/actions/entitlements";
import { getProposalByIdAction } from "@/app/actions/proposals";
import { getDashboardRfpSummaryAction } from "@/app/actions/rfpDashboard";
import { PLAN_FEATURE_LOCKED, isFeatureLocked, planName, rfpUsageOf, type PlanFeature, type RfpUsage } from "@/lib/entitlements/entitlements";
import PlanLockedState from "./PlanLockedState";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;

// The count and title for one RFP, from the RFP itself (not from the locked response routes).
// Both are null when the member can't read that RFP.
const rfpFacts = async (rfpId: string): Promise<{ responseCount: number | null; title: string | null }> => {
  if (!/^[0-9a-f]{24}$/i.test(rfpId)) return { responseCount: null, title: null };
  const result = await getProposalByIdAction(rfpId);
  if (!result.success || !isRecord(result.data)) return { responseCount: null, title: null };
  const lifecycle = isRecord(result.data.lifecycle) ? result.data.lifecycle : {};
  const event = isRecord(result.data.event) ? result.data.event : {};
  const title = typeof event.eventName === "string" && event.eventName.trim() ? event.eventName.trim() : null;
  return { responseCount: count(lifecycle.vendorsResponded), title };
};

// Responses received across the RFPs this member may see (the ORG-401 dashboard summary).
const allResponsesCount = async (): Promise<number | null> => {
  const summary = await getDashboardRfpSummaryAction();
  return summary.success && summary.data ? count(summary.data.responsesReceived) : null;
};

type LockedScreenOptions = {
  // Set on a screen that belongs to one RFP: the count is that RFP's.
  rfpId?: string;
  backHref: string;
  backLabel: string;
};

/**
 * The locked state for a plan-gated screen (ORG-602), or null when the organization's plan
 * includes the feature. Call it first in the page and return what it gives:
 *
 *   const locked = await planLockedScreen("vendorResponses", { backHref: "/dashboard", backLabel: "Back to the dashboard" });
 *   if (locked) return locked;
 *
 * so the page never asks the backend for data it would refuse. This is presentation only; the
 * backend refuses the routes whatever the dashboard renders (ORG-601).
 */
const lockedState = async (feature: PlanFeature, plan: string, options: LockedScreenOptions): Promise<ReactNode> => {
  const facts = options.rfpId ? await rfpFacts(options.rfpId) : { responseCount: await allResponsesCount(), title: null };
  return (
    <PlanLockedState
      feature={feature}
      planName={planName(plan)}
      responseCount={facts.responseCount}
      countScope={options.rfpId ? "rfp" : "all"}
      rfpTitle={facts.title}
      backHref={options.backHref}
      backLabel={options.backLabel}
    />
  );
};

export async function planLockedScreen(feature: PlanFeature, options: LockedScreenOptions): Promise<ReactNode | null> {
  const entitlements = await getEntitlementsAction();
  const plan = entitlements.success ? entitlements.data ?? null : null;
  if (!isFeatureLocked(plan, feature)) return null;
  return lockedState(feature, plan?.plan ?? "", options);
}

/**
 * The same locked state when the backend itself refused a read with PLAN_FEATURE_LOCKED: the
 * plan couldn't be read first, or it changed between the two requests. null for any other
 * result, which the page handles as before.
 */
export async function planLockedRefusal(
  feature: PlanFeature,
  results: ReadonlyArray<unknown>,
  options: LockedScreenOptions,
): Promise<ReactNode | null> {
  const refused = results.some((result) => isRecord(result) && result.success === false && result.code === PLAN_FEATURE_LOCKED);
  return refused ? lockedState(feature, "", options) : null;
}

// The plan's RFP counter for the "New RFP" button; null when the plan has no limit.
export async function loadRfpUsage(): Promise<RfpUsage | null> {
  const entitlements = await getEntitlementsAction();
  return rfpUsageOf(entitlements.success ? entitlements.data ?? null : null);
}

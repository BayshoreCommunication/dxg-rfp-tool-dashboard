// Plan entitlements as the dashboard reads them (ORG-602, DXG decision Q2). The backend owns the
// rules and enforces them on every route (ORG-601, GET /api/organization/entitlements); this
// module only turns its answer into what a screen shows. There is no generated contract for the
// endpoint, so the answer is parsed defensively: anything unreadable is "unknown", and an unknown
// plan shows the ordinary screen and lets the backend decide.

export const PLAN_FEATURES = ["vendorResponses", "proposalIntelligence"] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

export type Entitlements = {
  plan: string;
  exempt: boolean;
  rfps: {
    created: number;
    // null when the plan has no limit.
    limit: number | null;
    remaining: number | null;
    canCreate: boolean;
  };
  // false only when the backend says the feature is locked.
  features: Record<PlanFeature, boolean>;
};

// Refusal codes the backend sends with HTTP 403.
export const PLAN_LIMIT_REACHED = "PLAN_LIMIT_REACHED";
export const PLAN_FEATURE_LOCKED = "PLAN_FEATURE_LOCKED";

// Where "Contact us" leads until paid plans and checkout exist: the in-app support desk.
export const UPGRADE_CONTACT_HREF = "/support";

const PLAN_NAMES: Record<string, string> = {
  free_trial: "Free trial",
  full_access: "Full access",
};

export const planName = (plan: string): string => PLAN_NAMES[plan] ?? "Your plan";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const wholeNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;

export const toEntitlements = (value: unknown): Entitlements | null => {
  if (!isRecord(value) || !isRecord(value.proposals)) return null;
  const created = wholeNumber(value.proposals.created);
  if (created === null) return null;
  const limit = wholeNumber(value.proposals.limit);
  const features = isRecord(value.features) ? value.features : {};
  return {
    plan: typeof value.plan === "string" ? value.plan : "",
    exempt: value.exempt === true,
    rfps: {
      created,
      limit,
      remaining: limit === null ? null : wholeNumber(value.proposals.remaining) ?? Math.max(0, limit - created),
      // The backend's own answer when it gives one; otherwise what the numbers say.
      canCreate: typeof value.proposals.canCreate === "boolean" ? value.proposals.canCreate : limit === null || created < limit,
    },
    features: {
      vendorResponses: features.vendorResponses !== false,
      proposalIntelligence: features.proposalIntelligence !== false,
    },
  };
};

export const isFeatureLocked = (entitlements: Entitlements | null, feature: PlanFeature): boolean =>
  entitlements !== null && !entitlements.features[feature];

// What the "New RFP" button shows beside it. null on a plan with no limit (or an unknown plan):
// nothing to count.
export type RfpUsage = {
  used: number;
  limit: number;
  atLimit: boolean;
  planName: string;
};

export const rfpUsageOf = (entitlements: Entitlements | null): RfpUsage | null => {
  if (!entitlements || entitlements.rfps.limit === null) return null;
  const { created, limit, canCreate } = entitlements.rfps;
  return { used: Math.min(created, limit), limit, atLimit: !canCreate, planName: planName(entitlements.plan) };
};

const rfpWord = (count: number) => (count === 1 ? "RFP" : "RFPs");

// "1 of 2 RFPs used"
export const rfpUsageLabel = (usage: RfpUsage): string => `${usage.used} of ${usage.limit} ${rfpWord(usage.limit)} used`;

export const rfpLimitMessage = (usage: RfpUsage): string =>
  usage.limit === 0
    ? "Your plan doesn't include creating RFPs. Contact us to upgrade."
    : `Your plan includes ${usage.limit} ${rfpWord(usage.limit)} and your organization has used ${usage.limit === 1 ? "it" : usage.limit === 2 ? "both" : `all ${usage.limit}`}. Deleting an RFP doesn't free one up. Contact us to upgrade.`;

export const LOCKED_FEATURE_COPY: Record<PlanFeature, { name: string; title: string; body: string }> = {
  vendorResponses: {
    name: "Vendor responses",
    title: "Vendor responses aren't included in your plan",
    body: "Vendors can still respond to your RFPs. Every response is saved, and you can read, compare and export them as soon as your plan is upgraded.",
  },
  proposalIntelligence: {
    name: "RFP intelligence",
    title: "RFP intelligence isn't included in your plan",
    body: "RFP intelligence reads every vendor response, checks it against your requirements and lines the vendors up side by side. Vendors can still respond, and their responses are saved for when your plan is upgraded.",
  },
};

// "3 vendor responses received" for the locked state. `scope` says what was counted.
export const responseCountLabel = (count: number, scope: "rfp" | "all"): string => {
  const where = scope === "rfp" ? "on this RFP" : "on your RFPs";
  if (count === 0) return `No vendor responses received ${where} yet`;
  return `${count.toLocaleString("en-US")} vendor ${count === 1 ? "response" : "responses"} received ${where}`;
};

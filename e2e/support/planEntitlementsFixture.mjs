// Local-only stand-in for the backend's plan entitlements (ORG-601) and the routes they gate,
// for the locked states (ORG-602). Synthetic data only.
//
// The organization starts on full access with no limit, so the other specs see no counter and
// nothing locked. A spec puts it on the free trial, or changes the plan back (what DXG staff do
// from the admin app), with POST /__e2e/plan { plan, created }. Like the real backend, a locked
// feature is refused with 403 PLAN_FEATURE_LOCKED before anything is read, and that refusal
// carries no vendor data.

const FREE_TRIAL_LIMIT = 2;
const state = { plan: "full_access", created: 0, lockedRequests: [] };

// One RFP from roleDashboardFixture.mjs ("Annual Sales Kickoff", three responses).
export const PLAN_RFP_ID = "000000000000000000000001";
const PLAN_RFP_TITLE = "Annual Sales Kickoff";
const RESPONSE_IDS = ["aaaaaaaaaaaaaaaaaaaaaa01", "aaaaaaaaaaaaaaaaaaaaaa02", "aaaaaaaaaaaaaaaaaaaaaa03"];
// Names that must never reach a locked screen.
export const PLAN_VENDOR_NAMES = ["Brightline AV Synthetic", "Northlight Staging Synthetic", "Cobalt Production Synthetic"];

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
};

const isFree = () => state.plan === "free_trial";

const entitlements = () => {
  const limit = isFree() ? FREE_TRIAL_LIMIT : null;
  return {
    plan: state.plan,
    exempt: false,
    proposals: {
      created: state.created,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - state.created),
      canCreate: limit === null || state.created < limit,
    },
    features: { vendorResponses: !isFree(), proposalIntelligence: !isFree() },
  };
};

const LOCKED_MESSAGES = {
  vendorResponses: "Vendor responses aren't included in your plan. Contact us to upgrade.",
  proposalIntelligence: "RFP intelligence isn't included in your plan. Contact us to upgrade.",
};

// The feature a route needs, as in the backend's tests/plan-entitlements.test.js.
const gatedFeature = (method, pathname) => {
  if (/^\/api\/v1\/proposals\/[^/]+\/intelligence(\/|$)/.test(pathname)) return "proposalIntelligence";
  if (/^\/api\/v1\/vendor-responses\/[^/]+\/analysis-/.test(pathname)) return "vendorResponses";
  if (method === "GET" && /^\/api\/vendor-responses(\/proposals|\/[a-f0-9]{24}(\/submission-detail|\/submission-export)?)?$/.test(pathname)) return "vendorResponses";
  if (method === "PATCH" && /^\/api\/vendor-responses\/[a-f0-9]{24}\/read$/.test(pathname)) return "vendorResponses";
  return null;
};

const responseItem = (id, index) => ({
  _id: id,
  proposalId: PLAN_RFP_ID,
  proposalOwnerId: "4".repeat(24),
  proposalTitle: PLAN_RFP_TITLE,
  vendorName: PLAN_VENDOR_NAMES[index],
  submittedBy: `Contact ${index + 1}`,
  email: `vendor${index + 1}@example.com`,
  message: "Synthetic response for the plan tests.",
  documents: [],
  isRead: true,
  createdAt: new Date(Date.now() - (index + 1) * 3_600_000).toISOString(),
  updatedAt: new Date(Date.now() - (index + 1) * 3_600_000).toISOString(),
  responseFormat: "legacy_unstructured",
});

export async function handlePlanEntitlements(request, response, url) {
  const pathname = url.pathname;
  const method = request.method;

  if (pathname === "/__e2e/plan") {
    if (method === "POST") {
      const body = await readJson(request);
      if (body.plan === "free_trial" || body.plan === "full_access") state.plan = body.plan;
      if (Number.isInteger(body.created) && body.created >= 0) state.created = body.created;
      if (body.clearRequests) state.lockedRequests.length = 0;
    }
    json(response, 200, { ...entitlements(), lockedRequests: state.lockedRequests });
    return true;
  }

  if (method === "GET" && pathname === "/api/organization/entitlements") {
    json(response, 200, { success: true, data: entitlements() });
    return true;
  }

  // The plan tests' RFP, read by id for its title and response count (ungated on every plan).
  if (method === "GET" && pathname === `/api/proposals/${PLAN_RFP_ID}`) {
    json(response, 200, {
      success: true,
      data: { _id: PLAN_RFP_ID, status: "submitted", isDraft: false, event: { eventName: PLAN_RFP_TITLE }, lifecycle: { vendorsInvited: 5, vendorsResponded: RESPONSE_IDS.length } },
    });
    return true;
  }

  const feature = gatedFeature(method, pathname);
  if (!feature) return false;

  if (isFree()) {
    state.lockedRequests.push(`${method} ${pathname}`);
    json(response, 403, {
      success: false, code: "PLAN_FEATURE_LOCKED", status: 403, title: "Not included in your plan",
      message: LOCKED_MESSAGES[feature], plan: state.plan, feature,
    });
    return true;
  }

  // Full access: enough synthetic data for the unlocked screens.
  if (method === "GET" && pathname === "/api/vendor-responses/proposals") {
    json(response, 200, {
      success: true,
      data: [{
        proposalId: PLAN_RFP_ID, proposalTitle: PLAN_RFP_TITLE, responseCount: RESPONSE_IDS.length, responseIds: RESPONSE_IDS,
        unreadCount: 0, latestResponseAt: new Date(Date.now() - 3_600_000).toISOString(), latestVendorName: PLAN_VENDOR_NAMES[0],
      }],
      pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      responseCount: RESPONSE_IDS.length,
      unreadCount: 0,
    });
    return true;
  }
  if (method === "GET" && pathname === "/api/vendor-responses") {
    const forRfp = url.searchParams.get("proposalId") === PLAN_RFP_ID;
    const data = forRfp ? RESPONSE_IDS.map(responseItem) : [];
    json(response, 200, { success: true, data, pagination: { total: data.length, page: 1, limit: 100, totalPages: 1 }, unreadCount: 0 });
    return true;
  }
  if (method === "GET" && /^\/api\/v1\/proposals\/[^/]+\/intelligence\/(requirement-sets|comparisons)$/.test(pathname)) {
    json(response, 200, { success: true, data: [] });
    return true;
  }
  return false;
}

// The five stat cards at the top of /dashboard: the signed-in member's own totals. A figure that
// could not be read is null and shown as unavailable, never as a made-up zero.

export type DashboardOverviewTotals = {
  totalProposals: number;
  totalEmailSent: number;
  totalEmailClicked: number;
  totalProposalViews: number;
};

export type DashboardStats = {
  totalProposals: number | null;
  totalEmailSent: number | null;
  totalEmailClicked: number | null;
  totalProposalViews: number | null;
  totalVendorResponses: number | null;
  unreadVendorResponses: number | null;
  // The organization's plan doesn't include vendor responses: nothing to count, and not a failure.
  vendorResponsesLocked: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const countOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;

// GET /api/dashboard/overview `data`. All four totals or nothing: half an answer isn't shown.
export const toOverviewTotals = (value: unknown): DashboardOverviewTotals | null => {
  const totals = isRecord(value) && isRecord(value.totals) ? value.totals : null;
  if (!totals) return null;
  const totalProposals = countOrNull(totals.totalProposals);
  const totalEmailSent = countOrNull(totals.totalEmailSent);
  const totalEmailClicked = countOrNull(totals.totalEmailClicked);
  const totalProposalViews = countOrNull(totals.totalProposalViews);
  if (totalProposals === null || totalEmailSent === null || totalEmailClicked === null || totalProposalViews === null) return null;
  return { totalProposals, totalEmailSent, totalEmailClicked, totalProposalViews };
};

// `overview` is the overview action's data (null when it failed). `vendorResponses` is the raw
// answer of GET /api/vendor-responses?page=1&limit=1: its total and unread count cover every
// response to a proposal the member owns.
export const toDashboardStats = (overview: DashboardOverviewTotals | null | undefined, vendorResponses: unknown): DashboardStats => {
  const answered = isRecord(vendorResponses) && vendorResponses.success === true;
  const total = answered && isRecord(vendorResponses.pagination) ? countOrNull(vendorResponses.pagination.total) : null;
  const unread = answered ? countOrNull(vendorResponses.unreadCount) : null;
  // Both or neither: a total without its unread count (or the reverse) is an answer we can't trust.
  const counted = total !== null && unread !== null;
  return {
    totalProposals: overview?.totalProposals ?? null,
    totalEmailSent: overview?.totalEmailSent ?? null,
    totalEmailClicked: overview?.totalEmailClicked ?? null,
    totalProposalViews: overview?.totalProposalViews ?? null,
    totalVendorResponses: counted ? total : null,
    unreadVendorResponses: counted ? unread : null,
    vendorResponsesLocked: isRecord(vendorResponses) && vendorResponses.code === "PLAN_FEATURE_LOCKED",
  };
};

export const formatCount = (value: number): string => value.toLocaleString("en-US");

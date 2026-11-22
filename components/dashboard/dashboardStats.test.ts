import { formatCount, toDashboardStats, toOverviewTotals } from "./dashboardStats";

const totals = { totalProposals: 6, totalEmailSent: 22, totalEmailClicked: 14, totalProposalViews: 1234 };
const responses = { success: true, data: [], pagination: { total: 14, page: 1, limit: 1, totalPages: 14 }, unreadCount: 3 };

describe("dashboard stat cards: reading backend payloads", () => {
  test("the overview's four totals are read as sent", () => {
    expect(toOverviewTotals({ totals, latestProposals: [] })).toEqual(totals);
    expect(toOverviewTotals({ totals: { ...totals, totalProposals: 0 } })?.totalProposals).toBe(0);
  });

  test("an overview without usable totals is no answer, not zeros", () => {
    expect(toOverviewTotals(null)).toBeNull();
    expect(toOverviewTotals({})).toBeNull();
    expect(toOverviewTotals({ totals: { totalProposals: 6 } })).toBeNull();
    expect(toOverviewTotals({ totals: { ...totals, totalEmailSent: "22" } })).toBeNull();
    expect(toOverviewTotals({ totals: { ...totals, totalProposalViews: -1 } })).toBeNull();
    expect(toOverviewTotals({ totals: { ...totals, totalEmailClicked: Number.NaN } })).toBeNull();
  });

  test("the cards get the overview totals plus the vendor-responses total and unread count", () => {
    expect(toDashboardStats(totals, responses)).toEqual({
      ...totals, totalVendorResponses: 14, unreadVendorResponses: 3, vendorResponsesLocked: false,
    });
  });

  test("a failed overview leaves its four totals unavailable and keeps the vendor responses", () => {
    expect(toDashboardStats(null, responses)).toEqual({
      totalProposals: null, totalEmailSent: null, totalEmailClicked: null, totalProposalViews: null,
      totalVendorResponses: 14, unreadVendorResponses: 3, vendorResponsesLocked: false,
    });
    expect(toDashboardStats(undefined, responses).totalProposals).toBeNull();
  });

  test("a failed or malformed vendor-responses answer is unavailable, never a made-up number", () => {
    for (const answer of [
      null,
      undefined,
      { success: false, message: "Error fetching vendor responses", data: [] },
      { success: true, data: [] },
      { success: true, pagination: { total: 14 } },
      { success: true, pagination: { total: "14" }, unreadCount: 3 },
      { success: true, pagination: {}, unreadCount: 3 },
    ]) {
      expect(toDashboardStats(totals, answer)).toMatchObject({ totalProposals: 6, totalVendorResponses: null, unreadVendorResponses: null, vendorResponsesLocked: false });
    }
  });

  test("a plan that doesn't include vendor responses is told apart from a failure", () => {
    const locked = { success: false, code: "PLAN_FEATURE_LOCKED", message: "Vendor responses aren't included in your plan." };
    expect(toDashboardStats(totals, locked)).toMatchObject({ totalVendorResponses: null, unreadVendorResponses: null, vendorResponsesLocked: true });
  });

  test("counts are formatted with thousands separators", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(1234567)).toBe("1,234,567");
  });
});

import {
  isFeatureLocked,
  responseCountLabel,
  rfpLimitMessage,
  rfpUsageLabel,
  rfpUsageOf,
  toEntitlements,
} from "./entitlements";

const freeTrial = (created: number) => ({
  plan: "free_trial",
  exempt: false,
  proposals: { created, limit: 2, remaining: Math.max(0, 2 - created), canCreate: created < 2 },
  features: { vendorResponses: false, proposalIntelligence: false },
});
const fullAccess = {
  plan: "full_access",
  exempt: false,
  proposals: { created: 7, limit: null, remaining: null, canCreate: true },
  features: { vendorResponses: true, proposalIntelligence: true },
};

describe("plan entitlements (ORG-602)", () => {
  it("reads a free trial: counter, limit and locked features", () => {
    const plan = toEntitlements(freeTrial(1));
    expect(plan?.rfps).toEqual({ created: 1, limit: 2, remaining: 1, canCreate: true });
    expect(isFeatureLocked(plan, "vendorResponses")).toBe(true);
    expect(isFeatureLocked(plan, "proposalIntelligence")).toBe(true);
    const usage = rfpUsageOf(plan);
    expect(usage).toEqual({ used: 1, limit: 2, atLimit: false, planName: "Free trial", onPlan: "on the free trial" });
    expect(rfpUsageLabel(usage!)).toBe("1 of 2 RFPs used");
  });

  it("is at the limit when the backend says no more can be created", () => {
    const usage = rfpUsageOf(toEntitlements(freeTrial(2)));
    expect(usage?.atLimit).toBe(true);
    expect(rfpUsageLabel(usage!)).toBe("2 of 2 RFPs used");
    expect(rfpLimitMessage(usage!)).toBe(
      "Your plan includes 2 RFPs and your organization has used both. Deleting an RFP doesn't free one up. Contact us to upgrade.",
    );
  });

  it("never shows more used than the limit", () => {
    expect(rfpUsageLabel(rfpUsageOf(toEntitlements(freeTrial(5)))!)).toBe("2 of 2 RFPs used");
  });

  it("has no counter and nothing locked on a plan with no limit", () => {
    const plan = toEntitlements(fullAccess);
    expect(rfpUsageOf(plan)).toBeNull();
    expect(isFeatureLocked(plan, "vendorResponses")).toBe(false);
    expect(isFeatureLocked(plan, "proposalIntelligence")).toBe(false);
  });

  it("treats an unreadable answer as unknown: no counter, nothing locked", () => {
    for (const value of [null, undefined, "free_trial", [], {}, { plan: "free_trial" }, { proposals: { created: "1" } }]) {
      const plan = toEntitlements(value);
      expect(plan).toBeNull();
      expect(rfpUsageOf(plan)).toBeNull();
      expect(isFeatureLocked(plan, "vendorResponses")).toBe(false);
    }
  });

  it("locks a feature only when the backend says false", () => {
    const plan = toEntitlements({ plan: "free_trial", proposals: { created: 0, limit: 2 }, features: { vendorResponses: false } });
    expect(plan?.rfps).toEqual({ created: 0, limit: 2, remaining: 2, canCreate: true });
    expect(isFeatureLocked(plan, "vendorResponses")).toBe(true);
    expect(isFeatureLocked(plan, "proposalIntelligence")).toBe(false);
  });

  it("names a plan it doesn't know as your plan", () => {
    const usage = rfpUsageOf(toEntitlements({ plan: "team_2027", proposals: { created: 1, limit: 10 } }));
    expect(usage).toMatchObject({ planName: "Your plan", onPlan: "on your plan" });
  });

  it("says RFP, never proposal, and counts responses in plain words", () => {
    expect(responseCountLabel(0, "all")).toBe("No vendor responses received on your RFPs yet");
    expect(responseCountLabel(1, "rfp")).toBe("1 vendor response received on this RFP");
    expect(responseCountLabel(1200, "all")).toBe("1,200 vendor responses received on your RFPs");
    const single = { used: 1, limit: 1, atLimit: true, planName: "Free trial", onPlan: "on the free trial" };
    expect(rfpUsageLabel(single)).toBe("1 of 1 RFP used");
    expect(`${rfpLimitMessage(single)} ${rfpUsageLabel(single)}`).not.toMatch(/proposal/i);
  });
});

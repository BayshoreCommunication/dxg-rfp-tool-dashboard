import {
  buildRecommendationSummary,
  comparisonOverviewCounts,
  type SummaryRequirement,
} from "./recommendationSummary";

const requirement = (
  requirementId: string,
  title: string,
  verdicts: Record<string, string>,
): SummaryRequirement => ({
  requirementId,
  title,
  mandatoryStatus: "optional",
  vendors: Object.entries(verdicts).map(([participantId, verdict]) => ({
    participantId,
    verdict,
  })),
});

const requirements = [
  { ...requirement("r1", "Union Labor", { leader: "addressed", rival: "missing" }), mandatoryStatus: "mandatory" },
  requirement("r2", "Closed Captions", { leader: "addressed", rival: "not_assessable" }),
  requirement("r3", "Remote Speakers", { leader: "addressed", rival: "addressed" }),
  requirement("r4", "Estimated Av Budget", { leader: "missing", rival: "missing" }),
];

const ranking = [
  { participantId: "leader", vendorLabel: "Inspire Solutions", eligible: true, eligibilityFailures: 0, highRisks: 0, rank: 1 },
  { participantId: "rival", vendorLabel: "Test Manual Vendor", eligible: true, eligibilityFailures: 0, highRisks: 2, rank: 2 },
];

const commercial = [
  { participantId: "leader", submittedTotal: 100180, submittedCurrency: "USD" },
  { participantId: "rival", submittedTotal: 208601.5, submittedCurrency: "USD" },
];

const build = (over: Partial<Parameters<typeof buildRecommendationSummary>[0]> = {}) =>
  buildRecommendationSummary({
    leaderId: "leader",
    ranking,
    requirements,
    commercial,
    canViewCommercial: true,
    ...over,
  })!;

it("opens with what was compared, in plain numbers a planner recognises", () => {
  expect(build().overview).toBe(
    "RFPilot compared 2 vendors against all 4 of your approved requirements. Inspire Solutions answered 3 of them, more than the other vendor.",
  );
});

it("does not claim the leader answered more when the counts are equal", () => {
  const tied = build({
    requirements: [
      requirement("r1", "Union Labor", { leader: "addressed", rival: "missing" }),
      requirement("r2", "Closed Captions", { leader: "missing", rival: "addressed" }),
    ],
  });
  expect(tied.overview).toContain("answered 1 of them, the same as the other vendor");
  expect(tied.overview).toContain("what separates them is which ones");
  expect(tied.overview).not.toContain("more than");
});

it("names the requirements the leader answered and a rival did not", () => {
  expect(build().strengths).toContain(
    "Answered Union Labor and Closed Captions where another vendor did not.",
  );
});

it("treats a mentioned-but-unanswered rival response as unanswered", () => {
  // "Closed Captions" is not_assessable for the rival, which reads as
  // "mentioned, not answered" — the leader still wins that requirement.
  expect(build().strengths.join(" ")).toContain("Closed Captions");
});

it("explains the must-have and risk advantage without quoting a score", () => {
  const summary = build();
  expect(summary.strengths).toContain(
    "Answered every must-have requirement, which not every vendor did.",
  );
  expect(summary.strengths).toContain(
    "Raised no high-severity concerns, unlike other responses here.",
  );
  expect(summary.strengths.join(" ")).not.toMatch(/\d+\.\d{2}\s*\/\s*100|points/);
});

it("says the leader is cheaper, and by how much on each alternative", () => {
  const summary = build();
  expect(summary.strengths).toContain(
    "Quoted $100,180, less than Test Manual Vendor.",
  );
  expect(summary.alternatives[0].points).toContain("Quoted $108,422 more.");
});

it("hides every price line when the viewer may not see commercial data", () => {
  const summary = build({ canViewCommercial: false });
  expect(summary.strengths.join(" ")).not.toMatch(/\$/);
  expect(summary.alternatives.flatMap((a) => a.points).join(" ")).not.toMatch(/\$/);
});

it("keeps what is still open on the leader visible", () => {
  const summary = build();
  expect(summary.watchOuts).toContain(
    "1 of your 4 requirements is not fully answered.",
  );

  const shaky = build({
    requirements: [
      { ...requirement("r1", "Union Labor", { leader: "missing", rival: "addressed" }), mandatoryStatus: "mandatory" },
    ],
    ranking: [{ ...ranking[0], highRisks: 1 }, ranking[1]],
  });
  expect(shaky.watchOuts).toContain(
    "1 must-have requirement is still unanswered — ask before you award.",
  );
  expect(shaky.watchOuts).toContain(
    "1 high-severity concern recorded against this response.",
  );
});

it("lists what each alternative left unanswered", () => {
  expect(build().alternatives[0].points).toContain(
    "1 must-have requirement unanswered.",
  );
  expect(build().alternatives[0].points).toContain("2 high-severity concerns.");
});

it("marks an ineligible alternative as out of the running", () => {
  const summary = build({
    ranking: [ranking[0], { ...ranking[1], eligible: false, eligibilityFailures: 2 }],
  });
  expect(summary.alternatives[0].points[0]).toBe(
    "Missed 2 must-pass requirements, so it is out of the running.",
  );
});

it("says so plainly when an alternative is closely matched", () => {
  const summary = build({
    requirements: [requirement("r3", "Remote Speakers", { leader: "addressed", rival: "addressed" })],
    ranking: [ranking[0], { ...ranking[1], highRisks: 0 }],
    commercial: [
      { participantId: "leader", submittedTotal: 100180, submittedCurrency: "USD" },
      { participantId: "rival", submittedTotal: 100180, submittedCurrency: "USD" },
    ],
  });
  expect(summary.alternatives[0].points).toEqual([
    "Closely matched on requirements, price and risk.",
  ]);
});

it("returns nothing when the leader is not in the ranking", () => {
  expect(
    buildRecommendationSummary({
      leaderId: "ghost",
      ranking,
      requirements,
      commercial,
      canViewCommercial: true,
    }),
  ).toBeNull();
});

it("separates a must-have that is unanswered from one that is only partly answered", () => {
  const mandatory = (id: string, title: string, verdicts: Record<string, string>) => ({
    ...requirement(id, title, verdicts),
    mandatoryStatus: "mandatory",
  });
  const summary = build({
    requirements: [
      mandatory("m1", "Non-negotiable constraints", {
        leader: "partially_addressed",
        rival: "partially_addressed",
      }),
      mandatory("m2", "Insurance", { leader: "addressed", rival: "missing" }),
      mandatory("m3", "Union Labor", { leader: "addressed", rival: "not_assessable" }),
    ],
  });
  expect(summary.watchOuts).toContain(
    "1 must-have requirement is only partly answered — check the remaining detail matters.",
  );
  expect(summary.watchOuts.join(" ")).not.toContain("still unanswered");
  expect(summary.alternatives[0].points).toContain(
    "2 must-have requirements unanswered.",
  );
  expect(summary.alternatives[0].points).toContain(
    "1 must-have requirement only partly answered.",
  );
});

it("derives mandatory counts from the requirements, not from a saved ranking", () => {
  // Comparisons saved before the two definitions were reconciled still carry
  // the old ranking numbers; the panel must not repeat them.
  const summary = build({
    requirements: [
      { ...requirement("m1", "Non-negotiable constraints", { leader: "partially_addressed", rival: "addressed" }), mandatoryStatus: "mandatory" },
    ],
  });
  expect(summary.watchOuts.join(" ")).not.toContain("still unanswered");
  expect(summary.watchOuts).toContain(
    "1 must-have requirement is only partly answered — check the remaining detail matters.",
  );
});

it("keeps flagged evidence that nobody has reviewed on the checklist", () => {
  const summary = build({
    ranking: [{ ...ranking[0], unresolvedReviews: 2 }, ranking[1]],
  });
  expect(summary.watchOuts).toContain(
    "2 pieces of flagged evidence have not been reviewed yet.",
  );
});

it("counts a must-have with no assessment at all as unanswered", () => {
  const summary = build({
    requirements: [
      {
        requirementId: "m1",
        title: "Insurance",
        mandatoryStatus: "mandatory",
        vendors: [{ participantId: "leader", verdict: "addressed" }],
      },
    ],
  });
  expect(summary.alternatives[0].points).toContain(
    "1 must-have requirement unanswered.",
  );
  expect(summary.strengths).toContain(
    "Answered every must-have requirement, which not every vendor did.",
  );
});

it("counts must-have gaps and partials per vendor from the requirement list, matching the recommendation text", () => {
  const requirements = [
    { requirementId: "r1", title: "Union labor", mandatoryStatus: "mandatory", vendors: [{ participantId: "a", verdict: "partially_addressed" }, { participantId: "b", verdict: "missing" }] },
    { requirementId: "r2", title: "Captions", mandatoryStatus: "mandatory", vendors: [{ participantId: "a", verdict: "addressed" }] },
    { requirementId: "r3", title: "Stage", mandatoryStatus: "optional", vendors: [{ participantId: "a", verdict: "missing" }, { participantId: "b", verdict: "missing" }] },
  ];
  expect(comparisonOverviewCounts({ requirements, participantIds: ["a", "b"] })).toEqual({ mandatoryUnanswered: 2, mandatoryPartlyAnswered: 1 });
});

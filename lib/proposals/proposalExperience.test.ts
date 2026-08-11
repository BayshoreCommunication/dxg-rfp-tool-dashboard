import {
  buildPersonalizedInvitation,
  buildVendorReadyStatementOfWork,
  estimateInitialBudget,
  procurementTimelineIssues,
  proposalStepOrder,
} from "./proposalExperience";

describe("proposal experience helpers", () => {
  test("basic mode keeps only the essential proposal steps", () => {
    expect(proposalStepOrder("basic", "In-Person")).toEqual([1, 2, 3, 8, 10]);
    expect(proposalStepOrder("advanced", "Hybrid")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("detects contradictory procurement dates and late vendor selection", () => {
    const issues = procurementTimelineIssues(
      {
        vendorQuestionsDueDate: "2026-09-10",
        responseToVendorQuestionsDate: "2026-09-08",
        proposalSubmissionDueDate: "2026-09-20",
        shortlistNotificationDate: "2026-09-25",
        vendorPresentationOpportunity: "YES",
        vendorPresentationDate: "2026-09-24",
        vendorSelectionDate: "2026-10-02",
        decisionDate: "2026-10-01",
      },
      "2026-10-02",
    );

    expect(issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        "responseToVendorQuestionsDate",
        "vendorPresentationDate",
        "decisionDate",
        "vendorSelectionDate",
      ]),
    );
  });

  test("builds an explainable budget range", () => {
    const estimate = estimateInitialBudget({ attendees: "500", rooms: "4", eventFormat: "Hybrid" });
    expect(estimate.low).toBeGreaterThan(0);
    expect(estimate.high).toBeGreaterThan(estimate.low);
    expect(estimate.confidence).toBe(90);
    expect(estimate.explanation).toMatch(/Planning estimate/);
  });

  test("creates vendor-ready SOW and invitation copy", () => {
    expect(buildVendorReadyStatementOfWork({
      eventName: "Summit",
      eventType: "Conference",
      eventFormat: "Hybrid",
      attendees: "500",
      roomCount: "3",
      venueName: "Grand Hall",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
    })).toContain("turnkey audiovisual production");

    const invitation = buildPersonalizedInvitation({
      eventName: "Summit",
      proposalLink: "https://example.com/proposal/summit",
    });
    expect(invitation.subject).toContain("Summit");
    expect(invitation.message).toContain("https://example.com/proposal/summit");
  });
});

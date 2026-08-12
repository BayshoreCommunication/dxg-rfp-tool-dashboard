import {
  buildPersonalizedInvitation,
  buildVendorReadyStatementOfWork,
  estimateInitialBudget,
  procurementTimelineDateBounds,
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

  test("bounds each procurement calendar between viable surrounding milestones", () => {
    const timeline = {
      vendorQuestionsDueDate: "2026-08-12",
      responseToVendorQuestionsDate: "2026-08-14",
      proposalSubmissionDueDate: "2026-08-16",
      shortlistNotificationDate: "2026-08-20",
      vendorPresentationOpportunity: "YES",
      vendorPresentationDate: "2026-08-22",
      vendorSelectionDate: "2026-08-25",
      decisionDate: "2026-08-26",
    };
    const today = new Date(2026, 7, 11);

    expect(
      procurementTimelineDateBounds(
        timeline,
        "vendorPresentationDate",
        "2026-08-30",
        today,
      ),
    ).toEqual({
      minDate: new Date(2026, 7, 20),
      maxDate: new Date(2026, 7, 25),
    });
    expect(
      procurementTimelineDateBounds(
        timeline,
        "vendorQuestionsDueDate",
        "2026-08-30",
        today,
      ),
    ).toEqual({
      minDate: new Date(2026, 7, 11),
      maxDate: new Date(2026, 7, 14),
    });
    expect(
      procurementTimelineDateBounds(
        timeline,
        "decisionDate",
        "2026-08-30",
        today,
      ),
    ).toEqual({
      minDate: new Date(2026, 7, 25),
      maxDate: new Date(2026, 7, 29),
    });
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
      eventFormat: "Hybrid",
      eventType: "Conference",
      startDate: "10/10/2026",
      endDate: "10/12/2026",
      proposalSubmissionDueDate: "09/20/2026",
      vendorQuestionsDueDate: "09/10/2026",
      organizationName: "Apex Dynamics",
    });
    expect(invitation.subject).toBe("Invitation to propose: Summit AV production");
    expect(invitation.message).toContain("secure View Proposal button");
    expect(invitation.message).not.toContain("https://");
    expect(invitation.message).toContain("- Format: Hybrid");
    expect(invitation.message).toContain("- Proposal due: 09/20/2026");
    expect(invitation.message).toContain("send your questions by 09/10/2026");
    expect(invitation.message).toContain("on behalf of Apex Dynamics");
  });

  test("formats ISO invitation dates for human-readable email copy", () => {
    const invitation = buildPersonalizedInvitation({
      eventName: "Summit",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
      proposalSubmissionDueDate: "2026-09-20",
      vendorQuestionsDueDate: "2026-09-10",
    });

    expect(invitation.message).toContain(
      "- Event dates: October 10, 2026 to October 12, 2026",
    );
    expect(invitation.message).toContain("- Proposal due: September 20, 2026");
    expect(invitation.message).toContain("send your questions by September 10, 2026");
  });
});

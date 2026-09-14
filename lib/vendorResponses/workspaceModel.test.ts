import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import { applicableSections, sectionState, validateWorkspaceResponse, workspaceTotals } from "./workspaceModel";

const questionnaire = {
  schemaVersion: "vendor-response-questionnaire.v1",
  questionnaireId: "questionnaire-1",
  questionnaireVersion: 1,
  questionnaireChecksum: "a".repeat(64),
  proposalId: "6a7aa6f2c7e1575700216e0a",
  proposalVersion: 1,
  status: "published",
  context: { proposalTitle: "Annual Forum", currency: "USD", decimalPrecision: 2 },
  identity: { vendorNameRequired: true, submittedByRequired: true, emailRequired: true },
  sections: [
    { sectionId: "compliance", title: "Compliance", order: 1, enabled: true, required: true, condition: "always", evaluationMappings: [] },
    { sectionId: "rooms", title: "Rooms", order: 2, enabled: true, required: true, condition: "always", evaluationMappings: [] },
    { sectionId: "travel", title: "Travel", order: 3, enabled: true, required: true, condition: "travel_flagged", evaluationMappings: [] },
    { sectionId: "review", title: "Review", order: 4, enabled: true, required: true, condition: "always", evaluationMappings: [] },
  ],
  acknowledgements: [{ acknowledgementId: "accuracy", label: "Accuracy", text: "Accurate", textChecksum: "b".repeat(64), required: true }],
  companyProfile: { legalNameRequired: false, headquartersRequired: false, yearsInBusinessEnabled: false, staffCountEnabled: false, largestComparableEventEnabled: false, clientMix: { enabled: false, required: false, categories: [] }, deiPolicyRequired: false, sustainabilityPolicyRequired: false },
  rooms: [{ roomId: "room-1", name: "Ballroom", streamingApplicable: false, specs: [{ specId: "spec-1", category: "audio", label: "PA", requirementText: "PA system", sourcePath: "/rooms/1", allowedResponses: ["comply", "substitute", "exception"], noteMaxLength: 200 }] }],
  hybrid: { platformPlanRequired: false, platformPlanMaxWords: 300, roomPlanMaxWords: 200, externalUrlsAllowed: false },
  crew: { roles: [{ id: "td", label: "Technical director" }], requiredRoleIds: [], bioMaxWords: 200, headshotAllowed: true, headshotRequired: false },
  pricing: { currency: "USD", decimalPrecision: 2, equipmentCategories: [{ id: "audio", label: "Audio" }], feeLines: [], travelSubtotalRequired: false, discountRequired: false, assumptionsAllowed: true },
  alternates: { enabled: false, minimumCount: 0, maximumCount: 20 },
  references: { enabled: false, minimumCount: 0, maximumCount: 3, maxAgeMonths: 36, maxVisualsPerReference: 5 },
  documents: { categories: [], globalMaximumFiles: 20 },
  valueAdds: { enabled: false, required: false, maxWords: 300 },
  publishedAt: "2026-09-14T10:00:00.000Z",
} satisfies VendorResponseQuestionnaireV1;

const response = {
  schemaVersion: "vendor-response.v1",
  questionnaire: { questionnaireId: questionnaire.questionnaireId, questionnaireVersion: 1, questionnaireChecksum: questionnaire.questionnaireChecksum, proposalId: questionnaire.proposalId, proposalVersion: 1 },
  identity: { vendorName: "Acme AV", submittedBy: "Jordan Lee", email: "jordan@acme.test" },
  acknowledgements: [{ acknowledgementId: "accuracy", accepted: true, textChecksum: "b".repeat(64) }],
  companyProfile: { legalName: "", headquarters: "", largestComparableEvent: "", clientMix: [] },
  platformIntegrationPlan: "",
  rooms: [{ roomId: "room-1", specResponses: [{ specId: "spec-1", status: "comply", note: "" }], equipmentLines: [], categoryTotals: [{ categoryId: "audio", amount: { amountMinor: 120000, currency: "USD" } }], laborLines: [], laborSubtotal: { amountMinor: 30000, currency: "USD" } }],
  crew: [], travel: { lodgingRequests: [] }, pricing: { travelSubtotal: { amountMinor: 0, currency: "USD" }, fees: [], discount: { amountMinor: 10000, currency: "USD" }, assumptionsExclusions: [] }, alternates: [], references: [], documents: [], valueAdds: "",
} satisfies VendorResponseV1;

describe("vendor workspace model", () => {
  it("uses questionnaire-driven completion and hides conditional travel until flagged", () => {
    expect(validateWorkspaceResponse(questionnaire, response)).toEqual([]);
    expect(sectionState("rooms", response, [])).toBe("complete");
    expect(applicableSections(questionnaire, response).map((entry) => entry.sectionId)).toEqual(["compliance", "rooms", "review"]);
  });

  it("reports stable room blockers and live totals", () => {
    const incomplete = { ...response, rooms: [] };
    expect(validateWorkspaceResponse(questionnaire, incomplete)).toEqual(expect.arrayContaining([expect.objectContaining({ sectionId: "rooms", path: "/rooms/room-1" })]));
    expect(workspaceTotals(questionnaire, response)).toMatchObject({ grandMinor: 140000, totalSpecs: 1, answeredSpecs: 1, complySpecs: 1 });
  });
});

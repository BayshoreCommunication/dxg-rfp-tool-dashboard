import {
  validateVendorResponseCalculationV1,
  validateVendorResponseQuestionnaireV1,
  validateVendorResponseV1,
  validateVendorResponseValidationEnvelopeV1,
  validateVendorResponseWorkspaceV1,
} from "./validators";

describe("vendor response v1 contracts", () => {
  it("compiles all linked schemas and rejects incomplete payloads", () => {
    expect(validateVendorResponseQuestionnaireV1({ schemaVersion: "vendor-response-questionnaire.v1" })).toBe(false);
    expect(validateVendorResponseV1({ schemaVersion: "vendor-response.v1" })).toBe(false);
    expect(validateVendorResponseWorkspaceV1({ schemaVersion: "vendor-response-workspace.v1" })).toBe(false);
  });

  it("accepts a capability-only legacy workspace without a questionnaire", () => {
    expect(validateVendorResponseWorkspaceV1({
      schemaVersion: "vendor-response-workspace.v1",
      proposalTitle: "Annual Summit",
      capabilities: {
        structuredResponse: false,
        responseFormat: "legacy_unstructured",
        reason: "proposal_not_enabled",
      },
      access: { state: "open", canEdit: true, canSubmit: true },
      questionnaire: null,
      draft: null,
      currentSubmission: null,
    })).toBe(true);
  });

  it("accepts an integer-minor-unit calculation snapshot", () => {
    expect(
      validateVendorResponseCalculationV1({
        schemaVersion: "vendor-response-calculation.v1",
        currency: "USD",
        roomTotals: [],
        equipmentSubtotalMinor: 1001,
        laborSubtotalMinor: 2002,
        travelSubtotalMinor: 0,
        feeSubtotalMinor: 300,
        taxSubtotalMinor: 25,
        discountMinor: 1,
        grandTotalMinor: 3327,
        requestedRoomNights: 0,
        specCounts: { total: 0, answered: 0, comply: 0, substitute: 0, exception: 0 },
        completion: { requiredSections: 0, completedSections: 0, percent: 100 },
        calculatedAt: "2026-09-14T14:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("accepts the stable final-validation error envelope", () => {
    expect(
      validateVendorResponseValidationEnvelopeV1({
        schemaVersion: "vendor-response-validation-error.v1",
        valid: false,
        errors: [
          {
            code: "required",
            path: "/rooms/room-1/specResponses/spec-1",
            sectionId: "rooms",
            message: "Response is required",
          },
        ],
      }),
    ).toBe(true);
  });
});

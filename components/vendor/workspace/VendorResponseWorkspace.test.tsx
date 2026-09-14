import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { VendorResponseWorkspaceV1 } from "@/contracts/generated/vendor-response-workspace-v1";
import VendorResponseWorkspace from "./VendorResponseWorkspace";

const room = (index: number) => ({ roomId: `room-${index}`, name: `Room ${index}`, location: `Level ${index % 4}`, setup: "Classroom", estimatedAttendees: 100 + index, streamingApplicable: false, specs: [{ specId: `spec-${index}`, category: "audio", label: `Audio ${index}`, requirementText: `Provide audio system ${index}`, sourcePath: `/rooms/${index}`, allowedResponses: ["comply", "substitute", "exception"] as ("comply" | "substitute" | "exception")[], noteMaxLength: 200 }] });

const workspace = (): VendorResponseWorkspaceV1 => ({
  schemaVersion: "vendor-response-workspace.v1",
  access: { state: "open", canEdit: true, canSubmit: true },
  questionnaire: {
    schemaVersion: "vendor-response-questionnaire.v1", questionnaireId: "questionnaire-1", questionnaireVersion: 1, questionnaireChecksum: "a".repeat(64), proposalId: "6a7aa6f2c7e1575700216e0a", proposalVersion: 1, status: "published",
    context: { proposalTitle: "Annual Forum", plannerOrganizationName: "DXG", venueName: "Convention Center", proposalDueDate: "2026-09-30", currency: "USD", decimalPrecision: 2 },
    identity: { vendorNameRequired: true, submittedByRequired: true, emailRequired: true },
    sections: [
      { sectionId: "compliance", title: "Compliance", order: 1, enabled: true, required: true, condition: "always", evaluationMappings: ["compliance"] },
      { sectionId: "company_profile", title: "Company profile", order: 2, enabled: true, required: true, condition: "always", evaluationMappings: ["experience"] },
      { sectionId: "rooms", title: "Room responses", order: 3, enabled: true, required: true, condition: "always", evaluationMappings: ["technical approach"] },
      { sectionId: "pricing", title: "Pricing", order: 4, enabled: true, required: true, condition: "always", evaluationMappings: ["commercial"] },
      { sectionId: "review", title: "Review and submit", order: 5, enabled: true, required: true, condition: "always", evaluationMappings: [] },
    ],
    acknowledgements: [{ acknowledgementId: "accuracy", label: "Response accuracy", text: "I confirm this response is accurate.", textChecksum: "b".repeat(64), required: true }],
    companyProfile: { legalNameRequired: true, headquartersRequired: true, yearsInBusinessEnabled: true, staffCountEnabled: true, largestComparableEventEnabled: true, clientMix: { enabled: true, required: true, categories: [{ categoryId: "corporate", label: "Corporate" }, { categoryId: "association", label: "Association" }] }, deiPolicyRequired: false, sustainabilityPolicyRequired: false },
    rooms: Array.from({ length: 80 }, (_, index) => room(index + 1)),
    hybrid: { platformPlanRequired: false, platformPlanMaxWords: 300, roomPlanMaxWords: 200, externalUrlsAllowed: false },
    crew: { roles: [{ id: "td", label: "Technical director" }], requiredRoleIds: [], bioMaxWords: 200, headshotAllowed: true, headshotRequired: false },
    pricing: { currency: "USD", decimalPrecision: 2, equipmentCategories: [{ id: "audio", label: "Audio" }], feeLines: [{ feeId: "tax", label: "Tax", kind: "tax", required: false }], travelSubtotalRequired: false, discountRequired: false, assumptionsAllowed: true },
    alternates: { enabled: false, minimumCount: 0, maximumCount: 20 }, references: { enabled: false, minimumCount: 0, maximumCount: 3, maxAgeMonths: 36, maxVisualsPerReference: 5 }, documents: { categories: [], globalMaximumFiles: 20 }, valueAdds: { enabled: false, required: false, maxWords: 300 }, publishedAt: "2026-09-14T10:00:00.000Z",
  },
  draft: {
    draftId: "6b7aa6f2c7e1575700216e0b", draftRevision: 1, status: "active", lastSavedAt: "2026-09-14T10:00:00.000Z",
    response: { schemaVersion: "vendor-response.v1", questionnaire: { questionnaireId: "questionnaire-1", questionnaireVersion: 1, questionnaireChecksum: "a".repeat(64), proposalId: "6a7aa6f2c7e1575700216e0a", proposalVersion: 1 }, identity: { vendorName: "", submittedBy: "", email: "" }, acknowledgements: [], companyProfile: { legalName: "", headquarters: "", largestComparableEvent: "", clientMix: [] }, platformIntegrationPlan: "", rooms: [], crew: [], travel: { lodgingRequests: [] }, pricing: { travelSubtotal: { amountMinor: 0, currency: "USD" }, fees: [], discount: { amountMinor: 0, currency: "USD" }, assumptionsExclusions: [] }, alternates: [], references: [], documents: [], valueAdds: "" },
  }, currentSubmission: null,
});

describe("VendorResponseWorkspace", () => {
  beforeEach(() => { jest.useRealTimers(); global.fetch = jest.fn() as typeof fetch; });

  it("renders the questionnaire shell and only one of eighty room bodies", () => {
    render(<VendorResponseWorkspace workspace={workspace()} accessGrant="grant" />);
    expect(screen.getByText("Annual Forum")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /3\. Room responses/i })[0]);
    expect(screen.getByLabelText("Search 80 rooms")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Room 1" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Room 80" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search 80 rooms"), { target: { value: "Room 80" } });
    fireEvent.change(screen.getByLabelText("Selected room"), { target: { value: "room-80" } });
    expect(screen.getByRole("heading", { name: "Room 80" })).toBeInTheDocument();
  });

  it("preserves unsaved values and offers retry when autosave fails", async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ success: false, message: "Connection interrupted" }) });
    render(<VendorResponseWorkspace workspace={workspace()} accessGrant="grant" />);
    fireEvent.change(screen.getByLabelText(/Vendor \/ company name/), { target: { value: "Acme AV" } });
    await act(async () => { jest.advanceTimersByTime(900); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry save" })).toBeInTheDocument());
    expect(screen.getByLabelText(/Vendor \/ company name/)).toHaveValue("Acme AV");
    expect(screen.getByRole("alert")).toHaveTextContent("Connection interrupted");
    jest.useRealTimers();
  });
});

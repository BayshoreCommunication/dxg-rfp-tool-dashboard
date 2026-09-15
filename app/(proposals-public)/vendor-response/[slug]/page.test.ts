import type { VendorResponseWorkspaceV1 } from "@/contracts/generated/vendor-response-workspace-v1";
import {
  fetchVendorWorkspace,
  proposalIdFromSlug,
  proposalTitleFromSlug,
  usesStructuredWorkspace,
} from "./page";

describe("vendor response email links", () => {
  it("extracts the proposal id from an email-generated slug", () => {
    expect(
      proposalIdFromSlug("la-seminar-6a701cfb83266d4a2fd0fc39"),
    ).toBe("6a701cfb83266d4a2fd0fc39");
  });

  it("rejects a slug without a complete proposal id", () => {
    expect(proposalIdFromSlug("la-seminar-invalid")).toBe("");
  });

  it("provides a readable proposal title when the public lookup is unavailable", () => {
    expect(
      proposalTitleFromSlug("general-av-services-rfp-6a7aa6f2c7e1575700216e0a"),
    ).toBe("General AV Services RFP");
  });

  it("loads the structured workspace with the invitation grant kept in a header", async () => {
    const originalFetch = global.fetch;
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { schemaVersion: "vendor-response-workspace.v1" } }),
    } as Response);
    global.fetch = mockFetch as typeof fetch;

    const result = await fetchVendorWorkspace("6a701cfb83266d4a2fd0fc39", "secure-grant");

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/vendor-responses/workspace?proposalId=6a701cfb83266d4a2fd0fc39"),
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ "x-rfpilot-access-grant": "secure-grant" }),
      }),
    );
    expect(mockFetch.mock.calls[0][0]).not.toContain("secure-grant");
    global.fetch = originalFetch;
  });

  it("requires an authoritative structured workspace and never selects a legacy form", () => {
    const legacy = {
      capabilities: {
        structuredResponse: false,
        responseFormat: "legacy_unstructured",
        reason: "proposal_not_enabled",
      },
      questionnaire: null,
    } as VendorResponseWorkspaceV1;
    expect(usesStructuredWorkspace({
      questionnaire: {},
    } as unknown as VendorResponseWorkspaceV1)).toBe(false);
    expect(usesStructuredWorkspace(legacy)).toBe(false);
    const structured = {
      ...legacy,
      capabilities: {
        structuredResponse: true,
        responseFormat: "structured_v1",
        reason: "enabled",
      },
      questionnaire: {},
    } as unknown as VendorResponseWorkspaceV1;
    expect(usesStructuredWorkspace(structured)).toBe(true);
    structured.questionnaire = null;
    expect(usesStructuredWorkspace(structured)).toBe(false);
  });
});

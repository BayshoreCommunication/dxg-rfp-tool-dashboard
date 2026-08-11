import { proposalIdFromSlug, proposalTitleFromSlug } from "./page";

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
});

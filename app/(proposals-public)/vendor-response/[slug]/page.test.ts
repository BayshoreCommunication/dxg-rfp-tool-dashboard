import { proposalIdFromSlug } from "./page";

describe("vendor response email links", () => {
  it("extracts the proposal id from an email-generated slug", () => {
    expect(
      proposalIdFromSlug("la-seminar-6a701cfb83266d4a2fd0fc39"),
    ).toBe("6a701cfb83266d4a2fd0fc39");
  });

  it("rejects a slug without a complete proposal id", () => {
    expect(proposalIdFromSlug("la-seminar-invalid")).toBe("");
  });
});

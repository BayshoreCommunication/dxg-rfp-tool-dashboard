import { mapApiProposalToFormData } from "./AddNewProposal";

// The editor imports server actions; keep their backend client (and NextAuth) out of this unit test.
jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/server/backendSession", () => ({ getBackendSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

// The default link prefix used to be another tenant's name ("abuco"); a proposal stored without a
// prefix must open in the editor with none, and a stored one must be kept as it is.
describe("mapApiProposalToFormData — link prefix", () => {
  test("a proposal stored without a link prefix gets an empty one", () => {
    expect(mapApiProposalToFormData({}).proposalSettings.linkPrefix).toBe("");
    expect(
      mapApiProposalToFormData({ proposalSettings: { defaultFont: "Inter" } }).proposalSettings.linkPrefix,
    ).toBe("");
  });

  test("a stored link prefix is kept", () => {
    expect(
      mapApiProposalToFormData({ proposalSettings: { linkPrefix: "northwind" } }).proposalSettings.linkPrefix,
    ).toBe("northwind");
  });
});

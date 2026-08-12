import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { getVendorSubmissionDetailAction } from "./vendorResponse";

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

const payload = {
  historyTruncated: false,
  response: {
    _id: "response-1",
    proposalId: "proposal-1",
    proposalOwnerId: "owner-1",
    proposalTitle: "Summit",
    vendorName: "Apex",
    submittedBy: "Alex",
    email: "alex@example.com",
    message: "Attached",
    documents: [],
    isRead: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  submission: {
    submissionId: "submission-1",
    status: "active",
    currentVersionId: "version-1",
    currentVersionNumber: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  versions: [
    {
      versionId: "version-1",
      versionNumber: 1,
      parentVersionId: null,
      reason: "initial",
      sourceSystem: "public_portal",
      receivedAt: "2026-08-01T00:00:00.000Z",
      manifestChecksum: "a".repeat(64),
      vendorName: "Apex",
      submittedBy: "Alex",
      email: "alex@example.com",
      message: "Attached",
      documents: [
        {
          documentId: "doc-1",
          sourceId: "source-1",
          name: "proposal.pdf",
          url: "javascript:alert(1)",
          mimeType: "application/pdf",
          sizeBytes: 100,
          sha256: "b".repeat(64),
          scanStatus: "clean",
          inheritedFromVersionId: null,
        },
      ],
    },
  ],
};

const respond = (data: unknown, ok = true) =>
  jest
    .mocked(authenticatedBackendFetch)
    .mockResolvedValue({
      ok,
      status: ok ? 200 : 404,
      json: async () =>
        ok
          ? { success: true, data }
          : { success: false, message: "Vendor response not found" },
    } as Response);

beforeEach(() => jest.clearAllMocks());

it("loads the authenticated immutable-detail projection and strips unsafe file links", async () => {
  respond(payload);
  const result = await getVendorSubmissionDetailAction("response/unsafe");
  expect(authenticatedBackendFetch).toHaveBeenCalledWith(
    expect.stringContaining(
      "/api/vendor-responses/response%2Funsafe/submission-detail",
    ),
    { cache: "no-store" },
  );
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.versions[0].documents[0].url).toBe("");
});

it("rejects a malformed version contract instead of showing invented history", async () => {
  respond({
    ...payload,
    versions: [{ ...payload.versions[0], reason: "winner_selected" }],
  });
  await expect(getVendorSubmissionDetailAction("response-1")).resolves.toEqual({
    success: false,
    message: "The vendor response service returned an unexpected response.",
  });
});

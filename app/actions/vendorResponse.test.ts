import {
  createEvidenceExtractionAction,
  type EvidenceExtractionRun,
} from "@/app/actions/evidenceExtraction";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import {
  createManualVendorResponseAction,
  getVendorResponseProposalsAction,
  getVendorSubmissionDetailAction,
} from "./vendorResponse";

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

jest.mock("@/app/actions/evidenceExtraction", () => ({
  createEvidenceExtractionAction: jest.fn(),
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

it("loads and validates proposal-level vendor response summaries", async () => {
  jest.mocked(authenticatedBackendFetch).mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        {
          proposalId: "proposal-1",
          proposalTitle: "Annual Summit",
          responseCount: 4,
          unreadCount: 2,
          latestResponseAt: "2026-08-16T10:00:00.000Z",
          latestVendorName: "Apex Events",
        },
      ],
      pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      responseCount: 4,
      unreadCount: 2,
    }),
  } as Response);

  const result = await getVendorResponseProposalsAction({
    page: 1,
    search: "Annual Summit",
  });

  expect(authenticatedBackendFetch).toHaveBeenCalledWith(
    expect.stringContaining(
      "/api/vendor-responses/proposals?page=1&limit=12&search=Annual+Summit",
    ),
    { cache: "no-store" },
  );
  expect(result).toEqual({
    success: true,
    data: {
      proposals: [
        expect.objectContaining({
          proposalId: "proposal-1",
          responseCount: 4,
          unreadCount: 2,
        }),
      ],
      pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      responseCount: 4,
      unreadCount: 2,
    },
  });
});

it("rejects impossible proposal summary counts", async () => {
  jest.mocked(authenticatedBackendFetch).mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        {
          proposalId: "proposal-1",
          proposalTitle: "Annual Summit",
          responseCount: 1,
          unreadCount: 2,
          latestResponseAt: "2026-08-16T10:00:00.000Z",
          latestVendorName: "Apex Events",
        },
      ],
      pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      responseCount: 1,
      unreadCount: 0,
    }),
  } as Response);

  await expect(getVendorResponseProposalsAction()).resolves.toEqual({
    success: false,
    message: "The vendor response service returned an unexpected response.",
  });
});

describe("createManualVendorResponseAction", () => {
  beforeEach(() =>
    jest.mocked(createEvidenceExtractionAction).mockResolvedValue({
      success: true,
      data: { runs: [], unavailable: [] },
    }),
  );

  const manualForm = (overrides: Record<string, string> = {}) => {
    const formData = new FormData();
    formData.set("proposalId", "proposal-1");
    formData.set("vendorName", "  Apex AV ");
    formData.set("submittedBy", " Avery Vendor ");
    formData.set("email", "  SALES@Apex.Example ");
    formData.set("message", " Quote arrived by email. ");
    formData.set("submissionIdempotencyKey", "key-1");
    Object.entries(overrides).forEach(([key, value]) => formData.set(key, value));
    return formData;
  };

  it("normalizes the payload and posts it to the authenticated manual endpoint", async () => {
    jest.mocked(authenticatedBackendFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        isUpdate: false,
        message: "The vendor response was recorded.",
        data: { _id: "response-9" },
        submission: { versionNumber: 1 },
      }),
    } as Response);

    const result = await createManualVendorResponseAction(manualForm());

    expect(result).toEqual({
      success: true,
      message: "The vendor response was recorded.",
      responseId: "response-9",
      versionNumber: 1,
      isUpdate: false,
      extractionStarted: false,
    });
    const [url, init] = jest.mocked(authenticatedBackendFetch).mock.calls[0];
    expect(url).toContain("/api/vendor-responses/manual");
    expect(init?.method).toBe("POST");
    const body = init?.body as FormData;
    expect(body.get("vendorName")).toBe("Apex AV");
    expect(body.get("email")).toBe("sales@apex.example");
    expect(body.get("message")).toBe("Quote arrived by email.");
    expect(body.get("submissionIdempotencyKey")).toBe("key-1");
  });

  it("forwards only a recognized revision reason", async () => {
    jest.mocked(authenticatedBackendFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {}, submission: { versionNumber: 2 } }),
    } as Response);

    await createManualVendorResponseAction(
      manualForm({ submissionReason: "winner_selected" }),
    );
    const first = jest.mocked(authenticatedBackendFetch).mock
      .calls[0][1]?.body as FormData;
    expect(first.get("submissionReason")).toBeNull();

    await createManualVendorResponseAction(manualForm({ submissionReason: "bafo" }));
    const second = jest.mocked(authenticatedBackendFetch).mock
      .calls[1][1]?.body as FormData;
    expect(second.get("submissionReason")).toBe("bafo");
  });

  it("rejects an invalid email before calling the backend", async () => {
    const result = await createManualVendorResponseAction(
      manualForm({ email: "not-an-email" }),
    );
    expect(result.success).toBe(false);
    expect(authenticatedBackendFetch).not.toHaveBeenCalled();
  });

  it("rejects an oversized attachment before calling the backend", async () => {
    const formData = manualForm();
    formData.append(
      "documents",
      new File([new Uint8Array(11 * 1024 * 1024)], "huge.pdf", {
        type: "application/pdf",
      }),
    );

    const result = await createManualVendorResponseAction(formData);

    expect(result).toEqual({
      success: false,
      message: "huge.pdf exceeds the 10 MB file limit.",
    });
    expect(authenticatedBackendFetch).not.toHaveBeenCalled();
  });

  it("surfaces the backend message when the response is refused", async () => {
    jest.mocked(authenticatedBackendFetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        message: "You don't have access to this proposal.",
      }),
    } as Response);

    await expect(createManualVendorResponseAction(manualForm())).resolves.toEqual({
      success: false,
      message: "You don't have access to this proposal.",
    });
  });
});

describe("manual response extraction hand-off", () => {
  const startExtraction = jest.mocked(createEvidenceExtractionAction);

  const queuedRun: EvidenceExtractionRun = {
    runId: "run-1",
    jobId: "job-1",
    sourceKind: "document",
    sourceLabel: "quote.pdf",
    mimeType: "application/pdf",
    status: "queued",
    method: null,
    coverage: 0,
    fragmentCount: 0,
    tableCount: 0,
    pageCount: 0,
    warnings: [],
    reused: false,
    preview: [],
    createdAt: "2026-08-25T00:00:00.000Z",
    completedAt: null,
  };

  const manualForm = () => {
    const formData = new FormData();
    formData.set("proposalId", "proposal-1");
    formData.set("vendorName", "Apex AV");
    formData.set("submittedBy", "Avery");
    formData.set("email", "sales@apex.example");
    return formData;
  };

  const recorded = (submission: Record<string, unknown>) =>
    jest.mocked(authenticatedBackendFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {}, submission }),
    } as Response);

  it("queues extraction for the new version under a key derived from it", async () => {
    recorded({ submissionId: "submission-1", versionId: "version-1", versionNumber: 1 });
    startExtraction.mockResolvedValue({
      success: true,
      data: { runs: [queuedRun], unavailable: [] },
    });

    const result = await createManualVendorResponseAction(manualForm());

    expect(startExtraction).toHaveBeenCalledWith(
      "proposal-1",
      "submission-1",
      "version-1",
      "manual-response:version-1",
    );
    expect(result).toMatchObject({ success: true, extractionStarted: true });
  });

  it("still reports the response as recorded when extraction cannot start", async () => {
    recorded({ submissionId: "submission-1", versionId: "version-1", versionNumber: 1 });
    startExtraction.mockResolvedValue({
      success: false,
      code: "SOURCE_NOT_REGISTERED",
      message: "This attachment has not completed secure source registration.",
    });

    const result = await createManualVendorResponseAction(manualForm());

    expect(result).toMatchObject({ success: true, extractionStarted: false });
  });

  it("skips extraction when the backend returned no version to extract", async () => {
    recorded({ versionNumber: 1 });

    const result = await createManualVendorResponseAction(manualForm());

    expect(startExtraction).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, extractionStarted: false });
  });
});

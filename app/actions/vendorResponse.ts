"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

export type VendorDocument = {
  name: string;
  url: string;
  documentId?: string;
  sourceId?: string;
  sha256?: string | null;
  sizeBytes?: number | null;
  scanStatus?: "clean" | "skipped" | "legacy_unknown";
};

export type VendorResponseItem = {
  _id: string;
  proposalId: string;
  proposalOwnerId: string;
  proposalTitle: string;
  vendorName: string;
  submittedBy: string;
  email: string;
  message: string;
  documents: VendorDocument[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  submissionId?: string;
  currentVersionId?: string;
  currentVersionNumber?: number;
  versionReason?: string;
  versionReceivedAt?: string;
  manifestChecksum?: string;
};

export type VendorSubmissionVersion = {
  versionId: string;
  versionNumber: number;
  parentVersionId: string | null;
  reason:
    | "initial"
    | "vendor_revision"
    | "clarification_response"
    | "bafo"
    | "administrative_correction"
    | "legacy_backfill";
  sourceSystem: "public_portal" | "planner_upload" | "legacy_migration" | "api";
  receivedAt: string;
  manifestChecksum: string;
  vendorName: string;
  submittedBy: string;
  email: string;
  message: string;
  documents: Array<
    VendorDocument & { mimeType: string; inheritedFromVersionId: string | null }
  >;
};

export type VendorSubmissionDetail = {
  historyTruncated: boolean;
  response: VendorResponseItem;
  submission: {
    submissionId: string;
    status: "active" | "withdrawn" | "archived";
    currentVersionId: string | null;
    currentVersionNumber: number;
    createdAt: string;
    updatedAt: string;
  } | null;
  versions: VendorSubmissionVersion[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const safeFileUrl = (value: unknown) => {
  if (!isString(value)) return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? value
      : "";
  } catch {
    return "";
  }
};
const reasons = new Set<VendorSubmissionVersion["reason"]>([
  "initial",
  "vendor_revision",
  "clarification_response",
  "bafo",
  "administrative_correction",
  "legacy_backfill",
]);
const sourceSystems = new Set<VendorSubmissionVersion["sourceSystem"]>([
  "public_portal",
  "planner_upload",
  "legacy_migration",
  "api",
]);
const scanStatuses = new Set<NonNullable<VendorDocument["scanStatus"]>>([
  "clean",
  "skipped",
  "legacy_unknown",
]);
const submissionStatuses = new Set<
  NonNullable<VendorSubmissionDetail["submission"]>["status"]
>(["active", "withdrawn", "archived"]);

const parseDocument = (value: unknown): VendorDocument | null => {
  if (!isRecord(value) || !isString(value.name)) return null;
  const scanStatus = scanStatuses.has(
    value.scanStatus as NonNullable<VendorDocument["scanStatus"]>,
  )
    ? (value.scanStatus as NonNullable<VendorDocument["scanStatus"]>)
    : "legacy_unknown";
  return {
    name: value.name,
    url: safeFileUrl(value.url),
    documentId: isString(value.documentId) ? value.documentId : undefined,
    sourceId: isString(value.sourceId) ? value.sourceId : undefined,
    sha256: isString(value.sha256) ? value.sha256 : null,
    sizeBytes: typeof value.sizeBytes === "number" ? value.sizeBytes : null,
    scanStatus,
  };
};

const parseResponse = (value: unknown): VendorResponseItem | null => {
  if (!isRecord(value)) return null;
  const required = [
    "_id",
    "proposalId",
    "proposalOwnerId",
    "proposalTitle",
    "vendorName",
    "submittedBy",
    "email",
    "message",
    "createdAt",
    "updatedAt",
  ] as const;
  if (required.some((key) => !isString(value[key]))) return null;
  return {
    _id: value._id as string,
    proposalId: value.proposalId as string,
    proposalOwnerId: value.proposalOwnerId as string,
    proposalTitle: value.proposalTitle as string,
    vendorName: value.vendorName as string,
    submittedBy: value.submittedBy as string,
    email: value.email as string,
    message: value.message as string,
    documents: (Array.isArray(value.documents) ? value.documents : []).flatMap(
      (document) => parseDocument(document) ?? [],
    ),
    isRead: value.isRead === true,
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
    submissionId: isString(value.submissionId) ? value.submissionId : undefined,
    currentVersionId: isString(value.currentVersionId)
      ? value.currentVersionId
      : undefined,
    currentVersionNumber:
      typeof value.currentVersionNumber === "number"
        ? value.currentVersionNumber
        : undefined,
    versionReason: isString(value.versionReason)
      ? value.versionReason
      : undefined,
    versionReceivedAt: isString(value.versionReceivedAt)
      ? value.versionReceivedAt
      : undefined,
    manifestChecksum: isString(value.manifestChecksum)
      ? value.manifestChecksum
      : undefined,
  };
};

const parseVersion = (value: unknown): VendorSubmissionVersion | null => {
  if (
    !isRecord(value) ||
    !isString(value.versionId) ||
    typeof value.versionNumber !== "number" ||
    !reasons.has(value.reason as VendorSubmissionVersion["reason"]) ||
    !sourceSystems.has(
      value.sourceSystem as VendorSubmissionVersion["sourceSystem"],
    )
  )
    return null;
  const required = [
    "receivedAt",
    "manifestChecksum",
    "vendorName",
    "submittedBy",
    "email",
    "message",
  ] as const;
  if (required.some((key) => !isString(value[key]))) return null;
  const documents = (
    Array.isArray(value.documents) ? value.documents : []
  ).flatMap((document) => {
    const parsed = parseDocument(document);
    if (!parsed || !isRecord(document)) return [];
    return [
      {
        ...parsed,
        mimeType: isString(document.mimeType)
          ? document.mimeType
          : "application/octet-stream",
        inheritedFromVersionId: isString(document.inheritedFromVersionId)
          ? document.inheritedFromVersionId
          : null,
      },
    ];
  });
  return {
    versionId: value.versionId,
    versionNumber: value.versionNumber,
    parentVersionId: isString(value.parentVersionId)
      ? value.parentVersionId
      : null,
    reason: value.reason as VendorSubmissionVersion["reason"],
    sourceSystem: value.sourceSystem as VendorSubmissionVersion["sourceSystem"],
    receivedAt: value.receivedAt as string,
    manifestChecksum: value.manifestChecksum as string,
    vendorName: value.vendorName as string,
    submittedBy: value.submittedBy as string,
    email: value.email as string,
    message: value.message as string,
    documents,
  };
};

const parseSubmissionDetail = (
  value: unknown,
): VendorSubmissionDetail | null => {
  if (!isRecord(value)) return null;
  const response = parseResponse(value.response);
  if (!response || !Array.isArray(value.versions)) return null;
  const versions = value.versions.map(parseVersion);
  if (versions.some((version) => version === null)) return null;
  let submission: VendorSubmissionDetail["submission"] = null;
  if (value.submission !== null) {
    if (
      !isRecord(value.submission) ||
      !isString(value.submission.submissionId) ||
      !submissionStatuses.has(
        value.submission.status as NonNullable<
          VendorSubmissionDetail["submission"]
        >["status"],
      ) ||
      typeof value.submission.currentVersionNumber !== "number" ||
      !isString(value.submission.createdAt) ||
      !isString(value.submission.updatedAt)
    )
      return null;
    submission = {
      submissionId: value.submission.submissionId,
      status: value.submission.status as NonNullable<
        VendorSubmissionDetail["submission"]
      >["status"],
      currentVersionId: isString(value.submission.currentVersionId)
        ? value.submission.currentVersionId
        : null,
      currentVersionNumber: value.submission.currentVersionNumber,
      createdAt: value.submission.createdAt,
      updatedAt: value.submission.updatedAt,
    };
  }
  return {
    historyTruncated: value.historyTruncated === true,
    response,
    submission,
    versions: versions as VendorSubmissionVersion[],
  };
};

export const getVendorResponsesAction = async ({
  page = 1,
  limit = 20,
  unreadOnly = false,
  proposalId,
  campaignId,
}: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  proposalId?: string;
  campaignId?: string;
} = {}) => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      unreadOnly: String(unreadOnly),
    });
    if (campaignId) params.set("campaignId", campaignId);
    else if (proposalId) params.set("proposalId", proposalId);

    const res = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/vendor-responses?${params}`,
      {
        cache: "no-store",
      },
    );

    const json = await res.json();
    return json;
  } catch {
    return {
      success: false,
      message: "Error fetching vendor responses",
      data: [],
    };
  }
};

export const getVendorUnreadCountAction = async (): Promise<number> => {
  try {
    const res = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/vendor-responses?page=1&limit=1`,
      { cache: "no-store" },
    );

    const json = await res.json();
    return typeof json?.unreadCount === "number" ? json.unreadCount : 0;
  } catch {
    return 0;
  }
};

export const getVendorResponseByIdAction = async (id: string) => {
  try {
    const res = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/vendor-responses/${id}`,
      {
        cache: "no-store",
      },
    );

    return await res.json();
  } catch {
    return { success: false, message: "Error fetching vendor response" };
  }
};

export const getVendorSubmissionDetailAction = async (id: string) => {
  try {
    const res = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/vendor-responses/${encodeURIComponent(id)}/submission-detail`,
      { cache: "no-store" },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success || !json?.data) {
      return {
        success: false as const,
        message: String(json?.message || "Vendor response was not found."),
      };
    }
    const data = parseSubmissionDetail(json.data);
    return data
      ? { success: true as const, data }
      : {
          success: false as const,
          message:
            "The vendor response service returned an unexpected response.",
        };
  } catch {
    return {
      success: false as const,
      message: "The vendor response could not be loaded.",
    };
  }
};

export const markVendorResponseReadAction = async (id: string) => {
  try {
    const res = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/vendor-responses/${id}/read`,
      { method: "PATCH" },
    );

    return await res.json();
  } catch {
    return { success: false, message: "Error marking response as read" };
  }
};

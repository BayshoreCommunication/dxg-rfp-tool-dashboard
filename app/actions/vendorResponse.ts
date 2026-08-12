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
    return { success: false, message: "Error fetching vendor responses", data: [] };
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

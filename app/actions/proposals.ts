"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { auth } from "@/auth";
import type { ProposalData } from "@/components/proposals/AddNewProposal";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:8000"
).trim();
const FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
  pagination?: unknown;
  counts?: unknown;
};

const getAccessToken = async (): Promise<string | null> => {
  const session = await auth();
  return (session?.user as any)?.accessToken || null;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildProposalMeta = (proposal: any) => {
  const proposalId = proposal?._id ? String(proposal._id) : "";
  const title = proposal?.event?.eventName || "proposal";
  const slug = `${toSlug(title) || "proposal"}-${proposalId}`;
  const appProposalLink = `${FRONTEND_URL.replace(/\/+$/, "")}/proposal/${slug}`;
  const prefix = String(proposal?.proposalSettings?.linkPrefix || "")
    .trim()
    .toLowerCase();
  const proposalLinkPrefix = prefix || "abuco";
  const publicProposalLink = `https://${proposalLinkPrefix}.goprospero.com/proposal/${slug}?source=public`;

  return {
    ...proposal,
    proposalSlug: slug,
    proposalLink: appProposalLink,
    publicProposalLink,
  };
};

const withProposalMeta = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload.map((proposal) => buildProposalMeta(proposal));
  }
  if (payload && typeof payload === "object") {
    return buildProposalMeta(payload);
  }
  return payload;
};

export async function createProposalAction(
  payload: ProposalData & {
    status?: "draft" | "submitted" | "reviewed" | "approved" | "rejected";
  }
): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }
    console.log("PAYLOAD FROM FRONTEND ACTION:", JSON.stringify(payload, null, 2));

    const res = await fetch(`${API_URL}/api/proposals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal created" : "Create failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/**
 * Send a document file to the backend AI extraction endpoint.
 * Returns a partial ProposalData object with only the fields found in the document.
 */
export async function extractProposalFromFile(
  file: File
): Promise<{ success: boolean; data?: Partial<ProposalData>; message?: string }> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/api/extract-proposal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    });

    const json = await res.json();
    return {
      success: res.ok && json.success,
      data: json.data as Partial<ProposalData>,
      message: json.message,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export async function getProposalsAction(params?: {
  status?: string;
  favorite?: boolean;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeCounts?: boolean;
}): Promise<ApiResponse> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, message: "User is not authenticated." };
  }

  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (typeof params?.favorite === "boolean") {
    query.set("favorite", String(params.favorite));
  }
  if (typeof params?.isActive === "boolean") {
    query.set("isActive", String(params.isActive));
  }
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.sortBy) query.set("sortBy", params.sortBy);
  if (params?.sortOrder) query.set("sortOrder", params.sortOrder);
  if (typeof params?.includeCounts === "boolean") {
    query.set("includeCounts", String(params.includeCounts));
  }

  try {
    const res = await fetch(
      `${API_URL}/api/proposals?${query.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposals fetched" : "Fetch failed"),
      data: withProposalMeta(data.data),
      pagination: data.pagination,
      counts: data.counts,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export async function getProposalByIdAction(
  id: string
): Promise<ApiResponse> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, message: "User is not authenticated." };
  }

  try {
    const res = await fetch(`${API_URL}/api/proposals/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal fetched" : "Fetch failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export async function updateProposalAction(
  id: string,
  updates: Partial<ProposalData>
): Promise<ApiResponse> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, message: "User is not authenticated." };
  }

  try {
    const res = await fetch(`${API_URL}/api/proposals/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal updated" : "Update failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export async function updateProposalStatusAction(
  id: string,
  status: "draft" | "submitted" | "reviewed" | "approved" | "rejected"
): Promise<ApiResponse> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, message: "User is not authenticated." };
  }

  try {
    const res = await fetch(`${API_URL}/api/proposals/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Status updated" : "Update failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export async function updateProposalMetaAction(
  id: string,
  updates: {
    isActive?: boolean;
    isFavorite?: boolean;
    isAccepted?: boolean;
    isOpen?: boolean;
    viewsCount?: number;
  }
): Promise<ApiResponse> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, message: "User is not authenticated." };
  }

  try {
    const res = await fetch(`${API_URL}/api/proposals/${id}/meta`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Proposal updated" : "Update failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export async function incrementProposalViewsAction(
  id: string
): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }
    const res = await fetch(`${API_URL}/api/proposals/${id}/views`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Proposal views updated" : "Update failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export async function deleteProposalAction(id: string): Promise<ApiResponse> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, message: "User is not authenticated." };
  }

  try {
    const res = await fetch(`${API_URL}/api/proposals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal deleted" : "Delete failed"),
      data: data.data,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/**
 * Upload proposal support documents or AV quote files to DigitalOcean Spaces.
 * Returns the CDN URLs grouped by field name.
 *
 * Usage:
 *   const result = await uploadProposalFilesAction(formData);
 *   // formData fields: "supportDocuments" and/or "avQuoteFiles"
 */
export async function uploadProposalFilesAction(
  formData: FormData
): Promise<{
  success: boolean;
  message?: string;
  supportDocumentUrls: string[];
  avQuoteFileUrls: string[];
}> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return {
        success: false,
        message: "User is not authenticated.",
        supportDocumentUrls: [],
        avQuoteFileUrls: [],
      };
    }

    const res = await fetch(`${API_URL}/api/proposals/upload-files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        message: json.message || "Upload failed",
        supportDocumentUrls: [],
        avQuoteFileUrls: [],
      };
    }

    const results: Array<{ fieldname: string; originalname: string; url: string }> =
      json.data || [];

    return {
      success: true,
      message: json.message,
      supportDocumentUrls: results
        .filter((r) => r.fieldname === "supportDocuments")
        .map((r) => r.url),
      avQuoteFileUrls: results
        .filter((r) => r.fieldname === "avQuoteFiles")
        .map((r) => r.url),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error",
      supportDocumentUrls: [],
      avQuoteFileUrls: [],
    };
  }
}

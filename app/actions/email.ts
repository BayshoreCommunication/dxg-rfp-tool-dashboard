"use server";

import { authenticatedBackendFetch } from "@/lib/server/backendClient";

import { BACKEND_URL as API_URL } from "@/lib/config";

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
  pagination?: unknown;
};

export type SendProposalEmailPayload = {
  proposalId: string;
  recipientEmails: string[];
  subject?: string;
  message?: string;
  /** "question": a plain one-to-one email to a vendor who already responded (no proposal or submission links). */
  kind?: "invitation" | "question";
};

export async function sendProposalEmailAction(
  payload: SendProposalEmailPayload,
): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}/api/emails/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Email sent" : "Send failed"),
      data: data.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function getEmailCampaignsAction(params?: {
  proposalId?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.proposalId) query.set("proposalId", params.proposalId);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await authenticatedBackendFetch(`${API_URL}/api/emails?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Campaigns fetched" : "Fetch failed"),
      data: data.data,
      pagination: data.pagination,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function getEmailStatsAction(
  proposalId?: string,
): Promise<ApiResponse> {
  try {
    const query = new URLSearchParams();
    if (proposalId) query.set("proposalId", proposalId);

    const res = await authenticatedBackendFetch(`${API_URL}/api/emails/stats?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Stats fetched" : "Fetch failed"),
      data: data.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function deleteEmailCampaignsByProposalAction(
  proposalId: string,
): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}/api/emails/proposal/${proposalId}`, {
      method: "DELETE",
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Deleted successfully" : "Delete failed"),
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function deleteEmailCampaignAction(
  campaignId: string,
): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}/api/emails/${campaignId}`, {
      method: "DELETE",
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Deleted successfully" : "Delete failed"),
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

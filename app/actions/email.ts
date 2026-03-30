"use server";

import { auth } from "@/auth";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:8000"
).trim();

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
  pagination?: unknown;
};

const getAccessToken = async (): Promise<string | null> => {
  const session = await auth();
  return (session?.user as { accessToken?: string } | undefined)?.accessToken || null;
};

export type SendProposalEmailPayload = {
  proposalId: string;
  recipientEmails: string[];
  subject?: string;
  message?: string;
};

export async function sendProposalEmailAction(
  payload: SendProposalEmailPayload
): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const res = await fetch(`${API_URL}/api/emails/send`, {
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
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const query = new URLSearchParams();
    if (params?.proposalId) query.set("proposalId", params.proposalId);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await fetch(`${API_URL}/api/emails?${query.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
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
  proposalId?: string
): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const query = new URLSearchParams();
    if (proposalId) query.set("proposalId", proposalId);

    const res = await fetch(`${API_URL}/api/emails/stats?${query.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
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
  proposalId: string
): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const res = await fetch(`${API_URL}/api/emails/proposal/${proposalId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Deleted successfully" : "Delete failed"),
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
  campaignId: string
): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const res = await fetch(`${API_URL}/api/emails/${campaignId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Deleted successfully" : "Delete failed"),
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

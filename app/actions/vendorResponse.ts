"use server";

import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/config";

/* eslint-disable @typescript-eslint/no-explicit-any */

const getAccessToken = async (): Promise<string | null> => {
  const session = await auth();
  return (session?.user as any)?.accessToken || null;
};

export type VendorDocument = {
  name: string;
  url: string;
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
    const token = await getAccessToken();
    if (!token) return { success: false, message: "Not authenticated", data: [] };

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      unreadOnly: String(unreadOnly),
    });
    if (campaignId) params.set("campaignId", campaignId);
    else if (proposalId) params.set("proposalId", proposalId);

    const res = await fetch(`${BACKEND_URL}/api/vendor-responses?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const json = await res.json();
    return json;
  } catch {
    return { success: false, message: "Error fetching vendor responses", data: [] };
  }
};

export const getVendorUnreadCountAction = async (): Promise<number> => {
  try {
    const token = await getAccessToken();
    if (!token) return 0;

    const res = await fetch(`${BACKEND_URL}/api/vendor-responses?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const json = await res.json();
    return typeof json?.unreadCount === "number" ? json.unreadCount : 0;
  } catch {
    return 0;
  }
};

export const getVendorResponseByIdAction = async (id: string) => {
  try {
    const token = await getAccessToken();
    if (!token) return { success: false, message: "Not authenticated" };

    const res = await fetch(`${BACKEND_URL}/api/vendor-responses/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    return await res.json();
  } catch {
    return { success: false, message: "Error fetching vendor response" };
  }
};

export const markVendorResponseReadAction = async (id: string) => {
  try {
    const token = await getAccessToken();
    if (!token) return { success: false, message: "Not authenticated" };

    const res = await fetch(`${BACKEND_URL}/api/vendor-responses/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });

    return await res.json();
  } catch {
    return { success: false, message: "Error marking response as read" };
  }
};

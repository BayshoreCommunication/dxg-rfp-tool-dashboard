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
  unreadCount?: number;
  websocket?: unknown;
  socketUrl?: string;
};

const getAccessToken = async (): Promise<string | null> => {
  const session = await auth();
  return (session?.user as { accessToken?: string } | undefined)?.accessToken || null;
};

export type NotificationItem = {
  _id: string;
  proposalId?: string | null;
  type: "proposal_view" | "proposal_expiring_soon" | "proposal_expired";
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export async function getNotificationsAction(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (typeof params?.unreadOnly === "boolean") {
      query.set("unreadOnly", String(params.unreadOnly));
    }

    const res = await fetch(`${API_URL}/api/notifications?${query.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();

    return {
      success: res.ok,
      message: data.message || (res.ok ? "Notifications fetched" : "Fetch failed"),
      data: data.data,
      pagination: data.pagination,
      unreadCount: data.unreadCount,
      websocket: data.websocket,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function getUnreadNotificationCountAction(): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();

    return {
      success: res.ok,
      message: data.message || (res.ok ? "Unread count fetched" : "Fetch failed"),
      data: data.data,
      unreadCount: data.data?.unreadCount,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function markNotificationAsReadAction(
  id: string,
): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();

    return {
      success: res.ok,
      message: data.message || (res.ok ? "Notification updated" : "Update failed"),
      data: data.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function markAllNotificationsAsReadAction(): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const res = await fetch(`${API_URL}/api/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();

    return {
      success: res.ok,
      message: data.message || (res.ok ? "Notifications updated" : "Update failed"),
      data: data.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function getNotificationSocketConfigAction(): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const wsBase = API_URL.replace(/^http/i, "ws").replace(/\/+$/, "");

    return {
      success: true,
      socketUrl: `${wsBase}/api/notifications/ws?token=${encodeURIComponent(token)}`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

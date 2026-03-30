"use server";

import { auth } from "@/auth";

const API_URL = process.env.BACKEND_URL || "http://localhost:8000";

type SettingsResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

const getAuthHeader = async (): Promise<HeadersInit> => {
  const session = await auth();
  const accessToken = (session?.user as any)?.accessToken;
  if (!accessToken) {
    return {};
  }
  return {
    Authorization: `Bearer ${accessToken}`,
  };
};

export async function getSettingsAction(): Promise<SettingsResponse> {
  try {
    const headers = await getAuthHeader();
    if (!("Authorization" in headers)) {
      return { success: false, message: "User is not authenticated." };
    }

    const res = await fetch(`${API_URL}/api/settings`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Settings fetched" : "Failed to fetch"),
      data: data.data,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export async function updateSettingsAction(
  settings: Record<string, any>,
  logoFile?: File | null,
): Promise<SettingsResponse> {
  try {
    const headers = await getAuthHeader();
    if (!("Authorization" in headers)) {
      return { success: false, message: "User is not authenticated." };
    }

    const form = new FormData();
    form.append("settings", JSON.stringify(settings));
    if (logoFile) {
      form.append("logoFile", logoFile);
    }

    const res = await fetch(`${API_URL}/api/settings`, {
      method: "PUT",
      headers,
      body: form,
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Settings updated" : "Update failed"),
      data: data.data,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export async function deleteSettingsAction(): Promise<SettingsResponse> {
  try {
    const headers = await getAuthHeader();
    if (!("Authorization" in headers)) {
      return { success: false, message: "User is not authenticated." };
    }

    const res = await fetch(`${API_URL}/api/settings`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Settings deleted" : "Delete failed"),
      data: data.data,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

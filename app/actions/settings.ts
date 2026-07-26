"use server";

import { authenticatedBackendFetch } from "@/lib/server/backendClient";

import { BACKEND_URL as API_URL } from "@/lib/config";

type SettingsResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

const getErrorMessage = (error: unknown, fallback = "Network error") =>
  error instanceof Error && error.message ? error.message : fallback;

export async function getSettingsAction(): Promise<SettingsResponse> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}/api/settings`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Settings fetched" : "Failed to fetch"),
      data: data.data,
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function updateSettingsAction(
  settings: Record<string, unknown>,
  logoFile?: File | null,
): Promise<SettingsResponse> {
  try {
    const form = new FormData();
    form.append("settings", JSON.stringify(settings));
    if (logoFile) {
      form.append("logoFile", logoFile);
    }

    const res = await authenticatedBackendFetch(`${API_URL}/api/settings`, {
      method: "PUT",
      body: form,
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Settings updated" : "Update failed"),
      data: data.data,
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function deleteSettingsAction(): Promise<SettingsResponse> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}/api/settings`, {
      method: "DELETE",
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Settings deleted" : "Delete failed"),
      data: data.data,
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
}

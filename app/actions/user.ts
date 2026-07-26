"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

interface UserDataResponse {
  error?: string;
  ok: boolean;
  data?: unknown;
}

export async function getUserData(): Promise<UserDataResponse> {
  const apiUrl = BACKEND_URL.endsWith("/api")
    ? BACKEND_URL.slice(0, -4)
    : BACKEND_URL;

  try {
    if (!apiUrl) {
      return {
        error: "Backend API URL is not configured.",
        ok: false,
        data: null,
      };
    }

    const response = await authenticatedBackendFetch(`${apiUrl}/api/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        error:
          payload?.message ||
          `Failed to fetch user data. Status: ${response.status}`,
        ok: false,
        data: null,
      };
    }

    return {
      ok: true,
      data: payload?.data ?? payload?.user ?? null,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again later.",
      ok: false,
      data: null,
    };
  }
}

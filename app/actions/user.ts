"use server";

import { auth } from "@/auth";

interface UserDataResponse {
  error?: string;
  ok: boolean;
  data?: unknown;
}

export async function getUserData(): Promise<UserDataResponse> {
  const session = await auth();
  const accessToken = (session?.user as { accessToken?: string } | undefined)
    ?.accessToken;
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8000";
  const normalizedBaseUrl = baseUrl.trim();
  const apiUrl = normalizedBaseUrl.endsWith("/api")
    ? normalizedBaseUrl.slice(0, -4)
    : normalizedBaseUrl;

  if (!accessToken) {
    return {
      error: "User is not authenticated.",
      ok: false,
      data: null,
    };
  }

  try {
    if (!apiUrl) {
      return {
        error: "Backend API URL is not configured.",
        ok: false,
        data: null,
      };
    }

    const response = await fetch(`${apiUrl}/api/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      next: { tags: ["userDataUpdate"], revalidate: 360 },
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

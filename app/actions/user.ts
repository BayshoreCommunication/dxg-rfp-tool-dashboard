"use server";

import { auth } from "@/auth";
import { unstable_cache } from "next/cache";

interface UserDataResponse {
  error?: string;
  ok: boolean;
  data?: unknown;
}

export async function getUserData(): Promise<UserDataResponse> {
  const session = await auth();

  console.log("🔍 [getUserData] Session check:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    hasAccessToken: !!(session?.user as any)?.accessToken,
    email: session?.user?.email,
  });

  // Check for authentication and access token
  if (!(session?.user as any)?.accessToken) {
    console.log("❌ [getUserData] No access token in session");
    return {
      error: "User is not authenticated.",
      ok: false,
    };
  }

  try {
    // ✅ Updated endpoint: GET /api/auth/me (current user's data)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(session?.user as any)?.accessToken || ""}`,
        },
        next: { tags: ["userDataUpdate"], revalidate: 360 },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ [getUserData] Failed to fetch user data:", errorData);
      return {
        error: errorData?.message || "Failed to fetch user data.",
        ok: false,
        data: null,
      };
    }

    const data = await response.json();
    console.log("✅ [getUserData] Successfully fetched user data:", {
      hasUser: !!data?.user,
      email: data?.user?.email,
    });
    return {
      ok: true,
      data: data?.user || null,
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      ok: false,
      data: null,
    };
  }
}

export async function getUserDataTest(
  headers: HeadersInit,
): Promise<UserDataResponse> {
  try {
    // ✅ Updated endpoint: GET /api/auth/me
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
      {
        method: "GET",
        headers,
        next: { tags: ["userDataCache"], revalidate: 360 }, // Cache with a tag
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: errorData?.message || "Failed to fetch user data.",
        ok: false,
        data: null,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      data: data?.user || null,
    };
  } catch {
    return {
      error: "An unexpected error occurred. Please try again later.",
      ok: false,
      data: null,
    };
  }
}

export async function updateUserData(updateData: {
  organization_name?: string;
  company_organization_type?: string;
  website?: string;
  email?: string;
  country?: string;
  language?: string;
  timeZone?: string;
  name?: string;
  phone?: string;
  avatar?: string;
}): Promise<UserDataResponse> {
  const session = await auth();

  // Check for authentication and access token
  if (!(session?.user as any)?.accessToken || !session?.user?.id) {
    return {
      error: "User is not authenticated.",
      ok: false,
    };
  }

  try {
    // ✅ Updated endpoint: PUT /api/users/:id (update current user)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${session.user.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(session.user as any).accessToken}`,
        },
        body: JSON.stringify({
          name: updateData.name,
          email: updateData.email,
          phone: updateData.phone,
          avatar: updateData.avatar,
        }),
      },
    );

    // TODO: Fix revalidateTag for Next.js 16
    // revalidateTag("userDataUpdate");

    // Check if the response is successful
    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: errorData?.message || "Failed to update user data.",
        ok: false,
      };
    }

    // Parse the response data if the update is successful
    const data = await response.json();
    return {
      ok: true,
      data: data?.data || null,
    };
  } catch (error) {
    // Log unexpected errors
    console.error("Error updating user data:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      ok: false,
    };
  }
}

// Get all user list

export async function getAllUserData(
  search: string = "",
  page: number = 1,
  limit: number = 10000,
): Promise<UserDataResponse> {
  const session = await auth();

  if (!(session?.user as any)?.accessToken) {
    return {
      error: "User is not authenticated.",
      ok: false,
    };
  }

  try {
    const query = new URLSearchParams({
      search: search,
      page: page.toString(),
      limit: limit.toString(),
    }).toString();

    // ✅ Updated endpoint: GET /api/user/all (admin only)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/all?${query}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(session?.user as any)?.accessToken}`,
        },
        next: {
          tags: ["allUsers"],
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch user data:", errorData);
      return {
        error:
          errorData?.detail ||
          errorData?.message ||
          "Failed to fetch user data.",
        ok: false,
        data: null,
      };
    }

    const data = await response.json();

    return {
      ok: true,
      data: data?.payload || null,
    };
  } catch (error: unknown) {
    console.error("Error fetching user data:", error);
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

export async function userDeletedById(id: string): Promise<UserDataResponse> {
  const session = await auth();

  if (!(session?.user as any)?.accessToken) {
    return {
      error: "User is not authenticated.",
      ok: false,
      data: null,
    };
  }

  try {
    // ✅ Updated endpoint: DELETE /api/users/{id} (admin only)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(session?.user as any)?.accessToken}`,
        },
      },
    );
    // TODO: Fix revalidateTag for Next.js 16
    // revalidateTag("userDelete");

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to delete user:", errorData);
      return {
        error:
          errorData?.detail || errorData?.message || "Failed to delete user.",
        ok: false,
        data: null,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      data: data?.payload || null,
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      ok: false,
      data: null,
    };
  }
}

// User deleted by id

export const getCachedAllUsersData = unstable_cache(
  async (headers) => await getUserDataTest(headers), // Ensure async
  ["userDataCache"],
  { revalidate: 360 },
);

export const getCachedUserData = unstable_cache(
  async (headers) => await getAllUserData(headers), // Ensure async
  ["userDataCache"],
  { revalidate: 360 },
);

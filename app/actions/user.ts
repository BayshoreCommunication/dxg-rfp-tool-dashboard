"use server";

import { auth } from "@/auth";
import { revalidateTag, revalidatePath, unstable_cache } from "next/cache";

interface UserDataResponse {
  error?: string;
  ok: boolean;
  data?: any;
}

export async function getUserData(): Promise<UserDataResponse> {
  const session = await auth();

  console.log("🔍 [getUserData] Session check:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    hasAccessToken: !!session?.user?.accessToken,
    email: session?.user?.email,
  });

  // Check for authentication and access token
  if (!session?.user?.accessToken) {
    console.log("❌ [getUserData] No access token in session");
    return {
      error: "User is not authenticated.",
      ok: false,
    };
  }

  try {
    // ✅ Updated endpoint: GET /api/user (current user's data)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.accessToken || ""}`,
        },
        next: { tags: ["userDataUpdate"], revalidate: 360 },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ [getUserData] Failed to fetch user data:", errorData);
      return {
        error: errorData?.detail || errorData?.message || "Failed to fetch user data.",
        ok: false,
        data: null,
      };
    }

    const data = await response.json();
    console.log("✅ [getUserData] Successfully fetched user data:", {
      hasPayload: !!data?.payload,
      hasUser: !!data?.payload?.user,
      email: data?.payload?.user?.email,
    });
    return {
      ok: true,
      data: data?.payload?.user || null,
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
  headers: HeadersInit
): Promise<UserDataResponse> {
  try {
    // ✅ Updated endpoint: GET /api/user
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
      {
        method: "GET",
        headers,
        next: { tags: ["userDataCache"], revalidate: 360 }, // Cache with a tag
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: errorData?.detail || errorData?.message || "Failed to fetch user data.",
        ok: false,
        data: null,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      data: data?.payload?.user || null,
    };
  } catch (error) {
    return {
      error: "An unexpected error occurred. Please try again later.",
      ok: false,
      data: null,
    };
  }
}

export async function updateUserData(
  updateData: {
    organization_name?: string;
    company_organization_type?: string;
    website?: string;
    email?: string;
    country?: string;
    language?: string;
    timeZone?: string;
  }
): Promise<UserDataResponse> {
  const session = await auth();

  // Check for authentication and access token
  if (!session?.user?.accessToken) {
    return {
      error: "User is not authenticated.",
      ok: false,
    };
  }

  try {
    // ✅ Updated endpoint: PUT /api/user (current user)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    // TODO: Fix revalidateTag for Next.js 16
    // revalidateTag("userDataUpdate");

    // Check if the response is successful
    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: errorData?.detail || errorData?.message || "Failed to update user data.",
        ok: false,
      };
    }

    // Parse the response data if the update is successful
    const data = await response.json();
    return {
      ok: true,
      data: data?.payload?.user || null,
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
  limit: number = 10000
): Promise<UserDataResponse> {
  const session = await auth();

  if (!session?.user?.accessToken) {
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
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        next: {
          tags: ["allUsers"],
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch user data:", errorData);
      return {
        error: errorData?.detail || errorData?.message || "Failed to fetch user data.",
        ok: false,
        data: null,
      };
    }

    const data = await response.json();

    return {
      ok: true,
      data: data?.payload || null,
    };
  } catch (error: any) {
    console.error("Error fetching user data:", error);
    return {
      error:
        error?.message ||
        "An unexpected error occurred. Please try again later.",
      ok: false,
      data: null,
    };
  }
}

export async function userDeletedById(id: string): Promise<UserDataResponse> {
  const session = await auth();

  if (!session?.user?.accessToken) {
    return {
      error: "User is not authenticated.",
      ok: false,
      data: null,
    };
  }

  try {
    // ✅ Updated endpoint: DELETE /api/user/{id} (admin only)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      }
    );
    // TODO: Fix revalidateTag for Next.js 16
    // revalidateTag("userDelete");

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to delete user:", errorData);
      return {
        error: errorData?.detail || errorData?.message || "Failed to delete user.",
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

/**
 * Get user subscriptions by user ID
 * NOTE: This endpoint (/api/subscription/{userId}) may need to be verified
 * It might be under /admin/subscriptions or a different route
 */
export async function userSubscriptionByIds(
  userId: string,
  search: string = "52",
  page: number = 1,
  limit: number = 5,
  searchOption: string = "all"
): Promise<UserDataResponse> {
  const session = await auth();

  if (!session?.user?.accessToken) {
    return {
      error: "User is not authenticated.",
      ok: false,
      data: null,
    };
  }

  try {
    // Construct query parameters with all required values
    const queryParams = new URLSearchParams({
      search,
      page: page.toString(),
      limit: limit.toString(),
      searchOption: searchOption.toString(),
    });

    // ⚠️ TODO: Verify this endpoint exists on backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/subscription/${userId}?${queryParams}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      }
    );

    // TODO: Fix revalidateTag for Next.js 16
    // revalidateTag("userUpdate");

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch subscription data:", errorData);
      return {
        error: errorData?.detail || errorData?.message || "Failed to fetch subscription data.",
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
    console.error("Error fetching subscription data:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      ok: false,
      data: null,
    };
  }
}

/**
 * Get user subscription by user ID
 * NOTE: This endpoint (/api/subscription/{userId}) may need to be verified
 * It might be under /admin/subscriptions or a different route
 */
export async function userSubscriptionById(
  userId: string,
  search: string = "",
  page: number = 1,
  limit: number = 10000
): Promise<UserDataResponse> {
  const session = await auth();

  if (!session?.user?.accessToken) {
    return {
      error: "User is not authenticated.",
      ok: false,
    };
  }

  try {
    const queryParams = new URLSearchParams({
      search: search,
      page: page.toString(),
      limit: limit.toString(),
    }).toString();

    // ⚠️ TODO: Verify this endpoint exists on backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/subscription/${userId}?${queryParams}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        next: {
          tags: ["userSubscriptions"],
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch user subscription data:", errorData);
      return {
        error: errorData?.detail || errorData?.message || "Failed to fetch user subscription data.",
        ok: false,
        data: null,
      };
    }

    const data = await response.json();

    return {
      ok: true,
      data: data?.payload || null,
    };
  } catch (error: any) {
    console.error("Error fetching user subscription data:", error);
    return {
      error:
        error?.message ||
        "An unexpected error occurred. Please try again later.",
      ok: false,
      data: null,
    };
  }
}

export const getCachedAllUsersData = unstable_cache(
  async (headers) => await getUserDataTest(headers), // Ensure async
  ["userDataCache"],
  { revalidate: 360 }
);

export const getCachedUserData = unstable_cache(
  async (headers) => await getAllUserData(headers), // Ensure async
  ["userDataCache"],
  { revalidate: 360 }
);

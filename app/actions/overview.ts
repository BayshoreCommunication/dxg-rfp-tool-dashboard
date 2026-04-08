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
};

export type DashboardOverviewTotals = {
  totalProposals: number;
  totalEmailSent: number;
  totalEmailClicked: number;
  totalProposalViews: number;
};

export type DashboardOverviewProposal = {
  _id: string;
  status?: string;
  isActive?: boolean;
  isFavorite?: boolean;
  viewsCount?: number;
  createdAt?: string;
  event?: {
    eventName?: string;
  };
  contact?: {
    contactFirstName?: string;
    contactLastName?: string;
    contactEmail?: string;
  };
};

export type DashboardOverviewData = {
  totals: DashboardOverviewTotals;
  latestProposals: DashboardOverviewProposal[];
};

const getAccessToken = async (): Promise<string | null> => {
  const session = await auth();
  return (
    (session?.user as { accessToken?: string } | undefined)?.accessToken || null
  );
};

export async function getDashboardOverviewAction(): Promise<ApiResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "User is not authenticated." };
    }

    const res = await fetch(`${API_URL}/api/dashboard/overview`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();

    return {
      success: res.ok,
      message: data.message || (res.ok ? "Overview fetched" : "Fetch failed"),
      data: data.data as DashboardOverviewData,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

"use server";

import { authenticatedBackendFetch } from "@/lib/server/backendClient";

import { BACKEND_URL as API_URL } from "@/lib/config";

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

export async function getDashboardOverviewAction(): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}/api/dashboard/overview`, {
      method: "GET",
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

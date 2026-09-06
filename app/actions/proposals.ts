"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  ProposalData,
  ProposalWriteData,
} from "@/components/proposals/AddNewProposal";
import { BACKEND_URL as API_URL, FRONTEND_URL } from "@/lib/config";
import {
  omitStandaloneVideoRecording,
  STANDALONE_VIDEO_RECORDING_STEP_ENABLED,
} from "@/lib/proposals/proposalExperience";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProposalCounts = {
  all: number;
  draft: number;
  live: number;
  favorite: number;
  expired: number;
  archive: number;
  saved: number;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
  pagination?: unknown;
  counts?: ProposalCounts;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Backend validation failures carry the offending fields in `errors[]` while
 * `message` is only the generic headline ("Validation failed"). Forwarding the
 * headline alone leaves the planner with no idea which field to fix, so join
 * the detail on when it is present.
 */
const failureMessage = (body: { message?: string; errors?: unknown }, fallback: string): string => {
  const headline = typeof body.message === "string" && body.message ? body.message : fallback;
  const details = Array.isArray(body.errors)
    ? body.errors.map((entry) => String(entry).trim()).filter(Boolean)
    : [];
  return details.length ? `${headline}: ${details.join("; ")}` : headline;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Derives proposalSlug, proposalLink, and publicProposalLink from a raw proposal object. */
const buildProposalMeta = (proposal: any) => {
  const proposalId = proposal?._id ? String(proposal._id) : "";
  const title = proposal?.event?.eventName || "proposal";
  const slug = `${toSlug(title) || "proposal"}-${proposalId}`;
  const appProposalLink = `${FRONTEND_URL.replace(/\/+$/, "")}/proposal/${slug}`;
  const prefix = String(proposal?.proposalSettings?.linkPrefix || "")
    .trim()
    .toLowerCase();
  const proposalLinkPrefix = prefix || "abuco";
  const publicProposalLink = `https://${proposalLinkPrefix}.goprospero.com/proposal/${slug}?source=public`;

  return {
    ...proposal,
    proposalSlug: slug,
    proposalLink: appProposalLink,
    publicProposalLink,
  };
};

/** Applies buildProposalMeta to a single object or every item in an array. */
const withProposalMeta = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload.map((proposal) => buildProposalMeta(proposal));
  }
  if (payload && typeof payload === "object") {
    return buildProposalMeta(payload);
  }
  return payload;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public actions — no authentication required
// Used for public proposal preview links (email / share links)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch a proposal by ID without a token — used by public share/preview links. */
export async function getProposalByIdPublicAction(
  id: string,
  accessGrant?: string,
): Promise<ApiResponse> {
  try {
    const query = accessGrant ? `?accessGrant=${encodeURIComponent(accessGrant)}` : "";
    const res = await fetch(`${API_URL}/api/proposals/${id}${query}`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal fetched" : "Fetch failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/** Increment view count without a token — called when a public link is opened. */
export async function incrementProposalViewsPublicAction(
  id: string,
  accessGrant?: string,
): Promise<ApiResponse> {
  try {
    const query = accessGrant ? `?accessGrant=${encodeURIComponent(accessGrant)}` : "";
    const res = await fetch(`${API_URL}/api/proposals/${id}/views${query}`, {
      method: "PATCH",
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Proposal views updated" : "Update failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated actions — require a valid session token
// ─────────────────────────────────────────────────────────────────────────────

// ── Proposal CRUD ─────────────────────────────────────────────────────────────

/** Create a new proposal (draft or submitted). */
export async function createProposalAction(
  payload: ProposalWriteData & {
    status?: "unsubmitted" | "submitted" | "reviewed" | "approved" | "rejected";
  },
): Promise<ApiResponse> {
  try {
    const activePayload = STANDALONE_VIDEO_RECORDING_STEP_ENABLED
      ? payload
      : omitStandaloneVideoRecording(payload);
    const res = await authenticatedBackendFetch(`${API_URL}/api/proposals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activePayload),
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) revalidatePath("/proposals");
    return {
      success: res.ok,
      message: res.ok
        ? data.message || "Proposal created"
        : failureMessage(data, "Create failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/** Fetch a paginated list of proposals for the signed-in user. */
export async function getProposalsAction(params?: {
  status?: string;
  favorite?: boolean;
  isActive?: boolean;
  archived?: boolean;
  isCopy?: boolean;
  isDraft?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeCounts?: boolean;
}): Promise<ApiResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (typeof params?.favorite === "boolean") {
    query.set("favorite", String(params.favorite));
  }
  if (typeof params?.isCopy === "boolean") {
    query.set("isCopy", String(params.isCopy));
  }
  if (typeof params?.isDraft === "boolean") {
    query.set("isDraft", String(params.isDraft));
  }
  if (typeof params?.isActive === "boolean") {
    query.set("isActive", String(params.isActive));
  }
  if (typeof params?.archived === "boolean") {
    query.set("archived", String(params.archived));
  }
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.sortBy) query.set("sortBy", params.sortBy);
  if (params?.sortOrder) query.set("sortOrder", params.sortOrder);
  if (typeof params?.includeCounts === "boolean") {
    query.set("includeCounts", String(params.includeCounts));
  }

  try {
    const res = await authenticatedBackendFetch(
      `${API_URL}/api/proposals?${query.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposals fetched" : "Fetch failed"),
      data: withProposalMeta(data.data),
      pagination: data.pagination,
      counts: data.counts,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/** Fetch only the status counts (all / draft / live / favorite / expired). */
export async function getProposalCountsAction(search?: string): Promise<{
  success: boolean;
  message?: string;
  counts: ProposalCounts;
}> {
  const empty: ProposalCounts = { all: 0, draft: 0, live: 0, favorite: 0, expired: 0, archive: 0, saved: 0 };

  const query = new URLSearchParams({ includeCounts: "true", limit: "1", page: "1" });
  if (search?.trim()) query.set("search", search.trim());

  try {
    const res = await authenticatedBackendFetch(
      `${API_URL}/api/proposals?${query.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
    const data = await res.json();

    if (!res.ok || !data.counts) {
      return { success: false, message: data.message || "Fetch failed", counts: empty };
    }

    const raw = data.counts as Partial<ProposalCounts>;
    return {
      success: true,
      counts: {
        all: raw.all ?? 0,
        draft: raw.draft ?? 0,
        live: raw.live ?? 0,
        favorite: raw.favorite ?? 0,
        expired: raw.expired ?? 0,
        archive: raw.archive ?? 0,
        saved: raw.saved ?? 0,
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error", counts: empty };
  }
}

/**
 * Fetch a single proposal by ID for the signed-in user.
 * Sends the session token so the backend returns owner-scoped data.
 */
export async function getProposalByIdAction(id: string): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}/api/proposals/${id}`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal fetched" : "Fetch failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

export type ProposalViewAccessGrantResult = {
  success: boolean;
  message?: string;
  token?: string;
  expiresAt?: string;
};

/** Creates a fresh, read-only grant for a copied public proposal link. */
export async function createProposalViewAccessGrantAction(
  proposalId: string,
): Promise<ProposalViewAccessGrantResult> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}/api/public-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resourceId: proposalId,
        purpose: "proposal:view",
        expiresInHours: 720,
      }),
      cache: "no-store",
    });
    const data = await res.json();
    const token = data?.grant?.token;
    const expiresAt = data?.grant?.expiresAt;

    if (!res.ok || typeof token !== "string" || !token) {
      return {
        success: false,
        message: data?.message || "Could not create a secure proposal link",
      };
    }

    return {
      success: true,
      token,
      ...(typeof expiresAt === "string" ? { expiresAt } : {}),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Could not create a secure proposal link",
    };
  }
}

/** Create a copy of an existing proposal with optional field overrides. */
export async function copyProposalAction(
  sourceId: string,
  overrides?: {
    eventName?: string;
    startDate?: string;
    endDate?: string;
    templateId?: "template-one" | "template-two";
    status?: "unsubmitted" | "submitted";
    isDraft?: boolean;
  },
): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(
      `${API_URL}/api/proposals/${sourceId}/copy`,
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(overrides ?? {}),
      cache: "no-store",
      },
    );
    const data = await res.json();
    if (res.ok) revalidatePath("/proposals");
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal copied" : "Copy failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/** Replace all editable fields of a proposal (full update). */
export async function updateProposalAction(
  id: string,
  updates: Partial<ProposalData> & {
    isDraft?: boolean;
    isActive?: boolean;
    isCopy?: boolean;
    status?: string;
  },
): Promise<ApiResponse> {
  try {
    const activeUpdates = STANDALONE_VIDEO_RECORDING_STEP_ENABLED
      ? updates
      : omitStandaloneVideoRecording(updates);
    const res = await authenticatedBackendFetch(`${API_URL}/api/proposals/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activeUpdates),
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) revalidatePath("/proposals");
    return {
      success: res.ok,
      message: res.ok
        ? data.message || "Proposal updated"
        : failureMessage(data, "Update failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/** Archive a proposal (soft delete — recoverable for 30 days). */
export async function deleteProposalAction(id: string): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(`${API_URL}/api/proposals/${id}`, {
      method: "DELETE",
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) revalidatePath("/proposals");
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal archived" : "Archive failed"),
      data: data.data,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/** Restore an archived proposal back to active. */
export async function restoreProposalAction(id: string): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(
      `${API_URL}/api/proposals/${id}/restore`,
      {
      method: "PATCH",
      cache: "no-store",
      },
    );
    const data = await res.json();
    if (res.ok) revalidatePath("/proposals");
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal restored" : "Restore failed"),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/** Permanently delete an archived proposal — cannot be undone. */
export async function permanentlyDeleteProposalAction(id: string): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(
      `${API_URL}/api/proposals/${id}/permanent`,
      {
        method: "DELETE",
        cache: "no-store",
      },
    );
    const data = await res.json();
    if (res.ok) revalidatePath("/proposals");
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Proposal permanently deleted" : "Delete failed"),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

// ── Status, meta & views ──────────────────────────────────────────────────────

/** Change the workflow status (draft → submitted → reviewed → approved / rejected). */
export async function updateProposalStatusAction(
  id: string,
  status: "unsubmitted" | "submitted" | "reviewed" | "approved" | "rejected",
): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(
      `${API_URL}/api/proposals/${id}/status`,
      {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
      cache: "no-store",
      },
    );
    const data = await res.json();
    if (res.ok) revalidatePath("/proposals");
    return {
      success: res.ok,
      message: data.message || (res.ok ? "Status updated" : "Update failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/** Update boolean flags and viewsCount (isActive, isFavorite, isAccepted, isOpen). */
export async function updateProposalMetaAction(
  id: string,
  updates: {
    isActive?: boolean;
    isFavorite?: boolean;
    isAccepted?: boolean;
    isOpen?: boolean;
    viewsCount?: number;
  },
): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(
      `${API_URL}/api/proposals/${id}/meta`,
      {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
      cache: "no-store",
      },
    );
    const data = await res.json();
    if (res.ok) revalidatePath("/proposals");
    return {
      success: res.ok,
      message: res.ok
        ? data.message || "Proposal updated"
        : failureMessage(data, "Update failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/** Increment view count for an authenticated user session. */
export async function incrementProposalViewsAction(
  id: string,
): Promise<ApiResponse> {
  try {
    const res = await authenticatedBackendFetch(
      `${API_URL}/api/proposals/${id}/views`,
      {
      method: "PATCH",
      cache: "no-store",
      },
    );
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Proposal views updated" : "Update failed"),
      data: withProposalMeta(data.data),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

// ── File uploads ──────────────────────────────────────────────────────────────

/** Authorize a short-lived direct upload without proxying file bytes. */
export async function createProposalUploadTicketAction(): Promise<
  | { success: true; ticket: string; uploadUrl: string }
  | { success: false; message: string }
> {
  try {
    const response = await authenticatedBackendFetch(`${API_URL}/api/proposals/upload-ticket`, {
      method: "POST", cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok || !body.success || typeof body.data?.ticket !== "string") {
      return { success: false, message: body.message || "Please sign in again before uploading." };
    }
    return { success: true, ticket: body.data.ticket, uploadUrl: `${API_URL}/api/proposals/upload-files/direct` };
  } catch {
    return { success: false, message: "Could not prepare the upload. Please try again." };
  }
}

export async function uploadProposalFilesAction(formData: FormData): Promise<{
  success: boolean;
  message?: string;
  supportDocumentUrls: string[];
  avQuoteFileUrls: string[];
  scenicInspirationFileUrls: string[];
  venueCoiFileUrls: string[];
}> {
  try {
    const res = await authenticatedBackendFetch(
      `${API_URL}/api/proposals/upload-files`,
      {
      method: "POST",
      body: formData,
      cache: "no-store",
      },
    );

    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        message: json.message || "Upload failed",
        supportDocumentUrls: [],
        avQuoteFileUrls: [],
        scenicInspirationFileUrls: [],
        venueCoiFileUrls: [],
      };
    }

    const results: Array<{
      fieldname: string;
      originalname: string;
      url: string;
    }> = json.data || [];

    return {
      success: true,
      message: json.message,
      supportDocumentUrls: results
        .filter((r) => r.fieldname === "supportDocuments")
        .map((r) => r.url),
      avQuoteFileUrls: results
        .filter((r) => r.fieldname === "avQuoteFiles")
        .map((r) => r.url),
      scenicInspirationFileUrls: results
        .filter((r) => r.fieldname === "scenicInspirationFiles")
        .map((r) => r.url),
      venueCoiFileUrls: results
        .filter((r) => r.fieldname === "venueCoiFiles")
        .map((r) => r.url),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Network error",
      supportDocumentUrls: [],
      avQuoteFileUrls: [],
      scenicInspirationFileUrls: [],
      venueCoiFileUrls: [],
    };
  }
}

// ── AI extraction ─────────────────────────────────────────────────────────────

/**
 * Send a document file to the backend AI extraction endpoint.
 * Returns a partial ProposalData object with only the fields found in the document.
 */
export async function extractProposalFromFile(file: File): Promise<{
  success: boolean;
  data?: Partial<ProposalData>;
  message?: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await authenticatedBackendFetch(
      `${API_URL}/api/extract-proposal`,
      {
      method: "POST",
      body: formData,
      cache: "no-store",
      },
    );

    const json = await res.json();
    return {
      success: res.ok && json.success,
      data: json.data as Partial<ProposalData>,
      message: json.message,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/**
 * AI fallback for messy time-of-day strings a spreadsheet parser can't confidently
 * read on its own (typos, unusual notation). Only meant to be called with the small
 * batch of values a local parser already gave up on, not every cell in a sheet.
 * Returns one result per input value, in the same order — "HH:MM" (24-hour) or null.
 */
export async function normalizeScheduleTimesAction(values: string[]): Promise<{
  success: boolean;
  results?: (string | null)[];
  message?: string;
}> {
  if (values.length === 0) return { success: true, results: [] };
  try {
    // Migrated with the rest of this file to the shared authenticated client;
    // the manual getAccessToken helper no longer exists.
    //
    // NOTE: the backend has no /api/extract-proposal/normalize-times route —
    // extractRoute mounts only POST "/" — so this call 404s and the caller
    // silently drops the times it could not parse. Fixing that needs a backend
    // endpoint, not a change here.
    const res = await authenticatedBackendFetch(`${API_URL}/api/extract-proposal/normalize-times`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
      cache: "no-store",
    });

    const json = await res.json();
    return {
      success: res.ok && json.success,
      results: json.data?.results as (string | null)[] | undefined,
      message: json.message,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

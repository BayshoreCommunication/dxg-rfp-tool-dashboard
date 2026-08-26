import type { VendorResponseItem } from "@/app/actions/vendorResponse";

/* Shared between the planner-facing form, the server component that renders it,
   and the server action that records a response the vendor delivered outside the
   portal. Kept out of the "use server" module because only async functions may
   be exported from one, and out of the "use client" dialog so a server component
   can call it. */

export const MANUAL_RESPONSE_MAX_FILES = 10;
export const MANUAL_RESPONSE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MANUAL_RESPONSE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Reasons a planner can give for a response that follows an existing one. The
   first submission for a vendor is always recorded as "initial" by the backend,
   so these only apply to a revision. */
export const MANUAL_RESPONSE_REASONS = [
  { value: "vendor_revision", label: "Revised response" },
  { value: "clarification_response", label: "Clarification response" },
  { value: "bafo", label: "Best and final offer" },
  { value: "administrative_correction", label: "Administrative correction" },
] as const;

export type ManualResponseReason =
  (typeof MANUAL_RESPONSE_REASONS)[number]["value"];

export const isManualResponseReason = (
  value: string,
): value is ManualResponseReason =>
  MANUAL_RESPONSE_REASONS.some((reason) => reason.value === value);

/* The vendors a proposal has already heard from, keyed the way the dialog
   matches them: a normalized email. Reusing one adds a version to that vendor's
   existing response instead of creating a second one. */
export type ExistingVendorSummary = {
  email: string;
  vendorName: string;
  versionNumber: number;
};

export const existingVendorSummaries = (
  responses: VendorResponseItem[],
): ExistingVendorSummary[] =>
  responses.map((response) => ({
    email: response.email.trim().toLowerCase(),
    vendorName: response.vendorName,
    versionNumber: response.currentVersionNumber ?? 1,
  }));

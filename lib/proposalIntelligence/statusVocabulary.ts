import type { CardExtractionStatus } from "@/lib/vendorResponses/responseCardSummary";

export const intelligenceStatuses = [
  "not_started",
  "queued",
  "in_progress",
  "complete",
  "partial",
  "attention",
  "unavailable",
  "failed",
] as const;

export type IntelligenceStatus = (typeof intelligenceStatuses)[number];

export const intelligenceStatusPresentation: Record<
  IntelligenceStatus,
  { label: string; className: string }
> = {
  not_started: {
    label: "Not started",
    className: "border-gray-border bg-gray-panel text-gray",
  },
  queued: {
    label: "Queued",
    className: "border-gray bg-white text-gray",
  },
  in_progress: {
    label: "In progress",
    className: "border-brand bg-brand-muted text-brand-dark",
  },
  complete: {
    label: "Complete",
    className: "border-brand bg-white text-brand-dark",
  },
  partial: {
    label: "Partly done",
    className: "border-gray bg-gray-panel text-navy",
  },
  attention: {
    label: "Needs review",
    className: "border-navy bg-white text-navy",
  },
  unavailable: {
    label: "Not available",
    className: "border-gray bg-gray-panel text-gray",
  },
  failed: {
    label: "Failed",
    className: "border-navy bg-navy text-white",
  },
};

export const extractionStatusToIntelligenceStatus = (
  status: CardExtractionStatus,
): IntelligenceStatus => {
  switch (status) {
    case "processing":
      return "in_progress";
    case "ready":
      return "complete";
    case "partial":
      return "partial";
    case "unreadable":
    case "unavailable":
      return "unavailable";
    case "failed":
      return "failed";
    case "not_started":
    default:
      return "not_started";
  }
};

export const jobStatusToIntelligenceStatus = (
  status: string,
): IntelligenceStatus => {
  if (status === "queued" || status === "retry_scheduled") return "queued";
  if (status === "running" || status === "cancelling") return "in_progress";
  if (status === "succeeded") return "complete";
  if (status === "succeeded_with_warnings") return "partial";
  if (status === "failed" || status === "dead_letter") return "failed";
  if (status === "cancelled") return "unavailable";
  return "not_started";
};

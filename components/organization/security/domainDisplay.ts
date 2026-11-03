import type { DomainStatus } from "@/app/actions/domains";

export const DOMAIN_STATUS_LABEL: Record<DomainStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  unverified: "Unverified",
};

export const DOMAIN_STATUS_CLASS: Record<DomainStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unverified: "bg-rose-50 text-rose-700 border-rose-200",
};

/* lastCheckOutcome from the backend, in plain English. */
export const domainOutcomeText = (outcome: string | null): string | null => {
  if (!outcome) return null;
  if (outcome === "txt_record_found") return "TXT record found";
  if (outcome === "admin_email_domain") return "Verified by an Admin's email address";
  if (outcome === "txt_record_missing") return "TXT record not found";
  // Another organization already holds it verified; never say so outright.
  if (outcome === "not_verified") return "Not verified yet";
  if (outcome === "check_failed" || outcome.startsWith("dns_error"))
    return "DNS lookup failed; we'll retry within an hour";
  return null;
};

export const formatCheckTime = (iso: string | null, now = new Date()): string => {
  if (!iso) return "Not checked yet";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "Not checked yet";
  const minutes = Math.round((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/* Light client-side check before calling the API; the backend has the final say. */
export const normalizeDomainInput = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^.*@/, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");

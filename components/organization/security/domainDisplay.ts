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

// Country second-level suffixes where the registrable domain has three labels (acme.co.uk).
const SECOND_LEVEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au", "co.nz", "co.jp", "co.in",
  "com.br", "com.mx", "co.za", "com.sg", "com.cn", "com.hk", "co.kr", "com.tr",
]);

/** What to type in the provider's Host field. Most providers (Namecheap, GoDaddy, Cloudflare)
 *  append the domain themselves, so typing the full name there creates
 *  "acme.com.acme.com". For a main domain that's "@"; for a subdomain the full name is shown,
 *  because which part to type depends on where its DNS is hosted. */
export const txtRecordHost = (name: string): { host: string; isApex: boolean } => {
  const labels = name.toLowerCase().split(".").filter(Boolean);
  const isApex = labels.length === 2 || (labels.length === 3 && SECOND_LEVEL_SUFFIXES.has(labels.slice(1).join(".")));
  return { host: isApex ? "@" : name, isApex };
};

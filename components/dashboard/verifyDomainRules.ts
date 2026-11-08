import type { OrganizationDomain } from "@/app/actions/domains";

/* ORG-306 follow-up. Colleagues are asked to join an organization rather than
   start their own once a domain is verified (or a member is already on it).
   Owners and Admins who haven't verified their company domain get a nudge on
   the dashboard. Pure so it can be tested without a session. */

// Personal mail providers: nobody can verify these, so don't suggest it.
const PERSONAL_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "ymail.com", "icloud.com", "me.com", "mac.com", "aol.com",
  "proton.me", "protonmail.com", "gmx.com", "gmx.net", "zoho.com", "mail.com",
]);

export type VerifyDomainPrompt = { domain: string | null; pending: boolean };

export const emailDomain = (email: string | null | undefined): string | null => {
  const at = typeof email === "string" ? email.lastIndexOf("@") : -1;
  return at > 0 ? email!.slice(at + 1).trim().toLowerCase() || null : null;
};

export function verifyDomainPromptFor(input: {
  canManage: boolean;
  email: string | null | undefined;
  domains: Pick<OrganizationDomain, "domain" | "status">[];
}): VerifyDomainPrompt | null {
  if (!input.canManage) return null;
  if (input.domains.some((d) => d.status === "verified")) return null;
  const own = emailDomain(input.email);
  const company = own && !PERSONAL_MAIL_DOMAINS.has(own) ? own : null;
  const pendingRow = input.domains.find((d) => d.status === "pending" && (!company || d.domain === company))
    ?? input.domains.find((d) => d.status === "pending");
  if (pendingRow) return { domain: pendingRow.domain, pending: true };
  // A personal address and no domain added: nothing sensible to suggest.
  if (!company) return null;
  return { domain: company, pending: false };
}

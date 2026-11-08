import {
  storeGoogleDomainMatch,
  takeGoogleSeparateOrganization,
} from "@/lib/server/twoFactorPending";

/* ORG-306 pieces of the Google sign-in callback (auth.ts), kept here so they
   can be tested without NextAuth.

   - A first Google sign-in on a domain an organization has verified is
     refused by the backend with ORGANIZATION_DOMAIN_MATCH. Instead of the
     sign-in page's error, the person lands on /sign-up with the choice
     (request access or create a separate organization). The email and the
     organization name go in an encrypted cookie, not the URL.
   - Choosing "create a separate organization" there sets a one-shot cookie;
     the next callback sends separateOrganization: true. */

export const GOOGLE_DOMAIN_MATCH_PATH = "/sign-up?step=organization-match";

export async function googleSignInExtras(invited: boolean): Promise<{ separateOrganization?: true }> {
  // An invitation decides the organization; the flag never applies to it.
  if (invited) return {};
  return (await takeGoogleSeparateOrganization()) ? { separateOrganization: true } : {};
}

export async function googleDomainMatchRedirect(input: {
  invited: boolean;
  errorCode: string;
  data: unknown;
  email: string;
}): Promise<string | null> {
  if (input.invited || input.errorCode !== "ORGANIZATION_DOMAIN_MATCH") return null;
  const organizationName = (input.data as { organizationName?: unknown } | null)?.organizationName;
  if (typeof organizationName !== "string" || !organizationName.trim()) return null;
  await storeGoogleDomainMatch({ email: input.email, organizationName: organizationName.trim().slice(0, 200) });
  return GOOGLE_DOMAIN_MATCH_PATH;
}

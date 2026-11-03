import { AUTH_API_ORIGIN, fetchWithTimeout } from "@/lib/authRefresh";

/* A Google or Microsoft sign-up creates the organization before anyone has named
   it ("Pat's organization"). Right after such a sign-in the Owner is sent to
   COMPANY_NAME_PATH for the company name. Any failure here means "don't ask":
   the prompt must never block a sign-in. */

export const COMPANY_NAME_PATH = "/welcome";
// Sent with unstable_update once the organization is named, to clear the flag.
export const COMPANY_NAMED_UPDATE = "companyNamed";

export async function readNeedsCompanyName(
  accessToken: unknown,
  fetcher: typeof fetchWithTimeout = fetchWithTimeout,
): Promise<boolean> {
  if (typeof accessToken !== "string" || !accessToken) return false;
  try {
    const response = await fetcher(`${AUTH_API_ORIGIN}/api/organization/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return body?.needsName === true && body?.canEditName === true;
  } catch {
    return false;
  }
}

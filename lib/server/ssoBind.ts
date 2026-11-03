import { cookies } from "next/headers";

import { SSO_BIND_COOKIE } from "@/lib/auth/sso";

/* The bind cookie set by /api/sso/start. Read once: it is cleared whether or
   not the exchange succeeds, so a handoff can't be replayed with it. */
export async function takeSsoBind(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(SSO_BIND_COOKIE)?.value;
  if (value === undefined) return null;
  jar.delete(SSO_BIND_COOKIE);
  return /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : null;
}

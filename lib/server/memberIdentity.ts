import "server-only";

import { readMemberIdentity, type MemberIdentity } from "@/lib/dashboard/memberIdentity";
import { getBackendSession } from "@/lib/server/backendSession";

// The signed-in member's id and roles, to pick their dashboard (ORG-402).
export async function getMemberIdentity(): Promise<MemberIdentity> {
  try {
    const session = await getBackendSession();
    return readMemberIdentity(session.accessToken);
  } catch {
    return { userId: null, roles: [] };
  }
}

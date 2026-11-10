// Who is signed in, read from the backend access token's claims (userId, roles). Used only to
// choose which dashboard a member is shown: the token is not verified here, because every RFP
// on the page comes from the backend, which verifies it and scopes the data to the member.

export type MemberIdentity = { userId: string | null; roles: string[] };

const NOBODY: MemberIdentity = { userId: null, roles: [] };

export const readMemberIdentity = (accessToken: unknown): MemberIdentity => {
  if (typeof accessToken !== "string") return NOBODY;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return NOBODY;
    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claims = JSON.parse(globalThis.atob(normalized)) as { userId?: unknown; roles?: unknown };
    return {
      userId: typeof claims.userId === "string" && claims.userId ? claims.userId : null,
      roles: Array.isArray(claims.roles) ? claims.roles.filter((role): role is string => typeof role === "string") : [],
    };
  } catch {
    return NOBODY;
  }
};

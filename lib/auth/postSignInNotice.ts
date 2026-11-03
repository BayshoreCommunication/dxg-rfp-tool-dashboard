/* A one-shot message for the first dashboard page after sign-in ("Welcome to
   <org>"), carried in a short-lived cookie because sign-in ends with a full
   page load into a different root layout. */

export const POST_SIGN_IN_NOTICE_COOKIE = "rfpilot-notice";

export type PostSignInNotice =
  | { type: "welcome"; organizationName: string }
  | { type: "recovery-codes-low"; remaining: number };

export const parsePostSignInNotice = (raw: string | undefined | null): PostSignInNotice | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    if (value?.type === "welcome" && typeof value.organizationName === "string" && value.organizationName.trim()) {
      return { type: "welcome", organizationName: value.organizationName.trim().slice(0, 120) };
    }
    if (value?.type === "recovery-codes-low" && typeof value.remaining === "number") {
      return { type: "recovery-codes-low", remaining: value.remaining };
    }
  } catch {
    // fall through
  }
  return null;
};

export const postSignInNoticeText = (notice: PostSignInNotice) =>
  notice.type === "welcome"
    ? `Welcome to ${notice.organizationName}`
    : notice.remaining === 0
      ? "You've used your last recovery code. Generate new ones in Settings."
      : `You have ${notice.remaining} recovery ${notice.remaining === 1 ? "code" : "codes"} left. Generate new ones in Settings.`;

export const readCookie = (cookieHeader: string, name: string) => {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
};

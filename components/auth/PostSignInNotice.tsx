"use client";

import {
  parsePostSignInNotice,
  POST_SIGN_IN_NOTICE_COOKIE,
  postSignInNoticeText,
  readCookie,
} from "@/lib/auth/postSignInNotice";
import { useEffect } from "react";
import { toast } from "react-toastify";

/* Shows the one-shot message left by sign-in ("Welcome to <org>" after
   accepting an invitation, or a low recovery-code warning), then clears it. */
const PostSignInNotice = () => {
  useEffect(() => {
    const raw = readCookie(document.cookie, POST_SIGN_IN_NOTICE_COOKIE);
    if (raw === null) return;
    document.cookie = `${POST_SIGN_IN_NOTICE_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
    const notice = parsePostSignInNotice(raw);
    if (!notice) return;
    const text = postSignInNoticeText(notice);
    if (notice.type === "welcome") toast.success(text, { toastId: "post-sign-in" });
    else toast.warning(text, { toastId: "post-sign-in" });
  }, []);
  return null;
};

export default PostSignInNotice;

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  SUPPORT_UPDATED_EVENT,
  type SupportUpdatedEventDetail,
} from "@/lib/support/realtime";

export const useSupportRealtimeRefresh = (ticketId?: string) => {
  const router = useRouter();

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<SupportUpdatedEventDetail>).detail;
      if (!ticketId || !detail?.ticketId || detail.ticketId === ticketId) {
        router.refresh();
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    window.addEventListener(SUPPORT_UPDATED_EVENT, refresh);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener(SUPPORT_UPDATED_EVENT, refresh);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [router, ticketId]);
};

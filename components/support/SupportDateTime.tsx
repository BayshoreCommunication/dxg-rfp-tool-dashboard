"use client";

import { useSyncExternalStore } from "react";
import { formatAppDateTime, toAppDate } from "@/lib/dateFormat";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Dates are shown in the viewer's local timezone. Keep the server and the
 * first browser render identical, then reveal the localized value after
 * hydration so React never has to repair mismatched timestamp text.
 */
export default function SupportDateTime({
  value,
  fallback = "…",
  className,
}: {
  value: unknown;
  fallback?: string;
  className?: string;
}) {
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const date = toAppDate(value);

  return (
    <time dateTime={date?.toISOString()} className={className}>
      {hydrated ? formatAppDateTime(value) : fallback}
    </time>
  );
}

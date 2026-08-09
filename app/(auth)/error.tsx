"use client";

import ErrorPage from "@/components/ErrorPage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPage reset={reset} digest={error.digest} />;
}

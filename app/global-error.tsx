"use client";

import ErrorPage from "@/components/ErrorPage";
import "./globals.css";

// Catches errors thrown by the route groups' root layouts themselves. It
// replaces the entire document, so it must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <ErrorPage reset={reset} digest={error.digest} />
      </body>
    </html>
  );
}

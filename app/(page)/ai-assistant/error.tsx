"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AiAssistantRouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1320px] items-center justify-center">
      <div
        role="alert"
        className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm"
      >
        <AlertTriangle
          size={30}
          aria-hidden
          className="mx-auto text-rose-500"
        />
        <h1 className="mt-4 text-xl font-extrabold text-[#0e1b2b]">
          The AI Assistant couldn&apos;t open
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your conversation is safe. Try loading the workspace again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mx-auto mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#0e1b2b] px-4 text-sm font-semibold text-white hover:bg-[#1c3047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2"
        >
          <RefreshCw size={15} aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}

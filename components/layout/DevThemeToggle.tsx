"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

export default function DevThemeToggle({
  defaultDark = true,
}: {
  defaultDark?: boolean;
}) {
  const [darkPreview, setDarkPreview] = useState(defaultDark);

  const togglePreview = () => {
    const nextDarkPreview = !darkPreview;
    const root = document.documentElement;

    root.classList.toggle("dark", nextDarkPreview);
    root.dataset.theme = nextDarkPreview ? "dark" : "light";
    setDarkPreview(nextDarkPreview);
  };

  return (
    <button
      type="button"
      data-testid="dev-theme-toggle"
      aria-label={
        darkPreview
          ? "Disable local dark mode preview"
          : "Enable local dark mode preview"
      }
      aria-pressed={darkPreview}
      onClick={togglePreview}
      className="no-print fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 z-[100] inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-[0_12px_32px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 dark:border-[#3b5261] dark:bg-[#0d1d28] dark:text-[#d7e2e9] dark:shadow-[0_14px_36px_rgba(0,0,0,0.42)] dark:focus-visible:ring-offset-[#07131c] print:hidden lg:bottom-4 lg:left-[106px]"
    >
      {darkPreview ? (
        <Sun className="h-4 w-4 text-amber-400" aria-hidden />
      ) : (
        <Moon className="h-4 w-4 text-[#008ad2]" aria-hidden />
      )}
      <span>{darkPreview ? "Dark preview: On" : "Dark preview: Off"}</span>
      <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-700 dark:bg-[#0b3033] dark:text-[#67e8f9]">
        Local only
      </span>
    </button>
  );
}

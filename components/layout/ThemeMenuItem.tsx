"use client";

import { Moon } from "lucide-react";
import { setTheme, useIsDarkTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// The light or dark switch in the account menus (desktop card and mobile header). It does not
// close the menu, so the member sees the theme change behind it.
export default function ThemeMenuItem({ className }: { className: string }) {
  const dark = useIsDarkTheme();
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={className}
    >
      <Moon size={16} aria-hidden />
      <span className="flex-1 text-left">Dark mode</span>
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          dark ? "bg-primary" : "bg-slate-300 dark:bg-slate-600",
        )}
      >
        <span
          className={cn(
            // `left-0` anchors the knob: a button's UA `text-align: center` otherwise puts the
            // static position mid-track, pushing the knob 18px right and off the end when on.
            // `bg-[#ffffff]` keeps it white: globals.css repaints `.dark .bg-white` as #0d1d28,
            // which made the knob vanish into the blue track in dark mode.
            "absolute left-0 top-0.5 h-4 w-4 rounded-full bg-[#ffffff] shadow transition-transform",
            dark ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

"use client";
import { ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const TopHeader = () => {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration guard: date/time text must be initialized on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime
    ? currentTime.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  const greeting = () => {
    if (!currentTime) return "Welcome back";
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="relative">
      {/* Ambient glow behind header */}
      <div className="absolute -inset-4 bg-gradient-to-r from-[#008ad2]/5 via-[#0ea5e9]/3 to-[#2563eb]/5 rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative flex items-center justify-between">
        {/* Left: Title block */}
        <div className="flex flex-col gap-1">
          {/* Pill badge */}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-[#008ad2] mb-1">
            <Sparkles size={10} className="fill-[#008ad2]" />
            Overview
          </span>

          <h1 className="text-[30px] font-black tracking-tight leading-none">
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
              Settings
            </span>
          </h1>

          <p className="mt-1 text-[13px] text-slate-400 font-medium flex items-center gap-2 min-h-[20px]">
            {mounted && (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {greeting()}
                {formattedDate ? ` · ${formattedDate}` : ""}
              </>
            )}
            {!mounted && <span className="opacity-0">Loading date...</span>}
          </p>
        </div>
        {/* ORG-303/304/305 security settings */}
        <Link
          href="/settings/security"
          className="inline-flex items-center gap-2 rounded-md border border-[#e4e4e4] bg-white px-4 py-2 text-[13px] font-semibold text-[#222628] transition hover:border-[#008ad2] hover:text-[#008ad2]"
        >
          <ShieldCheck size={15} />
          Security
        </Link>
      </div>
    </div>
  );
};

export default TopHeader;

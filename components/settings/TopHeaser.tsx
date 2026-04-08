"use client";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const TopHeader = () => {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
      <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative flex items-center justify-between">
        {/* Left: Title block */}
        <div className="flex flex-col gap-1">
          {/* Pill badge */}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-cyan-500 mb-1">
            <Sparkles size={10} className="fill-cyan-400" />
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
      </div>
    </div>
  );
};

export default TopHeader;

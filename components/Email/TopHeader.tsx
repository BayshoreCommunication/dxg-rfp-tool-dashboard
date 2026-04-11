"use client";
import { Plus, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
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

      <div className="relative flex items-center justify-between px-6">
        {/* Left: Title block */}
        <div className="flex flex-col gap-1">
          {/* Pill badge */}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-cyan-500 mb-1">
            <Sparkles size={10} className="fill-cyan-400" />
            Overview
          </span>

          <h1 className="text-[30px] font-black tracking-tight leading-none">
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
              Email Templates & Reminders
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

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          {/* <Link
            href={"/settings"}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:shadow-md transition-all duration-200 group"
          >
            <Settings2
              size={18}
              className="group-hover:scale-110 transition-transform duration-200"
            />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />
          </Link> */}

          {/* CTA Button */}
          <Link
            href="/email/send-email"
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-[13px] font-bold uppercase tracking-widest text-white shadow-[0_4px_24px_rgba(45,198,245,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(45,198,245,0.55)] active:translate-y-0 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 50%, #6366f1 100%)",
            }}
          >
            {/* Shine sweep */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
            <Plus size={15} strokeWidth={3} className="shrink-0" />
            Email Send
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TopHeader;

import { ArrowDown } from "lucide-react";

export default function JumpToLatest({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-4 left-1/2 z-10 inline-flex min-h-10 -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-lg transition hover:border-[#00c2c9]/40 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
    >
      <ArrowDown size={14} aria-hidden />
      Jump to latest
    </button>
  );
}

import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TypingIndicator({
  label = "Assistant is responding",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-slate-500 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.55)]",
        className,
      )}
    >
      <Ellipsis
        aria-hidden
        size={22}
        strokeWidth={2.25}
        className="text-[#00aeb5] motion-safe:animate-pulse"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

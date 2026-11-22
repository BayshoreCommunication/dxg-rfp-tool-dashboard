import { cn } from "@/lib/utils";

// Loading placeholder. Hidden from assistive tech: the region that is loading should carry
// aria-busy or a status message instead. The pulse stops under prefers-reduced-motion.
export type SkeletonProps = { className?: string; lines?: number };

export default function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <div
          key={index}
          className={cn("h-4 animate-pulse rounded-control bg-line motion-reduce:animate-none", index === lines - 1 && lines > 1 && "w-3/4", className)}
        />
      ))}
    </div>
  );
}

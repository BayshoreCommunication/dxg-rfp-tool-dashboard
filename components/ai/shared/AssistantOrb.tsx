import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AssistantOrb({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative shrink-0 motion-safe:animate-[assistant-float_5s_ease-in-out_infinite]",
        compact ? "h-12 w-12" : "h-36 w-36 sm:h-44 sm:w-44",
        className,
      )}
    >
      <Image
        src="/assets/ai-assistant/orb-soft-v2.png"
        alt=""
        fill
        priority={!compact}
        sizes={compact ? "48px" : "(min-width: 640px) 176px, 144px"}
        className="object-contain"
      />
    </div>
  );
}

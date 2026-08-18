import {
  intelligenceStatusPresentation,
  type IntelligenceStatus,
} from "@/lib/proposalIntelligence/statusVocabulary";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function IntelligenceStatusChip({
  status,
  label,
  className,
  children,
}: {
  status: IntelligenceStatus;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const presentation = intelligenceStatusPresentation[status];
  return (
    <span
      data-intelligence-status={status}
      className={cn(
        intelligenceSurfaceClasses.chip,
        presentation.className,
        className,
      )}
    >
      {children ?? label ?? presentation.label}
    </span>
  );
}

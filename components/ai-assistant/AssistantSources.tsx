import { BookOpen, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import type { AssistantCitation } from "@/lib/aiAssistant/types";
import { trackAssistantProductEvent } from "@/lib/aiAssistant/analytics";

export const safeAssistantHref = (href: string | undefined): string | null => {
  if (!href) return null;
  if (
    href.startsWith("/") &&
    !href.startsWith("//") &&
    !href.includes("\\")
  ) {
    return href;
  }
  try {
    const parsed = new URL(href);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
};

export default function AssistantSources({
  citations,
  threadId,
  messageId,
  compact = false,
  onNavigate,
}: {
  citations: AssistantCitation[];
  threadId: string;
  messageId: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  if (citations.length === 0) return null;
  return (
    <div
      className={
        compact
          ? "mt-3 min-w-0 max-w-full overflow-hidden border-t border-slate-100 pt-2.5"
          : "mt-2.5 min-w-0 max-w-full overflow-hidden border-t border-slate-100 pt-2.5"
      }
    >
      <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
        <BookOpen size={11} aria-hidden />
        Sources
      </p>
      <ul
        className={
          compact
            ? "mt-1.5 grid min-w-0 max-w-full gap-1.5"
            : "mt-1.5 flex min-w-0 max-w-full flex-wrap gap-1"
        }
      >
        {citations.map((citation) => {
          const href = safeAssistantHref(citation.href);
          const content = (
            <>
              {compact && (
                <FileText
                  size={11}
                  aria-hidden
                  className="shrink-0 text-slate-500"
                />
              )}
              <span
                className={
                  compact
                    ? "min-w-0 flex-1 truncate"
                    : "max-w-[13rem] truncate"
                }
              >
                {citation.title}
              </span>
              {href?.startsWith("https://") && (
                <ExternalLink size={10} aria-hidden className="shrink-0" />
              )}
            </>
          );
          const opened = () => {
            void trackAssistantProductEvent({
              eventType: "citation_opened",
              threadId,
              messageId,
            });
            if (href?.startsWith("/")) onNavigate?.();
          };
          return (
            <li
              key={`${citation.sourceId}:${citation.fragmentId || ""}`}
              className="min-w-0 max-w-full overflow-hidden"
            >
              {href ? (
                href.startsWith("/") ? (
                  <Link
                    href={href}
                    onClick={opened}
                    className={
                      compact
                        ? "flex min-h-7 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[9.5px] font-medium leading-4 text-slate-600 transition-colors hover:border-[#00c2c9]/40 hover:bg-[#e0f9fa]/60 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                        : "inline-flex min-h-7 min-w-0 max-w-full items-center gap-1 overflow-hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold leading-4 text-slate-600 transition-colors hover:border-[#00c2c9]/40 hover:bg-[#e0f9fa]/60 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                    }
                  >
                    {content}
                  </Link>
                ) : (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={opened}
                    className={
                      compact
                        ? "flex min-h-7 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[9.5px] font-medium leading-4 text-slate-600 transition-colors hover:border-[#00c2c9]/40 hover:bg-[#e0f9fa]/60 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                        : "inline-flex min-h-7 min-w-0 max-w-full items-center gap-1 overflow-hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold leading-4 text-slate-600 transition-colors hover:border-[#00c2c9]/40 hover:bg-[#e0f9fa]/60 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                    }
                  >
                    {content}
                  </a>
                )
              ) : (
                <span
                  className={
                    compact
                      ? "flex min-h-7 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[9.5px] font-medium leading-4 text-slate-500"
                      : "inline-flex min-w-0 max-w-full items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold leading-4 text-slate-500"
                  }
                >
                  {compact && (
                    <FileText
                      size={11}
                      aria-hidden
                      className="shrink-0 text-slate-500"
                    />
                  )}
                  <span className={compact ? "min-w-0 flex-1 truncate" : "max-w-[13rem] truncate"}>
                    {citation.title}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

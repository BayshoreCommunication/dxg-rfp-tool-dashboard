import { BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { AssistantCitation } from "@/lib/aiAssistant/types";

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
}: {
  citations: AssistantCitation[];
}) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        <BookOpen size={12} aria-hidden />
        Sources
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {citations.map((citation) => {
          const href = safeAssistantHref(citation.href);
          const content = (
            <>
              <span className="max-w-[13rem] truncate">{citation.title}</span>
              {href?.startsWith("https://") && (
                <ExternalLink size={10} aria-hidden />
              )}
            </>
          );
          return (
            <li key={`${citation.sourceId}:${citation.fragmentId || ""}`}>
              {href ? (
                href.startsWith("/") ? (
                  <Link
                    href={href}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[#00c2c9]/40 hover:bg-[#e0f9fa]/60 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                  >
                    {content}
                  </Link>
                ) : (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[#00c2c9]/40 hover:bg-[#e0f9fa]/60 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                  >
                    {content}
                  </a>
                )
              ) : (
                <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  <span className="max-w-[13rem] truncate">
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

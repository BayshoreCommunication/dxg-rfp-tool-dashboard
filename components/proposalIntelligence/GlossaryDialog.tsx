"use client";

import { searchGlossary, glossaryTermCount } from "@/lib/proposalIntelligence/glossary";
import { BookOpen, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * A searchable definition list for the words these screens use, opened from any
 * page in Proposal Intelligence. Until now none of these terms were defined
 * anywhere in the product.
 */
export default function GlossaryDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => searchGlossary(query), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    dialog.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-800 hover:border-[#008ad2] hover:text-[#008ad2]"
      >
        <BookOpen size={15} aria-hidden="true" />
        What do these words mean?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 sm:p-8">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="glossary-title"
            tabIndex={-1}
            className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl focus-visible:outline-none"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h2 id="glossary-title" className="text-lg font-extrabold text-slate-950">
                  What the words mean
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Plain definitions for the {glossaryTermCount} terms used across
                  vendor responses and Proposal Intelligence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close glossary"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-slate-200 p-4">
              <label className="relative block">
                <span className="sr-only">Search the glossary</span>
                <Search
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for a word…"
                  className="min-h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm"
                />
              </label>
            </div>

            <div className="overflow-y-auto p-5">
              {groups.length ? (
                <div className="flex flex-col gap-6">
                  {groups.map((group) => (
                    <section key={group.heading}>
                      <h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                        {group.heading}
                      </h3>
                      <dl className="mt-2 flex flex-col gap-3">
                        {group.entries.map((entry) => (
                          <div key={entry.term}>
                            <dt className="text-sm font-extrabold text-slate-900">
                              {entry.term}
                              {entry.aliases?.length ? (
                                <span className="ml-2 font-semibold text-slate-400">
                                  also called {entry.aliases.join(", ")}
                                </span>
                              ) : null}
                            </dt>
                            <dd className="mt-0.5 text-sm leading-6 text-slate-600">
                              {entry.definition}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Nothing matches &ldquo;{query}&rdquo;. Try a word you saw on the
                  screen.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

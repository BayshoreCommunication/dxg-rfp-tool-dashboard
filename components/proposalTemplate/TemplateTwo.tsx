"use client";

import type { TemplateOneData } from "./TemplateOne";

type TemplateTwoProps = {
  data?: Partial<TemplateOneData>;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  showPrimaryAction?: boolean;
  isPrimaryLoading?: boolean;
  isSecondaryLoading?: boolean;
  isPrimaryDisabled?: boolean;
  fontFamily?: "Inter" | "Poppins" | "Roboto";
};

export default function TemplateTwo({
  data,
  onPrimaryAction,
  onSecondaryAction,
  showPrimaryAction = true,
  isPrimaryLoading = false,
  isSecondaryLoading = false,
  isPrimaryDisabled = false,
  fontFamily = "Poppins",
}: TemplateTwoProps) {
  return (
    <div
      className="proposal-print-root min-h-screen bg-slate-50 text-slate-900"
      style={{ fontFamily: `"${fontFamily}", var(--font-sans)` }}
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 no-print">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-xl">
          {showPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={isPrimaryDisabled || isPrimaryLoading}
              className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {isPrimaryLoading
                ? "Accepting..."
                : data?.ctaPrimary || "Accept Proposal"}
            </button>
          )}
          <button
            type="button"
            onClick={onSecondaryAction}
            disabled={isSecondaryLoading}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-800 disabled:opacity-60"
          >
            {isSecondaryLoading
              ? "Generating PDF..."
              : data?.ctaSecondary || "Download PDF"}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">
            {data?.badge || "Proposal"}
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">
            {data?.titleLineOne || "Event"}{" "}
            <span className="text-cyan-600">{data?.titleLineTwo || "Proposal"}</span>
          </h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            {data?.heroText ||
              "A tailored proposal based on your submitted event scope and production requirements."}
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-black text-slate-900">
              {data?.servicesTitle || "Scope & Requirements"}
            </h2>
            <div className="mt-4 space-y-3">
              {(data?.services || []).map((service, idx) => (
                <div key={`${service.title}-${idx}`} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-900">{service.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{service.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              {data?.pricingTitle || "Budget"}
            </h2>
            <div className="mt-4 space-y-3">
              {(data?.pricing || []).map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-cyan-700">{item.price}</p>
                  {item.bullets.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                      {item.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Room-by-Room Snapshot</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {(data?.avGroups || [])
              .flatMap((g) => g.items)
              .slice(0, 8)
              .map((item, idx) => (
                <div key={`${item.label}-${idx}`} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Contact</h2>
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-bold text-slate-900">{data?.contactName || "Contact"}</span>
            {data?.closingSubtitle ? ` - ${data.closingSubtitle}` : ""}
          </p>
          {data?.brandEmail && (
            <p className="mt-1 text-sm text-slate-600">Email: {data.brandEmail}</p>
          )}
          {data?.contactPhone && (
            <p className="mt-1 text-sm text-slate-600">Phone: {data.contactPhone}</p>
          )}
          {data?.additionalNotes && (
            <p className="mt-4 text-sm text-slate-600">{data.additionalNotes}</p>
          )}
        </section>
      </main>
    </div>
  );
}

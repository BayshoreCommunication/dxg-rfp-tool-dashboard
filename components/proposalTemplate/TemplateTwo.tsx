"use client";

import type { TemplateOneData } from "./TemplateOne";

type TemplateTwoProps = {
  data?: Partial<TemplateOneData>;
  proposalLanguage?: string;
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
  proposalLanguage = "English",
  onPrimaryAction,
  onSecondaryAction,
  showPrimaryAction = true,
  isPrimaryLoading = false,
  isSecondaryLoading = false,
  isPrimaryDisabled = false,
  fontFamily = "Poppins",
}: TemplateTwoProps) {
  const languageKey = proposalLanguage.trim().toLowerCase();
  const t = (english: string, spanish: string, french = english) =>
    languageKey === "spanish"
      ? spanish
      : languageKey === "french"
        ? french
        : english;

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
                ? t("Accepting...", "Aceptando...", "Acceptation...")
                : data?.ctaPrimary ||
                  t("Accept Proposal", "Aceptar propuesta", "Accepter la proposition")}
            </button>
          )}
          <button
            type="button"
            onClick={onSecondaryAction}
            disabled={isSecondaryLoading}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-800 disabled:opacity-60"
          >
            {isSecondaryLoading
              ? t("Generating PDF...", "Generando PDF...", "Generation du PDF...")
              : data?.ctaSecondary ||
                t("Download PDF", "Descargar PDF", "Telecharger le PDF")}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">
            {data?.badge || t("Proposal", "Propuesta", "Proposition")}
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">
            {data?.titleLineOne || t("Event", "Evento", "Evenement")}{" "}
            <span className="text-cyan-600">
              {data?.titleLineTwo || t("Proposal", "Propuesta", "Proposition")}
            </span>
          </h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            {data?.heroText ||
              t(
                "A tailored proposal based on your submitted event scope and production requirements.",
                "Una propuesta personalizada basada en el alcance y requisitos de produccion enviados.",
                "Une proposition adaptee selon la portee de votre evenement et vos besoins de production.",
              )}
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-black text-slate-900">
              {data?.servicesTitle ||
                t("Scope & Requirements", "Alcance y requisitos", "Portee et exigences")}
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
              {data?.pricingTitle || t("Budget", "Presupuesto", "Budget")}
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
          <h2 className="text-lg font-black text-slate-900">
            {t(
              "Room-by-Room Snapshot",
              "Resumen sala por sala",
              "Apercu salle par salle",
            )}
          </h2>
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
          <h2 className="text-lg font-black text-slate-900">
            {t("Contact", "Contacto", "Contact")}
          </h2>
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-bold text-slate-900">
              {data?.contactName || t("Contact", "Contacto", "Contact")}
            </span>
            {data?.closingSubtitle ? ` - ${data.closingSubtitle}` : ""}
          </p>
          {data?.brandEmail && (
            <p className="mt-1 text-sm text-slate-600">
              {t("Email", "Correo", "Email")}: {data.brandEmail}
            </p>
          )}
          {data?.contactPhone && (
            <p className="mt-1 text-sm text-slate-600">
              {t("Phone", "Telefono", "Telephone")}: {data.contactPhone}
            </p>
          )}
          {data?.additionalNotes && (
            <p className="mt-4 text-sm text-slate-600">{data.additionalNotes}</p>
          )}
        </section>
      </main>
    </div>
  );
}

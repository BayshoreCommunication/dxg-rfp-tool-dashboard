"use client";

import type { VendorSubmissionVersion } from "@/app/actions/vendorResponse";
import { fileTypeLabel } from "@/lib/proposalIntelligence/plainLanguage";
import { ExternalLink, File, FileImage, FileSpreadsheet, FileText, Presentation, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { displayFileName, documentKind, extensionOf, formatFileSize, type FileKind } from "@/lib/vendorResponses/documentFiles";

export { displayFileName, documentKind, formatFileSize };

type VersionDocuments = VendorSubmissionVersion["documents"];
type VersionDocument = VersionDocuments[number];

export type ResponseDocumentContext = {
  purposeLabel: (purposeId: string | null | undefined) => string;
  scopeLabel: (document: VersionDocument) => string;
};

const KIND_STYLE: Record<FileKind, { tile: string; icon: typeof File }> = {
  image: { tile: "bg-sky-50 text-sky-700 ring-sky-100", icon: FileImage },
  pdf: { tile: "bg-rose-50 text-rose-600 ring-rose-100", icon: FileText },
  word: { tile: "bg-blue-50 text-blue-700 ring-blue-100", icon: FileText },
  sheet: { tile: "bg-emerald-50 text-emerald-700 ring-emerald-100", icon: FileSpreadsheet },
  slides: { tile: "bg-orange-50 text-orange-600 ring-orange-100", icon: Presentation },
  other: { tile: "bg-slate-100 text-slate-600 ring-slate-200", icon: File },
};

function FileTile({ document }: { document: VersionDocument }) {
  const kind = documentKind(document.mimeType, document.name);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const style = KIND_STYLE[kind];
  const Icon = style.icon;
  if (kind === "image" && document.url && !thumbnailFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs are not known to next/image
      <img
        src={document.url}
        alt=""
        loading="lazy"
        onError={() => setThumbnailFailed(true)}
        className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
      />
    );
  }
  const extension = extensionOf(document.name).toUpperCase();
  return (
    <span aria-hidden="true" className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1 ${style.tile}`}>
      <Icon size={20} strokeWidth={1.8} />
      {extension && extension.length <= 4 ? (
        <span className="absolute -bottom-1.5 rounded bg-white px-1 text-[8px] font-extrabold leading-3 tracking-wide ring-1 ring-current/20">
          {extension}
        </span>
      ) : null}
    </span>
  );
}

const SCAN: Record<NonNullable<VersionDocument["scanStatus"]>, { label: string; className: string; safe: boolean }> = {
  clean: { label: "Scanned · clean", className: "border-emerald-200 bg-emerald-50 text-emerald-700", safe: true },
  skipped: { label: "Not scanned", className: "border-amber-200 bg-amber-50 text-amber-800", safe: false },
  legacy_unknown: { label: "Scan unknown", className: "border-slate-200 bg-slate-50 text-slate-600", safe: false },
};

const DISPOSITION: Record<NonNullable<VersionDocument["versionDisposition"]>, string> = {
  added: "New in this version",
  inherited: "Carried over",
  legacy: "Legacy upload",
};

export default function ResponseDocumentList({
  documents,
  context,
}: {
  documents: VersionDocuments;
  context: ResponseDocumentContext;
}) {
  if (!documents.length) {
    return <p className="mt-3 text-sm text-slate-500">No documents attached.</p>;
  }
  // Required category documents (insurance, policies) read best together,
  // with loose "other" uploads after them.
  const rows = [...documents].sort((a, b) =>
    context.purposeLabel(a.purposeId).localeCompare(context.purposeLabel(b.purposeId)),
  );
  return (
    <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200" data-testid="response-documents">
      {rows.map((document) => {
        const name = displayFileName(document.name);
        const scan = SCAN[document.scanStatus ?? "legacy_unknown"];
        const ScanIcon = scan.safe ? ShieldCheck : ShieldAlert;
        const meta = [fileTypeLabel(document.mimeType, document.name), formatFileSize(document.sizeBytes)].filter(Boolean).join(" · ");
        return (
          <li
            key={document.documentId ?? document.name}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4 md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] print:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto]"
          >
            <FileTile document={document} />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-extrabold text-slate-900 [overflow-wrap:anywhere] md:line-clamp-1" title={document.name}>{name}</p>
              <p className="mt-0.5 text-xs text-slate-500 md:truncate">{meta}</p>
            </div>
            <div className="col-span-3 min-w-0 pl-14 md:col-span-1 md:pl-0 print:col-span-1 print:pl-0">
              <p className="truncate text-xs font-bold text-slate-700">{context.purposeLabel(document.purposeId)}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {context.scopeLabel(document)}
                {document.versionDisposition ? ` · ${DISPOSITION[document.versionDisposition]}` : ""}
              </p>
            </div>
            <span className={`col-span-2 col-start-2 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold md:col-span-1 md:col-start-auto print:col-span-1 print:col-start-auto ${scan.className}`}>
              <ScanIcon size={12} aria-hidden="true" />
              {scan.label}
            </span>
            {document.url ? (
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${name}`}
                className="col-start-3 row-start-1 inline-flex min-h-9 items-center gap-1.5 justify-self-end rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-[#0075b4] hover:border-[#218ccb] hover:bg-sky-50 md:col-start-auto md:row-start-auto print:hidden"
              >
                Open <ExternalLink size={13} aria-hidden="true" />
              </a>
            ) : (
              <span className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto print:hidden" />
            )}
          </li>
        );
      })}
    </ul>
  );
}

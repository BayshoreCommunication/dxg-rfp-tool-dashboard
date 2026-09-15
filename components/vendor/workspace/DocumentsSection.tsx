import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import type { VendorDraftDocumentDto } from "@/lib/vendorResponses/workspaceModel";
import {
  FileCheck2,
  FilePlus2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { RetireDocument, UploadDocuments } from "./documentTypes";
import WorkspaceSection from "./WorkspaceSection";

const bytesLabel = (value: number) =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} MB`
    : `${Math.max(1, Math.round(value / 1000))} KB`;
const mimeLabel = (value: string) =>
  ({
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "DOCX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "image/jpeg": "JPG",
    "image/png": "PNG",
  })[value] ?? value;
const MAX_FILES_PER_UPLOAD = 10;
const TRANSPORT_MAX_FILE_BYTES = 10_000_000;

export default function DocumentsSection({
  questionnaire,
  response,
  manifest,
  retiredDocuments,
  onUpload,
  onRetire,
  sectionNumber,
  disabled,
  canUpload,
}: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  manifest: VendorDraftDocumentDto[];
  retiredDocuments: Array<VendorDraftDocumentDto & { replaced?: boolean }>;
  onUpload: UploadDocuments;
  onRetire: RetireDocument;
  sectionNumber: number;
  disabled: boolean;
  canUpload: boolean;
}) {
  const section = questionnaire.sections.find(
    (entry) => entry.sectionId === "documents",
  );
  const [pending, setPending] = useState<Record<string, File[]>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const activeIds = new Set(
    response.documents.map((document) => document.documentId),
  );
  const activeManifest = manifest.filter((document) =>
    activeIds.has(document.documentId),
  );

  const upload = async (purposeId: string) => {
    const files = pending[purposeId] ?? [];
    if (!files.length) return;
    setBusy(`upload:${purposeId}`);
    setError("");
    const result = await onUpload({ purposeId, scopeType: "proposal", files });
    if (result.ok) setPending((current) => ({ ...current, [purposeId]: [] }));
    else setError(result.message);
    setBusy("");
  };

  const retire = async (
    document: VendorDraftDocumentDto,
    replacement = false,
  ) => {
    setBusy(`retire:${document.documentId}`);
    setError("");
    const ok = await onRetire(document, replacement);
    if (!ok)
      setError(
        "The attachment could not be updated. Your current files are unchanged; try again.",
      );
    setBusy("");
  };

  const selectFiles = (
    purposeId: string,
    fileList: FileList | null,
    maximumFileBytes: number,
    remaining: number,
  ) => {
    const maximumBytes = Math.min(maximumFileBytes, TRANSPORT_MAX_FILE_BYTES);
    const candidates = Array.from(fileList ?? []).slice(
      0,
      Math.min(MAX_FILES_PER_UPLOAD, Math.max(0, remaining)),
    );
    const tooLarge = candidates.find((file) => file.size > maximumBytes);
    if (tooLarge) {
      setError(
        `${tooLarge.name} exceeds the ${bytesLabel(maximumBytes)} file limit.`,
      );
      setPending((current) => ({
        ...current,
        [purposeId]: candidates.filter((file) => file.size <= maximumBytes),
      }));
      return;
    }
    setError("");
    setPending((current) => ({ ...current, [purposeId]: candidates }));
  };

  return (
    <WorkspaceSection
      number={sectionNumber}
      title={section?.title ?? "Document uploads"}
      helperText={
        section?.helperText ??
        "Upload files by the client-defined category. Files are private, scanned, and attached to this response version."
      }
      evaluationMappings={section?.evaluationMappings}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-[#d8ebf5] bg-[#eef8fd] p-4">
        <ShieldCheck size={21} className="text-[#008ad2]" aria-hidden="true" />
        <div>
          <p className="text-sm font-extrabold text-[#16283c]">
            Private and scan-checked
          </p>
          <p className="text-xs text-[#607487]">
            {activeManifest.length} of{" "}
            {questionnaire.documents.globalMaximumFiles} total files uploaded.
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {questionnaire.documents.categories.map((category) => {
          const documents = activeManifest.filter(
            (document) => document.purposeId === category.purposeId,
          );
          const files = pending[category.purposeId] ?? [];
          const remaining = Math.min(
            category.maximumFiles - documents.length,
            questionnaire.documents.globalMaximumFiles - activeManifest.length,
          );
          return (
            <section
              key={category.purposeId}
              className="rounded-md border border-[#dce4eb] p-4 sm:p-5"
              aria-labelledby={`document-category-${category.purposeId}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2
                    id={`document-category-${category.purposeId}`}
                    className="font-extrabold text-[#16283c]"
                  >
                    {category.label}{" "}
                    {category.required ? (
                      <span className="text-rose-600">*</span>
                    ) : null}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#607487]">
                    {category.helperText ??
                      `${category.minimumFiles}–${category.maximumFiles} files · ${category.allowedMimeTypes.map(mimeLabel).join(", ")} · ${bytesLabel(Math.min(category.maximumFileBytes, TRANSPORT_MAX_FILE_BYTES))} each · up to ${MAX_FILES_PER_UPLOAD} per upload`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-extrabold ${documents.length >= category.minimumFiles ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                >
                  {documents.length}/{category.maximumFiles}
                </span>
              </div>
              {documents.length ? (
                <ul className="mt-4 divide-y divide-[#e6ebef] rounded-md border border-[#dce4eb]">
                  {documents.map((document) => (
                    <li
                      key={document.documentId}
                      className="flex flex-wrap items-center gap-3 p-3"
                    >
                      <FileCheck2
                        size={18}
                        className="shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-[#16283c]">
                          {document.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#718496]">
                          {bytesLabel(document.sizeBytes)} ·{" "}
                          {mimeLabel(document.mimeType)} ·{" "}
                          {document.scanStatus === "clean"
                            ? "Scan passed"
                            : "Scan accepted"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${document.disposition === "inherited" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}
                      >
                        {document.disposition}
                      </span>
                      {document.disposition === "inherited" ? (
                        <button
                          type="button"
                          disabled={disabled || Boolean(busy)}
                          className="rounded-md px-2 py-1.5 text-xs font-extrabold text-[#0075b4] hover:bg-[#eef8fd] disabled:opacity-50"
                          onClick={() => void retire(document, true)}
                        >
                          <RefreshCw
                            size={13}
                            className="mr-1 inline"
                            aria-hidden="true"
                          />
                          Replace
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={disabled || Boolean(busy)}
                        aria-label={`Remove ${document.name}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-[#718496] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        onClick={() => void retire(document)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block text-xs font-bold text-[#42576a]">
                  Select files
                  <input
                    className="mt-1.5 block w-full rounded-md border border-[#ccd8e2] bg-white px-3 py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-[#eef8fd] file:px-3 file:py-1 file:font-extrabold file:text-[#0075b4] disabled:bg-[#f4f7f9]"
                    type="file"
                    multiple
                    accept={category.allowedMimeTypes.join(",")}
                    disabled={
                      disabled || !canUpload || remaining <= 0 || Boolean(busy)
                    }
                    onChange={(event) =>
                      selectFiles(
                        category.purposeId,
                        event.target.files,
                        category.maximumFileBytes,
                        remaining,
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    disabled || !canUpload || !files.length || Boolean(busy)
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#008ad2] px-4 text-sm font-extrabold text-white hover:bg-[#0075b4] disabled:bg-[#d4dce3] disabled:text-[#8394a3]"
                  onClick={() => void upload(category.purposeId)}
                >
                  <FilePlus2 size={15} aria-hidden="true" />
                  {busy === `upload:${category.purposeId}`
                    ? "Uploading…"
                    : `Upload${files.length ? ` ${files.length}` : ""}`}
                </button>
              </div>
              {!canUpload ? (
                <p className="mt-2 text-xs font-bold text-amber-700">
                  Wait for your latest form changes to save before uploading.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
      {retiredDocuments.length ? (
        <details className="mt-5 rounded-md border border-[#dce4eb] bg-[#f8fafb] p-4">
          <summary className="cursor-pointer text-sm font-extrabold text-[#42576a]">
            Retired in this revision ({retiredDocuments.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {retiredDocuments.map((document) => (
              <li
                className="flex items-center justify-between gap-3 text-xs text-[#607487]"
                key={document.documentId}
              >
                <span className="truncate">{document.name}</span>
                <span className="rounded-full bg-[#edf1f4] px-2 py-1 font-extrabold uppercase tracking-[0.08em]">
                  {document.replaced ? "replaced" : "retired"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </WorkspaceSection>
  );
}

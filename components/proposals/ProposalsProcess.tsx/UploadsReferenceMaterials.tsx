"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  File as FileIcon,
  FileText,
  Loader2,
  Palette,
  PlusCircle,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import GlobalSelect from "@/components/shared/GlobalSelect";
import type {
  CoVendorEntry,
  ProposalSettings,
  ReferenceUrl,
  UploadsData,
} from "../AddNewProposal";
import { InfoTooltip, RadioIndicator } from "./shared";
import { uploadProposalFiles } from "@/lib/proposals/uploadProposalFiles";

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#222628] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20";
const groupLabelClass = "mb-4 text-xs font-bold uppercase tracking-widest text-[#969798]";
const subPanelClass = "mt-3 rounded-xl border border-[#eeeeee] bg-[#f9f9f9] p-4";
const errorClass = "mt-1 text-sm text-red-500 normal-case";

/* ─── Yes/No ─── */
const yesNoCls = (opt: "YES" | "NO", val: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (val !== opt)
    return `${base} border-[#e4e4e4] bg-white text-[#969798] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

const YesNo = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "YES" | "NO") => void;
}) => (
  <div className="flex gap-3">
    <button type="button" className={yesNoCls("YES", value)} onClick={() => onChange("YES")}>
      ✓ Yes
    </button>
    <button type="button" className={yesNoCls("NO", value)} onClick={() => onChange("NO")}>
      ✗ No
    </button>
  </div>
);

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#f0f0f0] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

/* ─── Upload Box ─── */
type PendingUpload = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
  remoteUrl?: string;
  retryable: boolean;
};

const getUploadedFileName = (url: string) => {
  const fallback = url.split("/").pop() || url;
  try {
    return decodeURIComponent(fallback.split("?")[0]);
  } catch {
    return fallback.split("?")[0];
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isAcceptedFile = (file: File, accept: string) => {
  const rules = accept.split(",").map((rule) => rule.trim().toLowerCase());
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
};

export const UploadBox = ({
  files,
  onFiles,
  accept = ".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg",
  hint = "Accepts PDFs, PowerPoint, Docs, Images",
  maxFiles,
  maxSizeMb = 50,
  uploadField = "supportDocuments",
}: {
  files: string[];
  onFiles: (files: string[]) => void;
  accept?: string;
  hint?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  uploadField?: "supportDocuments" | "avQuoteFiles" | "scenicInspirationFiles" | "venueCoiFiles";
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const getUrls = (res: Awaited<ReturnType<typeof uploadProposalFiles>>) =>
    uploadField === "supportDocuments"
      ? res.supportDocumentUrls
      : uploadField === "avQuoteFiles"
        ? res.avQuoteFileUrls
        : uploadField === "scenicInspirationFiles"
          ? res.scenicInspirationFileUrls
          : res.venueCoiFileUrls;

  const updatePending = (id: string, updates: Partial<PendingUpload>) =>
    setPending((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );

  const uploadOne = async (item: PendingUpload) => {
    updatePending(item.id, { status: "uploading", error: undefined });
    const fd = new FormData();
    fd.append(uploadField, item.file);
    try {
      const res = await uploadProposalFiles(fd);
      const uploadedUrl = getUrls(res)[0];
      if (!res.success || !uploadedUrl) {
        updatePending(item.id, {
          status: "error",
          error: res.message || "Upload failed. Check your connection and try again.",
          retryable: true,
        });
        return;
      }
      const nextFiles = [...filesRef.current, uploadedUrl];
      filesRef.current = nextFiles;
      onFiles(nextFiles);
      updatePending(item.id, { status: "success", remoteUrl: uploadedUrl, retryable: false });
    } catch {
      updatePending(item.id, {
        status: "error",
        error: "Could not upload this file. Check your connection and try again.",
        retryable: true,
      });
    }
  };

  const addFiles = async (selected: File[]) => {
    const activeCount = pending.filter((item) =>
      item.status === "queued" || item.status === "uploading",
    ).length;
    let remaining = maxFiles === undefined ? Infinity : Math.max(0, maxFiles - files.length - activeCount);
    const items = selected.map<PendingUpload>((file) => {
      const id = `${file.name}-${file.lastModified}-${crypto.randomUUID()}`;
      if (remaining <= 0) {
        return {
          id,
          file,
          status: "error",
          error: `This upload accepts a maximum of ${maxFiles} ${maxFiles === 1 ? "file" : "files"}.`,
          retryable: false,
        };
      }
      if (!isAcceptedFile(file, accept)) {
        return {
          id,
          file,
          status: "error",
          error: "This file type is not supported. Choose one of the formats listed above.",
          retryable: false,
        };
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        return {
          id,
          file,
          status: "error",
          error: `This file is larger than ${maxSizeMb} MB. Choose a smaller file and try again.`,
          retryable: false,
        };
      }
      remaining -= 1;
      return { id, file, status: "queued", retryable: true };
    });

    setPending((current) => [...current, ...items]);
    for (const item of items) {
      if (item.status === "queued") await uploadOne(item);
    }
    if (ref.current) ref.current.value = "";
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) await addFiles(Array.from(event.target.files));
  };

  const removeUploaded = (url: string) => {
    const nextFiles = filesRef.current.filter((file) => file !== url);
    filesRef.current = nextFiles;
    onFiles(nextFiles);
    setPending((current) => current.filter((item) => item.remoteUrl !== url));
  };

  const uploadingCount = pending.filter((item) => item.status === "uploading").length;
  const queuedCount = pending.filter((item) => item.status === "queued").length;
  const finishedCount = pending.filter((item) =>
    item.status === "success" || item.status === "error",
  ).length;
  const batchCount = pending.length;
  const progress = batchCount ? Math.round((finishedCount / batchCount) * 100) : 0;
  const busy = uploadingCount > 0 || queuedCount > 0;
  const atMax = maxFiles !== undefined && files.length + queuedCount + uploadingCount >= maxFiles;
  const shadowedUrls = new Set(
    pending.filter((item) => item.status === "success").map((item) => item.remoteUrl),
  );
  const persistedFiles = files.filter((file) => !shadowedUrls.has(file));
  const hasFiles = persistedFiles.length > 0 || pending.length > 0;

  return (
    <div className="w-full">
      <div
        data-testid="file-dropzone"
        onDragEnter={(event) => {
          event.preventDefault();
          if (!atMax && !busy) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!atMax && !busy && event.dataTransfer.files.length) {
            void addFiles(Array.from(event.dataTransfer.files));
          }
        }}
        className={`flex min-h-[190px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-7 text-center transition-all ${
          isDragging
            ? "scale-[1.01] border-[#1DBFD3] bg-cyan-50 shadow-sm"
            : atMax
              ? "border-slate-200 bg-slate-50"
              : "border-sky-300 bg-sky-50/30 hover:border-[#1DBFD3] hover:bg-cyan-50/60"
        }`}
      >
        <input
          ref={ref}
          type="file"
          multiple={!maxFiles || maxFiles > 1}
          accept={accept}
          className="hidden"
          onChange={handleChange}
          disabled={busy || atMax}
        />
        <span className={`mb-3 grid h-12 w-12 place-items-center rounded-xl ${isDragging ? "bg-[#1DBFD3] text-white" : "bg-white text-[#109aaf] shadow-sm ring-1 ring-sky-100"}`}>
          {busy ? <Loader2 size={24} className="animate-spin" /> : <CloudUpload size={25} />}
        </span>
        <p className="text-sm font-bold text-[#222628]">
          {isDragging
            ? "Release files to upload"
            : atMax
              ? `Maximum of ${maxFiles} ${maxFiles === 1 ? "file" : "files"} reached`
              : busy
                ? "Uploading your files…"
                : "Drop files here or click to browse"}
        </p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{hint}</p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          Maximum {maxSizeMb} MB per file{maxFiles ? ` · ${maxFiles} ${maxFiles === 1 ? "file" : "files"} total` : ""}
        </p>
        {!atMax && (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1DBFD3] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#087f90] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/30 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
            {busy ? "Uploading…" : "Choose files"}
          </button>
        )}
      </div>

      {busy && batchCount > 0 && (
        <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2.5" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Uploading {finishedCount + 1} of {batchCount}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sky-100">
            <div className="h-full rounded-full bg-[#1DBFD3] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {hasFiles && (
        <div className="mt-3 space-y-2" aria-live="polite">
          {pending.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
                item.status === "error"
                  ? "border-rose-200 bg-rose-50/60"
                  : item.status === "success"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-sky-100 bg-white"
              }`}
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-100">
                <FileIcon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">{item.file.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                  {item.status === "uploading" && <><Loader2 size={13} className="animate-spin text-[#109aaf]" /><span className="text-[#087f90]">Uploading · {formatFileSize(item.file.size)}</span></>}
                  {item.status === "queued" && <span className="text-slate-500">Waiting to upload · {formatFileSize(item.file.size)}</span>}
                  {item.status === "success" && <><CheckCircle2 size={13} className="text-emerald-600" /><span className="font-medium text-emerald-700">Uploaded successfully · {formatFileSize(item.file.size)}</span></>}
                  {item.status === "error" && <><AlertCircle size={13} className="shrink-0 text-rose-600" /><span className="text-rose-700">{item.error}</span></>}
                </div>
              </div>
              {item.status === "error" && item.retryable && (
                <button type="button" onClick={() => void uploadOne(item)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#087f90] hover:bg-white" aria-label={`Retry ${item.file.name}`}>
                  <RotateCcw size={13} /> Retry
                </button>
              )}
              {item.status !== "uploading" && item.status !== "queued" && (
                <button
                  type="button"
                  onClick={() => item.remoteUrl ? removeUploaded(item.remoteUrl) : setPending((current) => current.filter((entry) => entry.id !== item.id))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600"
                  aria-label={`Remove ${item.file.name}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
          {persistedFiles.map((file) => (
            <div key={file} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><FileIcon size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">{getUploadedFileName(file)}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={13} /> Uploaded</p>
              </div>
              <button type="button" onClick={() => removeUploaded(file)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${getUploadedFileName(file)}`}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Co-vendor status option lists ─── */
const IN_HOUSE_AV_STATUSES = [
  { value: "confirmed", label: "Confirmed — In-house AV partner known" },
  { value: "in_discussion", label: "In Discussion — Confirming exclusivity terms" },
  { value: "tbd", label: "TBD — Not yet identified" },
  { value: "not_applicable", label: "Not Applicable — No in-house AV at this venue" },
];
const DECORATOR_STATUSES = [
  { value: "confirmed", label: "Confirmed" },
  { value: "in_discussion", label: "In Discussion" },
  { value: "tbd", label: "TBD" },
  { value: "av_vendor_handles", label: "AV Vendor Handles Scenic" },
  { value: "not_applicable", label: "Not Applicable" },
];
const BASE_STATUSES = [
  { value: "confirmed", label: "Confirmed" },
  { value: "in_discussion", label: "In Discussion" },
  { value: "tbd", label: "TBD" },
  { value: "not_applicable", label: "Not Applicable" },
];
const AGENCY_STATUSES = [
  { value: "confirmed", label: "Confirmed" },
  { value: "internal_team", label: "Internal Team — No external agency" },
  { value: "in_discussion", label: "In Discussion" },
  { value: "tbd", label: "TBD" },
  { value: "not_applicable", label: "Not Applicable" },
];
const PHOTOGRAPHER_STATUSES = [
  { value: "confirmed", label: "Confirmed" },
  { value: "in_discussion", label: "In Discussion" },
  { value: "tbd", label: "TBD" },
  { value: "client_handles", label: "Client Handles — No AV coordination needed" },
  { value: "not_applicable", label: "Not Applicable" },
];

/* ─── CoVendorCard ─── */
const CoVendorCard = ({
  icon,
  title,
  companyPlaceholder,
  contactPlaceholder,
  helpText,
  statuses,
  coordinationScope,
  value,
  onChange,
  open,
  onToggle,
  topBanner,
  advisory,
}: {
  icon: React.ReactNode;
  title: string;
  companyPlaceholder: string;
  contactPlaceholder: string;
  helpText: string;
  statuses: { value: string; label: string }[];
  coordinationScope: string;
  value: CoVendorEntry;
  onChange: (v: CoVendorEntry) => void;
  open: boolean;
  onToggle: () => void;
  topBanner?: React.ReactNode;
  advisory?: string;
}) => {
  const hasData = !!(value.companyName || value.contactName || value.status);
  const up = (p: Partial<CoVendorEntry>) => onChange({ ...value, ...p });
  const completedDetails = [value.companyName, value.contactName, value.status].filter(Boolean).length;
  const statusLabel = statuses.find((status) => status.value === value.status)?.label;

  return (
    <div className={`overflow-hidden rounded-xl border bg-white transition-shadow ${open ? "border-[#1DBFD3]/40 shadow-sm" : "border-[#e4e4e4] hover:shadow-sm"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#fbfbfb]"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-500 transition-colors group-hover:border-[#1DBFD3]/35 group-hover:bg-[#1DBFD3]/5 group-hover:text-[#109aaf]"
          >
            {icon}
          </span>
          <div>
            <span className="text-sm font-bold text-[#222628]">{title}</span>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasData
                ? [value.companyName, value.contactName].filter(Boolean).join(" · ") || "Coordination details started"
                : "Add company, contact, and coordination status"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusLabel && (
            <span className="hidden max-w-[210px] truncate rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline-block">
              {statusLabel}
            </span>
          )}
          {!statusLabel && hasData && (
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 sm:inline-block">
              Status needed
            </span>
          )}
          {open ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-4">
          {topBanner}
          {advisory && (
            <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="shrink-0 text-amber-500">⚠</span>
              <p className="text-xs text-amber-700">{advisory}</p>
            </div>
          )}
          <div className="mb-4 flex flex-col gap-3 rounded-lg bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-600">{helpText}</p>
            <div className="shrink-0">
              <p className="mb-1 text-[11px] font-semibold text-slate-500">{completedDetails} of 3 key details</p>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                <div className="h-full rounded-full bg-[#1DBFD3] transition-all" style={{ width: `${(completedDetails / 3) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Company Name</label>
              <input
                className={inputClass}
                placeholder={companyPlaceholder}
                value={value.companyName}
                onChange={(e) => up({ companyName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Name</label>
              <input
                className={inputClass}
                placeholder={contactPlaceholder}
                value={value.contactName}
                onChange={(e) => up({ contactName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Email</label>
              <input
                type="email"
                className={inputClass}
                placeholder="e.g. contact@company.com"
                value={value.contactEmail}
                onChange={(e) => up({ contactEmail: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Phone</label>
              <input
                type="tel"
                className={inputClass}
                placeholder="e.g. (555) 555-0100"
                value={value.contactPhone}
                onChange={(e) => up({ contactPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Status</label>
            <GlobalSelect
              value={value.status}
              onChange={(e) => up({ status: e.target.value })}
              className={inputClass}
            >
              <option value="">Select status…</option>
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </GlobalSelect>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Notes</label>
            <input
              className={inputClass}
              placeholder="Optional coordination notes…"
              value={value.notes}
              onChange={(e) => up({ notes: e.target.value })}
            />
          </div>

          {/* PDF row preview */}
          <div className="mt-4 rounded-lg border border-[#eeeeee] bg-[#f9f9f9] px-3 py-2">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              PDF Section 7 Preview
            </p>
            <p className="text-xs text-slate-600">
              <span className="font-semibold">{title}</span>
              {" · "}
              {value.companyName || "—"}
              {" · "}
              {value.contactName || "TBD"}
              {value.contactEmail ? ` (${value.contactEmail})` : ""}
              {" · "}
              {coordinationScope}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── NDA type card style ─── */
const ndaTypeCls = (opt: string, selected: string): string =>
  selected === opt
    ? "flex items-start gap-3 rounded-lg border border-[#1DBFD3] bg-[#1DBFD3]/5 px-4 py-3 cursor-pointer"
    : "flex items-start gap-3 rounded-lg border border-[#e4e4e4] bg-white px-4 py-3 cursor-pointer hover:border-slate-300";

/* ─── Props ─── */
interface Props {
  data: UploadsData;
  onChange: (updates: Partial<UploadsData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
  venueAvContactName?: string;
  venueAvContactEmail?: string;
  venueAvContactPhone?: string;
  inHouseAvCompanyName?: string;
  riggingRequired?: string;
  isUnionVenue?: string;
  hasScenicOnAnyRoom?: boolean;
  eventFormat?: string;
  contentServicesNeeded?: string;
  focusTarget?: "scenic_inspiration" | "venue_coi" | null;
}

/* ─── Helpers ─── */
const emptyCoVendor = (): CoVendorEntry => ({
  companyName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  status: "",
  notes: "",
});

const emptyCoVendors = (): UploadsData["coVendors"] => ({
  inHouseVenueAv: emptyCoVendor(),
  eventDecorator: emptyCoVendor(),
  registrationTech: emptyCoVendor(),
  agencyOfRecord: emptyCoVendor(),
  photographer: emptyCoVendor(),
});

type CardKey = keyof UploadsData["coVendors"];

/* ─── Main component ─── */
const UploadsReferenceMaterials = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
  venueAvContactName,
  venueAvContactEmail,
  venueAvContactPhone,
  inHouseAvCompanyName,
  riggingRequired,
  isUnionVenue,
  hasScenicOnAnyRoom,
  eventFormat,
  contentServicesNeeded,
  focusTarget = null,
}: Props) => {
  const scenicRef = useRef<HTMLDivElement>(null);
  const venueCoiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = focusTarget === "scenic_inspiration" ? scenicRef.current : focusTarget === "venue_coi" ? venueCoiRef.current : null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.querySelector<HTMLElement>("input[type=file]")?.focus();
  }, [focusTarget]);
  /* ─── Safe data ─── */
  const safeData: UploadsData = {
    ...data,
    brandGuideFiles: data?.brandGuideFiles ?? [],
    eventLogoFiles: data?.eventLogoFiles ?? [],
    referenceFiles: data?.referenceFiles ?? [],
    referenceUrls: data?.referenceUrls ?? [],
    venueDocs: data?.venueDocs ?? [],
    scenicInspirationFiles: data?.scenicInspirationFiles ?? [],
    venueCoiFiles: data?.venueCoiFiles ?? [],
    ndaDocumentFiles: data?.ndaDocumentFiles ?? [],
    coVendors: { ...emptyCoVendors(), ...(data?.coVendors ?? {}) },
  };

  /* ─── Card open state ─── */
  const [openCards, setOpenCards] = useState<Record<CardKey, boolean>>({
    inHouseVenueAv: false,
    eventDecorator: false,
    registrationTech: false,
    agencyOfRecord: false,
    photographer: false,
  });
  const toggleCard = (key: CardKey) =>
    setOpenCards((p) => ({ ...p, [key]: !p[key] }));

  const updateCoVendor = (key: CardKey, val: CoVendorEntry) =>
    onChange({ coVendors: { ...safeData.coVendors, [key]: val } });

  /* ─── Pre-fill from Page 6 ─── */
  const prefillAvailable =
    !!(inHouseAvCompanyName || venueAvContactName) &&
    !safeData.coVendors.inHouseVenueAv.companyName &&
    !safeData.coVendors.inHouseVenueAv.contactName;

  const applyPrefill = () => {
    updateCoVendor("inHouseVenueAv", {
      companyName: inHouseAvCompanyName ?? "",
      contactName: venueAvContactName ?? "",
      contactEmail: venueAvContactEmail ?? "",
      contactPhone: venueAvContactPhone ?? "",
      status: "",
      notes: "",
    });
    setOpenCards((p) => ({ ...p, inHouseVenueAv: true }));
  };

  /* ─── Advisory logic ─── */
  const brandGuideAdvisory =
    contentServicesNeeded === "YES" &&
    !safeData.brandGuideFiles.length &&
    !safeData.brandGuideUrl
      ? "You indicated content services are needed but no brand guide has been uploaded. Vendors will have limited creative direction to work from."
      : undefined;

  const venuDocsAdvisory =
    riggingRequired === "YES" && !safeData.venueDocs.length
      ? "You indicated rigging is required. Uploading venue rigging plots or structural drawings will help vendors submit more accurate proposals."
      : undefined;

  const inHouseAvAdvisory =
    isUnionVenue === "YES" &&
    safeData.coVendors.inHouseVenueAv.status === "not_applicable"
      ? "Union venues typically require coordination with in-house AV or venue labor. Confirm no in-house AV exists before marking as Not Applicable."
      : undefined;

  const decoratorAdvisory =
    hasScenicOnAnyRoom &&
    (!safeData.coVendors.eventDecorator.status ||
      safeData.coVendors.eventDecorator.status === "tbd")
      ? "You indicated scenic design is needed but no scenic company is specified. Vendors will need to know who to coordinate with during load-in."
      : undefined;

  const eventTechAdvisory =
    eventFormat === "Hybrid" &&
    safeData.coVendors.registrationTech.status === "not_applicable"
      ? "A hybrid event typically requires an event technology platform for virtual audience management. Confirm this is not applicable."
      : undefined;

  /* ─── Reference URL helpers ─── */
  const updateRefUrl = (idx: number, patch: Partial<ReferenceUrl>) =>
    onChange({
      referenceUrls: safeData.referenceUrls.map((u, i) =>
        i === idx ? { ...u, ...patch } : u,
      ),
    });
  const addRefUrl = () =>
    onChange({ referenceUrls: [...safeData.referenceUrls, { url: "", label: "" }] });
  const removeRefUrl = (idx: number) =>
    onChange({ referenceUrls: safeData.referenceUrls.filter((_, i) => i !== idx) });

  /* ─── PDF table rows (exclude "not_applicable") ─── */
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const pdfRows: { category: string; entry: CoVendorEntry; scope: string }[] = [
    {
      category: "In-House Venue AV",
      entry: safeData.coVendors.inHouseVenueAv,
      scope: "Power, rigging, venue infrastructure sign-off",
    },
    {
      category: "Event Decorator / Scenic",
      entry: safeData.coVendors.eventDecorator,
      scope: "Stage build, furniture, signage coordination",
    },
    {
      category: "Registration / Event Tech",
      entry: safeData.coVendors.registrationTech,
      scope: "Badge scanning, app integration, virtual platform",
    },
    {
      category: "Agency of Record",
      entry: safeData.coVendors.agencyOfRecord,
      scope: "Brand approvals, content sign-off chain",
    },
    {
      category: "Photography",
      entry: safeData.coVendors.photographer,
      scope: "Stage access windows, lighting coordination",
    },
  ].filter((r) => r.entry.status !== "not_applicable");
  const coVendorEntries = Object.values(safeData.coVendors);
  const configuredCoVendors = coVendorEntries.filter((entry) => entry.status).length;
  const coVendorsNeedingStatus = coVendorEntries.filter(
    (entry) => (entry.companyName || entry.contactName || entry.contactEmail) && !entry.status,
  ).length;

  return (
    <section
      className="flex min-h-screen flex-col rounded-md border border-[#e4e4e4] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* ── Header ── */}
      <div className="border-b border-[#e4e4e4] px-8 py-6">
        <h2 className="text-[22px] font-bold text-[#222628]">Uploads &amp; Co-Vendors</h2>
        <p className="mt-1 text-sm text-[#969798]">
          Reference files, brand assets, co-vendor coordination, and NDA settings.
        </p>
      </div>

      <div className="flex-1 px-8 py-8">

        {/* ══════════════════════════════════════════
            BLOCK A — File Uploads
        ══════════════════════════════════════════ */}
        <Group label="Reference Materials" />

        {/* Field 1 — Brand Guide */}
        <div className="mb-6">
          <label className={labelClass}>
            Brand Guide / Style Guide
            <InfoTooltip text="Upload your event brand guide or style guide. Include logo files, color values (hex/RGB/Pantone), typography specs, and usage rules. This is the single most important creative reference for AV vendors producing content." />
          </label>
          {brandGuideAdvisory && (
            <div className="mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="shrink-0 text-amber-500">⚠</span>
              <p className="text-xs text-amber-700">{brandGuideAdvisory}</p>
            </div>
          )}
          <UploadBox
            files={safeData.brandGuideFiles}
            onFiles={(f) => onChange({ brandGuideFiles: f })}
            accept=".pdf,.zip,.ai,.eps,.png,.jpg,.jpeg"
            hint="PDF, ZIP, AI, EPS, PNG, JPG — max 50 MB · 1 file"
            maxFiles={1}
          />
          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[#969798]">
              Brand Guide URL (alternative to upload)
            </label>
            <input
              type="url"
              className={inputClass}
              placeholder="e.g. https://brand.yourcompany.com"
              value={safeData.brandGuideUrl}
              onChange={(e) => onChange({ brandGuideUrl: e.target.value })}
            />
          </div>
        </div>

        {/* Field 2 — Event Logo Files */}
        <div className="mb-6">
          <label className={labelClass}>
            Event Logo Files
            <InfoTooltip text="Upload your event logo in all required formats. Include vector formats (AI, EPS, SVG) for print and large-format production, and PNG with transparency for digital use. Include all color variants: full color, reversed, and one-color." />
          </label>
          <UploadBox
            files={safeData.eventLogoFiles}
            onFiles={(f) => onChange({ eventLogoFiles: f })}
            accept=".ai,.eps,.svg,.png,.pdf"
            hint="AI, EPS, SVG, PNG (with transparency), PDF — up to 5 files"
            maxFiles={5}
          />
        </div>

        {/* Field 3 — Reference / Inspiration Materials */}
        <div className="mb-6">
          <label className={labelClass}>
            Reference / Inspiration Materials
            <InfoTooltip text="Upload mood boards, reference event photos, sample videos, or prior year recap reels. These give vendors a visceral understanding of the aesthetic you are chasing far better than written descriptions alone." />
          </label>
          <UploadBox
            files={safeData.referenceFiles}
            onFiles={(f) => onChange({ referenceFiles: f })}
            accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.pptx,.key"
            hint="PDF, JPG, PNG, MP4, PPTX — up to 10 files"
            maxFiles={10}
          />
          {/* Reference URLs */}
          <div className="mt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#969798]">
              Reference URLs (Vimeo, YouTube, Behance, etc.)
            </p>
            {safeData.referenceUrls.map((u, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  type="url"
                  className={`${inputClass} flex-1`}
                  placeholder="e.g. https://vimeo.com/123456789"
                  value={u.url}
                  onChange={(e) => updateRefUrl(i, { url: e.target.value })}
                />
                <input
                  className="w-44 rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20"
                  placeholder="Label (optional)"
                  value={u.label}
                  onChange={(e) => updateRefUrl(i, { label: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeRefUrl(i)}
                  className="flex items-center text-slate-400 hover:text-red-400"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {safeData.referenceUrls.length < 5 && (
              <button
                type="button"
                onClick={addRefUrl}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#1DBFD3] hover:underline"
              >
                <PlusCircle size={14} /> Add reference URL
              </button>
            )}
          </div>
        </div>

        <div id="scenic-inspirations" ref={scenicRef} tabIndex={-1} className="mb-6 scroll-mt-6">
          <label className={labelClass}>
            Scenic Inspirations
            <InfoTooltip text="Upload mood boards, sketches, reference photos, or renderings specifically for the scenic design scope." />
          </label>
          <UploadBox
            files={safeData.scenicInspirationFiles}
            onFiles={(files) => onChange({ scenicInspirationFiles: files })}
            uploadField="scenicInspirationFiles"
            accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png"
            hint="PDF, PowerPoint, JPG, PNG — up to 10 files"
            maxFiles={10}
          />
        </div>

        {/* Field 4 — Venue Documents */}
        <div className="mb-6">
          <label className={labelClass}>
            Venue Documents
            <InfoTooltip text="Upload venue floor plans, room diagrams, rigging plots, or electrical schematics. AV vendors need these to spec power layouts, rigging points, and equipment placement accurately. Most venues provide these upon request." />
          </label>
          {venuDocsAdvisory && (
            <div className="mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="shrink-0 text-amber-500">⚠</span>
              <p className="text-xs text-amber-700">{venuDocsAdvisory}</p>
            </div>
          )}
          <UploadBox
            files={safeData.venueDocs}
            onFiles={(f) => onChange({ venueDocs: f })}
            accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png"
            hint="PDF, DWG, DXF, JPG, PNG — up to 5 files"
            maxFiles={5}
          />
        </div>

        <div id="venue-coi-documents" ref={venueCoiRef} tabIndex={-1} className="mb-6 scroll-mt-6">
          <label className={labelClass}>
            Venue / COI Documents
            <InfoTooltip text="Upload COI instructions, additional-insured language, access rules, dock details, or related venue documentation." />
          </label>
          <UploadBox
            files={safeData.venueCoiFiles}
            onFiles={(files) => onChange({ venueCoiFiles: files })}
            uploadField="venueCoiFiles"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            hint="PDF, DOC, DOCX, JPG, PNG — up to 10 files"
            maxFiles={10}
          />
        </div>

        {/* ══════════════════════════════════════════
            BLOCK B — Co-Vendor Coordination
        ══════════════════════════════════════════ */}
        <Group label="Co-Vendor Coordination" />

        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">Coordinate every production partner in one place</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
              These details populate Section 7 of the RFP. Add only the partners involved in this event; vendors marked Not Applicable are left out of the PDF.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#087f90]">
              {configuredCoVendors} of {coVendorEntries.length} statuses set
            </span>
            {coVendorsNeedingStatus > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                {coVendorsNeedingStatus} need {coVendorsNeedingStatus === 1 ? "a status" : "statuses"}
              </span>
            )}
          </div>
        </div>

        {/* Pre-fill banner for In-House AV */}
        {prefillAvailable && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#1DBFD3]/30 bg-[#1DBFD3]/5 px-4 py-3">
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#1DBFD3]/25 bg-white text-[#109aaf] shadow-sm"
            >
              <Building2 size={16} strokeWidth={1.9} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-brand-dark">
                Venue AV contact available from Venue &amp; Technical
              </p>
              <p className="mt-0.5 text-xs text-[#0069a0]">
                {inHouseAvCompanyName && (
                  <span className="font-semibold">{inHouseAvCompanyName}</span>
                )}
                {venueAvContactName && <span> · {venueAvContactName}</span>}
                {venueAvContactEmail && <span> · {venueAvContactEmail}</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={applyPrefill}
              className="shrink-0 rounded-lg border border-[#1DBFD3]/30 bg-white px-3 py-1.5 text-xs font-bold text-brand-dark hover:bg-[#1DBFD3]/5"
            >
              Apply ✓
            </button>
          </div>
        )}

        <div className="space-y-3">
          <CoVendorCard
            icon={<AudioLines size={16} strokeWidth={1.9} />}
            title="In-House Venue AV"
            companyPlaceholder="e.g. Encore, Pinnacle Live, Inspire"
            contactPlaceholder="e.g. James Whitfield"
            helpText="The in-house AV company at your venue. External AV vendors need early contact for power access, rigging approvals, and loading dock coordination."
            statuses={IN_HOUSE_AV_STATUSES}
            coordinationScope="Power, rigging, venue infrastructure sign-off"
            value={safeData.coVendors.inHouseVenueAv}
            onChange={(v) => updateCoVendor("inHouseVenueAv", v)}
            open={openCards.inHouseVenueAv}
            onToggle={() => toggleCard("inHouseVenueAv")}
            advisory={inHouseAvAdvisory}
          />

          <CoVendorCard
            icon={<Palette size={16} strokeWidth={1.9} />}
            title="Event Decorator / Scenic Company"
            companyPlaceholder="e.g. GES Events, Freeman Decorating, Becker Studios"
            contactPlaceholder="e.g. Maria Santos"
            helpText="AV vendors must coordinate stage build access, cable management through scenic elements, lighting positions around scenic pieces, and shared freight dock time."
            statuses={DECORATOR_STATUSES}
            coordinationScope="Stage build, furniture, signage coordination"
            value={safeData.coVendors.eventDecorator}
            onChange={(v) => updateCoVendor("eventDecorator", v)}
            open={openCards.eventDecorator}
            onToggle={() => toggleCard("eventDecorator")}
            advisory={decoratorAdvisory}
          />

          <CoVendorCard
            icon={<BadgeCheck size={16} strokeWidth={1.9} />}
            title="Registration / Event Technology"
            companyPlaceholder="e.g. Cvent, Bizzabo, EventMobi, Splash"
            contactPlaceholder="e.g. David Chen"
            helpText="AV vendors need to know the platform for digital Q&A integration, badge scanning, session access control, and virtual platform coordination. Especially critical for hybrid events."
            statuses={BASE_STATUSES}
            coordinationScope="Badge scanning, app integration, virtual platform coordination"
            value={safeData.coVendors.registrationTech}
            onChange={(v) => updateCoVendor("registrationTech", v)}
            open={openCards.registrationTech}
            onToggle={() => toggleCard("registrationTech")}
            advisory={eventTechAdvisory}
          />

          <CoVendorCard
            icon={<BriefcaseBusiness size={16} strokeWidth={1.9} />}
            title="Agency of Record"
            companyPlaceholder="e.g. Jack Morton, GPJ, MCI Group"
            contactPlaceholder="e.g. Rachel Kim"
            helpText="Your creative or event management agency responsible for brand approvals, content sign-off, and overall event strategy. AV vendors need to know who approves creative assets and who has event-day authority."
            statuses={AGENCY_STATUSES}
            coordinationScope="Brand approvals, content sign-off chain, production calls"
            value={safeData.coVendors.agencyOfRecord}
            onChange={(v) => updateCoVendor("agencyOfRecord", v)}
            open={openCards.agencyOfRecord}
            onToggle={() => toggleCard("agencyOfRecord")}
          />

          <CoVendorCard
            icon={<Camera size={16} strokeWidth={1.9} />}
            title="Photographer"
            companyPlaceholder="e.g. Smith Event Photography, Lens & Light Studios"
            contactPlaceholder="e.g. Tom Bradley"
            helpText="AV teams must coordinate stage access windows, lighting setups that work for both video and still photography, and cable management. Most photographers need 15–30 minute windows for key moments."
            statuses={PHOTOGRAPHER_STATUSES}
            coordinationScope="Stage access windows, lighting coordination, shot list review"
            value={safeData.coVendors.photographer}
            onChange={(v) => updateCoVendor("photographer", v)}
            open={openCards.photographer}
            onToggle={() => toggleCard("photographer")}
          />
        </div>

        {/* Section 7 PDF preview table */}
        <div className="mt-5 overflow-hidden rounded-xl border border-[#e4e4e4] bg-white">
          <button
            type="button"
            onClick={() => setPdfPreviewOpen(!pdfPreviewOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#fbfbfb]"
          >
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#969798]">
              <FileText aria-hidden="true" size={15} strokeWidth={1.9} className="shrink-0 text-slate-400" />
              <span>Section 7 PDF Preview — Co-Vendor Table</span>
            </span>
            {pdfPreviewOpen ? (
              <ChevronUp size={14} className="text-slate-400" />
            ) : (
              <ChevronDown size={14} className="text-slate-400" />
            )}
          </button>
          {pdfPreviewOpen && (
            <div className="border-t border-[#f0f0f0] overflow-x-auto px-4 pb-4 pt-3">
              <table className="w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="border-b border-[#f0f0f0]">
                    {["Category", "Company", "Contact", "Coordination Scope"].map((h) => (
                      <th key={h} className="pb-2 text-left font-bold text-slate-500 pr-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pdfRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-slate-400">
                        No co-vendors specified — vendor to confirm with client.
                      </td>
                    </tr>
                  ) : (
                    pdfRows.map((r, i) => (
                      <tr key={i} className="border-b border-[#f0f4f8] last:border-0">
                        <td className="py-2 pr-3 font-semibold text-[#222628]">{r.category}</td>
                        <td className="py-2 pr-3 text-slate-600">{r.entry.companyName || "TBD"}</td>
                        <td className="py-2 pr-3 text-slate-600">
                          {r.entry.contactName || "TBD"}
                          {r.entry.contactEmail ? ` · ${r.entry.contactEmail}` : ""}
                        </td>
                        <td className="py-2 text-slate-400">{r.scope}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            BLOCK C — NDA & Compliance
        ══════════════════════════════════════════ */}
        <Group label="NDA &amp; Distribution" />

        <div className="mb-6">
          <label className={labelClass}>
            NDA Required Before Sharing RFP? <span className="text-red-500">*</span>
            <InfoTooltip text="If Yes, vendors must execute a Non-Disclosure Agreement through the RFPilot portal before accessing the full RFP document and attachments. Required when the RFP contains proprietary event concepts, confidential attendee data, or brand materials not yet publicly released." />
          </label>
          <YesNo
            value={safeData.ndaRequired}
            onChange={(v) =>
              onChange({
                ndaRequired: v,
                ndaType: v === "NO" ? "" : safeData.ndaType,
                ndaDocumentFiles: v === "NO" ? [] : safeData.ndaDocumentFiles,
              })
            }
          />
          {showErrors && !safeData.ndaRequired && (
            <p className={errorClass}>Please indicate whether an NDA is required.</p>
          )}

          {safeData.ndaRequired === "YES" && (
            <div className={subPanelClass}>
              {/* Vendor experience flow */}
              <div className="mb-5 rounded-lg border border-[#1DBFD3]/30 bg-[#1DBFD3]/5 px-4 py-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-dark">
                  Vendor Experience
                </p>
                <ol className="space-y-1 text-xs text-brand-dark">
                  <li>1. Vendor receives invitation email</li>
                  <li>2. Vendor clicks portal link</li>
                  <li>3. Portal shows NDA for electronic signature</li>
                  <li>4. After signing → full RFP + attachments unlocked</li>
                </ol>
              </div>

              {/* NDA Type */}
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#969798]">
                NDA Type <span className="text-red-500">*</span>
              </p>
              <div className="mb-4 space-y-2">
                {[
                  {
                    value: "one_way",
                    label: "One-Way NDA",
                    desc: "Vendor agrees to keep client information confidential. Most common for event RFPs.",
                  },
                  {
                    value: "mutual",
                    label: "Standard Mutual NDA",
                    desc: "Both parties agree to confidentiality. Use when vendors are also sharing proprietary methodologies.",
                  },
                  {
                    value: "custom",
                    label: "Custom NDA",
                    desc: "Your legal team provides a custom NDA document. Upload it below.",
                  },
                ].map((opt) => (
                  <label key={opt.value} className={ndaTypeCls(opt.value, safeData.ndaType)}>
                    <input
                      type="radio"
                      name="ndaType"
                      value={opt.value}
                      checked={safeData.ndaType === opt.value}
                      onChange={() => onChange({ ndaType: opt.value })}
                      className="peer sr-only"
                    />
                    <span className="mt-0.5">
                      <RadioIndicator checked={safeData.ndaType === opt.value} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#222628]">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {showErrors && safeData.ndaRequired === "YES" && !safeData.ndaType && (
                <p className={errorClass}>Select an NDA type.</p>
              )}

              {/* NDA Document Upload */}
              <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-[#969798]">
                NDA Document Upload
                {safeData.ndaType !== "custom" && (
                  <span className="ml-2 font-normal normal-case text-slate-400">
                    (Optional — leave blank to use RFPilot standard NDA)
                  </span>
                )}
              </p>
              <UploadBox
                files={safeData.ndaDocumentFiles}
                onFiles={(f) => onChange({ ndaDocumentFiles: f })}
                accept=".pdf,.docx"
                hint="PDF or DOCX — max 1 file · 10 MB"
                maxFiles={1}
                maxSizeMb={10}
                uploadField="avQuoteFiles"
              />
            </div>
          )}
        </div>

      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between border-t border-[#e4e4e4] px-8 py-5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          Investment &amp; Evaluation
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #1DBFD3 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          Contact &amp; Submit
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default UploadsReferenceMaterials;

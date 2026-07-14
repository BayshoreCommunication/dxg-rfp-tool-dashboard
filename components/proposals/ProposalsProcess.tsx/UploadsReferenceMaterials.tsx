"use client";

import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Loader2, PlusCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import type {
  CoVendorEntry,
  ProposalSettings,
  ReferenceUrl,
  UploadsData,
} from "../AddNewProposal";
import { InfoTooltip } from "./shared";
import { uploadProposalFilesAction } from "@/app/actions/proposals";

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20";
const groupLabelClass = "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";
const subPanelClass = "mt-3 rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-4";
const errorClass = "mt-1 text-sm text-red-500 normal-case";

/* ─── Yes/No ─── */
const yesNoCls = (opt: "YES" | "NO", val: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (val !== opt)
    return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
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
  <div className="mb-5 mt-8 border-t border-[#e8edf5] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

/* ─── Upload Box ─── */
const UploadBox = ({
  files,
  onFiles,
  accept = ".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg",
  hint = "Accepts PDFs, PowerPoint, Docs, Images",
  maxFiles,
  uploadField = "supportDocuments",
}: {
  files: string[];
  onFiles: (files: string[]) => void;
  accept?: string;
  hint?: string;
  maxFiles?: number;
  uploadField?: "supportDocuments" | "avQuoteFiles";
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const remaining = maxFiles !== undefined ? maxFiles - files.length : Infinity;
    const toUpload = Array.from(e.target.files).slice(0, remaining);
    if (!toUpload.length) return;
    setBusy(true);
    const fd = new FormData();
    toUpload.forEach((f) => fd.append(uploadField, f));
    try {
      const res = await uploadProposalFilesAction(fd);
      if (res.success) {
        const urls =
          uploadField === "supportDocuments" ? res.supportDocumentUrls : res.avQuoteFileUrls;
        onFiles([...files, ...urls]);
      } else {
        alert(res.message || "Upload failed");
      }
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const atMax = maxFiles !== undefined && files.length >= maxFiles;

  return (
    <div className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-[#38bdf8] bg-white px-4 pb-6 pt-8">
      <div className="mb-3">
        <svg width="56" height="44" viewBox="0 0 84 64" fill="none">
          <path
            d="M42 0C32.148 0 23.772 5.964 19.824 14.532C8.61 15.666 0 25.032 0 36.5714C0 49.1914 10.29 59.4286 23.1 59.4286H63C74.592 59.4286 84 50.02 84 38.4C84 27.2457 75.348 18.2857 65.436 17.5543C62.454 7.63429 53.088 0 42 0Z"
            fill="#7DD3FC"
          />
          <path
            d="M42 22.8571L31.5 34.2857H37.8V45.7143H46.2V34.2857H52.5L42 22.8571Z"
            fill="white"
          />
        </svg>
      </div>
      <p className="mb-1 text-sm font-bold text-[#1f2d5d]">Drag &amp; drop or browse</p>
      <p className="mb-5 text-xs font-medium text-[#8f98bf]">{hint}</p>
      {atMax ? (
        <p className="text-xs text-slate-400">
          Max {maxFiles} {maxFiles === 1 ? "file" : "files"} reached
        </p>
      ) : (
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-lg bg-[#00c2c9] px-7 py-2.5 text-xs font-bold tracking-wide text-white transition-colors hover:bg-[#009198] ${
            busy ? "pointer-events-none opacity-70" : ""
          }`}
        >
          {busy && <Loader2 size={13} className="animate-spin" />}
          <span>{busy ? "UPLOADING…" : "BROWSE FILES"}</span>
          <input
            ref={ref}
            type="file"
            multiple={!maxFiles || maxFiles > 1}
            accept={accept}
            className="hidden"
            onChange={handleChange}
            disabled={busy}
          />
        </label>
      )}
      {files.length > 0 && (
        <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
          {files.map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded-full border border-[#38bdf8] bg-sky-50 px-3 py-1.5 text-xs font-semibold text-[#1f2d5d]"
            >
              <span className="max-w-[180px] truncate">{f.split("/").pop() || f}</span>
              <button
                type="button"
                onClick={() => onFiles(files.filter((_, j) => j !== i))}
                className="ml-1 text-gray-400 hover:text-red-400"
              >
                ✕
              </button>
            </span>
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
  icon: string;
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

  return (
    <div className="overflow-hidden rounded-xl border border-[#d7dce3] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#f8faff]"
      >
        <div className="flex items-center gap-3">
          <span>{icon}</span>
          <div>
            <span className="text-sm font-bold text-[#0f1b57]">{title}</span>
            {hasData && !open && (
              <span className="ml-2 text-xs text-slate-400">
                {value.companyName || value.contactName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasData && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
          {open ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#e8edf5] px-4 pb-4 pt-4">
          {topBanner}
          {advisory && (
            <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="shrink-0 text-amber-500">⚠</span>
              <p className="text-xs text-amber-700">{advisory}</p>
            </div>
          )}
          <p className="mb-4 text-xs text-slate-500">{helpText}</p>

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
            <select
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
            </select>
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
          <div className="mt-4 rounded-lg border border-[#e0e7ff] bg-[#f5f7ff] px-3 py-2">
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
    ? "flex items-start gap-3 rounded-lg border border-[#00c2c9] bg-[#00c2c9]/5 px-4 py-3 cursor-pointer"
    : "flex items-start gap-3 rounded-lg border border-[#d7dce3] bg-white px-4 py-3 cursor-pointer hover:border-slate-300";

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
}: Props) => {
  /* ─── Safe data ─── */
  const safeData: UploadsData = {
    ...data,
    brandGuideFiles: data?.brandGuideFiles ?? [],
    eventLogoFiles: data?.eventLogoFiles ?? [],
    referenceFiles: data?.referenceFiles ?? [],
    referenceUrls: data?.referenceUrls ?? [],
    venueDocs: data?.venueDocs ?? [],
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

  return (
    <section
      className="flex min-h-screen flex-col rounded-md border border-[#d7dce3] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* ── Header ── */}
      <div className="border-b border-[#d7dce3] px-8 py-6">
        <div className="mb-1 flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-[#00c2c9]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#00c2c9]">
            Page 8 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Uploads &amp; Co-Vendors</h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
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
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
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
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
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
                  className="w-44 rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20"
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
                className="flex items-center gap-1.5 text-xs font-semibold text-[#00c2c9] hover:underline"
              >
                <PlusCircle size={14} /> Add reference URL
              </button>
            )}
          </div>
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

        {/* ══════════════════════════════════════════
            BLOCK B — Co-Vendor Coordination
        ══════════════════════════════════════════ */}
        <Group label="Co-Vendor Coordination" />

        <p className="mb-5 text-xs text-slate-500">
          Co-vendor details auto-populate Section 7 of the RFP. Expand each card to add contacts
          and confirm coordination status. Rows marked &quot;Not Applicable&quot; are omitted from
          the PDF table.
        </p>

        {/* Pre-fill banner for In-House AV */}
        {prefillAvailable && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#00c2c9]/30 bg-[#00c2c9]/5 px-4 py-3">
            <span className="mt-0.5 shrink-0">🏛</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-brand-dark">
                Venue AV contact available from Page 6
              </p>
              <p className="mt-0.5 text-xs text-[#009198]">
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
              className="shrink-0 rounded-lg border border-[#00c2c9]/30 bg-white px-3 py-1.5 text-xs font-bold text-brand-dark hover:bg-[#00c2c9]/5"
            >
              Apply ✓
            </button>
          </div>
        )}

        <div className="space-y-3">
          <CoVendorCard
            icon="🏢"
            title="In-House Venue AV"
            companyPlaceholder="e.g. Encore, Freeman AV, PSAV"
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
            icon="🎨"
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
            icon="📱"
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
            icon="🏛️"
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
            icon="📷"
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
        <div className="mt-5 overflow-hidden rounded-xl border border-[#d7dce3] bg-white">
          <button
            type="button"
            onClick={() => setPdfPreviewOpen(!pdfPreviewOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#f8faff]"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
              📄 Section 7 PDF Preview — Co-Vendor Table
            </span>
            {pdfPreviewOpen ? (
              <ChevronUp size={14} className="text-slate-400" />
            ) : (
              <ChevronDown size={14} className="text-slate-400" />
            )}
          </button>
          {pdfPreviewOpen && (
            <div className="border-t border-[#e8edf5] overflow-x-auto px-4 pb-4 pt-3">
              <table className="w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="border-b border-[#e8edf5]">
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
                        <td className="py-2 pr-3 font-semibold text-[#0f1b57]">{r.category}</td>
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
              <div className="mb-5 rounded-lg border border-[#00c2c9]/30 bg-[#00c2c9]/5 px-4 py-3">
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
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
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
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#0f1b57]">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {showErrors && safeData.ndaRequired === "YES" && !safeData.ndaType && (
                <p className={errorClass}>Select an NDA type.</p>
              )}

              {/* NDA Document Upload */}
              <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
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
                uploadField="avQuoteFiles"
              />
            </div>
          )}
        </div>

      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between border-t border-[#d7dce3] px-8 py-5">
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
          style={{ background: "linear-gradient(135deg, #00c2c9 0%, #06b6d4 30%, #0ea5e9 60%, #2563eb 100%)" }}
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

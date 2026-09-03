"use client";

import type {
  VendorSubmissionDetail,
  VendorSubmissionVersion,
} from "@/app/actions/vendorResponse";
import { fileTypeLabel } from "@/lib/proposalIntelligence/plainLanguage";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  FileQuestion,
  FileText,
  Mail,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import VendorExtractionSection from "./VendorExtractionSection";
import VendorFactsSection from "./VendorFactsSection";
import { requirementRegistryHref } from "@/lib/proposalIntelligence/requirementRegistryNavigation";

const reasonLabels: Record<VendorSubmissionVersion["reason"], string> = {
  initial: "Initial response",
  vendor_revision: "Vendor revision",
  clarification_response: "Clarification response",
  bafo: "Best and final offer",
  administrative_correction: "Administrative correction",
  legacy_backfill: "Imported legacy response",
};


const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatBytes = (value: number | null | undefined) => {
  if (typeof value !== "number") return "Size unavailable";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function VendorResponseDetailWorkspace({
  detail,
}: {
  detail: VendorSubmissionDetail;
}) {
  const initialVersionId =
    detail.submission?.currentVersionId ?? detail.versions[0]?.versionId;
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersionId);
  const selectedVersion = useMemo(
    () =>
      detail.versions.find(
        (version) => version.versionId === selectedVersionId,
      ) ?? detail.versions[0],
    [detail.versions, selectedVersionId],
  );
  const current = Boolean(
    selectedVersion &&
    selectedVersion.versionId === detail.submission?.currentVersionId,
  );
  const vendorName = selectedVersion?.vendorName ?? detail.response.vendorName;
  const returnTo = `/vendor-responses/${detail.response._id}`;
  const proposalResponsesHref = `/vendor-responses/proposals/${encodeURIComponent(detail.response.proposalId)}`;
  const singleVersion = detail.versions.length === 1;

  return (
    <section
      className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_-34px_rgba(15,23,42,0.35)]"
      aria-labelledby="vendor-response-title"
    >
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-7 lg:px-9">
        <Link
          href={proposalResponsesHref}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg text-xs font-bold text-slate-600 hover:text-[#0076b4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008ad2]/20"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to proposal responses
        </Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1
                id="vendor-response-title"
                className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"
              >
                {vendorName}
              </h1>
              <StatusBadge status={detail.submission?.status ?? "active"} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Response to{" "}
              <span className="font-bold text-slate-800">
                {detail.response.proposalTitle}
              </span>
            </p>
          </div>
          <Link
            href={requirementRegistryHref(detail.response.proposalId, returnTo)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#008ad2] px-4 text-sm font-extrabold text-[#0076b4] hover:bg-[#eaf7fd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008ad2]/25"
          >
            <ClipboardList size={16} aria-hidden="true" /> Open requirements checklist
          </Link>
        </div>
      </header>

      {detail.versions.length === 0 ? (
        <LegacyResponse detail={detail} />
      ) : (
        <div className={`grid min-h-0 ${singleVersion ? "" : "lg:grid-cols-[310px_minmax(0,1fr)]"}`}>
          {!singleVersion && (
          <nav
            className="border-b border-slate-200 bg-slate-50/80 p-4 lg:border-b-0 lg:border-r lg:p-5"
            aria-label="Immutable response versions"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Version history
              </h2>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                {detail.versions.length} version{detail.versions.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Every version is kept exactly as received. Viewing an older
              version never changes the current response.
            </p>
            {detail.historyTruncated && (
              <p className="mt-3 rounded-xl bg-amber-100 p-3 text-xs leading-5 text-amber-950">
                Showing the 100 most recent versions. Older ones are still
                stored, just not listed here.
              </p>
            )}
            <ol className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
              {detail.versions.map((version) => {
                const isSelected =
                  version.versionId === selectedVersion?.versionId;
                const isCurrent =
                  version.versionId === detail.submission?.currentVersionId;
                return (
                  <li
                    key={version.versionId}
                    className="min-w-[230px] lg:min-w-0"
                  >
                    <button
                      type="button"
                      aria-current={isSelected ? "true" : undefined}
                      onClick={() => setSelectedVersionId(version.versionId)}
                      className={`w-full rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008ad2]/20 ${isSelected ? "border-[#008ad2]/35 bg-white shadow-sm" : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          Version {version.versionNumber}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-emerald-800">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-[#0076b4]">
                        {reasonLabels[version.reason]}
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-500">
                        {formatDate(version.receivedAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          )}

          {selectedVersion && (
            <main className="min-w-0 p-5 sm:p-7 lg:p-9" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-950">
                      {singleVersion ? "Response as received" : `Version ${selectedVersion.versionNumber}`}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${current ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
                    >
                      {current ? "Current response" : "Historical, superseded"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {reasonLabels[selectedVersion.reason]} received{" "}
                    {formatDate(selectedVersion.receivedAt)}
                    {singleVersion && ". The only version received so far; revisions will be listed here."}
                  </p>
                </div>
              </div>

              {!current && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    <strong>Older version.</strong> Everything below shows this
                    version exactly as it was. The current response is not
                    affected.
                  </p>
                </div>
              )}

              <dl className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
                <Fact
                  icon={<UserRound size={15} />}
                  label="Submitted by"
                  value={selectedVersion.submittedBy}
                />
                <Fact
                  icon={<Mail size={15} />}
                  label="Email"
                  value={selectedVersion.email}
                />
                <Fact
                  icon={<CalendarDays size={15} />}
                  label="Received"
                  value={formatDate(selectedVersion.receivedAt)}
                />
              </dl>

              <section
                className="mt-5 rounded-2xl border border-slate-200 p-5"
                aria-labelledby="message-heading"
              >
                <h3
                  id="message-heading"
                  className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500"
                >
                  Vendor message
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {selectedVersion.message ||
                    "No message was included with this version."}
                </p>
              </section>

              <SourceReadiness
                documents={selectedVersion.documents}
                versionLabel={singleVersion ? "this response" : `Version ${selectedVersion.versionNumber}`}
              />

              <section className="mt-6" aria-labelledby="intelligence-heading">
                <div className="mb-3">
                  <h3
                    id="intelligence-heading"
                    className="text-base font-extrabold text-slate-900"
                  >
                    Analysis
                  </h3>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                    RFPilot read {singleVersion ? "this response's" : `Version ${selectedVersion.versionNumber}'s`} files once and saved what it found: which files were readable, which requirements the vendor answered, and the values it stated. Scores and the ranking live in Proposal Intelligence. Opening anything here never reruns the analysis or changes what the vendor sent.
                  </p>
                </div>
                {detail.submission && (
                  <div className="space-y-5">
                    <VendorExtractionSection
                      proposalId={detail.response.proposalId}
                      submissionId={detail.submission.submissionId}
                      versionId={selectedVersion.versionId}
                    />
                    <VendorFactsSection
                      key={selectedVersion.versionId}
                      proposalId={detail.response.proposalId}
                      proposalTitle={detail.response.proposalTitle}
                      vendorName={vendorName}
                      vendorEmail={selectedVersion.email}
                      submissionId={detail.submission.submissionId}
                      versionId={selectedVersion.versionId}
                      returnTo={`/vendor-responses/${encodeURIComponent(detail.response._id)}`}
                    />
                  </div>
                )}
              </section>
            </main>
          )}
        </div>
      )}
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: "active" | "withdrawn" | "archived";
}) {
  const styles =
    status === "active"
      ? "bg-emerald-100 text-emerald-800"
      : status === "withdrawn"
        ? "bg-red-100 text-red-800"
        : "bg-slate-200 text-slate-700";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${styles}`}
    >
      {status}
    </span>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white p-4">
      <dt className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-bold text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function SourceReadiness({
  documents,
  versionLabel,
}: {
  documents: VendorSubmissionVersion["documents"];
  /** "this response" while only one version exists; "Version N" once there are several. */
  versionLabel: string;
}) {
  return (
    <section className="mt-5" aria-labelledby="sources-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3
            id="sources-heading"
            className="text-base font-extrabold text-slate-900"
          >
            Attached files
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Files included with {versionLabel}.
          </p>
        </div>
      </div>
      {documents.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
          <FileQuestion
            size={19}
            className="mb-2 text-slate-400"
            aria-hidden="true"
          />
          No files came with this version &mdash; only the vendor&rsquo;s
          message above.
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 xl:grid-cols-2">
          {documents.map((document, index) => {
            const ready = document.scanStatus === "clean";
            return (
              <li
                key={document.documentId || `${document.name}-${index}`}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
                  >
                    {ready ? (
                      <FileCheck2 size={18} aria-hidden="true" />
                    ) : (
                      <ShieldAlert size={18} aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">
                      {document.name}
                    </p>
                    <p
                      className={`mt-1 text-xs font-bold ${ready ? "text-emerald-700" : "text-amber-800"}`}
                    >
                      {ready
                        ? "Security scan passed"
                        : "Security scan pending"}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                  <div>
                    <dt className="font-bold uppercase">File type</dt>
                    <dd className="mt-0.5 truncate">
                      {fileTypeLabel(document.mimeType, document.name)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase">Size</dt>
                    <dd className="mt-0.5">
                      {formatBytes(document.sizeBytes)}
                    </dd>
                  </div>
                </dl>
                {document.inheritedFromVersionId && (
                  <p className="mt-2 text-[10px] font-semibold text-slate-500">
                    Carried over from an earlier version
                  </p>
                )}
                {!ready && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] leading-4 text-amber-900">
                    This file hasn&rsquo;t passed its security scan yet, so it
                    isn&rsquo;t included in the analysis.
                  </p>
                )}
                {document.url && (
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-[#008ad2]/30 hover:text-[#0076b4]"
                  >
                    <FileText size={14} aria-hidden="true" /> Open file
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function LegacyResponse({ detail }: { detail: VendorSubmissionDetail }) {
  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-extrabold text-amber-950">
              Version history unavailable
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              This response predates version tracking, so only its latest
              recorded state is shown.
            </p>
          </div>
        </div>
      </div>
      <section className="mt-5 rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-extrabold text-slate-900">
          Latest recorded message
        </h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {detail.response.message || "No message was included."}
        </p>
      </section>
    </div>
  );
}

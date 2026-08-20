"use client";

import type {
  VendorSubmissionDetail,
  VendorSubmissionVersion,
} from "@/app/actions/vendorResponse";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileQuestion,
  FileText,
  Fingerprint,
  Link2,
  Mail,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import VendorEvaluationSection from "./VendorEvaluationSection";
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

const sourceLabels: Record<VendorSubmissionVersion["sourceSystem"], string> = {
  public_portal: "Vendor portal",
  planner_upload: "Planner upload",
  legacy_migration: "Legacy migration",
  api: "API intake",
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

  return (
    <section
      className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_-34px_rgba(15,23,42,0.35)]"
      aria-labelledby="vendor-response-title"
    >
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-7 lg:px-9">
        <Link
          href="/vendor-responses"
          className="inline-flex min-h-9 items-center gap-2 rounded-lg text-xs font-bold text-slate-600 hover:text-[#0076b4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008ad2]/20"
        >
          <ArrowLeft size={15} aria-hidden="true" /> All vendor responses
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#008ad2] px-4 text-sm font-extrabold text-white shadow-sm hover:bg-[#0076b4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008ad2]/25"
          >
            <ClipboardList size={16} aria-hidden="true" /> Review proposal
            requirements
          </Link>
        </div>
      </header>

      {detail.versions.length === 0 ? (
        <LegacyResponse detail={detail} />
      ) : (
        <div className="grid min-h-0 lg:grid-cols-[310px_minmax(0,1fr)]">
          <nav
            className="border-b border-slate-200 bg-slate-50/80 p-4 lg:border-b-0 lg:border-r lg:p-5"
            aria-label="Immutable response versions"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Version history
              </h2>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                {detail.versions.length} retained
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Each entry is immutable. Selecting history never replaces or
              reruns the current response.
            </p>
            {detail.historyTruncated && (
              <p className="mt-3 rounded-xl bg-amber-100 p-3 text-xs leading-5 text-amber-950">
                Showing the 100 most recent retained versions. Older records
                remain stored but are not included in this view.
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

          {selectedVersion && (
            <main className="min-w-0 p-5 sm:p-7 lg:p-9" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-950">
                      Version {selectedVersion.versionNumber}
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
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                  <ClipboardCheck size={14} aria-hidden="true" /> Immutable
                  record
                </span>
              </div>

              {!current && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    <strong>Historical version.</strong> Evidence and
                    intelligence below are bound to this exact version. The
                    current response remains unchanged.
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

              <ReceiptLineage version={selectedVersion} />
              <SourceReadiness
                documents={selectedVersion.documents}
                versionNumber={selectedVersion.versionNumber}
              />

              <section className="mt-6" aria-labelledby="intelligence-heading">
                <div className="mb-3">
                  <h3
                    id="intelligence-heading"
                    className="text-base font-extrabold text-slate-900"
                  >
                    Proposal intelligence for this version
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    These resources remain bound to Version{" "}
                    {selectedVersion.versionNumber}; opening them does not rerun
                    completed work.
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
                      proposalId={detail.response.proposalId}
                      submissionId={detail.submission.submissionId}
                      versionId={selectedVersion.versionId}
                    />
                    <VendorEvaluationSection
                      proposalId={detail.response.proposalId}
                      submissionId={detail.submission.submissionId}
                      versionId={selectedVersion.versionId}
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

function ReceiptLineage({ version }: { version: VendorSubmissionVersion }) {
  return (
    <section
      className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
      aria-labelledby="receipt-heading"
    >
      <h3
        id="receipt-heading"
        className="flex items-center gap-2 text-sm font-extrabold text-slate-900"
      >
        <Fingerprint size={16} className="text-[#008ad2]" aria-hidden="true" />{" "}
        Receipt and lineage
      </h3>
      <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-bold uppercase tracking-wide text-slate-500">
            Receipt type
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {reasonLabels[version.reason]}
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wide text-slate-500">
            Received through
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {sourceLabels[version.sourceSystem]}
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wide text-slate-500">
            Parent version
          </dt>
          <dd className="mt-1 font-mono text-slate-700">
            {version.parentVersionId
              ? version.parentVersionId.slice(-8)
              : "None, first retained version"}
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wide text-slate-500">
            Manifest checksum
          </dt>
          <dd className="mt-1 break-all font-mono text-slate-700">
            {version.manifestChecksum}
          </dd>
        </div>
      </dl>
      {(version.reason === "clarification_response" ||
        version.reason === "bafo") && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">
          <Link2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          This version records a{" "}
          {version.reason === "bafo"
            ? "best-and-final-offer"
            : "clarification"}{" "}
          response linked to its parent submission version.
        </p>
      )}
    </section>
  );
}

function SourceReadiness({
  documents,
  versionNumber,
}: {
  documents: VendorSubmissionVersion["documents"];
  versionNumber: number;
}) {
  return (
    <section className="mt-5" aria-labelledby="sources-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3
            id="sources-heading"
            className="text-base font-extrabold text-slate-900"
          >
            Source readiness
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Files retained in Version {versionNumber}. Security and extraction
            readiness are shown separately.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-500">
          {documents.length} file{documents.length === 1 ? "" : "s"}
        </span>
      </div>
      {documents.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
          <FileQuestion
            size={19}
            className="mb-2 text-slate-400"
            aria-hidden="true"
          />
          No source files were retained with this version. The message alone
          must not be presented as analyzed file evidence.
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
                        : "Analysis readiness not confirmed"}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                  <div>
                    <dt className="font-bold uppercase">File type</dt>
                    <dd className="mt-0.5 truncate">
                      {document.mimeType || "Unknown"}
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
                    Carried forward from an earlier immutable version
                  </p>
                )}
                {!ready && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] leading-4 text-amber-900">
                    This file does not have a confirmed clean scan. It must not
                    be treated as extracted or analyzed evidence.
                  </p>
                )}
                {document.url && (
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-[#008ad2]/30 hover:text-[#0076b4]"
                  >
                    <FileText size={14} aria-hidden="true" /> Open authorized
                    file
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
              Immutable history unavailable
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              This legacy response has not been reconstructed into a version
              timeline. Only the latest compatibility record is shown, and it is
              not presented as historical evidence.
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

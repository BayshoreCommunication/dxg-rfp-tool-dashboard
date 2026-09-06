"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CircleAlert, MailPlus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { groupFacts } from "@/lib/vendorResponses/factPresentation";
import SectionLoadError from "@/components/vendor/SectionLoadError";
import { coverageFromRelationship, coveragePresentation } from "@/lib/proposalIntelligence/coverageVocabulary";
import { isBlockingWarning } from "@/lib/proposalIntelligence/evaluationGate";
import {
  createVendorIntelligenceAction,
  getLatestVendorIntelligenceAction,
  type ExtractedFact,
  type VendorIntelligenceResult,
} from "@/app/actions/vendorIntelligence";

const coverage = (relationship: string) => coveragePresentation[coverageFromRelationship(relationship)];
/** A percentage alone begs "compared to what"; say what it means for the reader. */
const confidenceNote = (confidence: number) =>
  confidence < 0.7 ? `Needs a human check · the AI was ${Math.round(confidence * 100)}% sure` : null;
type RequirementMapping = VendorIntelligenceResult["mappings"][number];
/** The value is the headline; money is shown as money. */
const factValue = (fact: ExtractedFact) => {
  if (fact.valueKind === "money") {
    const typed = fact.typedValue as { number?: unknown; currency?: unknown };
    const amount = Number(typed.number);
    const currency = fact.currency ?? (typeof typed.currency === "string" ? typed.currency : null);
    if (Number.isFinite(amount) && currency && /^[A-Z]{3}$/.test(currency)) {
      try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
      } catch { /* fall through to the normalized text */ }
    }
  }
  if (fact.valueKind === "list") {
    const typed = fact.typedValue as { list?: unknown };
    const items = Array.isArray(typed.list) ? typed.list.map(String) : fact.normalizedValue.split(" | ");
    return items.filter(Boolean).join(", ") || "Unspecified value";
  }
  return fact.normalizedValue || "Unspecified value";
};

function FactRow({ fact }: { fact: ExtractedFact }) {
  // Rows sit under their group heading, so the family is not repeated here.
  const note = [fact.explicitness === "derived" ? "Worked out from the file, not stated directly" : null, confidenceNote(fact.confidence)].filter(Boolean).join(" · ");
  return <li className="flex flex-col gap-x-4 gap-y-0.5 px-4 py-3 sm:flex-row sm:items-baseline">
    <p className="shrink-0 text-sm font-extrabold text-slate-900 sm:w-44">{factValue(fact)}</p>
    <div className="min-w-0 flex-1">
      <p className="text-xs leading-5 text-slate-700">{fact.statement}</p>
      {note && <p className="text-[11px] text-slate-500">{note}</p>}
    </div>
  </li>;
}

/**
 * Facts that disagree with each other are shown together, once, instead of as
 * unrelated amber cards, so the reader sees that they are the same item.
 */
function FactList({ facts }: { facts: ExtractedFact[] }) {
  const groups = new Map<string, ExtractedFact[]>();
  facts.forEach((fact) => { if (fact.contradictionGroup) groups.set(fact.contradictionGroup, [...(groups.get(fact.contradictionGroup) ?? []), fact]); });
  const rendered = new Set<string>();
  const card = (fact: ExtractedFact) => <FactRow key={fact.factId} fact={fact}/>;
  if (facts.length === 0) return <p className="mt-3 text-xs text-slate-500">No values were extracted from this response.</p>;
  const cards = (items: ExtractedFact[]) => items.flatMap((fact) => {
    const group = fact.contradictionGroup;
    if (!group || (groups.get(group)?.length ?? 0) < 2) return [card(fact)];
    if (rendered.has(group)) return [];
    rendered.add(group);
    const members = groups.get(group)!;
    return [<li key={`group-${group}`} className="bg-amber-50/40 px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-bold text-amber-900"><CircleAlert size={14} aria-hidden="true"/>Conflicting values</p>
      <p className="mt-0.5 text-xs leading-5 text-amber-900">The response gives {members.length} different answers for the same item.</p>
      <ul className="mt-2 divide-y divide-amber-100 rounded-lg border border-amber-200 bg-white">{members.map(card)}</ul>
    </li>];
  });
  // Grouped under plain headings, the figures a buyer compares first; form
  // metadata and identifiers sit in a closed section at the end.
  const { groups: sections, systemEntries } = groupFacts(facts);
  const PREVIEW = 4;
  return <div className="mt-3 space-y-5">
    <p className="text-[11px] text-slate-500">{facts.length - systemEntries.length} values in {sections.length} {sections.length === 1 ? "group" : "groups"}{systemEntries.length ? ` · ${systemEntries.length} system ${systemEntries.length === 1 ? "entry" : "entries"} set aside` : ""}</p>
    {sections.map((section) => {
      const shown = section.facts.slice(0, PREVIEW);
      const rest = section.facts.slice(PREVIEW);
      return <section key={section.family} aria-labelledby={`facts-${section.family}`}>
        <h4 id={`facts-${section.family}`} className="flex items-baseline gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">{section.label}<span className="font-mono text-[10px] font-bold normal-case tracking-normal text-slate-400">{section.facts.length}</span></h4>
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{cards(shown)}</ul>
        {rest.length > 0 && <details className="mt-2"><summary className="cursor-pointer text-[11px] font-bold text-[#0076b4]">Show {rest.length} more in {section.label.toLowerCase()}</summary><ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{cards(rest)}</ul></details>}
      </section>;
    })}
    {systemEntries.length > 0 && <details className="rounded-xl border border-slate-200 bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold text-slate-600">{systemEntries.length} system {systemEntries.length === 1 ? "entry" : "entries"} set aside</summary><p className="mt-1 text-[11px] leading-4 text-slate-500">Form details, contact addresses and reference numbers RFPilot read off the files. They are not compared across vendors.</p><ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{cards(systemEntries)}</ul></details>}
  </div>;
}

const coverageCounts = (mappings: VendorIntelligenceResult["mappings"]) => {
  const counts = { answered: 0, partly_answered: 0, mentioned_only: 0, conflicting: 0, not_answered: 0, not_applicable: 0 };
  mappings.forEach((mapping) => { counts[coverageFromRelationship(mapping.relationship)] += 1; });
  return counts;
};

/** Which of the three columns a requirement lands in. */
type CoverageColumn = "answered" | "partly_answered" | "not_answered";
const columnOf = (relationship: string): CoverageColumn => {
  const level = coverageFromRelationship(relationship);
  if (level === "answered" || level === "not_applicable") return "answered";
  if (level === "partly_answered" || level === "conflicting") return "partly_answered";
  return "not_answered";
};
const columns: Array<{ key: CoverageColumn; title: string; headerClassName: string; countClassName: string; empty: string }> = [
  { key: "answered", title: "Answered", headerClassName: "border-emerald-200 bg-emerald-50 text-emerald-900", countClassName: "bg-emerald-600 text-white", empty: "Nothing fully answered." },
  { key: "partly_answered", title: "Partly answered", headerClassName: "border-amber-200 bg-amber-50 text-amber-900", countClassName: "bg-amber-500 text-white", empty: "Nothing partly answered." },
  { key: "not_answered", title: "Not answered", headerClassName: "border-rose-200 bg-rose-50 text-rose-900", countClassName: "bg-rose-600 text-white", empty: "Nothing missing." },
];

/**
 * Three columns, one per outcome, so the reader sees at a glance what the
 * vendor covered, half-covered and missed. A chip appears on a card only when
 * its exact status differs from the column's plain one (conflicting answers,
 * mentioned only, not applicable); the description sentence appears only
 * where a reader has to decide something. A missing answer needs no
 * explanation beyond its column.
 */
function MappingList({ mappings }: { mappings: VendorIntelligenceResult["mappings"] }) {
  if (mappings.length === 0) return <p className="mt-3 text-xs text-slate-500">No requirements mapped.</p>;
  const mandatoryFirst = (left: RequirementMapping, right: RequirementMapping) => Number(right.mandatory) - Number(left.mandatory);
  return <div className="mt-3 grid gap-3 md:grid-cols-3" data-testid="requirements-table">
    {columns.map((column) => {
      const rows = mappings.filter((mapping) => columnOf(mapping.relationship) === column.key).sort(mandatoryFirst);
      return <section key={column.key} aria-labelledby={`requirements-column-${column.key}`} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h4 id={`requirements-column-${column.key}`} className={`flex items-center justify-between gap-2 border-b px-3 py-2 text-xs font-extrabold ${column.headerClassName}`}>
          {column.title}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${column.countClassName}`}>{rows.length}</span>
        </h4>
        {rows.length === 0
          ? <p className="px-3 py-4 text-xs text-slate-400">{column.empty}</p>
          : <ul className="divide-y divide-slate-100">{rows.map((mapping) => {
            const level = coverageFromRelationship(mapping.relationship);
            const presentation = coverage(mapping.relationship);
            const showChip = level !== column.key;
            const meta = [mapping.mandatory ? "Mandatory" : null, confidenceNote(mapping.confidence)].filter(Boolean).join(" · ");
            return <li key={mapping.mappingId} className="px-3 py-3">
              <p className="text-sm font-bold leading-5 text-slate-800">{mapping.requirementTitle}</p>
              {(meta || showChip) && <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                {showChip && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${presentation.className}`} title={presentation.description}>{presentation.label}</span>}
                {meta && <span className="text-[10px] uppercase tracking-wide text-slate-400">{meta}</span>}
              </div>}
              {!["answered", "not_applicable", "not_answered"].includes(level) && <p className="mt-1 text-xs leading-5 text-slate-600">{presentation.description}</p>}
            </li>;
          })}</ul>}
      </section>;
    })}
  </div>;
}

const vendorLabel = (name?: string) => name?.trim() || "this vendor";

/** One sentence that carries the whole state of the analysis. */
const verdictSentence = (mappings: VendorIntelligenceResult["mappings"]) => {
  const counts = coverageCounts(mappings);
  const total = mappings.length - counts.not_applicable;
  if (total === 0) return "No requirements have been checked against this response yet.";
  const mandatoryGaps = mappings.filter((mapping) => mapping.mandatory && ["not_answered", "mentioned_only"].includes(coverageFromRelationship(mapping.relationship))).length;
  const lead = counts.answered === total ? `All ${total} requirements answered.` : `${counts.answered} of ${total} requirements answered.`;
  const gaps = [
    counts.partly_answered ? `${counts.partly_answered} partly answered` : null,
    counts.not_answered + counts.mentioned_only ? `${counts.not_answered + counts.mentioned_only} not answered${mandatoryGaps ? `, including ${mandatoryGaps} mandatory` : ""}` : null,
    counts.conflicting ? `${counts.conflicting} with conflicting answers` : null,
  ].filter(Boolean);
  return `${lead}${gaps.length ? ` ${gaps.join(", ")}.` : ""}`;
};

const gapTitles = (mappings: VendorIntelligenceResult["mappings"]) =>
  mappings.filter((mapping) => coverageFromRelationship(mapping.relationship) !== "answered" && coverageFromRelationship(mapping.relationship) !== "not_applicable").map((mapping) => mapping.requirementTitle);

/** Opens the composer as a one-to-one question to this vendor, not as a proposal campaign. */
const emailHref = (input: { proposalId: string; to?: string; subject: string; message: string; vendorName?: string; returnTo?: string }) => {
  const params = new URLSearchParams({ mode: "question", proposalId: input.proposalId, subject: input.subject, message: input.message });
  if (input.to) params.set("to", input.to);
  if (input.vendorName?.trim()) params.set("vendor", input.vendorName.trim());
  if (input.returnTo) params.set("returnTo", input.returnTo);
  return `/email/send-email?${params.toString()}`;
};



/** Tells the planner what to do now, based on what the analysis found. */
function WhatNext({ blocked, mappings, vendorName, vendorEmail, proposalId, proposalTitle, returnTo }: {
  blocked: boolean; mappings: VendorIntelligenceResult["mappings"]; vendorName?: string; vendorEmail?: string; proposalId: string; proposalTitle?: string; returnTo?: string;
}) {
  const name = vendorLabel(vendorName);
  const gaps = gapTitles(mappings);
  const askHref = emailHref({
    proposalId, to: vendorEmail, vendorName, returnTo,
    subject: `Questions about your response${proposalTitle ? ` to ${proposalTitle}` : ""}`,
    message: `Hello,\n\nThank you for your response${proposalTitle ? ` to ${proposalTitle}` : ""}. We could not find answers to the following requirements and would appreciate clarification:\n\n${gaps.map((title) => `- ${title}`).join("\n")}\n\nThank you.`,
  });
  const compareHref = `/proposals/${encodeURIComponent(proposalId)}/intelligence`;
  return <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="What to do next">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">What to do next</p>
    {blocked
      ? <p className="mt-1 text-sm text-slate-700">Resolve the unavailable file above first. Once the analysis can use it, {name} can be included in the vendor comparison.</p>
      : <>
        <p className="mt-1 text-sm text-slate-700">{gaps.length > 0
          ? `${name} left ${gaps.length} ${gaps.length === 1 ? "requirement" : "requirements"} unanswered or only partly answered. You can ask them about it, or compare all vendors as things stand.`
          : `${name} covered every requirement. Compare all vendors when you are ready.`}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {gaps.length > 0 && <Link href={askHref} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#008ad2] px-3.5 text-xs font-bold text-white hover:bg-[#0076b4]"><MailPlus size={13} aria-hidden="true"/>Ask {name} about the {gaps.length === 1 ? "gap" : `${gaps.length} gaps`}</Link>}
          <Link href={compareHref} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 hover:border-[#008ad2]">Compare all vendors <ArrowRight size={13} aria-hidden="true"/></Link>
        </div>
      </>}
  </div>;
}

export default function VendorFactsSection({ proposalId, proposalTitle, vendorName, vendorEmail, submissionId, versionId, returnTo, onIntelligence }: {
  proposalId: string; submissionId: string; versionId: string;
  /** Where "Back to the response" and a sent question return to. */
  returnTo?: string;
  /** Used in the header, the blocker card, and the prefilled vendor emails. */
  proposalTitle?: string; vendorName?: string; vendorEmail?: string;
  /** Lets the page share the loaded run with sections that depend on it. */
  onIntelligence?: (state: { loaded: boolean; result?: VendorIntelligenceResult }) => void;
}) {
  const [result, setResult] = useState<VendorIntelligenceResult>();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState<"mappings" | "facts">("mappings");
  const cancelled = useRef(false);
  // Held in a ref so a parent passing an inline callback cannot retrigger the
  // notification effect on every render.
  const onIntelligenceRef = useRef(onIntelligence);
  useEffect(() => { onIntelligenceRef.current = onIntelligence; }, [onIntelligence]);

  const load = useCallback(async () => {
    const response = await getLatestVendorIntelligenceAction(proposalId, submissionId, versionId);
    if (cancelled.current) return;
    setLoading(false);
    if (response.success) { setResult(response.data); setError(undefined); }
    else if (response.code === "INTELLIGENCE_RUN_NOT_FOUND") { setResult(undefined); setError(undefined); }
    else setError(response.message);
  }, [proposalId, submissionId, versionId]);

  useEffect(() => { cancelled.current = false; const timer = window.setTimeout(() => void load(), 0); return () => { cancelled.current = true; window.clearTimeout(timer); }; }, [load]);
  useEffect(() => { if (!result || !["queued", "running"].includes(result.run.status)) return; const timer = window.setTimeout(() => void load(), 2000); return () => window.clearTimeout(timer); }, [result, load]);
  useEffect(() => { onIntelligenceRef.current?.({ loaded: !loading, result }); }, [loading, result]);

  const start = async () => {
    setStarting(true); setError(undefined);
    const response = await createVendorIntelligenceAction(proposalId, submissionId, versionId, crypto.randomUUID());
    if (cancelled.current) return;
    setStarting(false);
    if (!response.success) { setError(response.message); return; }
    await load();
  };

  const processing = starting || result?.run.status === "queued" || result?.run.status === "running";
  // A succeeded run is never redone for the same inputs (the backend returns
  // the saved result), so present the button as an up-to-date state instead
  // of implying a rerun.
  const upToDate = !processing && result?.run.status === "succeeded";
  const name = vendorLabel(vendorName);
  // Mirrors the backend: only an unavailable source blocks; partial pages warn.
  const blocked = result?.run.warnings.some(isBlockingWarning) ?? false;
  return <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm" aria-labelledby="vendor-intelligence-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-2xl">
      <h3 id="vendor-intelligence-title" className="text-base font-extrabold text-slate-900">How {name} answered your requirements</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">Use this to see what {name} left out or only partly covered before you compare vendors. Nothing here ranks or picks a winner.</p>
      {upToDate && result && <p className="mt-2 text-sm font-bold text-slate-800" data-testid="requirements-verdict">{verdictSentence(result.mappings)}</p>}
    </div>{!upToDate && <button type="button" onClick={() => void start()} disabled={processing || loading} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#087f69] px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={13} className={processing ? "animate-spin" : ""}/>{processing ? "Checking…" : result ? "Retry the check" : "Check this response"}</button>}</div>
    {error && (result ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p> : <SectionLoadError what="the proposal intelligence analysis" message={error} onRetry={() => { setLoading(true); setError(undefined); void load(); }} retrying={loading}/>)}
    {loading && <p className="mt-4 text-xs text-slate-500">Checking proposal intelligence…</p>}
    {!loading && !result && !error && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">This response has not been checked against your requirements yet. Use the button above to start.</p>}
    {result?.run.status === "failed" && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">The run failed safely{result.run.safeErrorCode ? ` (${result.run.safeErrorCode})` : ""}. No unsupported findings were saved.</p>}
    {result && ["queued", "running"].includes(result.run.status) && <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-800">Checking the response against your requirements. This page will update on its own.</p>}
    {result?.run.status === "succeeded" && <>
      {result.run.contradictionCount > 0 && <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800"><CircleAlert size={14}/>{name} gave conflicting answers in places. They are kept side by side under Numbers and dates they gave so you can decide which is right.</p>}
      <div className="mt-4 flex gap-2 border-b border-slate-200" role="tablist" aria-label="Analysis views">
        <button type="button" role="tab" aria-selected={tab === "mappings"} onClick={() => setTab("mappings")} className={`border-b-2 px-3 py-2 text-sm font-bold ${tab === "mappings" ? "border-[#008ad2] text-[#0076b4]" : "border-transparent text-slate-500"}`}>What they answered</button>
        <button type="button" role="tab" aria-selected={tab === "facts"} onClick={() => setTab("facts")} className={`border-b-2 px-3 py-2 text-sm font-bold ${tab === "facts" ? "border-[#008ad2] text-[#0076b4]" : "border-transparent text-slate-500"}`}>Numbers and dates they gave</button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{tab === "mappings"
        ? `Each thing you asked for, and whether ${name} covered it. Sorted into what they answered, partly answered, and did not answer.`
        : `The numbers and dates ${name} gave, such as the total cost, staffing, and schedule. These are what gets compared across vendors.`}</p>
      {tab === "mappings"
        ? <MappingList mappings={result.mappings}/>
        : <FactList facts={result.facts}/>}
      <WhatNext blocked={blocked} mappings={result.mappings} vendorName={vendorName} vendorEmail={vendorEmail} proposalId={proposalId} proposalTitle={proposalTitle} returnTo={returnTo}/>
    </>}
  </section>;
}

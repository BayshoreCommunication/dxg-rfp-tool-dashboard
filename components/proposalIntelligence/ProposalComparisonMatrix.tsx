"use client";

import type {
  ComparisonEvidence,
  ComparisonRequirement,
  ComparisonWorkspace,
} from "@/app/actions/comparisonOrchestration";
import IntelligenceStatusChip from "@/components/proposalIntelligence/IntelligenceStatusChip";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import { comparisonCellId } from "@/lib/proposalIntelligence/anchors";
import type { IntelligenceStatus } from "@/lib/proposalIntelligence/statusVocabulary";
import { cn } from "@/lib/utils";
import { FileSearch, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type CellSelection = {
  requirement: ComparisonRequirement;
  vendor: ComparisonRequirement["vendors"][number];
};

const label = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const locatorLabel = (locator: Record<string, unknown>) =>
  Object.entries(locator).map(([key, value]) => `${key.replaceAll("_", " ")} ${typeof value === "object" ? JSON.stringify(value) : String(value)}`).join(" · ") || "Location recorded";

const verdictStatus = (verdict: string): IntelligenceStatus => {
  if (verdict === "addressed") return "complete";
  if (verdict === "partially_addressed") return "partial";
  if (verdict === "contradictory") return "attention";
  if (verdict === "missing" || verdict === "not_assessable") return "unavailable";
  return "not_started";
};

const verdictLabel = (verdict: string) =>
  verdict === "missing" || verdict === "not_assessable" ? "Not stated" : label(verdict);

function SourceEvidence({ evidence }: { evidence: ComparisonEvidence }) {
  return (
    <article className={intelligenceSurfaceClasses.block}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-extrabold text-navy">{evidence.sourceLabel}</p>
        {evidence.supportRole && <IntelligenceStatusChip status={evidence.supportRole === "contradicts" ? "attention" : "complete"} label={label(evidence.supportRole)} />}
      </div>
      <p className="mt-2 font-mono text-xs text-gray">{locatorLabel(evidence.locator)}</p>
      <blockquote className="mt-3 border-l-2 border-brand pl-3 text-sm leading-6 text-gray">{evidence.excerpt}</blockquote>
      {evidence.facts?.length ? (
        <details className="mt-3 border-t border-gray-border pt-3">
          <summary className="cursor-pointer text-xs font-extrabold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{evidence.facts.length} extracted {evidence.facts.length === 1 ? "fact" : "facts"}</summary>
          <ul className="mt-2 space-y-2">
            {evidence.facts.map((fact) => (
              <li key={fact.factId} className="text-xs leading-5 text-gray">
                <span className="font-mono font-bold text-navy">{fact.normalizedValue || "Value unavailable"}</span> · {fact.statement}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

function EvidenceDialog({ selection, onClose }: { selection: CellSelection; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/40" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="matrix-evidence-title" className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-border bg-white p-5">
          <div><p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">Source evidence</p><h3 id="matrix-evidence-title" className="mt-1 text-xl font-extrabold text-navy">{selection.requirement.title}</h3><p className="mt-1 text-sm text-gray">{selection.vendor.vendorLabel}</p></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close source evidence" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-border text-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="space-y-4 p-5">
          <section className={intelligenceSurfaceClasses.block}><h4 className="text-xs font-extrabold uppercase tracking-wide text-gray">Assessment</h4><div className="mt-2"><IntelligenceStatusChip status={verdictStatus(selection.vendor.verdict)} label={verdictLabel(selection.vendor.verdict)} /></div><p className="mt-3 text-sm leading-6 text-gray">{selection.vendor.rationale || "No assessment rationale was stored."}</p></section>
          {selection.vendor.evidence.length > 0 ? selection.vendor.evidence.map((evidence) => <SourceEvidence key={`${evidence.evidenceId}-${evidence.supportRole ?? "evidence"}`} evidence={evidence} />) : (
            <section className={cn(intelligenceSurfaceClasses.block, "bg-gray-panel")}><h4 className="text-sm font-extrabold text-navy">No source passage stored</h4><p className="mt-2 text-sm leading-6 text-gray">Treat this requirement as not stated. The system does not infer compliance from missing evidence.</p></section>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function ProposalComparisonMatrix({ workspace }: { workspace: ComparisonWorkspace }) {
  const requirements = workspace.intelligence.requirements;
  const [category, setCategory] = useState("all");
  const [selection, setSelection] = useState<CellSelection>();
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    requirements.forEach((requirement) => counts.set(requirement.kind, (counts.get(requirement.kind) ?? 0) + 1));
    return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [requirements]);
  const visible = category === "all" ? requirements : requirements.filter((requirement) => requirement.kind === category);
  const vendors = workspace.participants;

  return (
    <section className={cn(intelligenceSurfaceClasses.card, "mt-5")} aria-labelledby="comparison-matrix-title">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">State B · Comparison</p><h2 id="comparison-matrix-title" className="mt-2 text-2xl font-extrabold text-navy">Vendor requirement matrix</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-gray">Respondents are rows and approved RFP requirements are columns. Open any cell to inspect its persisted source context; missing evidence always reads “not stated.”</p></div>
        <span className="font-mono text-xs text-gray">{vendors.length} vendors · {requirements.length} requirements</span>
      </header>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter requirements by category">
        <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")} className={cn(intelligenceSurfaceClasses.chip, category === "all" ? "border-brand bg-brand-muted text-brand-dark" : "border-gray-border bg-white text-gray", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand")}>All · {requirements.length}</button>
        {categories.map(([kind, count]) => <button key={kind} type="button" aria-pressed={category === kind} onClick={() => setCategory(kind)} className={cn(intelligenceSurfaceClasses.chip, category === kind ? "border-brand bg-brand-muted text-brand-dark" : "border-gray-border bg-white text-gray", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand")}>{label(kind)} · {count}</button>)}
      </div>

      {visible.length === 0 ? (
        <div className={cn(intelligenceSurfaceClasses.block, "mt-5 bg-gray-panel text-center")}><FileSearch className="mx-auto text-brand" size={24} aria-hidden="true" /><h3 className="mt-3 font-extrabold text-navy">No requirements in this category</h3><p className="mt-1 text-sm text-gray">Choose another category to continue comparing vendors.</p></div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-border">
          <table className="min-w-max border-separate border-spacing-0 text-left">
            <thead><tr><th className="sticky left-0 z-20 min-w-60 border-b border-r border-gray-border bg-gray-panel p-3 text-xs font-extrabold text-navy">Respondent</th>{visible.map((requirement) => <th key={requirement.requirementId} className="min-w-56 max-w-64 border-b border-gray-border bg-gray-panel p-3 align-top"><p className="text-xs font-extrabold text-navy">{requirement.title}</p><p className="mt-1 text-xs font-normal text-gray">{label(requirement.kind)}{requirement.mandatoryStatus === "mandatory" ? " · Mandatory" : ""}</p></th>)}</tr></thead>
            <tbody>
              {vendors.map((participant) => <tr key={participant.participantId}><th scope="row" className="sticky left-0 z-10 border-b border-r border-gray-border bg-white p-3 align-top"><p className="text-sm font-extrabold text-navy">{participant.vendorLabel}</p><p className="mt-1 font-mono text-xs text-gray">Version {participant.versionId.slice(0, 8)}</p></th>{visible.map((requirement) => {
                const vendor = requirement.vendors.find((item) => item.participantId === participant.participantId);
                return <td key={requirement.requirementId} className="border-b border-gray-border p-2 align-top">{vendor ? <button id={comparisonCellId(requirement.requirementId, participant.participantId)} type="button" onClick={() => setSelection({ requirement, vendor })} className="min-h-24 w-full scroll-mt-24 rounded-xl p-2 text-left hover:bg-gray-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><IntelligenceStatusChip status={verdictStatus(vendor.verdict)} label={verdictLabel(vendor.verdict)} /><p className="mt-2 line-clamp-3 text-xs leading-5 text-gray">{vendor.rationale || (vendor.evidence.length ? "Source evidence stored." : "No source evidence stored.")}</p><p className="mt-2 font-mono text-xs font-bold text-brand-dark">{vendor.evidence.length} {vendor.evidence.length === 1 ? "source" : "sources"}</p></button> : <button id={comparisonCellId(requirement.requirementId, participant.participantId)} type="button" onClick={() => setSelection({ requirement, vendor: { participantId: participant.participantId, vendorLabel: participant.vendorLabel, assessmentId: null, verdict: "not_assessable", rationale: "No assessment exists for this frozen vendor version.", confidence: null, needsHumanReview: true, reviewReasons: ["assessment_missing"], evidence: [], reviewHistory: [] } })} className="min-h-24 w-full scroll-mt-24 rounded-xl p-2 text-left hover:bg-gray-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><IntelligenceStatusChip status="unavailable" label="Not stated" /><p className="mt-2 text-xs text-gray">No assessment exists.</p></button>}</td>;
              })}</tr>)}
            </tbody>
            <tfoot><tr><th className="sticky left-0 z-10 border-r border-gray-border bg-gray-panel p-3 text-xs font-extrabold text-navy">Field coverage</th>{visible.map((requirement) => { const count = requirement.vendors.filter((vendor) => vendor.evidence.length > 0).length; return <td key={requirement.requirementId} className="bg-gray-panel p-3 font-mono text-xs font-bold text-gray">{count}/{vendors.length} with source evidence</td>; })}</tr></tfoot>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-gray">Numeric field averages, spreads, relative positions, and inferred-vs-stated markers are unavailable because the persisted comparison contract does not expose per-vendor criterion values or fact explicitness. No values are estimated in this matrix.</p>
      {selection && <EvidenceDialog selection={selection} onClose={() => setSelection(undefined)} />}
    </section>
  );
}

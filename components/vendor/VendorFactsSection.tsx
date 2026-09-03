"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert, ClipboardList, FileWarning, MailPlus, Pencil, RefreshCw, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { familyLabel, groupFacts } from "@/lib/vendorResponses/factPresentation";
import SectionLoadError from "@/components/vendor/SectionLoadError";
import { coverageFromRelationship, coveragePresentation } from "@/lib/proposalIntelligence/coverageVocabulary";
import { isBlockingWarning } from "@/lib/proposalIntelligence/evaluationGate";
import {
  createVendorIntelligenceAction,
  getLatestVendorIntelligenceAction,
  reviewVendorIntelligenceAction,
  type ExtractedFact,
  type HumanReview,
  type VendorIntelligenceResult,
} from "@/app/actions/vendorIntelligence";

const coverage = (relationship: string) => coveragePresentation[coverageFromRelationship(relationship)];
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
/** A percentage alone begs "compared to what"; say what it means for the reader. */
const confidenceNote = (confidence: number) =>
  confidence < 0.7 ? `Needs a human check · the AI was ${Math.round(confidence * 100)}% sure` : null;
type RequirementMapping = VendorIntelligenceResult["mappings"][number];
type ReviewDecision = "accepted" | "rejected" | "corrected" | "escalated";
type ReviewTarget = { type: "fact"; fact: ExtractedFact } | { type: "mapping"; mapping: RequirementMapping };
/** Statuses a planner may set on a requirement; the backend's relationship enum. */
const correctableRelationships: Array<{ value: string; needsEvidence: boolean }> = [
  { value: "supports", needsEvidence: true },
  { value: "partially_supports", needsEvidence: true },
  { value: "context_only", needsEvidence: true },
  { value: "contradicts", needsEvidence: true },
  { value: "none", needsEvidence: false },
];

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

export const factCorrectionPayload = (fact: ExtractedFact, value: string): Record<string, unknown> | null => {
  const corrected = value.trim();
  if (!corrected) return null;
  if (fact.valueKind === "money") {
    const match = /^(?:([a-z]{3})\s+)?(-?\d+(?:\.\d+)?)$/i.exec(corrected.replaceAll(",", ""));
    const currency = (match?.[1] ?? fact.currency ?? "").toUpperCase();
    const amount = Number(match?.[2]);
    return match && /^[A-Z]{3}$/.test(currency) && Number.isFinite(amount)
      ? { normalizedValue: `${currency} ${amount}`, typedValue: { kind: "money", number: amount, currency } }
      : null;
  }
  if (["number", "quantity"].includes(fact.valueKind)) {
    const number = Number(corrected.replaceAll(",", ""));
    return Number.isFinite(number)
      ? { normalizedValue: String(number), typedValue: { kind: fact.valueKind, number } }
      : null;
  }
  if (fact.valueKind === "boolean") {
    const normalized = corrected.toLowerCase();
    if (!["true", "false", "yes", "no"].includes(normalized)) return null;
    const boolean = normalized === "true" || normalized === "yes";
    return { normalizedValue: String(boolean), typedValue: { kind: "boolean", boolean } };
  }
  if (fact.valueKind === "list") {
    const list = corrected.split(/[\n,]/).map((item) => item.trim()).filter(Boolean).slice(0, 30);
    return list.length ? { normalizedValue: list.join(" | "), typedValue: { kind: "list", list } } : null;
  }
  return {
    normalizedValue: corrected,
    typedValue: { kind: fact.valueKind, text: corrected },
  };
};


/**
 * Review is opt-in. Most findings need no action, so the four decisions sit
 * behind one link, and each one says what it does to scoring before it is
 * clicked. Corrections work for both facts (a new value) and requirements (a
 * new answer status backed by the already-cited evidence).
 */
function ReviewControls({ target, review, saving, onReview }: {
  target: ReviewTarget; review?: HumanReview; saving: boolean;
  onReview: (decision: ReviewDecision, correctedPayload: Record<string, unknown> | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [value, setValue] = useState("");
  const [relationship, setRelationship] = useState(target.type === "mapping" ? target.mapping.relationship : "none");
  if (review) {
    if (review.decision === "accepted" && review.note?.startsWith("Automatically acknowledged")) return null;
    return <p className="mt-3 text-[11px] font-semibold text-slate-500">Your review: <span className="text-slate-800">{label(review.decision)}</span>{review.note ? ` · ${review.note}` : ""}</p>;
  }
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#0076b4] hover:underline"><Pencil size={11} aria-hidden="true"/>Disagree with this?</button>;
  }
  const isFact = target.type === "fact";
  const evidenceIds = target.type === "mapping" ? target.mapping.evidence.map((item) => item.fragmentId) : [];
  const chosen = correctableRelationships.find((item) => item.value === relationship);
  const canSaveMapping = Boolean(chosen) && (!chosen?.needsEvidence || evidenceIds.length > 0);
  const saveCorrection = () => {
    if (isFact) return onReview("corrected", factCorrectionPayload(target.fact, value));
    return onReview("corrected", canSaveMapping ? { relationship, fragmentIds: chosen?.needsEvidence ? evidenceIds : [] } : null);
  };
  const choices: Array<{ decision: ReviewDecision; name: string; explain: string; icon: React.ReactNode; className: string }> = [
    { decision: "accepted", name: "Accept", icon: <Check size={12}/>, className: "border-emerald-200 text-emerald-700",
      explain: isFact ? "Keep this value and mark it as checked by you." : "Keep this answer status and mark it as checked by you." },
    { decision: "rejected", name: "Reject", icon: <X size={12}/>, className: "border-red-200 text-red-700",
      explain: isFact ? "Remove this value. It will not be used in scoring." : "Treat this requirement as not answered by the vendor." },
    { decision: "corrected", name: "Correct", icon: <Pencil size={12}/>, className: "border-slate-200 text-slate-700",
      explain: isFact ? "Replace the value with the one you verified in the file." : "Change the answer status to the one you verified in the file." },
    { decision: "escalated", name: "Escalate", icon: <ShieldAlert size={12}/>, className: "border-amber-200 text-amber-700",
      explain: "Park it for someone else to decide. It stays out of scoring until resolved." },
  ];
  return <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[11px] leading-4 text-slate-600">Your decision replaces the AI&rsquo;s finding when this response is scored.</p>
      <button type="button" onClick={() => { setOpen(false); setCorrecting(false); }} className="text-[11px] font-bold text-slate-500 hover:text-slate-800">Close</button>
    </div>
    <ul className="mt-2 space-y-1.5">{choices.map((choice) => <li key={choice.decision} className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button type="button" disabled={saving} onClick={() => { if (choice.decision === "corrected") setCorrecting((current) => !current); else void onReview(choice.decision, null); }} className={`inline-flex min-w-24 items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-50 ${choice.className}`}>{choice.icon}{choice.name}</button>
      <span className="text-[11px] text-slate-600">{choice.explain}</span>
    </li>)}</ul>
    {correcting && (isFact
      ? <div className="mt-3 flex gap-2">
          <input aria-label="Corrected value" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Enter the verified corrected value" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#008ad2]" />
          <button type="button" disabled={saving || !value.trim()} onClick={() => void saveCorrection()} className="rounded-lg bg-[#087f69] px-3 text-xs font-bold text-white disabled:opacity-50">Save correction</button>
        </div>
      : <div className="mt-3 flex flex-wrap items-center gap-2">
          <select aria-label="Corrected status" value={relationship} onChange={(event) => setRelationship(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#008ad2]">
            {correctableRelationships.map((item) => <option key={item.value} value={item.value} disabled={item.needsEvidence && evidenceIds.length === 0}>{coverage(item.value).label}{item.needsEvidence && evidenceIds.length === 0 ? " (needs cited evidence)" : ""}</option>)}
          </select>
          <button type="button" disabled={saving || !canSaveMapping} onClick={() => void saveCorrection()} className="rounded-lg bg-[#087f69] px-3 text-xs font-bold text-white disabled:opacity-50">Save correction</button>
          <span className="text-[11px] text-slate-500">Uses the evidence already cited for this requirement.</span>
        </div>)}
  </div>;
}

function FactCard({ fact, review, saving, onReview }: { fact: ExtractedFact; review?: HumanReview; saving: boolean; onReview: (decision: ReviewDecision, payload: Record<string, unknown> | null) => Promise<void> }) {
  const note = confidenceNote(fact.confidence);
  return <li className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-base font-extrabold text-slate-900">{factValue(fact)}</p>
    <p className="mt-0.5 text-xs leading-5 text-slate-600">{fact.statement}</p>
    <p className="mt-1 text-[11px] text-slate-500">{[familyLabel(fact.family), fact.explicitness === "derived" ? "Worked out from the file, not stated directly" : null, note].filter(Boolean).join(" · ")}</p>
    <ReviewControls target={{ type: "fact", fact }} review={review} saving={saving} onReview={onReview}/>
  </li>;
}

/**
 * Facts that disagree with each other are shown together, once, instead of as
 * unrelated amber cards, so the reader sees that they are the same item.
 */
function FactList({ facts, latestReviews, savingTarget, onReview }: {
  facts: ExtractedFact[]; latestReviews: Map<string, HumanReview>; savingTarget?: string;
  onReview: (factId: string, decision: ReviewDecision, payload: Record<string, unknown> | null) => Promise<void>;
}) {
  const groups = new Map<string, ExtractedFact[]>();
  facts.forEach((fact) => { if (fact.contradictionGroup) groups.set(fact.contradictionGroup, [...(groups.get(fact.contradictionGroup) ?? []), fact]); });
  const rendered = new Set<string>();
  const card = (fact: ExtractedFact) => <FactCard key={fact.factId} fact={fact} review={latestReviews.get(`fact:${fact.factId}`)} saving={savingTarget === `fact:${fact.factId}`} onReview={(decision, payload) => onReview(fact.factId, decision, payload)}/>;
  if (facts.length === 0) return <p className="mt-3 text-xs text-slate-500">No values were extracted from this response.</p>;
  const cards = (items: ExtractedFact[]) => items.flatMap((fact) => {
    const group = fact.contradictionGroup;
    if (!group || (groups.get(group)?.length ?? 0) < 2) return [card(fact)];
    if (rendered.has(group)) return [];
    rendered.add(group);
    const members = groups.get(group)!;
    return [<li key={`group-${group}`} className="rounded-xl border border-amber-300 bg-amber-50/40 p-3">
      <p className="flex items-center gap-2 text-xs font-bold text-amber-900"><CircleAlert size={14} aria-hidden="true"/>Conflicting values</p>
      <p className="mt-0.5 text-xs leading-5 text-amber-900">The response gives {members.length} different answers for the same item. Accept the right one and reject the others.</p>
      <ul className="mt-2 space-y-2">{members.map(card)}</ul>
    </li>];
  });
  // Grouped under plain headings, the figures a buyer compares first; form
  // metadata and identifiers sit in a closed section at the end.
  const confirmed = new Set([...latestReviews.entries()].filter(([key, review]) => key.startsWith("fact:") && ["accepted", "corrected"].includes(review.decision)).map(([key]) => key.slice("fact:".length)));
  const { groups: sections, systemEntries } = groupFacts(facts, confirmed);
  const PREVIEW = 4;
  return <div className="mt-3 space-y-5">
    <p className="text-[11px] text-slate-500">{facts.length - systemEntries.length} values in {sections.length} {sections.length === 1 ? "group" : "groups"}{systemEntries.length ? ` · ${systemEntries.length} system ${systemEntries.length === 1 ? "entry" : "entries"} set aside` : ""}</p>
    {sections.map((section) => {
      const shown = section.facts.slice(0, PREVIEW);
      const rest = section.facts.slice(PREVIEW);
      return <section key={section.family} aria-labelledby={`facts-${section.family}`}>
        <h4 id={`facts-${section.family}`} className="flex items-baseline gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">{section.label}<span className="font-mono text-[10px] font-bold normal-case tracking-normal text-slate-400">{section.facts.length}</span></h4>
        <ul className="mt-2 space-y-3">{cards(shown)}</ul>
        {rest.length > 0 && <details className="mt-2"><summary className="cursor-pointer text-[11px] font-bold text-[#0076b4]">Show {rest.length} more in {section.label.toLowerCase()}</summary><ul className="mt-2 space-y-3">{cards(rest)}</ul></details>}
      </section>;
    })}
    {systemEntries.length > 0 && <details className="rounded-xl border border-slate-200 bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold text-slate-600">{systemEntries.length} system {systemEntries.length === 1 ? "entry" : "entries"} set aside</summary><p className="mt-1 text-[11px] leading-4 text-slate-500">Form details, contact addresses and reference numbers RFPilot read off the files. They are not compared across vendors.</p><ul className="mt-2 space-y-3">{cards(systemEntries)}</ul></details>}
  </div>;
}

const coverageCounts = (mappings: VendorIntelligenceResult["mappings"]) => {
  const counts = { answered: 0, partly_answered: 0, mentioned_only: 0, conflicting: 0, not_answered: 0, not_applicable: 0 };
  mappings.forEach((mapping) => { counts[coverageFromRelationship(mapping.relationship)] += 1; });
  return counts;
};

/**
 * One row per requirement. The repeated "what this chip means" sentence is
 * shown only where a reader has to decide something (anything not fully
 * answered); fully answered rows carry the chip, the mandatory tag, and the
 * evidence link, which is all they need.
 */
function MappingList({ mappings, attentionOnly, onAttentionOnlyChange, latestReviews, savingTarget, onReview }: {
  mappings: VendorIntelligenceResult["mappings"];
  attentionOnly: boolean;
  onAttentionOnlyChange: (value: boolean) => void;
  latestReviews: Map<string, HumanReview>;
  savingTarget?: string;
  onReview: (mappingId: string, decision: ReviewDecision, payload: Record<string, unknown> | null) => Promise<void>;
}) {
  const counts = coverageCounts(mappings);
  const needsAttention = (relationship: string) => coverageFromRelationship(relationship) !== "answered";
  const attentionCount = mappings.filter((mapping) => needsAttention(mapping.relationship)).length;
  // Gaps first: the rows a planner must act on should not be buried at row 12.
  const visible = (attentionOnly ? mappings.filter((mapping) => needsAttention(mapping.relationship)) : mappings)
    .slice()
    .sort((left, right) => Number(needsAttention(right.relationship)) - Number(needsAttention(left.relationship)));
  const summary = [
    [counts.answered, "answered"], [counts.partly_answered, "partly answered"], [counts.mentioned_only, "mentioned only"],
    [counts.conflicting, "conflicting"], [counts.not_answered, "not answered"], [counts.not_applicable, "not applicable"],
  ].filter(([count]) => Number(count) > 0).map(([count, name]) => `${count} ${name}`).join(" · ");
  return <>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-semibold text-slate-600" aria-live="polite">{summary || "No requirements mapped."}</p>
      {attentionCount > 0 && attentionCount < mappings.length && <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={attentionOnly} onChange={(event) => onAttentionOnlyChange(event.target.checked)}/>Only the {attentionCount} needing attention</label>}
    </div>
    <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">{visible.map((mapping) => {
      const key = `mapping:${mapping.mappingId}`;
      const presentation = coverage(mapping.relationship);
      const meta = [mapping.mandatory ? "Mandatory" : null, confidenceNote(mapping.confidence)].filter(Boolean).join(" · ");
      return <li key={mapping.mappingId} className="px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">{mapping.requirementTitle}</p>
            {meta && <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{meta}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${presentation.className}`} title={presentation.description}>{presentation.label}</span>
        </div>
        {needsAttention(mapping.relationship) && <p className="mt-1 text-xs leading-5 text-slate-600">{presentation.description}</p>}
        <ReviewControls target={{ type: "mapping", mapping }} review={latestReviews.get(key)} saving={savingTarget === key} onReview={(decision, payload) => onReview(mapping.mappingId, decision, payload)}/>
      </li>;
    })}</ul>
  </>;
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

const warningSources = (warnings: VendorIntelligenceResult["run"]["warnings"]) =>
  [...new Set(warnings.map((warning) => (typeof warning.sourceLabel === "string" ? warning.sourceLabel : "")).filter(Boolean))];

/**
 * The most important thing on the page when it applies. Two flavours, matching
 * the backend rule: a source that was unavailable to the analysis blocks
 * scoring and comparison; partially readable pages do not block but may hide
 * answers. Both are written as a task with two ways out, not as a warning.
 */
function UnreadableFileCard({ warnings, blocked, vendorName, vendorEmail, proposalId, proposalTitle, returnTo }: {
  warnings: VendorIntelligenceResult["run"]["warnings"]; blocked: boolean; vendorName?: string; vendorEmail?: string; proposalId: string; proposalTitle?: string; returnTo?: string;
}) {
  const sources = warningSources(blocked ? warnings.filter(isBlockingWarning) : warnings);
  const name = vendorLabel(vendorName);
  const heading = blocked
    ? (sources.length === 1 ? `${sources[0]} could not be used by the analysis` : sources.length > 1 ? `${sources.length} files could not be used by the analysis` : "A file could not be used by the analysis")
    : (sources.length === 1 ? `Some pages of ${sources[0]} could not be read` : sources.length > 1 ? `Some pages of ${sources.length} files could not be read` : "Some pages of this response could not be read");
  const fileList = sources.length ? sources.map((source) => `"${source}"`).join(", ") : "your response";
  const askHref = emailHref({
    proposalId, to: vendorEmail, vendorName, returnTo,
    subject: `Text-based copy of your response${proposalTitle ? ` to ${proposalTitle}` : ""}`,
    message: `Hello,\n\nOur system could not read part of ${fileList} in your response${proposalTitle ? ` to ${proposalTitle}` : ""}. Could you send a text-based (not scanned) copy of the same document?\n\nThank you.`,
  });
  const details = warnings.map((warning) => `${typeof warning.sourceLabel === "string" ? `${warning.sourceLabel}: ` : ""}${String(warning.message ?? "Some response evidence was unavailable.")}`);
  return <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
    <p className="flex items-center gap-2 text-sm font-bold"><FileWarning size={16} aria-hidden="true"/>{heading}</p>
    <p className="mt-1 text-xs leading-5">{blocked
      ? `Until it can be, ${name} is left out of the vendor comparison and cannot be scored. Retry the check above, or get a fresh copy of the file.`
      : `Scoring and comparison can go ahead with what was read, but the unread pages may hold answers we have not seen. Check the gaps below before deciding, or get a readable copy.`}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <Link href={askHref} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#008ad2] px-3.5 text-xs font-bold text-white hover:bg-[#0076b4]"><MailPlus size={13} aria-hidden="true"/>Ask {name} for a text-based copy</Link>
      <Link href={`/vendor-responses/proposals/${encodeURIComponent(proposalId)}?add=manual`} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-amber-400 bg-white px-3.5 text-xs font-bold text-amber-900 hover:bg-amber-100"><ClipboardList size={13} aria-hidden="true"/>Add the missing figures manually</Link>
    </div>
    {details.length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">Details</summary><ul className="mt-1 list-disc space-y-1 pl-5">{details.map((detail, index) => <li key={`${detail}-${index}`}>{detail}</li>)}</ul></details>}
  </div>;
}

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
  const [savingTarget, setSavingTarget] = useState<string>();
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState<"mappings" | "facts">("mappings");
  const [attentionOnly, setAttentionOnly] = useState(false);
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

  const latestReviews = useMemo(() => {
    const reviews = new Map<string, HumanReview>();
    result?.reviews.forEach((review) => reviews.set(`${review.targetType}:${review.targetId}`, review));
    return reviews;
  }, [result?.reviews]);

  const start = async () => {
    setStarting(true); setError(undefined);
    const response = await createVendorIntelligenceAction(proposalId, submissionId, versionId, crypto.randomUUID());
    if (cancelled.current) return;
    setStarting(false);
    if (!response.success) { setError(response.message); return; }
    await load();
  };
  const review = async (targetType: "fact" | "mapping", targetId: string, decision: ReviewDecision, correctedPayload?: Record<string, unknown> | null) => {
    if (!result) return;
    if (decision === "corrected" && !correctedPayload) {
      setError(targetType === "fact"
        ? "The corrected value does not match this fact’s type. Use a valid number, currency amount, boolean, or text value."
        : "Choose an answer status that the cited evidence can support.");
      return;
    }
    setSavingTarget(`${targetType}:${targetId}`); setError(undefined);
    const response = await reviewVendorIntelligenceAction(proposalId, submissionId, versionId, result.run.runId, {
      targetType, targetId, decision, reasonCode: decision === "corrected" ? "human_verified_correction" : "human_review",
      note: decision === "corrected" ? "Value corrected by the proposal owner." : "", correctedPayload: correctedPayload ?? null,
    }, crypto.randomUUID());
    if (cancelled.current) return;
    setSavingTarget(undefined);
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
  const hasSourceWarnings = (result?.run.warnings.length ?? 0) > 0;
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
      {hasSourceWarnings && <UnreadableFileCard warnings={result.run.warnings} blocked={blocked} vendorName={vendorName} vendorEmail={vendorEmail} proposalId={proposalId} proposalTitle={proposalTitle} returnTo={returnTo}/>}
      {result.run.contradictionCount > 0 && <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800"><CircleAlert size={14}/>{name} gave conflicting answers in places. They are kept side by side under Stated values so you can decide which is right.</p>}
      <div className="mt-4 flex gap-2 border-b border-slate-200" role="tablist" aria-label="Analysis views">
        <button type="button" role="tab" aria-selected={tab === "mappings"} onClick={() => setTab("mappings")} className={`border-b-2 px-3 py-2 text-xs font-bold ${tab === "mappings" ? "border-[#008ad2] text-[#0076b4]" : "border-transparent text-slate-500"}`}>Requirements</button>
        <button type="button" role="tab" aria-selected={tab === "facts"} onClick={() => setTab("facts")} className={`border-b-2 px-3 py-2 text-xs font-bold ${tab === "facts" ? "border-[#008ad2] text-[#0076b4]" : "border-transparent text-slate-500"}`}>Stated values</button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{tab === "mappings"
        ? `Each thing you asked for, and whether ${name} covered it. Anything not fully answered is listed first.`
        : `The numbers and dates ${name} gave, such as the total cost, staffing, and schedule. These are what gets compared across vendors.`}</p>
      {tab === "mappings"
        ? <MappingList mappings={result.mappings} attentionOnly={attentionOnly} onAttentionOnlyChange={setAttentionOnly} latestReviews={latestReviews} savingTarget={savingTarget} onReview={(mappingId, decision, payload) => review("mapping", mappingId, decision, payload)}/>
        : <FactList facts={result.facts} latestReviews={latestReviews} savingTarget={savingTarget} onReview={(factId, decision, payload) => review("fact", factId, decision, payload)}/>}
      <WhatNext blocked={blocked} mappings={result.mappings} vendorName={vendorName} vendorEmail={vendorEmail} proposalId={proposalId} proposalTitle={proposalTitle} returnTo={returnTo}/>
    </>}
  </section>;
}

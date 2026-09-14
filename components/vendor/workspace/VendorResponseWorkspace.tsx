"use client";

import type { SectionId, VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseWorkspaceV1 } from "@/contracts/generated/vendor-response-workspace-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import {
  applicableSections,
  formatMoney,
  sectionState,
  validateWorkspaceResponse,
  workspaceTotals,
  type VendorDraftDto,
  type VendorWorkspaceIssue,
} from "@/lib/vendorResponses/workspaceModel";
import { AlertCircle, Check, CheckCircle2, ChevronDown, Circle, Clock3, Loader2, LockKeyhole, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CompanyProfileSection from "./CompanyProfileSection";
import ComplianceSection from "./ComplianceSection";
import PricingSection from "./PricingSection";
import ReviewSubmitSection from "./ReviewSubmitSection";
import RoomResponseSection from "./RoomResponseSection";
import WorkspaceSection from "./WorkspaceSection";

type Props = {
  workspace: VendorResponseWorkspaceV1;
  accessGrant: string;
  initialEmail?: string;
};

type SaveState = "saved" | "dirty" | "saving" | "error";
type Receipt = {
  submissionId: string;
  versionId: string;
  versionNumber: number;
  receivedAt: string;
  manifestChecksum: string;
};

const TASK_FIVE_SECTIONS = new Set<SectionId>(["compliance", "company_profile", "rooms", "pricing", "review"]);

const dateLabel = (value?: string): string => {
  if (!value) return "No deadline listed";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
};

const saveTimeLabel = (value?: string): string => {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved" : `Saved ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)}`;
};

export default function VendorResponseWorkspace({ workspace, accessGrant, initialEmail = "" }: Props) {
  const questionnaire = workspace.questionnaire;
  const startingResponse = useRef<VendorResponseV1 | null>(workspace.draft
    ? initialEmail && !workspace.draft.response.identity.email
      ? { ...workspace.draft.response, identity: { ...workspace.draft.response.identity, email: initialEmail } }
      : workspace.draft.response
    : null);
  const [draft, setDraft] = useState<VendorDraftDto | null>(workspace.draft);
  const [response, setResponse] = useState<VendorResponseV1 | null>(startingResponse.current);
  const [activeSection, setActiveSection] = useState<SectionId>("compliance");
  const [creatingDraft, setCreatingDraft] = useState(!workspace.draft && workspace.access.canEdit);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>(workspace.draft && startingResponse.current === workspace.draft.response ? "saved" : "dirty");
  const [saveError, setSaveError] = useState("");
  const [serverIssues, setServerIssues] = useState<VendorWorkspaceIssue[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const createStarted = useRef(false);
  const draftRef = useRef<VendorDraftDto | null>(workspace.draft);
  const responseRef = useRef<VendorResponseV1 | null>(startingResponse.current);
  const lastSavedJson = useRef(workspace.draft ? JSON.stringify(workspace.draft.response) : "");
  const savingRef = useRef(false);
  const queuedSnapshot = useRef<VendorResponseV1 | null>(null);
  const persistRef = useRef<(snapshot: VendorResponseV1) => Promise<boolean>>(async () => false);
  const finalizeKey = useRef<string | null>(null);

  const requestHeaders = useMemo(() => ({ "Content-Type": "application/json", "x-rfpilot-access-grant": accessGrant }), [accessGrant]);
  const endpoint = useCallback((suffix: string) => `/api/vendor-responses${suffix}?proposalId=${encodeURIComponent(questionnaire.proposalId)}`, [questionnaire.proposalId]);

  const applyDraft = useCallback((next: VendorDraftDto) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const createDraft = useCallback(async () => {
    setCreatingDraft(true);
    setLoadError("");
    try {
      const result = await fetch(endpoint("/drafts"), { method: "POST", headers: requestHeaders, body: "{}" });
      const json = await result.json();
      if (!result.ok || !json.success || !json.data) throw new Error(json.message || "Your response draft could not be started.");
      const nextDraft = json.data as VendorDraftDto;
      const nextResponse = initialEmail && !nextDraft.response.identity.email
        ? { ...nextDraft.response, identity: { ...nextDraft.response.identity, email: initialEmail } }
        : nextDraft.response;
      applyDraft(nextDraft);
      responseRef.current = nextResponse;
      setResponse(nextResponse);
      lastSavedJson.current = JSON.stringify(nextDraft.response);
      setSaveState(JSON.stringify(nextResponse) === lastSavedJson.current ? "saved" : "dirty");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Your response draft could not be started.");
    } finally {
      setCreatingDraft(false);
    }
  }, [applyDraft, endpoint, initialEmail, requestHeaders]);

  useEffect(() => {
    if (!workspace.draft && workspace.access.canEdit && !createStarted.current) {
      createStarted.current = true;
      void createDraft();
    }
  }, [createDraft, workspace.access.canEdit, workspace.draft]);

  const persist = useCallback(async (snapshot: VendorResponseV1): Promise<boolean> => {
    const currentDraft = draftRef.current;
    if (!currentDraft || !workspace.access.canEdit) return false;
    if (savingRef.current) {
      queuedSnapshot.current = snapshot;
      return false;
    }
    if (JSON.stringify(snapshot) === lastSavedJson.current) {
      setSaveState("saved");
      return true;
    }
    savingRef.current = true;
    setSaveState("saving");
    setSaveError("");
    let succeeded = false;
    try {
      const result = await fetch(endpoint(`/drafts/${currentDraft.draftId}`), {
        method: "PATCH",
        headers: requestHeaders,
        body: JSON.stringify({ draftRevision: currentDraft.draftRevision, response: snapshot }),
      });
      const json = await result.json();
      if (!result.ok || !json.success || !json.data) {
        if (Number.isInteger(json.latestDraftRevision)) {
          const latest = { ...currentDraft, draftRevision: json.latestDraftRevision };
          applyDraft(latest);
        }
        throw new Error(json.message || "Changes could not be saved.");
      }
      const savedDraft = json.data as VendorDraftDto;
      applyDraft(savedDraft);
      lastSavedJson.current = JSON.stringify(snapshot);
      setSaveState(JSON.stringify(responseRef.current) === lastSavedJson.current ? "saved" : "dirty");
      succeeded = true;
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Changes could not be saved.");
    } finally {
      savingRef.current = false;
      const queued = queuedSnapshot.current;
      queuedSnapshot.current = null;
      if (succeeded && queued && JSON.stringify(queued) !== lastSavedJson.current) {
        void persistRef.current(queued);
      }
    }
    return succeeded;
  }, [applyDraft, endpoint, requestHeaders, workspace.access.canEdit]);
  persistRef.current = persist;

  useEffect(() => {
    if (!response || !draft || JSON.stringify(response) === lastSavedJson.current || savingRef.current) return;
    setSaveState("dirty");
    const timer = window.setTimeout(() => void persistRef.current(response), 850);
    return () => window.clearTimeout(timer);
  }, [draft, response]);

  const updateResponse = (next: VendorResponseV1) => {
    responseRef.current = next;
    setResponse(next);
    setServerIssues([]);
    setSaveState("dirty");
  };

  const sections = response ? applicableSections(questionnaire, response) : questionnaire.sections.filter((section) => section.enabled).sort((a, b) => a.order - b.order);
  useEffect(() => {
    if (sections.length && !sections.some((section) => section.sectionId === activeSection)) setActiveSection(sections[0].sectionId);
  }, [activeSection, sections]);

  const localIssues = response ? validateWorkspaceResponse(questionnaire, response) : [];
  const issues = serverIssues.length ? serverIssues : localIssues;
  const requiredSections = sections.filter((section) => section.required && section.sectionId !== "review");
  const completedSections = response ? requiredSections.filter((section) => sectionState(section.sectionId, response, localIssues) === "complete").length : 0;
  const completionPercent = requiredSections.length ? Math.round(completedSections / requiredSections.length * 100) : 100;
  const totals = response ? workspaceTotals(questionnaire, response) : { grandMinor: 0, totalSpecs: 0, answeredSpecs: 0, complySpecs: 0 };
  const compliancePercent = totals.totalSpecs ? Math.round(totals.complySpecs / totals.totalSpecs * 100) : null;
  const activeIndex = Math.max(0, sections.findIndex((section) => section.sectionId === activeSection));
  const navigate = (sectionId: string) => {
    if (sections.some((section) => section.sectionId === sectionId)) {
      setActiveSection(sectionId as SectionId);
      window.requestAnimationFrame(() => document.getElementById("vendor-workspace-content")?.focus());
    }
  };

  const finalize = async () => {
    if (!draft || !response || issues.length || saveState !== "saved") return;
    setSubmitting(true);
    setServerIssues([]);
    finalizeKey.current ??= globalThis.crypto?.randomUUID?.() ?? `${draft.draftId}-${draft.draftRevision}`;
    try {
      const result = await fetch(endpoint(`/drafts/${draft.draftId}/finalize`), {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ draftRevision: draft.draftRevision, submissionIdempotencyKey: finalizeKey.current }),
      });
      const json = await result.json();
      if (!result.ok || !json.success || !json.data) {
        if (Array.isArray(json.errors)) setServerIssues(json.errors);
        if (Number.isInteger(json.latestDraftRevision)) applyDraft({ ...draft, draftRevision: json.latestDraftRevision });
        setSaveError(json.message || "Your proposal could not be submitted.");
        setSaveState("error");
        setActiveSection("review");
        return;
      }
      setReceipt(json.data as Receipt);
    } catch {
      setSaveError("We could not confirm submission. Retry to safely check the same submission request.");
      setSaveState("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!workspace.access.canEdit && !draft) {
    return <WorkspaceProblem title={questionnaire.context.proposalTitle} message={workspace.access.message ?? "This proposal is not accepting vendor responses."} />;
  }
  if (receipt) return <SubmissionConfirmation receipt={receipt} response={response!} questionnaire={questionnaire} />;
  if (creatingDraft || (!draft && !loadError)) return <WorkspaceLoading title={questionnaire.context.proposalTitle} />;
  if (loadError || !draft || !response) return <WorkspaceProblem title={questionnaire.context.proposalTitle} message={loadError || "Your response draft is unavailable."} onRetry={workspace.access.canEdit ? createDraft : undefined} />;

  const disabled = !workspace.access.canEdit || draft.status !== "active";
  const activeDefinition = sections[activeIndex];

  return (
    <div className="min-h-screen bg-[#f3f6f8] pb-40 text-[#16283c] [&_input]:scroll-mb-36 [&_select]:scroll-mb-36 [&_textarea]:scroll-mb-36 sm:pb-28">
      <header className="bg-[#16283c] text-white shadow-sm">
        <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7">
          <div className="flex items-baseline gap-3"><span className="text-[25px] font-extrabold tracking-[-0.04em]">RFP<span className="text-[#2fc6f5]">ilot</span></span><span className="hidden text-[11px] font-semibold tracking-[0.04em] text-[#9fb2c4] sm:inline">Vendor response portal</span></div>
          <div className="max-w-2xl text-left sm:text-right"><p className="truncate text-sm font-extrabold">{questionnaire.context.proposalTitle}</p><p className="mt-0.5 text-xs text-[#b8c6d2]">{[questionnaire.context.plannerOrganizationName, questionnaire.context.venueName, `Due ${dateLabel(questionnaire.context.proposalDueDate)}`].filter(Boolean).join(" · ")}</p></div>
        </div>
      </header>

      {!workspace.access.canEdit ? <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm font-bold text-amber-900"><LockKeyhole className="mr-2 inline" size={15} aria-hidden="true" />{workspace.access.message ?? "This response is read-only."}</div> : null}

      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:items-start lg:px-7">
        <aside className="hidden w-[268px] shrink-0 lg:sticky lg:top-6 lg:block" aria-label="Response sections">
          <div className="overflow-hidden rounded-lg border border-[#dce4eb] bg-white shadow-[0_1px_4px_rgba(15,42,67,0.04)]">
            <div className="border-b border-[#dce4eb] px-4 py-4"><div className="flex items-center justify-between text-xs"><span className="font-bold text-[#607487]">Required sections complete</span><strong className="text-[#16283c]">{completionPercent}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6edf2]"><div className="h-full rounded-full bg-[#2fc6f5] transition-[width]" style={{ width: `${completionPercent}%` }} /></div></div>
            <nav>{sections.map((section, index) => <SectionButton key={section.sectionId} section={section} number={index + 1} active={activeSection === section.sectionId} state={sectionState(section.sectionId, response, localIssues)} available={TASK_FIVE_SECTIONS.has(section.sectionId)} onClick={() => navigate(section.sectionId)} />)}</nav>
          </div>
          <p className="mt-3 px-1 text-[11px] leading-4 text-[#718496]">Rooms and specifications come directly from the client’s published RFP. Your draft saves securely as you work.</p>
        </aside>

        <main className="min-w-0 flex-1" style={{ scrollPaddingBottom: "9rem" }}>
          <div className="mb-4 lg:hidden"><label className="text-xs font-extrabold text-[#42576a]" htmlFor="vendor-section-select">Response section</label><div className="relative"><select id="vendor-section-select" className="mt-1 h-11 w-full appearance-none rounded-md border border-[#ccd8e2] bg-white px-3 pr-10 text-sm font-bold" value={activeSection} onChange={(event) => navigate(event.target.value)}>{sections.map((section, index) => <option key={section.sectionId} value={section.sectionId}>{index + 1}. {section.title}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-4 text-[#718496]" size={17} aria-hidden="true" /></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dce4eb]"><div className="h-full bg-[#2fc6f5]" style={{ width: `${completionPercent}%` }} /></div></div>
          <div id="vendor-workspace-content" tabIndex={-1} className="outline-none">
            {activeSection === "compliance" ? <ComplianceSection questionnaire={questionnaire} response={response} onChange={updateResponse} sectionNumber={activeIndex + 1} disabled={disabled} /> : null}
            {activeSection === "company_profile" ? <CompanyProfileSection questionnaire={questionnaire} response={response} onChange={updateResponse} sectionNumber={activeIndex + 1} disabled={disabled} /> : null}
            {activeSection === "rooms" ? <RoomResponseSection questionnaire={questionnaire} response={response} onChange={updateResponse} sectionNumber={activeIndex + 1} disabled={disabled} /> : null}
            {activeSection === "pricing" ? <PricingSection questionnaire={questionnaire} response={response} onChange={updateResponse} sectionNumber={activeIndex + 1} disabled={disabled} /> : null}
            {activeSection === "review" ? <ReviewSubmitSection questionnaire={questionnaire} response={response} issues={issues} sectionNumber={activeIndex + 1} onNavigate={navigate} /> : null}
            {!TASK_FIVE_SECTIONS.has(activeSection) && activeDefinition ? <WorkspaceSection number={activeIndex + 1} title={activeDefinition.title} helperText={activeDefinition.helperText} evaluationMappings={activeDefinition.evaluationMappings}><div className="rounded-md border border-[#d8ebf5] bg-[#eef8fd] p-5"><h2 className="font-extrabold text-[#16283c]">Section shell is ready</h2><p className="mt-1 text-sm leading-5 text-[#52687b]">This section is part of the next vendor-response delivery. Existing saved data and its validation status are preserved in this workspace.</p></div></WorkspaceSection> : null}
          </div>
        </main>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#dce4eb] bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(22,40,60,0.06)] sm:px-7">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2">
          <div className="min-w-0 flex-1 text-xs text-[#607487]"><span className="font-extrabold text-[#16283c]">{completionPercent}%</span> complete <span className="hidden md:inline">· Spec compliance: <b className="text-[#16283c]">{compliancePercent === null ? "—" : `${compliancePercent}%`}</b> · Grand total: <b className="text-[#16283c]">{formatMoney(totals.grandMinor, questionnaire.pricing.currency, questionnaire.pricing.decimalPrecision)}</b></span><SaveIndicator state={saveState} lastSavedAt={draft.lastSavedAt} /></div>
          <div className="ml-auto flex items-center gap-3">
            {saveState === "error" ? <button type="button" onClick={() => void persist(response)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-50"><RefreshCw size={14} aria-hidden="true" /> Retry save</button> : null}
            {issues.length ? <details className="relative"><summary className="cursor-pointer list-none whitespace-nowrap text-xs font-extrabold text-rose-700">{issues.length} item{issues.length === 1 ? "" : "s"} blocking submission</summary><div className="absolute bottom-11 right-0 max-h-72 w-[min(420px,calc(100vw-2rem))] overflow-y-auto rounded-md border border-[#dce4eb] bg-white p-4 shadow-xl"><p className="font-extrabold text-[#16283c]">Complete before submitting</p><ul className="mt-2 space-y-2 text-xs text-[#52687b]">{issues.slice(0, 20).map((entry) => <li key={`${entry.path}-${entry.message}`}><button className="text-left hover:text-[#0075b4] hover:underline" onClick={() => navigate(entry.sectionId)}>• {entry.message}</button></li>)}</ul></div></details> : null}
            <button type="button" disabled={disabled || submitting || issues.length > 0 || saveState !== "saved"} onClick={() => void finalize()} className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-[#008ad2] px-5 text-sm font-extrabold text-white hover:bg-[#0075b4] disabled:cursor-not-allowed disabled:bg-[#d4dce3] disabled:text-[#8394a3]"><Send size={15} aria-hidden="true" />{submitting ? "Submitting…" : "Submit proposal"}</button>
          </div>
          {saveError ? <p className="basis-full text-xs font-bold text-rose-700" role="alert">{saveError} Your unsaved entries are still on this page.</p> : null}
        </div>
      </footer>
    </div>
  );
}

function SectionButton({ section, number, active, state, available, onClick }: { section: VendorResponseQuestionnaireV1["sections"][number]; number: number; active: boolean; state: ReturnType<typeof sectionState>; available: boolean; onClick: () => void }) {
  const label = state === "complete" ? "Complete" : state === "in_progress" ? "In progress" : "Not started";
  return <button type="button" onClick={onClick} aria-current={active ? "step" : undefined} className={`flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left transition ${active ? "border-[#2fc6f5] bg-[#eef8fd]" : "border-transparent hover:bg-[#f8fafb]"}`}><span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${state === "complete" ? "bg-emerald-600 text-white" : state === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-[#e3e9ee] text-[#718496]"}`} aria-label={label}>{state === "complete" ? <Check size={11} aria-hidden="true" /> : state === "in_progress" ? <Clock3 size={10} aria-hidden="true" /> : <Circle size={7} fill="currentColor" aria-hidden="true" />}</span><span className="min-w-0 flex-1"><span className={`block text-[13px] font-bold ${active ? "text-[#0069a0]" : "text-[#334b60]"}`}>{number}. {section.title}</span>{!available ? <span className="text-[10px] font-bold text-[#8a9aaa]">Next delivery</span> : null}</span>{!section.required ? <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8a9aaa]">Optional</span> : null}</button>;
}

function SaveIndicator({ state, lastSavedAt }: { state: SaveState; lastSavedAt?: string }) {
  return <span className={`ml-3 inline-flex items-center gap-1.5 font-bold ${state === "error" ? "text-rose-700" : state === "saving" || state === "dirty" ? "text-amber-700" : "text-emerald-700"}`} role="status" aria-live="polite">{state === "saving" ? <Loader2 className="animate-spin" size={13} aria-hidden="true" /> : state === "error" ? <AlertCircle size={13} aria-hidden="true" /> : <CheckCircle2 size={13} aria-hidden="true" />}{state === "saving" ? "Saving…" : state === "dirty" ? "Changes pending" : state === "error" ? "Save failed" : saveTimeLabel(lastSavedAt)}</span>;
}

function WorkspaceLoading({ title }: { title: string }) {
  return <main className="grid min-h-screen place-items-center bg-[#f3f6f8] px-5"><div className="w-full max-w-md rounded-lg border border-[#dce4eb] bg-white p-8 text-center shadow-sm"><Loader2 className="mx-auto animate-spin text-[#008ad2]" size={28} aria-hidden="true" /><h1 className="mt-4 text-xl font-extrabold text-[#16283c]">Preparing your response workspace</h1><p className="mt-2 text-sm text-[#607487]">Loading {title} and securely resuming any saved draft.</p><p className="sr-only" role="status">Loading vendor response workspace</p></div></main>;
}

export function WorkspaceProblem({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-[#f3f6f8] px-5"><div className="w-full max-w-lg rounded-lg border border-[#dce4eb] bg-white p-8 text-center shadow-sm"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600"><LockKeyhole size={22} aria-hidden="true" /></div><p className="mt-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0075b4]">Vendor response portal</p><h1 className="mt-2 text-2xl font-extrabold text-[#16283c]">{title}</h1><p className="mt-3 text-sm leading-6 text-[#607487]" role="alert">{message}</p>{onRetry ? <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#008ad2] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0075b4]" onClick={onRetry}><RefreshCw size={15} aria-hidden="true" /> Try again</button> : null}</div></main>;
}

function SubmissionConfirmation({ receipt, response, questionnaire }: { receipt: Receipt; response: VendorResponseV1; questionnaire: VendorResponseQuestionnaireV1 }) {
  return <main className="grid min-h-screen place-items-center bg-[#f3f6f8] px-5 py-10"><section className="w-full max-w-xl overflow-hidden rounded-lg border border-[#dce4eb] bg-white shadow-[0_18px_55px_rgba(15,42,67,0.10)]"><div className="h-1.5 bg-emerald-500" /><div className="p-8 text-center sm:p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={30} aria-hidden="true" /></div><p className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">Response received</p><h1 className="mt-2 text-3xl font-extrabold text-[#16283c]">Thank you, {response.identity.submittedBy || response.identity.vendorName}.</h1><p className="mt-3 text-sm leading-6 text-[#607487]">Version {receipt.versionNumber} of your response to {questionnaire.context.proposalTitle} is ready for the planner to review.</p><dl className="mt-6 grid grid-cols-2 gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-left"><div><dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-700">Version</dt><dd className="mt-1 font-extrabold text-emerald-950">{receipt.versionNumber}</dd></div><div><dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-700">Receipt</dt><dd className="mt-1 truncate font-mono text-xs font-bold text-emerald-950" title={receipt.versionId}>{receipt.versionId}</dd></div></dl><p className="mt-5 text-xs text-[#718496]">Received {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.receivedAt))}</p></div></section></main>;
}

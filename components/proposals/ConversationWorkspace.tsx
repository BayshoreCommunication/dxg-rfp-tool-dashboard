"use client";

import {
  type ConversationIntent,
  type ConversationMessage,
  type ConversationQuestion,
  type ConversationRunType,
} from "@/app/actions/conversation";
import { presentJob } from "@/lib/asyncOperations";
import { useState } from "react";
import { useConversation, useNotesScan, useProposalSources } from "./useConversation";

export const defaultIntentContent: Record<ConversationIntent, string> = {
  chat: "",
  extract_requirements: "Extract the requirements from the selected sources.",
  generate_draft: "Generate a proposal draft from the current information.",
};

const runLabels: Record<ConversationRunType, { pending: string; failed: string; view: string }> = {
  proposal_context: { pending: "Extracting requirements…", failed: "Requirement extraction did not finish. Try again.", view: "View extracted requirements" },
  proposal_draft: { pending: "Drafting the proposal…", failed: "Draft generation did not finish. Try again.", view: "View draft" },
};

export default function ConversationWorkspace({
  proposalId,
  proposalVersion,
  onOpenRun,
}: {
  proposalId: string;
  proposalVersion?: number;
  onOpenRun?: (runType: ConversationRunType, runId: string) => void;
}) {
  const [text, setText] = useState("");
  const [notesMode, setNotesMode] = useState(false);
  const [notesNonConfidential, setNotesNonConfidential] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const {
    data, loading, loadError, pending, sendMessage, retrySend,
    resolveQuestion: patchQuestion, questionBusyId, questionError,
  } = useConversation(proposalId);
  const { notesJob, notesJobId, notesError, notesBusy, submitNotes: saveNotes } = useNotesScan(proposalId);
  const { sources: allSources } = useProposalSources(proposalId, notesJobId);
  const sources = allSources.filter(item => item.status === "ready" && item.confidentiality === "non_confidential");

  const send = async (intent: ConversationIntent) => {
    const content = text.trim() || defaultIntentContent[intent];
    if (!content) return;
    if (intent === "extract_requirements" && selectedSourceIds.length === 0) return;
    if (intent === "generate_draft" && typeof proposalVersion !== "number") return;
    setText("");
    await sendMessage({
      content,
      intent,
      sourceIds: selectedSourceIds.slice(0, 5),
      expectedProposalVersion: proposalVersion,
    });
  };

  const submitNotes = async () => {
    const saved = await saveNotes(text, notesNonConfidential ? "non_confidential" : "confidential");
    if (saved) setText("");
  };

  const resolveQuestion = async (question: ConversationQuestion, status: "answered" | "dismissed") => {
    const answer = (answers[question.id] ?? "").trim();
    if (status === "answered" && !answer) return;
    const resolved = await patchQuestion(question.id, status === "answered" ? { status, answer } : { status });
    if (resolved) setAnswers(prev => ({ ...prev, [question.id]: "" }));
  };

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void (notesMode ? submitNotes() : send("chat"));
    }
  };

  const toggleSource = (sourceId: string) =>
    setSelectedSourceIds(prev => prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : prev.length >= 5 ? prev : [...prev, sourceId]);

  const messages = data?.messages ?? [];
  const openQuestions = (data?.questions ?? []).filter(item => item.status === "open");
  const resolvedQuestions = (data?.questions ?? []).filter(item => item.status !== "open");
  const notesPresentation = notesJob ? presentJob(notesJob) : null;
  const notesTone = notesPresentation?.tone === "success" ? "border-emerald-300 bg-emerald-50" : notesPresentation?.tone === "error" ? "border-red-300 bg-red-50" : notesPresentation?.tone === "warning" ? "border-amber-300 bg-amber-50" : "border-cyan-200 bg-cyan-50";
  const textRows = Math.min(6, Math.max(2, text.split("\n").length));
  const canExtract = selectedSourceIds.length > 0 && pending.every(item => item.state !== "sending");
  const canDraft = typeof proposalVersion === "number" && pending.every(item => item.state !== "sending");
  const sending = pending.some(item => item.state === "sending");

  const renderMessage = (message: ConversationMessage) => {
    const labels = message.runType ? runLabels[message.runType] : null;
    if (message.role === "system_event") {
      return (
        <li key={message.id} className="text-center text-xs text-slate-500">{message.content}</li>
      );
    }
    const mine = message.role === "user";
    return (
      <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[85%] rounded-xl border p-3 text-sm ${mine ? "border-[#103B4C] bg-[#103B4C] text-white" : message.kind === "question_answer" ? "border-amber-200 bg-amber-50 text-slate-800" : "border-slate-200 bg-white text-slate-800"}`}>
          {message.kind === "question_answer" && <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${mine ? "text-cyan-200" : "text-amber-700"}`}>Answer</p>}
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.attachments.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map(attachment => (
                <li key={attachment.sourceId} className={`rounded-full border px-2 py-1 text-xs ${mine ? "border-cyan-300/50 text-cyan-100" : "border-slate-300 bg-slate-50 text-slate-600"}`}>
                  <span className="max-w-[12rem] truncate align-middle" title={attachment.filename}>{attachment.filename || "Attached source"}</span>
                  {attachment.sourceStatus && <span className="ml-1 opacity-75">· {attachment.sourceStatus.replaceAll("_", " ")}</span>}
                </li>
              ))}
            </ul>
          )}
          {labels && message.status === "pending" && (
            <p role="status" className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <span aria-hidden className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
              {labels.pending} You can keep working while this finishes.
            </p>
          )}
          {labels && message.status === "failed" && (
            <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800">{labels.failed}</p>
          )}
          {labels && message.status === "complete" && message.runId && onOpenRun && (
            <button
              type="button"
              onClick={() => onOpenRun(message.runType as ConversationRunType, message.runId as string)}
              className="mt-2 text-xs font-semibold text-[#087f69] underline underline-offset-2"
            >
              {labels.view}
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <section aria-labelledby="conversation-workspace-title" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="conversation-workspace-title" className="text-lg font-semibold text-slate-900">Work with the proposal assistant</h2>
      <p className="mt-1 text-sm text-slate-600">Add information, ask for requirement extraction, and generate a read-only draft. Every saved change still requires your explicit review.</p>

      {loadError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{loadError}</p>}

      <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
        {loading && <p role="status" className="text-sm text-slate-600">Loading the conversation…</p>}
        {!loading && messages.length === 0 && pending.length === 0 && (
          <p className="text-sm text-slate-600">No messages yet. Share notes or instructions below to get started.</p>
        )}
        <ol className="space-y-3">
          {messages.map(renderMessage)}
          {pending.map(entry => (
            <li key={entry.localId} className="flex justify-end">
              <div className="max-w-[85%] rounded-xl border border-[#103B4C] bg-[#103B4C] p-3 text-sm text-white opacity-90">
                <p className="whitespace-pre-wrap">{entry.content}</p>
                {entry.state === "sending" && <p role="status" className="mt-1 text-xs text-cyan-200">Sending…</p>}
                {entry.state === "failed" && (
                  <p role="alert" className="mt-1 text-xs text-red-200">
                    {entry.errorMessage ?? "The message could not be sent."}{" "}
                    <button type="button" onClick={() => void retrySend(entry.localId)} className="font-semibold underline underline-offset-2">Retry</button>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        {openQuestions.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">Open questions ({openQuestions.length})</h3>
            <ul className="mt-2 space-y-3">
              {openQuestions.map(question => (
                <li key={question.id} className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{question.prompt || question.code.replaceAll("_", " ").toLowerCase()}</p>
                    {question.severity === "blocking" && <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">Blocking</span>}
                  </div>
                  {question.paths.length > 0 && <p className="mt-1 font-mono text-xs text-slate-500">{question.paths.join(", ")}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex-1 text-xs font-medium text-slate-700">
                      <span className="sr-only">Answer for: {question.prompt || question.code}</span>
                      <input
                        value={answers[question.id] ?? ""}
                        onChange={event => setAnswers(prev => ({ ...prev, [question.id]: event.target.value }))}
                        placeholder="Type your answer"
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={questionBusyId === question.id || !(answers[question.id] ?? "").trim()}
                      onClick={() => void resolveQuestion(question, "answered")}
                      className="rounded-md bg-[#087f69] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Answer
                    </button>
                    <button
                      type="button"
                      disabled={questionBusyId === question.id}
                      onClick={() => void resolveQuestion(question, "dismissed")}
                      className="text-xs font-semibold text-slate-600 underline underline-offset-2 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {questionError && <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800">{questionError}</p>}

        {resolvedQuestions.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">Resolved questions ({resolvedQuestions.length})</summary>
            <ul className="mt-2 space-y-2">
              {resolvedQuestions.map(question => (
                <li key={question.id} className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{question.prompt || question.code.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 font-semibold">{question.status}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {notesPresentation && (
        <div role={notesPresentation.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-lg border p-3 text-sm ${notesTone}`}>
          <p className="font-semibold text-slate-900">Notes: {notesPresentation.title}</p>
          <p className="mt-1 text-slate-700">{notesPresentation.detail}</p>
        </div>
      )}
      {notesError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{notesError}</p>}

      <div className="mt-4 rounded-lg border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={notesMode} onChange={event => setNotesMode(event.target.checked)} />
            Add notes (stored as a scanned source, not sent to the assistant)
          </label>
          {notesMode && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={notesNonConfidential} onChange={event => setNotesNonConfidential(event.target.checked)} />
              These notes contain no confidential information — approve them for AI processing
            </label>
          )}
          {typeof proposalVersion !== "number" && !notesMode && <span className="text-xs text-slate-500">Draft generation unlocks after requirements are reviewed.</span>}
        </div>
        <label className="mt-2 block text-sm font-medium text-slate-800">
          <span className="sr-only">{notesMode ? "Notes" : "Message"}</span>
          <textarea
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={textRows}
            placeholder={notesMode ? "Paste or type notes to attach to this proposal…" : "Ask a question or describe what you need… (Cmd/Ctrl+Enter to send)"}
            className="mt-1 w-full resize-none rounded-lg border border-slate-300 p-2 text-sm"
          />
        </label>

        {!notesMode && sources.length === 0 && (
          <p className="mt-2 text-xs text-slate-500">
            No sources are approved for AI processing yet. Requirement extraction needs at least one ready source explicitly
            marked non-confidential — tick that option when uploading a file, or use “Add notes” with AI processing approved.
          </p>
        )}
        {!notesMode && sources.length > 0 && (
          <fieldset className="mt-2">
            <legend className="text-xs font-semibold text-slate-700">Approved sources for extraction (up to five)</legend>
            <ul className="mt-1 flex flex-wrap gap-2">
              {sources.map(source => (
                <li key={source.id}>
                  <label className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${selectedSourceIds.includes(source.id) ? "border-[#087f69] bg-emerald-50 text-slate-800" : "border-slate-300 bg-white text-slate-600"}`}>
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.includes(source.id)}
                      disabled={!selectedSourceIds.includes(source.id) && selectedSourceIds.length >= 5}
                      onChange={() => toggleSource(source.id)}
                    />
                    <span className="max-w-[14rem] truncate" title={source.originalFilename}>{source.originalFilename}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {notesMode ? (
            <button
              type="button"
              disabled={!text.trim() || notesBusy}
              onClick={() => void submitNotes()}
              className="rounded-lg bg-[#103B4C] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {notesBusy ? "Saving notes…" : "Save notes and check"}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!text.trim() || sending}
                onClick={() => void send("chat")}
                className="rounded-lg bg-[#103B4C] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
              <button
                type="button"
                disabled={!canExtract}
                onClick={() => void send("extract_requirements")}
                title={selectedSourceIds.length === 0 ? "Select at least one approved, ready source first." : undefined}
                className="rounded-lg border border-[#087f69] px-4 py-2 text-sm font-semibold text-[#087f69] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Extract requirements
              </button>
              <button
                type="button"
                disabled={!canDraft}
                onClick={() => void send("generate_draft")}
                title={typeof proposalVersion !== "number" ? "Review extracted requirements first to establish the proposal version." : undefined}
                className="rounded-lg border border-[#087f69] px-4 py-2 text-sm font-semibold text-[#087f69] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate draft
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

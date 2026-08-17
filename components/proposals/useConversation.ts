"use client";

// Shared conversation/session hooks behind the chat-first assistant workspace:
// idempotent sends, durable polling, notes-as-source scanning, and
// private upload sessions. They stay a separate module so the conversation
// mechanics can be reasoned about (and tested) apart from the page that renders
// them.

import {
  createProposalNotesAction,
  getConversationAction,
  patchConversationQuestionAction,
  postConversationMessageAction,
  type ConversationData,
  type ConversationIntent,
  type ConversationQuestionAnswer,
} from "@/app/actions/conversation";
import {
  completePrivateUpload,
  createPrivateUploadSession,
  createSourceScanJob,
  getDurableJob,
  listPrivateDocumentSources,
  type PrivateDocumentSource,
} from "@/app/actions/durableJobs";
import { nextPollDelay, presentJob, type DurableJob } from "@/lib/asyncOperations";
import { useCallback, useEffect, useRef, useState } from "react";

const uuidPattern = /^[0-9a-f-]{36}$/i;

// Slightly wider than the server action deadline so a lost request can never
// leave the optimistic entry in "sending" indefinitely. The bound also keeps
// the dashboard compatible while an older synchronous API image drains during
// a rolling deployment.
export const SEND_TIMEOUT_MS = 60_000;

// Fast while an assistant generation is active, then progressively quieter.
// Polling is deliberately the correctness path in production: unlike a
// long-lived Vercel SSE proxy, every request is bounded and reconnect-safe.
export const conversationPollDelay = (pollCount: number, pending: boolean) => {
  if (!pending) return 10_000;
  if (pollCount < 10) return 1_000;
  if (pollCount < 20) return 2_000;
  return 5_000;
};

export const notesScanKey = (proposalId: string) => `rfpilot:notes-scan:${proposalId}`;
export const sourceScanKey = (proposalId: string) => `rfpilot:source-scan:${proposalId}`;
export const autoExtractKey = (proposalId: string) => `rfpilot:auto-extract:${proposalId}`;

export type PendingSend = {
  localId: string;
  proposalId: string;
  content: string;
  intent: ConversationIntent;
  sourceIds: string[];
  expectedProposalVersion?: number;
  idempotencyKey: string;
  acknowledgedMessageId?: string;
  state: "sending" | "failed";
  errorMessage?: string;
};

export type SendInput = {
  content: string;
  intent: ConversationIntent;
  sourceIds?: string[];
  expectedProposalVersion?: number;
};

// Loads the conversation for a proposal (when one exists), keeps it fresh via
// bounded polling, and manages idempotent message sends
// plus clarification-question resolution. Passing null defers everything until
// a proposal is lazily created.
export function useConversation(proposalId: string | null) {
  const [data, setData] = useState<ConversationData | null>(null);
  // The initial load is "settled" once the first fetch for this proposal id
  // resolves; deriving `loading` avoids synchronous setState inside effects.
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const loading = !!proposalId && settledFor !== proposalId;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSend[]>([]);
  const [questionBusyId, setQuestionBusyId] = useState<string | null>(null);
  const [questionFailure, setQuestionFailure] = useState<{ questionId: string; message: string } | null>(null);
  // Initial load, mutation refreshes, polling, and visibility refreshes can
  // overlap. A slower request that started earlier must never replace a newer
  // conversation snapshot (it used to make the populated thread go blank
  // until the following poll restored it).
  const latestReadRef = useRef(0);
  const pendingMessageCount = data?.messages.filter(item => item.status === "pending").length ?? 0;

  const refresh = useCallback(async (targetProposalId?: string) => {
    const target = targetProposalId ?? proposalId;
    if (!target) return null;
    const readId = ++latestReadRef.current;
    const result = await getConversationAction(target);
    if (readId !== latestReadRef.current) return null;
    if (!result.success) {
      setLoadError(result.message);
      return null;
    }
    setSettledFor(target);
    setLoadError(null);
    setData(result.data);
    // A successful POST is only retired from the optimistic layer after its
    // persisted user message is visible in the authoritative conversation.
    // Atlas/read timing can briefly return an older empty snapshot; retaining
    // the entry across that gap prevents both a blank/loading frame and a
    // second send while the first turn is still settling.
    const persistedIds = new Set(result.data.messages.map(message => message.id));
    setPending(prev => prev.filter(item =>
      !item.acknowledgedMessageId || !persistedIds.has(item.acknowledgedMessageId),
    ));
    return result.data;
  }, [proposalId]);

  useEffect(() => {
    if (!proposalId) return;
    let active = true;
    const readId = ++latestReadRef.current;
    void getConversationAction(proposalId).then(result => {
      if (!active || readId !== latestReadRef.current) return;
      setSettledFor(proposalId);
      if (!result.success) { setLoadError(result.message); return; }
      setLoadError(null);
      setData(result.data);
    });
    return () => { active = false; };
  }, [proposalId]);

  // Durable live updates. The database owns generation state; the browser
  // periodically re-reads it with short, bounded requests. This survives
  // Vercel function limits, navigation, reloads, and transient disconnects.
  useEffect(() => {
    if (!proposalId) return;
    let active = true;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let pollCount = 0;
    const schedule = () => {
      if (!active) return;
      pollTimer = setTimeout(poll, conversationPollDelay(pollCount, pendingMessageCount > 0));
    };
    const poll = async () => {
      if (!active) return;
      if (document.hidden) { pollTimer = setTimeout(poll, 2_000); return; }
      await refresh();
      if (!active) return;
      pollCount += 1;
      schedule();
    };
    const onVisibility = () => {
      if (document.hidden || !active) return;
      if (pollTimer) clearTimeout(pollTimer);
      pollCount = 0;
      void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      active = false;
      if (pollTimer) clearTimeout(pollTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pendingMessageCount, proposalId, refresh]);

  const performSend = useCallback(async (entry: PendingSend) => {
    let result: Awaited<ReturnType<typeof postConversationMessageAction>>;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      result = await Promise.race([
        postConversationMessageAction(entry.proposalId, {
          content: entry.content,
          intent: entry.intent,
          // Attachments ride along on any intent that has them (chat messages
          // with staged files, extraction with selected sources). The backend
          // accepts up to five source ids per message regardless of intent.
          ...(entry.sourceIds.length > 0 ? { sourceIds: entry.sourceIds } : {}),
          ...(entry.intent === "generate_draft" ? { expectedProposalVersion: entry.expectedProposalVersion } : {}),
        }, entry.idempotencyKey),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("SEND_TIMED_OUT")), SEND_TIMEOUT_MS);
        }),
      ]);
    } catch {
      // A server action call can reject without ever producing a structured
      // result — most commonly when its POST is aborted mid-flight (e.g. by a
      // navigation) or the connection drops — and it can also hang past any
      // useful wait. Both must land in "failed" so the composer recovers and
      // the planner gets a retry; the retry reuses the same idempotency key,
      // so a send that actually reached the backend is never duplicated.
      setPending(prev => prev.map(item => item.localId === entry.localId
        ? { ...item, state: "failed", errorMessage: "The message didn't go through. Retrying is safe — it won't send twice." }
        : item));
      return false;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    if (!result.success) {
      setPending(prev => prev.map(item => item.localId === entry.localId ? { ...item, state: "failed", errorMessage: result.message } : item));
      return false;
    }
    const acknowledgedMessageId = result.data.message?.id;
    if (acknowledgedMessageId) {
      setPending(prev => prev.map(item => item.localId === entry.localId
        ? { ...item, acknowledgedMessageId }
        : item));
    }
    // Keep the optimistic turn mounted until the authoritative conversation
    // has been re-read. Retiring it first creates an empty intermediate frame:
    // loading can flash again and newly-synchronised questions can appear
    // before the user/assistant messages that explain them.
    const snapshot = await refresh(entry.proposalId);
    // Older backend versions may acknowledge without returning the created
    // message. Preserve their previous behaviour; current versions return the
    // id and use the authoritative reconciliation above.
    if (!acknowledgedMessageId || snapshot?.messages.some(message => message.id === acknowledgedMessageId)) {
      setPending(prev => prev.filter(item => item.localId !== entry.localId));
    }
    return true;
  }, [refresh]);

  // targetProposalId lets a caller send immediately after lazily creating the
  // proposal, before the hook re-renders with the new id.
  const sendMessage = useCallback(async (input: SendInput, targetProposalId?: string) => {
    const target = targetProposalId ?? proposalId;
    if (!target || !input.content.trim()) return false;
    const idempotencyKey = crypto.randomUUID();
    const entry: PendingSend = {
      localId: idempotencyKey,
      proposalId: target,
      content: input.content,
      intent: input.intent,
      sourceIds: (input.sourceIds ?? []).slice(0, 5),
      expectedProposalVersion: input.expectedProposalVersion,
      idempotencyKey,
      state: "sending",
    };
    setPending(prev => [...prev, entry]);
    return performSend(entry);
  }, [proposalId, performSend]);

  const retrySend = useCallback(async (localId: string) => {
    const entry = pending.find(item => item.localId === localId);
    if (!entry || entry.state !== "failed") return;
    // A retry reuses the original idempotency key so the backend deduplicates.
    setPending(prev => prev.map(item => item.localId === localId ? { ...item, state: "sending", errorMessage: undefined } : item));
    await performSend({ ...entry, state: "sending" });
  }, [pending, performSend]);

  const resolveQuestion = useCallback(async (
    questionId: string,
    input: { status: "answered" | "dismissed"; answer?: ConversationQuestionAnswer },
    options?: { refresh?: boolean },
  ) => {
    if (!proposalId) return false;
    setQuestionBusyId(questionId);
    setQuestionFailure(null);
    const result = await patchConversationQuestionAction(proposalId, questionId, input);
    setQuestionBusyId(null);
    if (!result.success) {
      // A question answer spans Mongo (proposal field) and Postgres
      // (conversation history). If Mongo succeeded and the live synchronizer
      // retired the question before Postgres recorded the answer, the request
      // can report a failure even though the authoritative conversation has
      // already advanced. Re-read once before showing an error; validation
      // failures deliberately stay on the same question and keep their useful
      // inline message.
      if (result.code !== "INVALID_CANDIDATE_VALUE" && result.code !== "INVALID_QUESTION_ANSWER") {
        const readId = ++latestReadRef.current;
        const latest = await getConversationAction(proposalId);
        if (readId === latestReadRef.current && latest.success) {
          setLoadError(null);
          setData(latest.data);
          const stillOpen = latest.data.questions.some(question => question.id === questionId && question.status === "open");
          if (!stillOpen) {
            setQuestionFailure(null);
            return true;
          }
        }
      }
      setQuestionFailure({ questionId, message: result.message });
      return false;
    }
    if (options?.refresh !== false) await refresh();
    return true;
  }, [proposalId, refresh]);

  const currentQuestionId = data?.questions.find(question => question.status === "open")?.id ?? null;
  const currentQuestionError = questionFailure?.questionId === currentQuestionId ? questionFailure.message : null;
  return {
    data, loading, loadError, refresh, pending, sendMessage, retrySend, resolveQuestion,
    questionBusyId, questionError: currentQuestionError,
  };
}

// Lists the private document sources of a proposal. refreshKey retriggers the
// fetch (for example when a scan job finishes and a new source becomes ready);
// refresh() re-reads the list on demand and can be awaited, so a caller that
// just mutated a source (removing one) can wait for the authoritative list
// instead of reloading the page or guessing optimistically.
export function useProposalSources(proposalId: string | null, refreshKey?: unknown) {
  const [sources, setSources] = useState<PrivateDocumentSource[]>([]);

  const refresh = useCallback(async () => {
    if (!proposalId) return;
    const result = await listPrivateDocumentSources(proposalId);
    if (result.success) setSources(result.data);
  }, [proposalId]);

  useEffect(() => {
    if (!proposalId) return;
    let active = true;
    void listPrivateDocumentSources(proposalId).then(result => {
      if (active && result.success) setSources(result.data);
    });
    return () => { active = false; };
  }, [proposalId, refreshKey]);
  return { sources, refresh };
}

// Generic durable-job tracker with sessionStorage persistence so an in-flight
// scan survives a reload, exponential backoff, and hidden-tab pauses.
function useScanJobTracker(proposalId: string | null, keyFor: (proposalId: string) => string) {
  const [job, setJob] = useState<DurableJob | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollCount = useRef(0);
  const keyForRef = useRef(keyFor);
  useEffect(() => { keyForRef.current = keyFor; }, [keyFor]);

  // Restores an in-flight scan after a reload.
  useEffect(() => {
    if (!proposalId || typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(keyForRef.current(proposalId));
    if (saved && uuidPattern.test(saved)) setJobId(saved);
  }, [proposalId]);

  useEffect(() => {
    if (!jobId || !proposalId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (!active) return;
      if (document.hidden) { timer = setTimeout(poll, 2_000); return; }
      const result = await getDurableJob(jobId);
      if (!active) return;
      if (!result.success) { setError(result.message); return; }
      setJob(result.data);
      if (presentJob(result.data).terminal) {
        window.sessionStorage.removeItem(keyForRef.current(proposalId));
        setJobId(null);
        return;
      }
      pollCount.current += 1;
      timer = setTimeout(poll, nextPollDelay(pollCount.current));
    };
    void poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [proposalId, jobId]);

  const track = useCallback((queued: DurableJob, forProposalId: string) => {
    window.sessionStorage.setItem(keyForRef.current(forProposalId), queued.id);
    pollCount.current = 0;
    setError(null);
    setJob(queued);
    setJobId(queued.id);
  }, []);

  return { job, jobId, error, setError, track };
}

// Saves pasted notes as a scanned private source and tracks the scan job.
export function useNotesScan(proposalId: string | null) {
  const tracker = useScanJobTracker(proposalId, notesScanKey);
  const [busy, setBusy] = useState(false);

  const submitNotes = useCallback(async (
    text: string,
    classification: "non_confidential" | "confidential",
    targetProposalId?: string,
  ) => {
    const target = targetProposalId ?? proposalId;
    const value = text.trim();
    if (!target || !value || busy) return null;
    setBusy(true);
    tracker.setError(null);
    const idempotencyKey = crypto.randomUUID();
    const created = await createProposalNotesAction(target, { text: value, classification }, idempotencyKey);
    if (!created.success) { tracker.setError(created.message); setBusy(false); return null; }
    const queued = await createSourceScanJob(created.data.source.id, idempotencyKey);
    if (!queued.success) { tracker.setError(queued.message); setBusy(false); return null; }
    tracker.track(queued.data, target);
    setBusy(false);
    return created.data.source.id;
  }, [proposalId, busy, tracker]);

  return {
    notesJob: tracker.job,
    notesJobId: tracker.jobId,
    notesError: tracker.error,
    notesBusy: busy,
    submitNotes,
  };
}

// Runs the private upload-session flow (session -> PUT -> complete -> scan job)
// and tracks the resulting scan job with the same persistence the status panel
// uses, so progress survives navigation between the two surfaces.
export function useSourceUpload(proposalId: string | null) {
  const tracker = useScanJobTracker(proposalId, sourceScanKey);
  const [busy, setBusy] = useState(false);

  const upload = useCallback(async (
    file: File,
    classification: "non_confidential" | "confidential",
    targetProposalId?: string,
  ): Promise<string | null> => {
    const target = targetProposalId ?? proposalId;
    if (!target || busy) return null;
    setBusy(true);
    tracker.setError(null);
    const operationKey = crypto.randomUUID();
    const session = await createPrivateUploadSession(target, { name: file.name, type: file.type, size: file.size }, operationKey, classification);
    if (!session.success) { tracker.setError(session.message); setBusy(false); return null; }
    try {
      const putResponse = await fetch(session.data.uploadUrl, { method: "PUT", headers: session.data.requiredHeaders, body: file });
      if (!putResponse.ok) throw new Error("upload failed");
    } catch {
      tracker.setError("The private upload could not be completed. Check your connection and try again.");
      setBusy(false);
      return null;
    }
    const completed = await completePrivateUpload(session.data.sourceId);
    if (!completed.success) { tracker.setError(completed.message); setBusy(false); return null; }
    const queued = await createSourceScanJob(session.data.sourceId, operationKey);
    if (!queued.success) { tracker.setError(queued.message); setBusy(false); return null; }
    tracker.track(queued.data, target);
    setBusy(false);
    return session.data.sourceId;
  }, [proposalId, busy, tracker]);

  return {
    uploadJob: tracker.job,
    uploadJobId: tracker.jobId,
    uploadError: tracker.error,
    uploadBusy: busy,
    upload,
  };
}

// ── Auto-extraction orchestration ────────────────────────────────────────────
// After a chat send that carried attachments, the workspace watches the new
// sources' scans and — once ALL of them are ready — automatically sends one
// extract_requirements message for the batch. The intent survives a reload via
// sessionStorage; source ids that already triggered an extraction are recorded
// under the same key so the follow-up fires exactly once per originating send.

type AutoExtractStore = { pending: string[]; handled: string[] };

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const readAutoExtractStore = (proposalId: string): AutoExtractStore => {
  if (typeof window === "undefined") return { pending: [], handled: [] };
  try {
    const raw = window.sessionStorage.getItem(autoExtractKey(proposalId));
    if (!raw) return { pending: [], handled: [] };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { pending: [], handled: [] };
    const record = parsed as Record<string, unknown>;
    return { pending: stringArray(record.pending), handled: stringArray(record.handled) };
  } catch {
    return { pending: [], handled: [] };
  }
};

const writeAutoExtractStore = (proposalId: string, store: AutoExtractStore) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(autoExtractKey(proposalId), JSON.stringify(store));
  } catch {
    // Storage being unavailable only loses reload-resume, never the session.
  }
};

export type AutoExtractNotice = { sourceId: string; filename: string };

export function useAutoExtraction(
  proposalId: string | null,
  sendMessage: (input: SendInput, targetProposalId?: string) => Promise<boolean>,
) {
  // The watch carries its own proposal id so a send right after lazy proposal
  // creation is tracked even before the hook re-renders with the new id.
  const [watch, setWatch] = useState<{ proposalId: string; sourceIds: string[] } | null>(null);
  const [failedNotices, setFailedNotices] = useState<AutoExtractNotice[]>([]);
  const sendRef = useRef(sendMessage);
  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);
  const firingRef = useRef(false);
  const pollCount = useRef(0);

  // Resumes a persisted intent after a reload. The setState is deferred to a
  // macrotask so the effect itself never sets state synchronously.
  useEffect(() => {
    if (!proposalId) return;
    const timer = setTimeout(() => {
      const stored = readAutoExtractStore(proposalId);
      if (stored.pending.length === 0) return;
      pollCount.current = 0;
      setWatch(current => current ?? { proposalId, sourceIds: stored.pending });
    }, 0);
    return () => clearTimeout(timer);
  }, [proposalId]);

  useEffect(() => {
    if (!watch) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (!active) return;
      if (document.hidden) { timer = setTimeout(poll, 2_000); return; }
      const result = await listPrivateDocumentSources(watch.proposalId);
      if (!active) return;
      if (result.success) {
        const byId = new Map(result.data.map(source => [source.id, source]));
        const failed = watch.sourceIds.filter(id => byId.get(id)?.status === "failed");
        if (failed.length > 0) {
          // A failed scan cancels the automatic extraction for this send; the
          // user gets an inline notice and can re-upload instead.
          setFailedNotices(prev => [
            ...prev,
            ...failed
              .filter(id => !prev.some(notice => notice.sourceId === id))
              .map(id => ({ sourceId: id, filename: byId.get(id)?.originalFilename || "A file" })),
          ]);
          writeAutoExtractStore(watch.proposalId, { pending: [], handled: readAutoExtractStore(watch.proposalId).handled });
          setWatch(null);
          return;
        }
        if (watch.sourceIds.every(id => byId.get(id)?.status === "ready")) {
          const store = readAutoExtractStore(watch.proposalId);
          const toExtract = watch.sourceIds.filter(id => !store.handled.includes(id));
          // The handled ids are recorded BEFORE the send so a re-render or a
          // reload during the send can never fire the extraction twice.
          writeAutoExtractStore(watch.proposalId, { pending: [], handled: [...store.handled, ...toExtract] });
          setWatch(null);
          if (toExtract.length > 0 && !firingRef.current) {
            firingRef.current = true;
            void sendRef.current({
              content: "Extracting requirements from the attached files.",
              intent: "extract_requirements",
              sourceIds: toExtract,
            }, watch.proposalId).then((sent) => {
              if (sent) return;
              // Acceptance failed before a run existed (for example while the
              // API had no healthy target). Do not permanently consume these
              // sources: the failed message's Retry action must be able to
              // submit the same source ids again without another upload.
              const latest = readAutoExtractStore(watch.proposalId);
              writeAutoExtractStore(watch.proposalId, {
                pending: latest.pending,
                handled: latest.handled.filter(id => !toExtract.includes(id)),
              });
            }).finally(() => { firingRef.current = false; });
          }
          return;
        }
      }
      pollCount.current += 1;
      timer = setTimeout(poll, nextPollDelay(pollCount.current));
    };
    void poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [watch]);

  const queueAutoExtract = useCallback((targetProposalId: string, sourceIds: string[]) => {
    if (sourceIds.length === 0) return;
    const store = readAutoExtractStore(targetProposalId);
    const fresh = sourceIds.filter(id => !store.handled.includes(id));
    if (fresh.length === 0) return;
    writeAutoExtractStore(targetProposalId, { pending: fresh, handled: store.handled });
    pollCount.current = 0;
    setWatch({ proposalId: targetProposalId, sourceIds: fresh });
  }, []);

  // A source that no longer exists (it was removed from the rail) must leave
  // the pending extraction selection, in memory and in the persisted intent,
  // or the watch would wait forever for a scan that can never become ready.
  const dropSource = useCallback((sourceId: string) => {
    setWatch(current => {
      if (!current) return current;
      const remaining = current.sourceIds.filter(id => id !== sourceId);
      return remaining.length > 0 ? { ...current, sourceIds: remaining } : null;
    });
    if (!proposalId) return;
    const store = readAutoExtractStore(proposalId);
    if (!store.pending.includes(sourceId)) return;
    writeAutoExtractStore(proposalId, { pending: store.pending.filter(id => id !== sourceId), handled: store.handled });
  }, [proposalId]);

  return { queueAutoExtract, dropSource, autoScanning: watch !== null, scanCount: watch?.sourceIds.length ?? 0, failedNotices };
}

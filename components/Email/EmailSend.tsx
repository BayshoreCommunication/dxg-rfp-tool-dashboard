"use client";

import { sendProposalEmailAction } from "@/app/actions/email";
import {
  getProposalByIdAction,
  getProposalsAction,
} from "@/app/actions/proposals";
import { buildPersonalizedInvitation } from "@/lib/proposals/proposalExperience";
import { cn } from "@/lib/utils";
import { ArrowLeft, Mail, MessageCircleQuestion, Send, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyboardEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import VendorListPicker from "./VendorListPicker";


type ProposalOption = {
  _id: string;
  event?: {
    eventName?: string;
    eventFormat?: string;
    eventType?: string | { eventType?: string; eventTypeOther?: string };
    startDate?: string;
    endDate?: string;
  };
  budget?: {
    proposalSubmissionDueDate?: string;
    vendorQuestionsDueDate?: string;
  };
  contact?: { contactEmail?: string; contactOrganization?: string };
  proposalSetting?: {
    proposals?: {
      teammateEmail?: string;
    };
  };
  proposalLink?: string;
  publicProposalLink?: string;
  proposalSlug?: string;
};

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const invitationRow = "grid min-w-0 gap-x-3.5 gap-y-2 @2xl/invite:grid-cols-[170px_minmax(0,1fr)]";
const invitationLabel = "text-[13px] !font-semibold text-slate-800";
const invitationField = "min-h-10 w-full min-w-0 rounded-lg border border-[var(--invite-border)] bg-white px-3 py-2.5 text-[13px] text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 dark:focus-visible:outline-teal-300";
const questionField = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-[#008ad2]";

const DEFAULT_MESSAGE = `Hello,

We would like to invite your team to review an upcoming audiovisual production opportunity. The complete proposal includes the project scope, schedule, technical requirements, and evaluation criteria.

Please review the details and share any questions, assumptions, or recommendations that would help us understand your approach.

Warm regards,
RFPilot Team`;

const validateEmail = (email: string) =>
  EMAIL_REGEX.test(email.trim().toLowerCase());

const getTeammateEmail = (proposal: ProposalOption | null): string => {
  const teammateEmail = proposal?.proposalSetting?.proposals?.teammateEmail;
  if (!teammateEmail) return "";
  const normalized = teammateEmail.trim().toLowerCase();
  return validateEmail(normalized) ? normalized : "";
};

type EmailSendProps = {
  /**
   * Fix the composer to one proposal — the one the planner just published.
   * There is no proposal picker, and a successful send is handed back through
   * `onSent` instead of navigating to the email dashboard, so the publish
   * flow can carry on in place.
   */
  proposalId?: string;
  onSent?: (recipients: string[]) => void;
};

export default function EmailSend({ proposalId: fixedProposalId, onSent }: EmailSendProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const [proposals, setProposals] = useState<ProposalOption[]>([]);

  // Deep links from a vendor response can prefill the recipient, subject and
  // body (for example "ask this vendor for a text-based copy"). Only valid
  // addresses are accepted; everything else falls back to the defaults.
  const prefilledRecipients = (searchParams.get("to") || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value && validateEmail(value));
  const prefilledSubject = searchParams.get("subject")?.trim() || "";
  const prefilledMessage = searchParams.get("message")?.trim() || "";
  // "Ask this vendor about the gaps" and "ask for a text-based copy" open the
  // composer as a one-to-one question: the proposal is fixed, the vendor is
  // named, and the email goes out plain (no invitation wrapper or links).
  const questionMode = searchParams.get("mode") === "question";
  const questionVendor = searchParams.get("vendor")?.trim() || "the vendor";
  const rawReturnTo = searchParams.get("returnTo") || "";
  const returnTo = rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : "";

  const [proposalId, setProposalId] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientEmails, setRecipientEmails] = useState<string[]>(prefilledRecipients);
  const [subject, setSubject] = useState(prefilledSubject);
  const [message, setMessage] = useState(prefilledMessage || DEFAULT_MESSAGE);
  const [draftSource, setDraftSource] = useState<"user" | "ai">("user");
  const [sendApproved, setSendApproved] = useState(false);

  const selectedProposal =
    proposals.find((item) => item._id === proposalId) || null;
  // Used in the email body — full public URL so recipients can open it
  const selectedProposalLink =
    selectedProposal?.publicProposalLink ||
    selectedProposal?.proposalLink ||
    "";
  // Used for the in-app "Open proposal" preview button — absolute URL so target="_blank" opens a new tab
  const previewProposalLink = selectedProposal?.proposalSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/proposal/${selectedProposal.proposalSlug}`
    : selectedProposalLink;
  const autoTeammateEmail = questionMode ? "" : getTeammateEmail(selectedProposal);
  const preselectedProposalId = searchParams.get("proposalId")?.trim() || "";
  const fixedMode = Boolean(fixedProposalId);
  // One known proposal, loaded directly: the publish flow's fixed proposal, or
  // a question about a proposal a vendor already responded to.
  const singleProposalId = fixedProposalId || (questionMode ? preselectedProposalId : "");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setLoadError(undefined);

      try {
        if (singleProposalId) {
          // The proposal is known; it need not be "submitted" to ask a vendor
          // who has already responded a question about it.
          const proposalRes = await getProposalByIdAction(singleProposalId);
          if (cancelled) return;
          if (proposalRes.success && proposalRes.data && typeof proposalRes.data === "object") {
            const loaded = proposalRes.data as ProposalOption & { status?: string };
            // Vendors only ever see a published proposal, so a draft opened
            // here (e.g. from a stale link) is refused with the reason.
            if (loaded.status === "unsubmitted") {
              setProposals([]);
              setProposalId("");
              setLoadError("This proposal hasn't been published yet. Publish it before sharing it with vendors.");
              return;
            }
            setProposals([loaded]);
            setProposalId(singleProposalId);
            if (fixedMode) setSubject((prev) =>
              prev.trim().length > 0
                ? prev
                : `Proposal for ${loaded.event?.eventName || "Untitled Proposal"} - RFPilot`,
            );
          } else {
            setProposals([]);
            setProposalId("");
            setLoadError(proposalRes.message || "The proposal could not be loaded.");
          }
          return;
        }
        const proposalsRes = await getProposalsAction({
          page: 1,
          limit: 100,
          status: "submitted",
          isActive: true,
        });

        if (cancelled) return;

        if (proposalsRes.success && Array.isArray(proposalsRes.data)) {
          const proposalItems = proposalsRes.data as ProposalOption[];
          setProposals(proposalItems);

          const preferredProposal = preselectedProposalId
            ? proposalItems.find((item) => item._id === preselectedProposalId)
            : null;

          if (preferredProposal) {
            setProposalId(preferredProposal._id);
            setSubject((prev) =>
              prev.trim().length > 0
                ? prev
                : `Proposal for ${preferredProposal.event?.eventName || "Untitled Proposal"} - RFPilot`,
            );
          } else if (proposalItems[0]?._id) {
            setProposalId((prev) => prev || proposalItems[0]._id);
            setSubject((prev) =>
              prev.trim().length > 0
                ? prev
                : `Proposal for ${proposalItems[0].event?.eventName || "Untitled Proposal"} - RFPilot`,
            );
          }
        } else {
          setProposals([]);
          setProposalId("");
          setLoadError(proposalsRes.message || "Submitted proposals could not be loaded.");
        }
      } catch {
        if (cancelled) return;
        setProposals([]);
        setProposalId("");
        setLoadError("Submitted proposals could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [singleProposalId, preselectedProposalId, questionMode, fixedMode]);

  // Gmail-style input handler
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " "].includes(event.key)) {
      event.preventDefault();
      addEmailsFromInput();
    } else if (event.key === "Backspace" && recipientInput === "") {
      // Remove the last email chip if backspace is pressed on an empty input
      event.preventDefault();
      setRecipientEmails((prev) => prev.slice(0, -1));
    }
  };

  const addEmailsFromInput = () => {
    const rawItems = recipientInput
      .split(/[,\s]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (rawItems.length === 0) return;

    const validItems = rawItems.filter(validateEmail);
    const invalidCount = rawItems.length - validItems.length;

    // Prevent duplicates
    const merged = [...new Set([...recipientEmails, ...validItems])];

    setRecipientEmails(merged);
    setRecipientInput("");
    setSendApproved(false);

    if (invalidCount > 0) {
      toast.warning(`${invalidCount} invalid email(s) were skipped.`);
    }
  };

  // Add emails when the input loses focus (optional but good UX)
  const handleBlur = () => {
    if (recipientInput.trim()) {
      addEmailsFromInput();
    }
  };

  // ORG-607: recipients ticked or unticked in the organization's vendor list.
  const addListedRecipients = (emails: string[]) => {
    setRecipientEmails((prev) => [...new Set([...prev, ...emails])]);
    setSendApproved(false);
  };
  const removeListedRecipients = (emails: string[]) => {
    setRecipientEmails((prev) => prev.filter((entry) => !emails.includes(entry)));
    setSendApproved(false);
  };

  const removeRecipient = (email: string) => {
    setRecipientEmails((prev) => prev.filter((entry) => entry !== email));
    setSendApproved(false);
  };

  const personalizeInvitation = async () => {
    if (!selectedProposal) {
      toast.error("Please select a proposal first.");
      return;
    }

    setDrafting(true);
    let proposal = selectedProposal;
    try {
      const proposalRes = await getProposalByIdAction(selectedProposal._id);
      if (
        proposalRes.success &&
        proposalRes.data &&
        typeof proposalRes.data === "object"
      ) {
        proposal = proposalRes.data as ProposalOption;
      }
    } catch {
      // The list record still provides a safe title-only fallback draft.
    }
    const draft = buildPersonalizedInvitation({
      eventName: proposal.event?.eventName || "AV production proposal",
      eventFormat: proposal.event?.eventFormat,
      eventType:
        typeof proposal.event?.eventType === "string"
          ? proposal.event.eventType
          : proposal.event?.eventType?.eventType === "Other"
            ? proposal.event.eventType.eventTypeOther
            : proposal.event?.eventType?.eventType,
      startDate: proposal.event?.startDate,
      endDate: proposal.event?.endDate,
      proposalSubmissionDueDate: proposal.budget?.proposalSubmissionDueDate,
      vendorQuestionsDueDate: proposal.budget?.vendorQuestionsDueDate,
      organizationName: proposal.contact?.contactOrganization,
    });
    setSubject(draft.subject);
    setMessage(draft.message);
    setDraftSource("ai");
    setSendApproved(false);
    setDrafting(false);
    toast.info("Personalized invitation drafted. Review and approve it before sending.");
  };

  const handleSend = async () => {
    // Process anything left in the input field just in case
    addEmailsFromInput();

    if (!proposalId) {
      toast.error("Please select a proposal.");
      return;
    }

    // Final merge of state emails and any lingering input that valid
    const manualRecipients =
      recipientInput.trim().length > 0
        ? [
            ...new Set([
              ...recipientEmails,
              ...recipientInput.split(/[,\s]+/).filter(validateEmail),
            ]),
          ]
        : recipientEmails;

    const finalRecipients = [
      ...new Set(
        [...manualRecipients, autoTeammateEmail]
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    if (finalRecipients.length === 0) {
      toast.error("Please add at least one valid recipient email.");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter an email subject.");
      return;
    }
    if (!sendApproved) {
      toast.error(questionMode ? "Review the message, then approve sending." : "Review the recipients and invitation, then approve sending.");
      return;
    }

    setSending(true);
    const res = await sendProposalEmailAction({
      proposalId,
      recipientEmails: finalRecipients,
      subject: subject.trim(),
      message: message.trim(),
      kind: questionMode ? "question" : "invitation",
    });
    setSending(false);

    if (!res.success) {
      toast.error(res.message || (questionMode ? "The question could not be sent." : "Failed to send email campaign."));
      return;
    }

    toast.success(questionMode ? `Question sent to ${questionVendor}.` : fixedMode ? "Invitations sent." : res.message || "Email campaign sent.");
    setRecipientInput("");
    setRecipientEmails([]);
    if (onSent) {
      setSendApproved(false);
      onSent(finalRecipients);
      return;
    }
    const destination = questionMode && returnTo ? returnTo : "/email";
    router.push(destination);
    setTimeout(() => {
      if (window.location.pathname !== destination.split("?")[0]) {
        window.location.href = destination;
      }
    }, 250);
  };

  const handleProposalChange = (nextProposalId: string) => {
    setProposalId(nextProposalId);
    setSendApproved(false);
    if (!subject.trim()) {
      const proposal = proposals.find((item) => item._id === nextProposalId);
      const proposalTitle = proposal?.event?.eventName || "Untitled Proposal";
      setSubject(`Proposal for ${proposalTitle} - RFPilot`);
    }
  };

  const fieldClass = questionMode ? questionField : invitationField;
  const labelClass = questionMode ? "text-[12px] font-semibold text-slate-600" : invitationLabel;

  return (
    <section
      className={cn(
        "rounded-2xl border bg-white shadow-sm",
        questionMode
          ? "border-slate-200 p-5"
          : "@container/invite border-[var(--invite-border)] [--invite-border:#d1e1e2] [--invite-surface:#f1f7f7] [--invite-tint:#e7f2f2] dark:[--invite-border:#34505a] dark:[--invite-surface:#132931] dark:[--invite-tint:#15343b]",
      )}
    >
      <div className={questionMode ? undefined : "px-4 pt-4 sm:px-6 sm:pt-5"}>
        {questionMode ? (
          <div className="mb-5">
            {returnTo && (
              <Link href={returnTo} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0076b4]">
                <ArrowLeft size={14} aria-hidden="true" /> Back to the response
              </Link>
            )}
            <h1 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <MessageCircleQuestion size={20} className="text-[#008ad2]" aria-hidden="true" />
              Ask {questionVendor} a question
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              {selectedProposal?.event?.eventName ? `About their response to ${selectedProposal.event.eventName}. ` : ""}
              This is a plain email from you to the addresses below. They reply to you directly; it does not resend the proposal.
            </p>
            {loading && <p role="status" className="mt-2 text-[12px] text-slate-500">Loading the proposal…</p>}
            {!loading && loadError && <p role="alert" className="mt-2 text-[12px] text-red-600">{loadError}</p>}
          </div>
        ) : (
          <div className="mb-3">
            <div className="flex items-center gap-3 text-slate-800">
              <Mail size={16} className="shrink-0 text-teal-800 dark:text-teal-300" aria-hidden="true" />
              <h3 className="text-[23px] leading-tight !font-extrabold tracking-tight">
                {fixedMode ? "Invite vendors" : "Compose & Send"}
              </h3>
            </div>
            {fixedMode && loading && <p role="status" className="mt-2 text-xs text-slate-500">Loading the proposal…</p>}
            {fixedMode && !loading && loadError && <p role="alert" className="mt-2 text-xs text-red-600">{loadError}</p>}
          </div>
        )}

        {!questionMode && !fixedMode && (
          <div className={cn(invitationRow, "mb-3 items-center")}>
            <label htmlFor="invitation-proposal" className={invitationLabel}>
              Select Proposal
            </label>
            <div className="min-w-0">
              <select
                id="invitation-proposal"
                value={proposalId}
                onChange={(event) => handleProposalChange(event.target.value)}
                disabled={loading || Boolean(loadError)}
                aria-describedby="proposal-load-status"
                className={fieldClass}
              >
                {loading && <option value="">Loading submitted proposals…</option>}
                {!loading && loadError && (
                  <option value="">Submitted proposals could not be loaded</option>
                )}
                {!loading && !loadError && proposals.length === 0 && (
                  <option value="">No submitted proposals ready to send</option>
                )}
                {proposals.map((proposal) => (
                  <option key={proposal._id} value={proposal._id}>
                    {proposal.event?.eventName || "Untitled Proposal"}
                  </option>
                ))}
              </select>
              <div id="proposal-load-status" aria-live="polite">
                {loading && <p role="status" className="mt-1 text-xs text-slate-500">Loading submitted proposals…</p>}
                {!loading && loadError && <p role="alert" className="mt-1 text-xs text-red-600">{loadError} Refresh the page to try again.</p>}
              </div>
            </div>
          </div>
        )}

        {!questionMode && selectedProposal && (fixedMode || selectedProposalLink) && (
          <div className="rounded-lg bg-[var(--invite-tint)] px-3.5 py-2 text-xs leading-5 text-slate-600">
            <p>
              {fixedMode ? (
                <>Inviting vendors to <strong className="!font-semibold text-slate-800">{selectedProposal.event?.eventName || "Untitled Proposal"}.</strong></>
              ) : "Proposal:"}
              {previewProposalLink && (
                <>
                  {" "}
                  <a
                    href={previewProposalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block !font-semibold text-teal-800 underline underline-offset-2 dark:text-teal-200"
                  >
                    Open proposal
                  </a>
                </>
              )}
            </p>
            <p>
              {fixedMode
                ? "Each vendor gets their own secure access link when the invitation is sent, and vendors cannot see the other recipients."
                : "A secure, recipient-specific access link is added when the campaign is sent."}
            </p>
          </div>
        )}

        <div className={questionMode ? "space-y-2" : cn(invitationRow, "border-b border-[var(--invite-border)] py-3")}>
          <div className={questionMode ? "flex items-center gap-1.5" : "@2xl/invite:pt-2"}>
            <label htmlFor="invitation-recipients" className={labelClass}>{questionMode ? "To" : "Recipients"}</label>
            <span id="invitation-recipient-hint" className={questionMode ? "text-[10px] text-slate-400" : "ml-1 text-[11px] text-slate-600 @2xl/invite:ml-0 @2xl/invite:block"}>
              (Press Enter, Space, or Comma)
            </span>
          </div>

          <div className="min-w-0 space-y-2">
            <div className={cn(
              "flex w-full flex-wrap items-center gap-2 border bg-white text-[13px] transition-colors focus-within:ring-1",
              questionMode
                ? "min-h-[46px] rounded-xl border-slate-200 px-3 py-2 focus-within:border-[#008ad2] focus-within:ring-[#008ad2]/30"
                : "min-h-10 rounded-lg border-[var(--invite-border)] px-2 py-1.5 focus-within:border-teal-700 focus-within:ring-teal-700 dark:focus-within:border-teal-300 dark:focus-within:ring-teal-300",
            )}>
              {recipientEmails.map((email) => (
                <span
                  key={email}
                  className={cn(
                    "flex min-w-0 max-w-full items-center gap-1.5 rounded-md text-xs font-medium",
                    questionMode
                      ? "border border-[#008ad2]/30 bg-[#008ad2]/5 px-2.5 py-1 text-brand-dark"
                      : "bg-[var(--invite-tint)] py-0.5 pr-1 pl-2 text-teal-800 dark:text-teal-200",
                  )}
                >
                  <span className="wrap-anywhere">{email}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    className={cn(
                      "flex shrink-0 items-center justify-center",
                      questionMode
                        ? "h-4 w-4 rounded-full text-[#008ad2] hover:bg-[#008ad2]/20 hover:text-brand-dark"
                        : "size-5 rounded hover:bg-teal-200/50 focus-visible:outline-2 dark:hover:bg-teal-800",
                    )}
                    aria-label={`Remove ${email}`}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </span>
              ))}

              <input
                id="invitation-recipients"
                value={recipientInput}
                onChange={(event) => setRecipientInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={handleBlur}
                aria-label="Add recipient email addresses"
                aria-describedby="invitation-recipient-hint"
                placeholder={
                  recipientEmails.length === 0
                    ? "john@email.com, anna@email.com"
                    : ""
                }
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-500",
                  recipientEmails.length === 0 ? "basis-40" : "basis-16",
                  !questionMode && "dark:!bg-transparent",
                )}
              />
            </div>

            {/* Auto-Teammate Notification */}
            {autoTeammateEmail && (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600">
                <Users size={12} />
                Teammate automatically included: {autoTeammateEmail}
              </p>
            )}

            {/* ORG-607: pick from the shared vendor list (an invitation, not a one-to-one question) */}
            {!questionMode && (
              <VendorListPicker recipients={recipientEmails} onAdd={addListedRecipients} onRemove={removeListedRecipients} />
            )}
          </div>
        </div>

        {!questionMode && <div className={cn(invitationRow, "items-start border-b border-[var(--invite-border)] py-3 text-violet-800 dark:text-violet-200")}>
          <p className="flex items-start gap-2 text-[13px] !font-semibold">
            <Sparkles size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Personalized invitation
          </p>
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2 @3xl/invite:flex-nowrap">
            <div className="min-w-0">
              <p className="text-xs leading-5">
                Draft event-specific subject and message copy, then keep you in control of the final send.
              </p>
              {draftSource === "ai" && (
                <p role="status" className="mt-1.5 inline-block rounded-md border border-violet-200 px-2 py-0.5 text-[11px] dark:border-violet-700">
                  AI-generated · 86% confidence · Based on proposal details
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void personalizeInvitation()}
              disabled={!selectedProposal || drafting}
              className="min-h-9 max-w-full shrink-0 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs !font-semibold hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700 dark:hover:bg-violet-950 dark:focus-visible:outline-violet-300"
            >
              {drafting ? "Drafting invitation…" : "Generate personalized draft"}
            </button>
          </div>
        </div>}

        <div className={questionMode ? "mt-4 space-y-2" : cn(invitationRow, "items-center border-b border-[var(--invite-border)] py-3")}>
          <label htmlFor="invitation-subject" className={labelClass}>
            Subject
          </label>
          <input
            id="invitation-subject"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setDraftSource("user");
              setSendApproved(false);
            }}
            className={fieldClass}
          />
        </div>

        <div className={questionMode ? "mt-4 space-y-2" : cn(invitationRow, "items-start pt-3 pb-5")}>
          <label htmlFor="invitation-message" className={cn(labelClass, !questionMode && "@2xl/invite:pt-2")}>
            Message
          </label>
          <textarea
            id="invitation-message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setDraftSource("user");
              setSendApproved(false);
            }}
            rows={6}
            className={cn(fieldClass, !questionMode && "min-h-39 resize-y bg-[var(--invite-surface)] leading-5 dark:!bg-[var(--invite-surface)]")}
          />
        </div>
      </div>

      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between",
        questionMode
          ? "mt-4 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
          : "gap-2 rounded-b-2xl border-t border-[var(--invite-border)] bg-[var(--invite-surface)] px-4 py-2.5 sm:px-6",
      )}>
        <label className={cn(
          "flex min-h-11 cursor-pointer items-center text-slate-700 focus-within:ring-2",
          questionMode ? "gap-3 text-sm font-bold focus-within:ring-[#008ad2]" : "gap-2 text-[13px] focus-within:ring-teal-700 dark:focus-within:ring-teal-300",
        )}>
          <input
            type="checkbox"
            checked={sendApproved}
            onChange={(event) => setSendApproved(event.target.checked)}
            className={questionMode ? "size-5 shrink-0 accent-[#008ad2]" : "size-4 shrink-0 accent-teal-800 dark:accent-teal-300"}
          />
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={15} className={cn("shrink-0", questionMode ? "text-[#008ad2]" : "text-teal-800 dark:text-teal-300")} aria-hidden="true" />
            {questionMode ? "I reviewed this message." : "I reviewed the recipients and invitation text."}
          </span>
        </label>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || loading}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 text-xs uppercase shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
            questionMode
              ? "rounded-xl px-5 py-2.5 font-bold tracking-wider text-white transition-opacity hover:opacity-95 focus-visible:outline-[#008ad2]"
              : "min-h-10 self-end rounded-lg bg-[#175e66] px-3.5 !font-semibold tracking-wide text-white hover:bg-[#104c54] focus-visible:outline-teal-800 dark:bg-teal-300 dark:text-teal-950 dark:hover:bg-teal-200 dark:focus-visible:outline-teal-300",
          )}
          style={questionMode ? { background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" } : undefined}
        >
          <Send size={14} aria-hidden="true" />
          {sending ? "Sending..." : questionMode ? "Send question" : fixedMode ? "Send invitations" : "Send Campaign"}
        </button>
      </div>
    </section>
  );
}

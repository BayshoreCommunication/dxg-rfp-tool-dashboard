"use client";

import { sendProposalEmailAction } from "@/app/actions/email";
import {
  getProposalByIdAction,
  getProposalsAction,
} from "@/app/actions/proposals";
import { buildPersonalizedInvitation } from "@/lib/proposals/proposalExperience";
import { ArrowLeft, Mail, MessageCircleQuestion, Send, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyboardEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";


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

const DEFAULT_MESSAGE = `Hello,

We would like to invite your team to review an upcoming audiovisual production opportunity. The complete RFP includes the project scope, schedule, technical requirements, and evaluation criteria.

Please review the details and share any questions, assumptions, or recommendations that would help us understand your approach.

Warm regards,
DXG RFP Team`;

const validateEmail = (email: string) =>
  EMAIL_REGEX.test(email.trim().toLowerCase());

const getTeammateEmail = (proposal: ProposalOption | null): string => {
  const teammateEmail = proposal?.proposalSetting?.proposals?.teammateEmail;
  if (!teammateEmail) return "";
  const normalized = teammateEmail.trim().toLowerCase();
  return validateEmail(normalized) ? normalized : "";
};

export default function EmailSend() {
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

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setLoadError(undefined);

      try {
        if (questionMode && preselectedProposalId) {
          // The proposal is known; it need not be "submitted" to ask a vendor
          // who has already responded a question about it.
          const proposalRes = await getProposalByIdAction(preselectedProposalId);
          if (cancelled) return;
          if (proposalRes.success && proposalRes.data && typeof proposalRes.data === "object") {
            setProposals([proposalRes.data as ProposalOption]);
            setProposalId(preselectedProposalId);
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
                : `Proposal for ${preferredProposal.event?.eventName || "Untitled Proposal"} - DXG RFP Tool`,
            );
          } else if (proposalItems[0]?._id) {
            setProposalId((prev) => prev || proposalItems[0]._id);
            setSubject((prev) =>
              prev.trim().length > 0
                ? prev
                : `Proposal for ${proposalItems[0].event?.eventName || "Untitled Proposal"} - DXG RFP Tool`,
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
  }, [preselectedProposalId, questionMode]);

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
      eventName: proposal.event?.eventName || "AV production RFP",
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

    toast.success(questionMode ? `Question sent to ${questionVendor}.` : res.message || "Email campaign sent.");
    setRecipientInput("");
    setRecipientEmails([]);
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
      setSubject(`Proposal for ${proposalTitle} - DXG RFP Tool`);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          <div className="mb-4 flex items-center gap-2 text-slate-800">
            <Mail size={16} className="text-[#008ad2]" />
            <h3 className="text-[14px] font-black tracking-wide uppercase">
              Compose & Send
            </h3>
          </div>
        )}

        <div className={questionMode ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 lg:grid-cols-2"}>
          {/* Select Proposal Section */}
          {!questionMode && <div className="space-y-2">
            <label className="text-[12px] font-semibold text-slate-600">
              Select Proposal
            </label>
            <select
              value={proposalId}
              onChange={(event) => handleProposalChange(event.target.value)}
              disabled={loading || Boolean(loadError)}
              aria-describedby="proposal-load-status"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-[#008ad2]"
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
              {loading && (
                <p role="status" className="text-[12px] text-slate-500">
                  Loading submitted proposals…
                </p>
              )}
              {!loading && loadError && (
                <p role="alert" className="text-[12px] text-red-600">
                  {loadError} Refresh the page to try again.
                </p>
              )}
            </div>
            {selectedProposalLink ? (
              <div className="rounded-lg border border-[#008ad2]/20 bg-[#008ad2]/5 px-3 py-2 text-[12px] text-brand-dark">
                Proposal:{" "}
                <a
                  href={previewProposalLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline"
                >
                  Open proposal
                </a>
                <p className="mt-1 text-slate-600">
                  A secure, recipient-specific access link is added when the
                  campaign is sent.
                </p>
              </div>
            ) : null}
          </div>}

          {/* New Gmail-Style Recipient Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
              {questionMode ? "To" : "Recipients"}
              <span className="text-[10px] font-normal text-slate-400">
                (Press Enter, Space, or Comma)
              </span>
            </label>

            <div className="flex w-full min-h-[46px] flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] transition-colors focus-within:border-[#008ad2] focus-within:ring-1 focus-within:ring-[#008ad2]/30">
              {/* Chips */}
              {recipientEmails.map((email) => (
                <span
                  key={email}
                  className="flex items-center gap-1.5 rounded-md border border-[#008ad2]/30 bg-[#008ad2]/5 px-2.5 py-1 text-[12px] font-medium text-brand-dark"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[#008ad2] hover:bg-[#008ad2]/20 hover:text-brand-dark"
                    aria-label={`Remove ${email}`}
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </span>
              ))}

              {/* Seamless Input */}
              <input
                value={recipientInput}
                onChange={(event) => setRecipientInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={handleBlur}
                placeholder={
                  recipientEmails.length === 0
                    ? "john@email.com, anna@email.com"
                    : ""
                }
                className="flex-1 min-w-[150px] bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Auto-Teammate Notification */}
            {autoTeammateEmail && (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600">
                <Users size={12} />
                Teammate automatically included: {autoTeammateEmail}
              </p>
            )}
          </div>
        </div>

        {!questionMode && <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-extrabold text-violet-950">
                <Sparkles size={16} aria-hidden="true" /> Personalized invitation
              </p>
              <p className="mt-1 text-xs leading-5 text-violet-800">
                Draft event-specific subject and message copy, then keep you in control of the final send.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void personalizeInvitation()}
              disabled={!selectedProposal || drafting}
              className="min-h-10 shrink-0 rounded-xl bg-violet-600 px-4 text-xs font-extrabold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {drafting ? "Drafting invitation…" : "Generate personalized draft"}
            </button>
          </div>
          {draftSource === "ai" && (
            <p role="status" className="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-bold text-violet-800">
              AI-generated · 86% confidence · Based on proposal details
            </p>
          )}
        </div>}

        <div className="mt-4 space-y-2">
          <label htmlFor="invitation-subject" className="text-[12px] font-semibold text-slate-600">
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
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-[#008ad2]"
          />
        </div>

        <div className="mt-4 space-y-2">
          <label htmlFor="invitation-message" className="text-[12px] font-semibold text-slate-600">
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
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-[#008ad2]"
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold text-slate-700 focus-within:ring-2 focus-within:ring-[#008ad2]">
            <input
              type="checkbox"
              checked={sendApproved}
              onChange={(event) => setSendApproved(event.target.checked)}
              className="h-5 w-5 accent-[#008ad2]"
            />
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#008ad2]" aria-hidden="true" />
              {questionMode ? "I reviewed this message." : "I reviewed the recipients and invitation text."}
            </span>
          </label>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || loading}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
          >
            <Send size={14} />
            {sending ? "Sending..." : questionMode ? "Send question" : "Send Campaign"}
          </button>
        </div>
      </section>
    </div>
  );
}

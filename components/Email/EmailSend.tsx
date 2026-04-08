"use client";

import { sendProposalEmailAction } from "@/app/actions/email";
import { getProposalsAction } from "@/app/actions/proposals";
import { Mail, Send, Users, X } from "lucide-react"; // Replaced Plus and Trash2 with X
import { useRouter, useSearchParams } from "next/navigation";
import { KeyboardEvent, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";


type ProposalOption = {
  _id: string;
  event?: { eventName?: string };
  contact?: { contactEmail?: string };
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

const DEFAULT_MESSAGE = `Hi,

Please review the proposal and let us know your feedback.

Best regards,
DXG Team`;

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
  const [sending, setSending] = useState(false);

  const [proposals, setProposals] = useState<ProposalOption[]>([]);

  const [proposalId, setProposalId] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const selectedProposal =
    proposals.find((item) => item._id === proposalId) || null;
  const selectedProposalLink =
    selectedProposal?.publicProposalLink ||
    selectedProposal?.proposalLink ||
    "";
  const autoTeammateEmail = getTeammateEmail(selectedProposal);
  const preselectedProposalId = searchParams.get("proposalId")?.trim() || "";

  const loadData = useCallback(async () => {
    setLoading(true);

    const proposalsRes = await getProposalsAction({
      page: 1,
      limit: 100,
      status: "submitted",
      isActive: true,
    });

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
            : `Proposal for ${
                preferredProposal.event?.eventName || "Untitled Proposal"
              } - DXG RFP Tool`,
        );
      } else if (!proposalId && proposalItems[0]?._id) {
        setProposalId(proposalItems[0]._id);
      }
    } else {
      setProposals([]);
    }

    setLoading(false);
  }, [preselectedProposalId, proposalId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
    if (!selectedProposalLink) {
      toast.error(
        "Proposal link is missing. Please refresh and select proposal again.",
      );
      return;
    }

    const baseMessage = message.trim();
    const messageWithLink =
      selectedProposalLink && !baseMessage.includes(selectedProposalLink)
        ? `${baseMessage}\n\nProposal link: ${selectedProposalLink}`
        : baseMessage;

    setSending(true);
    const res = await sendProposalEmailAction({
      proposalId,
      recipientEmails: finalRecipients,
      subject: subject.trim(),
      message: messageWithLink,
    });
    setSending(false);

    if (!res.success) {
      toast.error(res.message || "Failed to send email campaign.");
      return;
    }

    toast.success(res.message || "Email campaign sent.");
    setRecipientInput("");
    setRecipientEmails([]);
    router.push("/email");
    setTimeout(() => {
      if (window.location.pathname !== "/email") {
        window.location.href = "/email";
      }
    }, 250);
  };

  const handleProposalChange = (nextProposalId: string) => {
    setProposalId(nextProposalId);
    if (!subject.trim()) {
      const proposal = proposals.find((item) => item._id === nextProposalId);
      const proposalTitle = proposal?.event?.eventName || "Untitled Proposal";
      setSubject(`Proposal for ${proposalTitle} - DXG RFP Tool`);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-800">
          <Mail size={16} className="text-cyan-600" />
          <h3 className="text-[14px] font-black tracking-wide uppercase">
            Compose & Send
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Select Proposal Section */}
          <div className="space-y-2">
            <label className="text-[12px] font-semibold text-slate-600">
              Select Proposal
            </label>
            <select
              value={proposalId}
              onChange={(event) => handleProposalChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-cyan-400"
            >
              {proposals.length === 0 && (
                <option value="">
                  No active submitted proposals available
                </option>
              )}
              {proposals.map((proposal) => (
                <option key={proposal._id} value={proposal._id}>
                  {proposal.event?.eventName || "Untitled Proposal"}
                </option>
              ))}
            </select>
            {selectedProposalLink ? (
              <div className="rounded-lg border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-[12px] text-cyan-700">
                Proposal link:{" "}
                <a
                  href={selectedProposalLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline"
                >
                  Open proposal
                </a>
                {selectedProposalLink.includes("localhost") ? (
                  <p className="mt-1 text-amber-700">
                    Warning: this link is localhost. External recipients cannot
                    open it.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* New Gmail-Style Recipient Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
              Recipients
              <span className="text-[10px] font-normal text-slate-400">
                (Press Enter, Space, or Comma)
              </span>
            </label>

            <div className="flex w-full min-h-[46px] flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] transition-colors focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400">
              {/* Chips */}
              {recipientEmails.map((email) => (
                <span
                  key={email}
                  className="flex items-center gap-1.5 rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[12px] font-medium text-cyan-800"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-cyan-600 hover:bg-cyan-200 hover:text-cyan-900"
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

        <div className="mt-4 space-y-2">
          <label className="text-[12px] font-semibold text-slate-600">
            Subject
          </label>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-cyan-400"
          />
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-[12px] font-semibold text-slate-600">
            Message
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-cyan-400"
          />
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={14} />
            {sending ? "Sending..." : "Send Campaign"}
          </button>
        </div>
      </section>
    </div>
  );
}

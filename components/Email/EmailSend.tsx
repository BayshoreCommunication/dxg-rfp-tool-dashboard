"use client";

import { sendProposalEmailAction } from "@/app/actions/email";
import { getProposalsAction } from "@/app/actions/proposals";
import { Mail, Plus, Send, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

type ProposalOption = {
  _id: string;
  event?: { eventName?: string };
  contact?: { contactEmail?: string };
  proposalLink?: string;
  proposalSlug?: string;
};

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const DEFAULT_MESSAGE = `Hi,

Please review the proposal and let us know your feedback.

Best regards,
DXG Team`;

const validateEmail = (email: string) =>
  EMAIL_REGEX.test(email.trim().toLowerCase());

export default function EmailSend() {
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
  const selectedProposalLink = selectedProposal?.proposalLink || "";
  const preselectedProposalId = searchParams.get("proposalId")?.trim() || "";

  const loadData = useCallback(async () => {
    setLoading(true);

    const proposalsRes = await getProposalsAction({ page: 1, limit: 100 });

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
              } - DXG RFP Tool`
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const addEmailsFromInput = () => {
    const rawItems = recipientInput
      .split(/[,\s]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (rawItems.length === 0) return;

    const validItems = rawItems.filter(validateEmail);
    const invalidCount = rawItems.length - validItems.length;
    const merged = [...new Set([...recipientEmails, ...validItems])];

    setRecipientEmails(merged);
    setRecipientInput("");

    if (invalidCount > 0) {
      toast.warning(`${invalidCount} invalid email(s) were skipped.`);
    }
  };

  const removeRecipient = (email: string) => {
    setRecipientEmails((prev) => prev.filter((entry) => entry !== email));
  };

  const handleSend = async () => {
    addEmailsFromInput();

    if (!proposalId) {
      toast.error("Please select a proposal.");
      return;
    }

    const finalRecipients =
      recipientInput.trim().length > 0
        ? [
            ...new Set([
              ...recipientEmails,
              ...recipientInput.split(/[,\s]+/).filter(validateEmail),
            ]),
          ]
        : recipientEmails;

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
        "Proposal link is missing. Please refresh and select proposal again."
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
    await loadData();
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
          <div className="space-y-2">
            <label className="text-[12px] font-semibold text-slate-600">
              Select Proposal
            </label>
            <select
              value={proposalId}
              onChange={(event) => handleProposalChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-cyan-400"
            >
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

          <div className="space-y-2">
            <label className="text-[12px] font-semibold text-slate-600">
              Add Recipient Emails
            </label>
            <div className="flex items-center gap-2">
              <input
                value={recipientInput}
                onChange={(event) => setRecipientInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addEmailsFromInput();
                  }
                }}
                placeholder="john@email.com, anna@email.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={addEmailsFromInput}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
            {recipientEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipientEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-semibold text-cyan-700"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="text-cyan-700 hover:text-cyan-900"
                      aria-label={`Remove ${email}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
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
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={14} />
            {sending ? "Sending..." : "Send Campaign"}
          </button>
        </div>
      </section>
    </div>
  );
}

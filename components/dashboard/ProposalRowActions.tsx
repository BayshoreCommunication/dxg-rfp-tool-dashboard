"use client";

import { Archive, CopyPlus, Eye, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { copyProposalAction, deleteProposalAction } from "@/app/actions/proposals";
import ProposalDeletionDialog from "@/components/proposals/ProposalDeletionDialog";
import SaveCopyModal, { type CopyOverrides } from "@/components/proposals/SaveCopyModal";
import { Dropdown } from "@/components/ui/Dropdown";
import { PLAN_LIMIT_REACHED, rfpLimitMessage, rfpUsageLabel, type RfpUsage } from "@/lib/entitlements/entitlements";
import type { RowActions } from "./rfpDashboardModel";

// The "more" menu on a dashboard row: Edit, Duplicate, Archive. It calls the same server
// actions, the same copy dialog and the same archive confirmation as the proposal list, and
// then asks the server for the list again; nothing about the list is kept here. Only the
// actions the row allows are shown (rowActionsFor), and the backend checks each one again.

export type ProposalRowActionsProps = {
  proposal: { id: string; eventName: string; eventStartDate: string | null; eventEndDate: string | null };
  actions: RowActions;
  editHref: string;
  viewHref: string;
  // The plan's proposal counter; null on a plan with no limit. A copy counts as a new proposal.
  usage: RfpUsage | null;
};

const dayOf = (value: string | null): string => (value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "");

export default function ProposalRowActions({ proposal, actions, editHref, viewHref, usage }: ProposalRowActionsProps) {
  const router = useRouter();
  const [copying, setCopying] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const archiveInFlight = useRef(false);

  if (!actions.canEdit && !actions.canDuplicate && !actions.canArchive) return null;

  const atLimit = usage?.atLimit === true;

  const saveCopy = async (overrides: CopyOverrides) => {
    setSavingCopy(true);
    try {
      const result = await copyProposalAction(proposal.id, {
        eventName: overrides.eventName,
        ...(overrides.startDate ? { startDate: overrides.startDate } : {}),
        ...(overrides.endDate ? { endDate: overrides.endDate } : {}),
        isDraft: false,
      });
      if (result.success) {
        toast.success("Copy saved. Find it under the Saved tab in Proposals.");
        setCopying(false);
        router.refresh();
      } else if (result.code === PLAN_LIMIT_REACHED) {
        // The plan's limit is a plan state, not a failure (ORG-602).
        toast.info(result.message || "Your plan's proposal limit is reached. Contact us to upgrade.");
        setCopying(false);
        router.refresh();
      } else {
        toast.error(result.message || "We couldn't save the copy. Try again.");
      }
    } catch {
      toast.error("We couldn't save the copy. Try again.");
    } finally {
      setSavingCopy(false);
    }
  };

  const confirmArchive = async () => {
    if (archiveInFlight.current) return;
    archiveInFlight.current = true;
    setArchiveBusy(true);
    setArchiveError("");
    try {
      const result = await deleteProposalAction(proposal.id);
      if (!result.success) {
        setArchiveError(result.message || "We couldn't archive this proposal. Try again.");
        return;
      }
      setArchiving(false);
      toast.success("Proposal moved to archive.");
      router.refresh();
    } catch {
      setArchiveError("We couldn't archive this proposal. Try again.");
    } finally {
      archiveInFlight.current = false;
      setArchiveBusy(false);
    }
  };

  return (
    <>
      <Dropdown.Root>
        <Dropdown.DotsButton aria-label={`Actions for ${proposal.eventName}`} />
        <Dropdown.Popover>
          <Dropdown.Menu aria-label={`Actions for ${proposal.eventName}`}>
            {actions.canEdit && <Dropdown.Item id="edit" label="Edit" icon={Pencil} onAction={() => router.push(editHref)} />}
            <Dropdown.Item id="view" label="Preview" icon={Eye} onAction={() => router.push(viewHref)} />
            {actions.canDuplicate && (
              <Dropdown.Item
                id="duplicate"
                label="Duplicate"
                icon={CopyPlus}
                hint={atLimit ? "Your plan's proposal limit is reached" : undefined}
                onAction={() => {
                  // At the limit say so before anyone fills in the copy (ORG-602).
                  if (usage && atLimit) toast.info(`${rfpUsageLabel(usage)}. ${rfpLimitMessage(usage)}`);
                  else setCopying(true);
                }}
              />
            )}
            {actions.canArchive && (
              <>
                <Dropdown.Separator />
                <Dropdown.Item
                  id="archive"
                  label="Archive"
                  icon={Archive}
                  tone="danger"
                  onAction={() => {
                    setArchiveError("");
                    setArchiving(true);
                  }}
                />
              </>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>

      <SaveCopyModal
        isOpen={copying}
        onClose={() => setCopying(false)}
        onConfirm={(overrides) => void saveCopy(overrides)}
        saving={savingCopy}
        defaultEventName={proposal.eventName}
        defaultStartDate={dayOf(proposal.eventStartDate)}
        defaultEndDate={dayOf(proposal.eventEndDate)}
      />

      {archiving && (
        <ProposalDeletionDialog
          proposalName={proposal.eventName}
          mode="archive"
          busy={archiveBusy}
          error={archiveError}
          onCancel={() => {
            if (!archiveInFlight.current) setArchiving(false);
          }}
          onConfirm={() => void confirmArchive()}
        />
      )}
    </>
  );
}

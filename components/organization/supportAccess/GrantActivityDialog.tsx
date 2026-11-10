"use client";

import { useEffect, useState } from "react";
import { getSupportGrantAction } from "@/app/actions/supportGrants";
import { InlineError, OrgDialog, secondaryButtonClass, TableSkeleton } from "../members/ui";
import {
  formatDateTime,
  grantTarget,
  operationLabel,
  SUPPORT_LABEL,
  supportGrantErrorMessage,
  accessUseLabel,
  type SupportGrant,
  type SupportGrantDetail,
} from "./supportGrantModel";

// The backend returns the newest 200 events.
const EVENT_LIMIT = 200;

type Load = { state: "loading" } | { state: "error"; message: string; gone: boolean } | { state: "ready"; detail: SupportGrantDetail };

type Props = {
  grant: SupportGrant;
  onClose: () => void;
  // The grant no longer exists for this organization: the list is out of date.
  onGone: () => void;
};

// ORG-405: what RFPilot Support did under one grant. Staff are shown as "RFPilot Support" with
// a short reference, never by name.
export default function GrantActivityDialog({ grant, onClose, onGone }: Props) {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let current = true;
    void getSupportGrantAction(grant.id).then((result) => {
      if (!current) return;
      if (result.success && result.data) setLoad({ state: "ready", detail: result.data });
      else {
        setLoad({
          state: "error",
          message: supportGrantErrorMessage(result, "The activity couldn't be loaded. Try again."),
          gone: result.code === "SUPPORT_GRANT_NOT_FOUND",
        });
      }
    });
    return () => {
      current = false;
    };
  }, [grant.id]);

  const close = () => {
    if (load.state === "error" && load.gone) onGone();
    onClose();
  };

  return (
    <OrgDialog
      wide
      title="Support activity"
      description={
        <>
          <span className="break-words font-semibold text-slate-700">{grantTarget(grant)}</span>
          {" · granted "}
          {formatDateTime(grant.createdAt)}
        </>
      }
      onClose={close}
      footer={<button type="button" className={secondaryButtonClass} onClick={close}>Close</button>}
    >
      {load.state === "loading" && <TableSkeleton rows={3} />}
      {load.state === "error" && <InlineError>{load.message}</InlineError>}
      {load.state === "ready" && load.detail.events.length === 0 && (
        <p className="rounded-md border border-dashed border-[#e4e4e4] bg-[#fafbfc] px-4 py-6 text-center text-sm text-slate-500">
          {SUPPORT_LABEL} hasn&apos;t used this access.
        </p>
      )}
      {load.state === "ready" && load.detail.events.length > 0 && (
        <>
          <p className="mb-3 text-xs text-slate-500">
            {accessUseLabel(load.detail.activity.useCount)}
            {load.detail.events.length >= EVENT_LIMIT ? `. Showing the latest ${EVENT_LIMIT}.` : "."}
          </p>
          <ol className="divide-y divide-slate-100 rounded-md border border-[#e4e4e4]" aria-label="Support activity">
            {load.detail.events.map((event, index) => (
              <li key={`${event.at}-${index}`} className="px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">{operationLabel(event.operation)}</p>
                {event.rfp && <p className="mt-0.5 break-words text-slate-600">{event.rfp.title ?? "An RFP that was deleted"}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  {SUPPORT_LABEL}
                  {event.agentReference ? ` (agent ${event.agentReference})` : ""} · {formatDateTime(event.at)}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </OrgDialog>
  );
}

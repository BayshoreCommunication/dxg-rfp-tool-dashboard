"use client";

import { ArrowLeft, Building2, FileText, LifeBuoy, Plus, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listSupportGrantsAction, revokeSupportGrantAction } from "@/app/actions/supportGrants";
import {
  Badge,
  dangerButtonClass,
  EmptyState,
  formatRelative,
  InlineError,
  OrgDialog,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  sectionClass,
  sectionTitleClass,
  Spinner,
  TableSkeleton,
  type BadgeTone,
} from "../members/ui";
import GrantActivityDialog from "./GrantActivityDialog";
import GrantSupportDialog from "./GrantSupportDialog";
import {
  currentStatus,
  formatDateTime,
  grantScopeLabel,
  grantTarget,
  STATUS_LABELS,
  SUPPORT_LABEL,
  supportGrantErrorMessage,
  timeLeft,
  accessUseLabel,
  type SupportGrant,
  type SupportGrantPage,
  type SupportGrantStatus,
} from "./supportGrantModel";

type DialogState = { kind: "grant" } | { kind: "revoke"; grant: SupportGrant } | { kind: "activity"; grant: SupportGrant } | null;

type Props = {
  // The first page, loaded by the route (which is also what proves the member may be here).
  initialPage: SupportGrantPage | null;
  initialError?: string | null;
};

// The shared link button's brand blue is too faint on white for small text (3.7:1).
const activityButtonClass =
  "rounded px-2 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

const STATUS_TONES: Record<SupportGrantStatus, BadgeTone> = { active: "emerald", expired: "slate", revoked: "rose" };
const FORMER_MEMBER = "a former member";

const mergeGrants = (current: SupportGrant[], incoming: SupportGrant[]): SupportGrant[] => {
  const seen = new Set(current.map((grant) => grant.id));
  return [...current, ...incoming.filter((grant) => !seen.has(grant.id))];
};

// ORG-405 (PRD P0-9): an Owner or Admin lets RFPilot Support read one RFP or the whole
// organization for a limited time, ends that access, and sees every grant with what Support did
// under it. The backend refuses every other role; the route answers 404 for them.
export default function SupportAccessSettings({ initialPage, initialError = null }: Props) {
  const [grants, setGrants] = useState<SupportGrant[]>(initialPage?.grants ?? []);
  const [page, setPage] = useState(initialPage?.page ?? 1);
  const [totalPages, setTotalPages] = useState(initialPage?.totalPages ?? 1);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [loaded, setLoaded] = useState(initialPage !== null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  // Dates and "time left" depend on the reader's clock and time zone, so they are drawn only in
  // the browser; the clock then ticks so an access that runs out stops showing as active.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Hydration guard: the reader's clock is only known in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const reload = useCallback(async () => {
    const result = await listSupportGrantsAction(1);
    if (result.success && result.data) {
      setGrants(result.data.grants);
      setPage(result.data.page);
      setTotalPages(result.data.totalPages);
      setLoadError(null);
      setLoaded(true);
    } else {
      setLoadError(supportGrantErrorMessage(result, "Support access couldn't be loaded. Try again."));
    }
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    const result = await listSupportGrantsAction(page + 1);
    setLoadingMore(false);
    if (result.success && result.data) {
      const next = result.data;
      setGrants((current) => mergeGrants(current, next.grants));
      setPage(next.page);
      setTotalPages(next.totalPages);
    } else {
      toast.error(supportGrantErrorMessage(result, "Older access couldn't be loaded. Try again."));
    }
  };

  const replaceGrant = (grant: SupportGrant) => setGrants((current) => current.map((item) => (item.id === grant.id ? grant : item)));

  const ready = loaded && now !== null;
  const clock = now ?? 0;
  const active = grants.filter((grant) => currentStatus(grant, clock) === "active");
  const past = grants.filter((grant) => currentStatus(grant, clock) !== "active");

  const grantButton = (
    <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={() => setDialog({ kind: "grant" })}>
      <Plus size={15} aria-hidden="true" /> Grant access
    </button>
  );

  const grantRow = (grant: SupportGrant) => {
    const status = currentStatus(grant, clock);
    const ended =
      status === "active"
        ? `${timeLeft(grant.expiresAt, clock)} (${formatDateTime(grant.expiresAt)})`
        : status === "revoked"
          ? `Revoked by ${grant.revokedBy?.name ?? FORMER_MEMBER} on ${formatDateTime(grant.revokedAt)}`
          : `Expired on ${formatDateTime(grant.expiresAt)}`;
    return (
      <li key={grant.id} className="rounded-md border border-[#e4e4e4] bg-white px-4 py-4" data-grant-status={status}>
        {/* Stacked on a phone: beside the buttons the title would be squeezed to a letter's width. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:flex-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#008ad2]">
              {grant.scope === "organization" ? <Building2 size={17} aria-hidden="true" /> : <FileText size={17} aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-slate-800" data-grant-title>{grantTarget(grant)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
                <Badge tone={grant.scope === "organization" ? "amber" : "sky"}>{grantScopeLabel(grant)}</Badge>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 pl-12 sm:pl-0">
            <button type="button" className={activityButtonClass} onClick={() => setDialog({ kind: "activity", grant })} aria-label={`View activity for ${grantTarget(grant)}`}>
              View activity
            </button>
            {status === "active" && (
              <button
                type="button"
                className={`${secondaryButtonClass} px-3 py-1.5 text-rose-700 hover:border-rose-200 hover:bg-rose-50`}
                onClick={() => setDialog({ kind: "revoke", grant })}
                aria-label={`Revoke access to ${grantTarget(grant)}`}
              >
                Revoke
              </button>
            )}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-slate-500 md:grid-cols-2">
          <div>
            <dt className="sr-only">Granted</dt>
            <dd>Granted by {grant.grantedBy?.name ?? FORMER_MEMBER} on {formatDateTime(grant.createdAt)}</dd>
          </div>
          <div>
            <dt className="sr-only">Ends</dt>
            <dd>{ended}</dd>
          </div>
          <div>
            <dt className="sr-only">Support activity</dt>
            <dd>
              {accessUseLabel(grant.activity.useCount)}
              {grant.activity.lastUsedAt ? ` · last used ${formatRelative(grant.activity.lastUsedAt, clock).toLowerCase()}` : ""}
            </dd>
          </div>
          {grant.reason && (
            <div className="md:col-span-2">
              <dt className="sr-only">Reason</dt>
              <dd className="break-words">Reason: {grant.reason}</dd>
            </div>
          )}
        </dl>
      </li>
    );
  };

  return (
    <div className="space-y-6 px-6 pb-10" data-testid="support-access">
      <div>
        <Link href="/settings/security" className="inline-flex items-center gap-1 rounded text-xs font-semibold text-slate-600 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          <ArrowLeft size={12} aria-hidden="true" /> Security
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-[30px] font-black leading-none tracking-tight text-slate-900">
          <LifeBuoy size={24} className="shrink-0 text-[#008ad2]" aria-hidden="true" />
          Support access
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] font-medium text-slate-600">
          {SUPPORT_LABEL} can&apos;t read your RFPs unless an Owner or Admin allows it. Grant access to one RFP or your whole
          organization for up to 30 days, and end it whenever you like. Everything Support opens is recorded here.
        </p>
      </div>

      {loadError && (
        <div className="space-y-3">
          <InlineError>{loadError}</InlineError>
          <button type="button" className={secondaryButtonClass} onClick={() => void reload()}>Try again</button>
        </div>
      )}

      {!loadError && (
        <>
          <section className={sectionClass} aria-labelledby="support-active-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="support-active-title" className={sectionTitleClass}>Active access</h2>
                <p className="mt-2 text-sm text-slate-500">What {SUPPORT_LABEL} can read right now.</p>
              </div>
              {grantButton}
            </div>
            <div className="mt-6">
              {!ready ? (
                <TableSkeleton rows={2} />
              ) : active.length === 0 ? (
                <EmptyState
                  icon={<ShieldOff size={20} />}
                  title={`${SUPPORT_LABEL} has no access`}
                  body="Nobody at RFPilot can read your RFPs. Grant access when you want Support to look at something with you."
                />
              ) : (
                <ul className="space-y-3" aria-label="Active access">{active.map(grantRow)}</ul>
              )}
            </div>
          </section>

          <section className={sectionClass} aria-labelledby="support-past-title">
            <h2 id="support-past-title" className={sectionTitleClass}>Past access</h2>
            <p className="mt-2 text-sm text-slate-500">Access that expired or was revoked, with what Support did under it.</p>
            <div className="mt-6">
              {!ready ? (
                <TableSkeleton rows={2} />
              ) : past.length === 0 ? (
                <p className="text-sm text-slate-500">No past access yet.</p>
              ) : (
                <ul className="space-y-3" aria-label="Past access">{past.map(grantRow)}</ul>
              )}
            </div>
            {ready && page < totalPages && (
              <div className="mt-5">
                <button type="button" className={secondaryButtonClass} onClick={() => void loadMore()} disabled={loadingMore}>
                  {loadingMore && <Spinner />} Show older access
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {dialog?.kind === "grant" && (
        <GrantSupportDialog
          onClose={() => setDialog(null)}
          onGranted={(grant) => {
            setGrants((current) => [grant, ...current.filter((item) => item.id !== grant.id)]);
            setDialog(null);
            toast.success(`${SUPPORT_LABEL} can now read ${grant.scope === "organization" ? "your organization's RFPs" : "that RFP"}.`);
          }}
        />
      )}
      {dialog?.kind === "revoke" && (
        <RevokeGrantDialog
          grant={dialog.grant}
          onClose={() => setDialog(null)}
          onRevoked={(grant) => {
            replaceGrant(grant);
            setDialog(null);
            toast.success(`${SUPPORT_LABEL} access revoked.`);
          }}
          onStale={() => void reload()}
        />
      )}
      {dialog?.kind === "activity" && (
        <GrantActivityDialog grant={dialog.grant} onClose={() => setDialog(null)} onGone={() => void reload()} />
      )}
    </div>
  );
}

type RevokeProps = {
  grant: SupportGrant;
  onClose: () => void;
  onRevoked: (grant: SupportGrant) => void;
  // The grant changed under us (it expired, or it is gone): the list needs a fresh copy.
  onStale: () => void;
};

function RevokeGrantDialog({ grant, onClose, onRevoked, onStale }: RevokeProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const revoke = async () => {
    setBusy(true);
    setError(null);
    const result = await revokeSupportGrantAction(grant.id);
    setBusy(false);
    if (result.success && result.data) return onRevoked(result.data);
    setError(supportGrantErrorMessage(result, "Access couldn't be revoked. Try again."));
    if (result.code === "SUPPORT_GRANT_EXPIRED" || result.code === "SUPPORT_GRANT_NOT_FOUND") {
      setStale(true);
      onStale();
    }
  };

  return (
    <OrgDialog
      title={`Revoke ${SUPPORT_LABEL} access?`}
      description={
        <>
          Support loses access to <span className="break-words font-semibold text-slate-700">{grantTarget(grant)}</span> straight away.
          What they did under it stays in the record.
        </>
      }
      busy={busy}
      onClose={onClose}
      footer={
        stale ? (
          <button type="button" className={secondaryButtonClass} onClick={onClose}>Close</button>
        ) : (
          <>
            <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Keep access</button>
            <button type="button" className={dangerButtonClass} onClick={() => void revoke()} disabled={busy}>
              {busy && <Spinner />} Revoke access
            </button>
          </>
        )
      }
    >
      {error && <InlineError>{error}</InlineError>}
    </OrgDialog>
  );
}

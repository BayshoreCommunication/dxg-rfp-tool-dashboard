"use client";

import { ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  approveAccessRequestAction,
  denyAccessRequestAction,
  getAccessRequestSettingsAction,
  listAccessRequestsAction,
  setAutoApproveDomainAction,
  type AccessRequest,
  type AccessRequestSettings,
} from "@/app/actions/accessRequests";
import { orgErrorMessage } from "../members/errorMessages";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "../members/orgAccess";
import type { InvitableRole, Team } from "../members/types";
import {
  formatRelative,
  InlineError,
  inputClass,
  linkButtonClass,
  primaryButtonClass,
  primaryButtonStyle,
  sectionClass,
  sectionTitleClass,
  Spinner,
} from "../members/ui";

/* ORG-306. People who signed up with an email on one of the organization's
   verified domains and asked to join. Approving sends them an invitation (it
   then shows as "Invited" in the Users table); denying lets them know. Owners
   and Admins can let their verified domain join without review. */

type Props = { teams: Team[]; onInvited: () => void };

export default function AccessRequestsSection({ teams, onInvited }: Props) {
  const [requests, setRequests] = useState<AccessRequest[] | null>(null);
  const [settings, setSettings] = useState<AccessRequestSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingSetting, setSavingSetting] = useState(false);
  const [choices, setChoices] = useState<Record<string, { role: InvitableRole; teamId: string }>>({});
  const activeTeams = teams.filter((team) => !team.archived);

  const load = useCallback(async () => {
    const [list, current] = await Promise.all([listAccessRequestsAction(), getAccessRequestSettingsAction()]);
    if (list.success) {
      setRequests(list.data ?? []);
      setLoadError(null);
    } else {
      setLoadError(orgErrorMessage(list, "Access requests couldn't be loaded."));
    }
    if (current.success && current.data) setSettings(current.data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const choiceFor = (id: string) => choices[id] ?? { role: "planner" as InvitableRole, teamId: "" };
  const setChoice = (id: string, patch: Partial<{ role: InvitableRole; teamId: string }>) =>
    setChoices((all) => ({ ...all, [id]: { ...choiceFor(id), ...patch } }));

  const decide = async (request: AccessRequest, decision: "approve" | "deny") => {
    setBusyId(request.id);
    const choice = choiceFor(request.id);
    const result =
      decision === "approve"
        ? await approveAccessRequestAction(request.id, { role: choice.role, teamId: choice.teamId || null })
        : await denyAccessRequestAction(request.id);
    setBusyId(null);
    if (result.success) {
      toast.success(
        decision === "approve"
          ? `Invitation sent to ${request.email}.`
          : `Request from ${request.email} declined.`,
      );
      if (decision === "approve") onInvited();
    } else {
      toast.error(orgErrorMessage(result));
    }
    await load();
  };

  const toggleAutoApprove = async (next: boolean) => {
    setSavingSetting(true);
    const result = await setAutoApproveDomainAction(next);
    setSavingSetting(false);
    if (result.success && result.data) {
      setSettings(result.data);
      toast.success(next ? "People from your verified domain will be invited automatically." : "New requests will wait for review.");
    } else {
      toast.error(orgErrorMessage(result));
    }
  };

  const domains = settings?.verifiedDomains ?? [];
  const pendingCount = requests?.length ?? 0;
  // Nothing to review and no verified domain: the feature can't apply yet, so stay out of the way.
  if (requests && pendingCount === 0 && settings && domains.length === 0) return null;

  return (
    <section className={sectionClass} aria-labelledby="access-requests-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="access-requests-title" className={sectionTitleClass}>
            Access requests{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            People who signed up with {domains.length ? domains.map((d) => `@${d}`).join(", ") : "your verified domain"} and
            asked to join. Approving sends them an invitation.
          </p>
        </div>
      </div>

      {settings && domains.length > 0 && (
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50/60 p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[#008ad2]"
            checked={settings.autoApproveDomain}
            disabled={savingSetting}
            onChange={(event) => void toggleAutoApprove(event.target.checked)}
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#222628]">
              <ShieldCheck size={15} className="text-emerald-600" aria-hidden="true" />
              Auto-approve users from our verified domain
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              New requests get a Planner invitation straight away, sent in the Owner&apos;s name. Manage domains in{" "}
              <Link href="/settings/security" className="font-semibold text-[#008ad2] hover:underline">Security</Link>.
            </span>
          </span>
        </label>
      )}

      <div className="mt-5">
        {loadError ? (
          <InlineError>{loadError}</InlineError>
        ) : !requests ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Loading requests…</div>
        ) : pendingCount === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <UserPlus size={15} aria-hidden="true" /> No requests waiting.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {requests.map((request) => {
              const choice = choiceFor(request.id);
              const busy = busyId === request.id;
              return (
                <li key={request.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#222628]">{request.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {request.email} · asked {formatRelative(request.createdAt)}
                    </p>
                  </div>
                  <select
                    aria-label={`Role for ${request.email}`}
                    className={`${inputClass} appearance-auto sm:w-44`}
                    value={choice.role}
                    disabled={busy}
                    onChange={(event) => setChoice(request.id, { role: event.target.value as InvitableRole })}
                  >
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                  {activeTeams.length > 0 && (
                    <select
                      aria-label={`Team for ${request.email}`}
                      className={`${inputClass} appearance-auto sm:w-44`}
                      value={choice.teamId}
                      disabled={busy}
                      onChange={(event) => setChoice(request.id, { teamId: event.target.value })}
                    >
                      <option value="">No team</option>
                      {activeTeams.map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={primaryButtonClass}
                      style={primaryButtonStyle}
                      disabled={busy}
                      onClick={() => void decide(request, "approve")}
                    >
                      {busy ? <Spinner /> : null} Approve
                    </button>
                    <button
                      type="button"
                      className={linkButtonClass}
                      disabled={busy}
                      onClick={() => void decide(request, "deny")}
                    >
                      Deny
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

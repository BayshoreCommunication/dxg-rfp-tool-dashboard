"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  listSecurityMembersAction,
  resetMemberTwoFactorAction,
  updateOrganizationSecurityAction,
  type OrganizationSecurity,
  type SecurityMember,
} from "@/app/actions/security";
import { resetBlockReason, roleLabel } from "./memberReset";
import { securityErrorMessage } from "./securityMessages";
import {
  ConfirmDialog,
  InlineError,
  SectionCard,
  StatusPill,
  inputClass,
  labelClass,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "./ui";

type Props = {
  settings: OrganizationSecurity;
  myTwoFactorEnabled: boolean;
  onSettingsChanged: (next: OrganizationSecurity) => void;
  onSetUpMyTwoFactor: () => void;
};

const OrganizationSecurityCard = ({ settings, myTwoFactorEnabled, onSettingsChanged, onSetUpMyTwoFactor }: Props) => {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsOwnTwoFactor, setNeedsOwnTwoFactor] = useState(false);

  const turningOn = !settings.requireTwoFactor;

  const apply = async () => {
    setBusy(true);
    setError(null);
    setNeedsOwnTwoFactor(false);
    const res = await updateOrganizationSecurityAction(turningOn);
    setBusy(false);
    setConfirming(false);
    if (res.success && res.data) {
      onSettingsChanged({ ...settings, requireTwoFactor: res.data.requireTwoFactor });
      const out = res.data.signedOutMembers;
      toast.success(
        res.data.requireTwoFactor
          ? `Two-factor is now required.${out ? ` ${out} ${out === 1 ? "member was" : "members were"} signed out to set it up.` : ""}`
          : "Two-factor is no longer required.",
      );
      return;
    }
    if (res.code === "TWO_FACTOR_REQUIRED_FOR_ACTOR") setNeedsOwnTwoFactor(true);
    setError(securityErrorMessage(res.code, "orgSecurity", res.status));
  };

  const onToggle = () => {
    setError(null);
    if (turningOn && !myTwoFactorEnabled) {
      setNeedsOwnTwoFactor(true);
      setError(securityErrorMessage("TWO_FACTOR_REQUIRED_FOR_ACTOR", "orgSecurity"));
      return;
    }
    setConfirming(true);
  };

  const without = settings.membersWithoutTwoFactor;

  return (
    <SectionCard
      title="Organization security"
      description="Settings that apply to everyone in your organization. Only Owners and Admins can change them."
    >
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-[#e4e4e4] bg-[#f9fafb] p-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#222628]">Require two-factor for everyone</span>
            <StatusPill on={settings.requireTwoFactor} onText="Required" offText="Optional" />
          </div>
          <p className="mt-1 text-sm text-[#6b7280]">
            {settings.activeMembers} active {settings.activeMembers === 1 ? "member" : "members"}
            {" · "}
            {without === 0 ? "everyone has two-factor on" : `${without} without two-factor`}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.requireTwoFactor}
          aria-label="Require two-factor for everyone"
          onClick={onToggle}
          disabled={busy}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
            settings.requireTwoFactor ? "bg-[#008ad2]" : "bg-slate-300"
          } disabled:opacity-60`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              settings.requireTwoFactor ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <InlineError message={error} />
      {needsOwnTwoFactor ? (
        <button
          type="button"
          className={primaryButtonClass + " mt-3"}
          style={primaryButtonStyle}
          onClick={() => {
            setError(null);
            setNeedsOwnTwoFactor(false);
            onSetUpMyTwoFactor();
          }}
        >
          Set up my two-factor
        </button>
      ) : null}

      <MemberResetPanel />

      <ConfirmDialog
        open={confirming}
        title={turningOn ? "Require two-factor for everyone?" : "Stop requiring two-factor?"}
        confirmLabel={turningOn ? "Require two-factor" : "Make it optional"}
        busy={busy}
        onConfirm={apply}
        onCancel={() => setConfirming(false)}
      >
        {turningOn ? (
          <>
            <p>
              Members who don&apos;t have two-factor on will be signed out now
              {without ? ` (${without} ${without === 1 ? "member" : "members"})` : ""}. The next time they sign in,
              they&apos;ll be asked to set it up before they can continue.
            </p>
            <p>Members who already use two-factor aren&apos;t affected.</p>
          </>
        ) : (
          <p>Members will be able to turn two-factor off for their own accounts. Nobody is signed out.</p>
        )}
      </ConfirmDialog>
    </SectionCard>
  );
};

/* No per-member 2FA status endpoint exists, so the reset works from a member picker. */
const MemberResetPanel = () => {
  const [members, setMembers] = useState<SecurityMember[] | null>(null);
  const [me, setMe] = useState<{ userId: string | null; role: string | null }>({ userId: null, role: null });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listSecurityMembersAction();
    if (res.success && res.data) {
      setMembers(res.data.members);
      setMe(res.data.me);
      setLoadError(null);
    } else {
      setMembers([]);
      setLoadError("Couldn't load your organization's members.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const options = useMemo(() => (members ?? []).filter((m) => m.userId !== me.userId), [members, me.userId]);
  const target = options.find((m) => m.userId === selected) ?? null;
  const blocked = target ? resetBlockReason(target, me) : null;
  const name = target ? target.name || target.email || "this member" : "";

  const reset = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    const res = await resetMemberTwoFactorAction(target.userId);
    setBusy(false);
    setConfirming(false);
    if (res.success && res.data) {
      toast.success(
        res.data.wasEnrolled
          ? `${name}'s two-factor was reset. They'll set it up again next time they sign in.`
          : `${name} didn't have two-factor on. Nothing to reset.`,
      );
      setSelected("");
      return;
    }
    setError(securityErrorMessage(res.code, "reset", res.status));
  };

  return (
    <div className="mt-6 border-t border-[#eef0f2] pt-6">
      <h3 className="text-base font-semibold text-[#222628]">Reset a member&apos;s two-factor</h3>
      <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
        Use this when someone has lost their phone and their recovery codes. Their two-factor is removed and
        they&apos;re signed out everywhere; they set it up again at their next sign-in.
      </p>
      <div className="mt-4 flex max-w-xl flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="reset-member" className={labelClass}>
            Member
          </label>
          <select
            id="reset-member"
            className={inputClass + " appearance-none"}
            value={selected}
            disabled={!members || options.length === 0}
            onChange={(e) => {
              setSelected(e.target.value);
              setError(null);
            }}
          >
            <option value="">{members ? (options.length ? "Choose a member" : "No other members yet") : "Loading members..."}</option>
            {options.map((m) => (
              <option key={m.userId} value={m.userId}>
                {(m.name || m.email || "Unnamed member") + (m.role ? ` (${roleLabel(m.role)})` : "")}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!target || Boolean(blocked) || busy}
          onClick={() => setConfirming(true)}
        >
          Reset 2FA
        </button>
      </div>
      {blocked ? <p className="mt-2 text-sm text-amber-700">{blocked}</p> : null}
      <InlineError message={loadError ?? error} />

      <ConfirmDialog
        open={confirming}
        danger
        title={`Reset ${name}'s two-factor?`}
        confirmLabel="Reset two-factor"
        busy={busy}
        onConfirm={reset}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {name} will be signed out on every device, and their authenticator app and recovery codes will stop working.
        </p>
        <p>Only do this once you&apos;re sure it&apos;s really them asking.</p>
      </ConfirmDialog>
    </div>
  );
};

export default OrganizationSecurityCard;

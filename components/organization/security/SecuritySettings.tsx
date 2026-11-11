"use client";

import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getOrganizationSecurityAction,
  getTwoFactorStatusAction,
  type OrganizationSecurity,
  type TwoFactorStatus,
} from "@/app/actions/security";
import SupportAccessLink from "../supportAccess/SupportAccessLink";
import DomainsCard from "./DomainsCard";
import OrganizationSecurityCard from "./OrganizationSecurityCard";
import SingleSignOnSection from "./SingleSignOnCard";
import { securityErrorMessage } from "./securityMessages";
import TwoFactorCard from "./TwoFactorCard";
import AuditLogLink from "../audit/AuditLogLink";

type OrgAccess = { state: "loading" } | { state: "denied" } | { state: "error"; message: string } | { state: "ok"; settings: OrganizationSecurity };

const SecuritySettings = () => {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [org, setOrg] = useState<OrgAccess>({ state: "loading" });
  const [startSignal, setStartSignal] = useState(0);

  const loadStatus = useCallback(async () => {
    const res = await getTwoFactorStatusAction();
    if (res.success && res.data) {
      setStatus(res.data);
      setStatusError(null);
    } else {
      setStatusError(securityErrorMessage(res.code, "enrol", res.status));
    }
  }, []);

  const loadOrg = useCallback(async () => {
    const res = await getOrganizationSecurityAction();
    if (res.success && res.data) setOrg({ state: "ok", settings: res.data });
    // organization:manage refuses everyone but Owners and Admins.
    else if (res.status === 403 || res.status === 401) setOrg({ state: "denied" });
    else setOrg({ state: "error", message: securityErrorMessage(res.code, "orgSecurity", res.status) });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus();
    void loadOrg();
  }, [loadStatus, loadOrg]);

  const refresh = () => {
    void loadStatus();
    if (org.state === "ok") void loadOrg();
  };

  return (
    <div className="space-y-6 px-6 pb-10">
      <div>
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#008ad2]">
          <ArrowLeft size={12} /> Settings
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-[30px] font-black leading-none tracking-tight text-slate-900">
          <Lock size={24} className="text-[#008ad2]" />
          Security
        </h1>
        <p className="mt-2 text-[13px] font-medium text-slate-400">
          Two-factor sign-in for your account
          {org.state === "ok" ? ", your organization's security rules, verified domains and single sign-on" : ""}.
        </p>
      </div>

      {status === null && !statusError ? (
        <div className="h-40 animate-pulse rounded-md border border-[#e4e4e4] bg-white" />
      ) : (
        <TwoFactorCard status={status} loadError={statusError} startSignal={startSignal} onChanged={refresh} />
      )}

      {org.state === "loading" ? <div className="h-40 animate-pulse rounded-md border border-[#e4e4e4] bg-white" /> : null}
      {org.state === "error" ? (
        <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {org.message}
        </p>
      ) : null}
      {org.state === "ok" ? (
        <>
          <AuditLogLink />
          <OrganizationSecurityCard
            settings={org.settings}
            myTwoFactorEnabled={Boolean(status?.enabled)}
            onSettingsChanged={(settings) => setOrg({ state: "ok", settings })}
            onSetUpMyTwoFactor={() => setStartSignal((n) => n + 1)}
          />
          <DomainsCard />
          <SupportAccessLink />
        </>
      ) : null}
      {org.state === "denied" ? (
        <p className="text-sm text-slate-500">
          Organization security and verified domains are managed by your organization&apos;s Owner and Admins.
        </p>
      ) : null}
      {org.state === "ok" || org.state === "denied" ? <SingleSignOnSection /> : null}
    </div>
  );
};

export default SecuritySettings;

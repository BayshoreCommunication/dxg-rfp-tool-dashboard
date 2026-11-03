"use client";

import { Globe, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  addDomainAction,
  checkDomainAction,
  listDomainsAction,
  removeDomainAction,
  type OrganizationDomain,
} from "@/app/actions/domains";
import {
  DOMAIN_STATUS_CLASS,
  DOMAIN_STATUS_LABEL,
  domainOutcomeText,
  formatCheckTime,
  normalizeDomainInput,
} from "./domainDisplay";
import { securityErrorMessage } from "./securityMessages";
import {
  ConfirmDialog,
  CopyButton,
  InlineError,
  SectionCard,
  inputClass,
  labelClass,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "./ui";

const TxtRecord = ({ domain }: { domain: OrganizationDomain }) => {
  const rows: Array<[string, string, boolean]> = [
    ["Type", domain.verification.type, false],
    ["Name / Host", domain.verification.name, true],
    ["Value", domain.verification.value, true],
  ];
  return (
    <div className="rounded-md border border-sky-100 bg-sky-50/50 p-4">
      <p className="text-sm font-semibold text-[#222628]">Add this TXT record at your DNS provider</p>
      <dl className="mt-3 divide-y divide-sky-100 rounded-md border border-sky-100 bg-white">
        {rows.map(([label, value, copy]) => (
          <div key={label} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="min-w-0 flex-1 break-all font-mono text-sm text-[#222628]">{value}</dd>
            {copy ? <CopyButton value={value} label={`Copy ${label.split(" ")[0].toLowerCase()}`} /> : null}
          </div>
        ))}
      </dl>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#4b5563]">
        <li>Sign in to wherever your domain&apos;s DNS is managed (GoDaddy, Cloudflare, Route 53, Google Domains...).</li>
        <li>
          Create a new <strong>TXT</strong> record. For the name, use <strong>@</strong> or the domain itself, as your
          provider expects; paste the value exactly.
        </li>
        <li>Save it, then come back and press &quot;Check now&quot;.</li>
      </ol>
      <p className="mt-2 text-xs text-slate-500">
        DNS changes can take up to a day to show up. We check automatically, and re-check verified domains every week,
        so leave the record in place.
      </p>
    </div>
  );
};

const DomainsCard = () => {
  const [domains, setDomains] = useState<OrganizationDomain[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [removing, setRemoving] = useState<OrganizationDomain | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await listDomainsAction();
    if (res.success && res.data) {
      setDomains(res.data);
      setLoadError(null);
    } else {
      setDomains([]);
      setLoadError(securityErrorMessage(res.code, "domain", res.status));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const domain = normalizeDomainInput(input);
    if (!domain) return;
    setAdding(true);
    setAddError(null);
    const res = await addDomainAction(domain);
    setAdding(false);
    if (res.success && res.data) {
      const added = res.data;
      setDomains((prev) => [added, ...(prev ?? []).filter((d) => d.id !== added.id)]);
      setExpanded(added.status === "verified" ? null : added.id);
      setInput("");
      toast.success(added.status === "verified" ? `${added.domain} is verified.` : `${added.domain} added. Publish the TXT record to verify it.`);
    } else {
      setAddError(securityErrorMessage(res.code, "domain", res.status));
    }
  };

  const check = async (domain: OrganizationDomain) => {
    setChecking(domain.id);
    const res = await checkDomainAction(domain.id);
    setChecking(null);
    if (res.success && res.data) {
      const next = res.data;
      setDomains((prev) => (prev ?? []).map((d) => (d.id === next.id ? next : d)));
      if (next.status === "verified") toast.success(`${next.domain} is verified.`);
      else toast.info(`We didn't find the TXT record for ${next.domain} yet. DNS can take up to a day.`);
    } else {
      toast.error(securityErrorMessage(res.code, "domain", res.status));
      if (res.code === "DOMAIN_NOT_FOUND") void load();
    }
  };

  const remove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    const res = await removeDomainAction(removing.id);
    setRemoveBusy(false);
    if (res.success || res.code === "DOMAIN_NOT_FOUND") {
      setDomains((prev) => (prev ?? []).filter((d) => d.id !== removing.id));
      toast.success(`${removing.domain} removed.`);
    } else {
      toast.error(securityErrorMessage(res.code, "domain", res.status));
    }
    setRemoving(null);
  };

  return (
    <SectionCard
      title="Verified domains"
      description="Prove your organization owns its email domains by publishing a DNS TXT record. Verification can take up to a day, and verified domains are re-checked weekly."
    >
      <form onSubmit={add} className="flex max-w-xl flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="new-domain" className={labelClass}>
            Add a domain
          </label>
          <input
            id="new-domain"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setAddError(null);
            }}
            className={inputClass}
            placeholder="yourcompany.com"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button type="submit" className={primaryButtonClass} style={primaryButtonStyle} disabled={adding || !input.trim()}>
          {adding ? "Adding..." : "Add domain"}
        </button>
      </form>
      <InlineError message={addError} />

      <div className="mt-6">
        {domains === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        ) : loadError ? (
          <InlineError message={loadError} />
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center rounded-md border border-dashed border-[#e4e4e4] px-6 py-10 text-center">
            <Globe className="text-slate-300" size={28} />
            <p className="mt-2 text-sm font-semibold text-[#222628]">No domains yet</p>
            <p className="mt-1 text-sm text-slate-500">Add your company&apos;s email domain to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#eef0f2] rounded-md border border-[#e4e4e4]">
            {domains.map((d) => {
              const outcome = domainOutcomeText(d.lastCheckOutcome);
              const open = expanded === d.id;
              return (
                <li key={d.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-all font-semibold text-[#222628]">{d.domain}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${DOMAIN_STATUS_CLASS[d.status]}`}>
                          {DOMAIN_STATUS_LABEL[d.status]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Last checked: {formatCheckTime(d.lastCheckedAt)}
                        {outcome ? ` · ${outcome}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.status !== "verified" ? (
                        <button type="button" className={secondaryButtonClass + " px-3 py-1.5 text-xs"} onClick={() => setExpanded(open ? null : d.id)}>
                          {open ? "Hide record" : "Show TXT record"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={secondaryButtonClass + " px-3 py-1.5 text-xs"}
                        disabled={checking === d.id}
                        onClick={() => check(d)}
                      >
                        <RefreshCw size={13} className={checking === d.id ? "animate-spin" : ""} />
                        {checking === d.id ? "Checking..." : "Check now"}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${d.domain}`}
                        className="inline-flex items-center rounded-md border border-[#e4e4e4] px-2 py-1.5 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                        onClick={() => setRemoving(d)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div className="mt-3">
                      <TxtRecord domain={d} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        danger
        title={`Remove ${removing?.domain ?? "this domain"}?`}
        confirmLabel="Remove domain"
        busy={removeBusy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      >
        <p>It will no longer count as verified for your organization. You can add it again later, but it will need verifying again.</p>
      </ConfirmDialog>
    </SectionCard>
  );
};

export default DomainsCard;

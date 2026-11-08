"use client";

import {
  getOrganizationProfileAction,
  saveOrganizationDetailsAction,
  type OrganizationDetailsInput,
  type OrganizationProfile,
} from "@/app/actions/organizationProfile";
import type { OrgActionResult } from "@/app/actions/organizationApi";
import {
  COUNTRY_OPTIONS,
  ORGANIZATION_FIELD_ERRORS,
  ORGANIZATION_TYPE_OPTIONS,
  PLAN_LABELS,
  US_TIME_ZONE_OPTIONS,
} from "@/components/auth/onboardingOptions";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

/* The company details from onboarding (ORG-301): name, type, industry,
   country, time zone and events per year. Owners and Admins edit them here
   after onboarding; everyone else sees them read-only. Saved on its own,
   apart from the "Update Settings" button below, because it is the
   organization's record rather than this account's preferences. */

const labelClass = "mb-2 block text-sm font-semibold text-[#969798]";
const inputClass =
  "h-10 w-full rounded-md border border-[#e4e4e4] bg-white px-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-500";

type Option = { value: string; label: string };

const toForm = (profile: OrganizationProfile): OrganizationDetailsInput => ({
  name: profile.name,
  type: profile.type ?? "",
  industry: profile.industry ?? "",
  country: profile.country ?? "",
  timeZone: profile.timeZone ?? "",
  eventsPerYear: profile.eventsPerYear === null ? "" : String(profile.eventsPerYear),
});

// A value saved before the lists were narrowed to the US still shows as itself.
const withSaved = (options: Option[], saved: string): Option[] =>
  saved && !options.some((option) => option.value === saved) ? [...options, { value: saved, label: saved }] : options;

const errorFor = (result: OrgActionResult<unknown>) => {
  const field = result.details?.field;
  if (result.code === "VALIDATION_ERROR" && typeof field === "string" && ORGANIZATION_FIELD_ERRORS[field]) {
    return ORGANIZATION_FIELD_ERRORS[field];
  }
  if (result.status === 403) return "Only the organization's Owner or an Admin can change these details.";
  if (result.status === 429) return "Too many changes. Wait a few minutes and try again.";
  return "We couldn't save the organization details. Try again.";
};

export default function OrganizationDetailsSettings() {
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [form, setForm] = useState<OrganizationDetailsInput | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const result = await getOrganizationProfileAction();
    if (result.success && result.data) {
      setProfile(result.data);
      setForm(toForm(result.data));
      setLoadError(null);
    } else {
      setLoadError("Organization details couldn't be loaded.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const update = (patch: Partial<OrganizationDetailsInput>) => setForm((current) => (current ? { ...current, ...patch } : current));

  const dirty = Boolean(profile && form && JSON.stringify(toForm(profile)) !== JSON.stringify(form));
  const canManage = profile?.canManage === true;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return setError(ORGANIZATION_FIELD_ERRORS.name);
    const events = form.eventsPerYear.trim();
    if (events && !/^\d+$/.test(events)) return setError(ORGANIZATION_FIELD_ERRORS.eventsPerYear);
    setError(null);
    setSaving(true);
    const result = await saveOrganizationDetailsAction({ ...form, name: form.name.trim() });
    setSaving(false);
    if (result.success && result.data) {
      setProfile(result.data);
      setForm(toForm(result.data));
      toast.success("Organization details saved.");
    } else {
      setError(errorFor(result));
    }
  };

  return (
    <section className="rounded-md border border-[#e4e4e4] bg-white px-5 py-6 md:px-8" aria-labelledby="organization-details-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="organization-details-title" className="text-xl font-semibold leading-none text-[#222628] md:text-[26px]">
            Organization
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {canManage
              ? "Your company details from sign-up. Owners and Admins can change them."
              : "Your company details. Ask an Owner or Admin to change them."}
          </p>
        </div>
        {profile ? (
          <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            Plan: {PLAN_LABELS[profile.plan] ?? profile.plan}
          </span>
        ) : null}
      </div>

      {loadError ? (
        <p role="alert" className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>
      ) : !form ? (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index}>
              <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={save} noValidate className="mt-8">
          <fieldset disabled={!canManage || saving} className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="org-name" className={labelClass}>Company name</label>
              <input id="org-name" className={inputClass} maxLength={200} value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="org-type" className={labelClass}>Organization type</label>
              <select id="org-type" className={`${inputClass} appearance-auto`} value={form.type} onChange={(e) => update({ type: e.target.value as OrganizationDetailsInput["type"] })}>
                <option value="">Not set</option>
                {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="org-industry" className={labelClass}>Industry</label>
              <input id="org-industry" className={inputClass} maxLength={120} placeholder="Not set" value={form.industry} onChange={(e) => update({ industry: e.target.value })} />
            </div>
            <div>
              <label htmlFor="org-events" className={labelClass}>Events per year</label>
              <input id="org-events" className={inputClass} inputMode="numeric" placeholder="Not set" value={form.eventsPerYear} onChange={(e) => update({ eventsPerYear: e.target.value.replace(/[^\d]/g, "") })} />
            </div>
            <div>
              <label htmlFor="org-country" className={labelClass}>Country</label>
              <select id="org-country" className={`${inputClass} appearance-auto`} value={form.country} onChange={(e) => update({ country: e.target.value })}>
                <option value="">Not set</option>
                {withSaved(COUNTRY_OPTIONS, form.country).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="org-timezone" className={labelClass}>Time zone</label>
              <select id="org-timezone" className={`${inputClass} appearance-auto`} value={form.timeZone} onChange={(e) => update({ timeZone: e.target.value })}>
                <option value="">Not set</option>
                {withSaved(US_TIME_ZONE_OPTIONS, form.timeZone).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </fieldset>

          {error ? <p role="alert" className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}

          {canManage ? (
            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={!dirty || saving}
                className="rounded-md px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.30)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
              >
                {saving ? "Saving..." : "Save organization details"}
              </button>
              {dirty && !saving ? (
                <button type="button" className="text-sm font-semibold text-slate-500 hover:text-slate-800" onClick={() => { setForm(toForm(profile!)); setError(null); }}>
                  Discard changes
                </button>
              ) : null}
            </div>
          ) : null}
        </form>
      )}
    </section>
  );
}

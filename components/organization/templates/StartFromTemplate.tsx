"use client";

import { FileStack, LayoutTemplate, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { createRfpFromTemplateAction, listTemplatesAction } from "@/app/actions/proposalTemplates";
import { Badge, EmptyState, InlineError, inputClass, labelClass, OrgDialog, primaryButtonClass, primaryButtonStyle, secondaryButtonClass, Spinner, TableSkeleton } from "../members/ui";
import {
  eventNameError,
  isRoleRefusal,
  isStaleTemplate,
  LAYOUT_LABELS,
  MAX_EVENT_NAME_LENGTH,
  planLimitOf,
  planLimitSummary,
  TEMPLATES_HIDDEN_MESSAGE,
  templateErrorMessage,
  type PlanLimit,
  type RfpTemplate,
} from "./templateModel";

// Where "Contact us" leads until paid plans and checkout exist: the in-app support desk (the
// same place the ORG-602 limit states send people).
const CONTACT_HREF = "/support";
const PICKER_LIMIT = 200;

// Where a new RFP opens: the assistant workspace when conversations are on, the editor otherwise.
export const rfpHref = (proposalId: string): string =>
  process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED === "true"
    ? `/proposals/${encodeURIComponent(proposalId)}/assistant`
    : `/proposals/proposal-edit?proposalId=${encodeURIComponent(proposalId)}`;

// The organization has used every RFP its plan includes: a state with a next step, not an error.
export function TemplatePlanLimit({ limit }: { limit: PlanLimit }) {
  return (
    <div role="status" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-4">
      <p className="text-sm font-semibold text-amber-900">You&apos;ve reached your plan&apos;s RFP limit</p>
      <p className="mt-1 text-sm leading-6 text-amber-900">
        {planLimitSummary(limit)} Starting an RFP from a template counts as a new RFP, and deleting an RFP doesn&apos;t free one up.
      </p>
      <p className="mt-3 text-sm text-amber-900">
        <Link href={CONTACT_HREF} className="font-semibold underline underline-offset-2 hover:text-amber-950">Contact us</Link> to upgrade your plan.
      </p>
    </div>
  );
}

type PickerProps = { onClose: () => void };

// The template picker: the member's own personal templates and the organization's published
// ones (the backend decides which; nothing here widens it).
export function TemplatePickerDialog({ onClose }: PickerProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<RfpTemplate[] | null>(null);
  const [total, setTotal] = useState(0);
  // Templates the member sees but can't start from (an Owner's unpublished organization ones).
  const [unusable, setUnusable] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planLimit, setPlanLimit] = useState<PlanLimit | null>(null);
  const groupName = useId();
  const eventNameId = useId();

  const load = useCallback(async () => {
    const result = await listTemplatesAction({ scope: "all", status: "active", limit: PICKER_LIMIT });
    if (result.success && result.data) {
      // Owners and Admins also get unpublished organization templates back; those can't be used.
      const usable = result.data.items.filter((template) => template.usable);
      setTemplates(usable);
      setTotal(result.data.total);
      setUnusable(result.data.items.length - usable.length);
      setLoadError(null);
      setSelectedId((current) => (current && usable.some((template) => template.id === current) ? current : null));
    } else {
      setTemplates(null);
      setLoadError(isRoleRefusal(result) ? TEMPLATES_HIDDEN_MESSAGE : templateErrorMessage(result, "Your templates couldn't be loaded. Close this and try again."));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const all = templates ?? [];
    if (!needle) return all;
    return all.filter((template) => `${template.title} ${template.description} ${template.eventName}`.toLowerCase().includes(needle));
  }, [templates, search]);
  const selected = templates?.find((template) => template.id === selectedId) ?? null;
  const eventNameProblem = eventNameError(eventName);

  const create = async () => {
    if (!selected || eventNameProblem) return;
    setBusy(true);
    setError(null);
    const result = await createRfpFromTemplateAction(selected.id, eventName);
    if (result.success && result.data) {
      toast.success(`RFP started from ${selected.title}.`);
      router.push(rfpHref(result.data.proposalId));
      return;
    }
    setBusy(false);
    const limit = planLimitOf(result);
    if (limit) return setPlanLimit(limit);
    setError(templateErrorMessage(result, "The RFP couldn't be started. Try again."));
    // The template was archived, unpublished or removed while the picker was open.
    if (isStaleTemplate(result)) void load();
  };

  const group = (title: string, items: RfpTemplate[]) =>
    items.length > 0 && (
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <ul className="space-y-2">
          {items.map((template) => (
            <li key={template.id}>
              <label className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 ${selectedId === template.id ? "border-[#008ad2] bg-sky-50/60" : "border-[#e4e4e4] hover:border-slate-300"}`}>
                <input
                  type="radio"
                  name={groupName}
                  className="mt-1"
                  checked={selectedId === template.id}
                  onChange={() => {
                    setSelectedId(template.id);
                    setError(null);
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words text-sm font-semibold text-slate-800">{template.title}</span>
                    {template.presentationLayout && <Badge tone="sky">{LAYOUT_LABELS[template.presentationLayout]} layout</Badge>}
                  </span>
                  {template.description && <span className="mt-0.5 block break-words text-xs text-slate-500">{template.description}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    );

  if (planLimit) {
    return (
      <OrgDialog
        title="Start from a template"
        onClose={onClose}
        footer={<button type="button" className={secondaryButtonClass} onClick={onClose}>Close</button>}
      >
        <TemplatePlanLimit limit={planLimit} />
      </OrgDialog>
    );
  }

  return (
    <OrgDialog
      title="Start from a template"
      description="Creates a new draft RFP with the template's content. Dates, contacts, vendors and files start empty."
      busy={busy}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={() => void create()} disabled={busy || !selected || !!eventNameProblem}>
            {busy ? <Spinner /> : <FileStack size={15} aria-hidden="true" />} Create RFP
          </button>
        </>
      }
    >
      <div className="space-y-4" aria-live="polite" aria-busy={templates === null && !loadError}>
        {loadError ? (
          <InlineError>{loadError}</InlineError>
        ) : templates === null ? (
          <TableSkeleton rows={3} />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<LayoutTemplate size={20} />}
            title={unusable > 0 ? "No published templates" : "No templates yet"}
            body={unusable > 0
              ? "Publish a template under Settings, Templates to start RFPs from it."
              : "Open your RFP list and choose Save as template on an RFP you want to reuse."}
          />
        ) : (
          <>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search templates"
                placeholder="Search templates"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
            {shown.length === 0 ? (
              <p className="text-sm text-slate-500">No templates match.</p>
            ) : (
              <div role="radiogroup" aria-label="Templates" className="space-y-4">
                {group("Organization templates", shown.filter((template) => template.scope === "organization"))}
                {group("My templates", shown.filter((template) => template.scope === "personal"))}
              </div>
            )}
            {total > PICKER_LIMIT && <p className="text-xs text-slate-500">Showing the first {PICKER_LIMIT} templates. Archive ones you no longer use under Settings, Templates.</p>}
            {selected && (
              <div>
                <label htmlFor={eventNameId} className={labelClass}>Event name (optional)</label>
                <input
                  id={eventNameId}
                  className={inputClass}
                  value={eventName}
                  maxLength={MAX_EVENT_NAME_LENGTH}
                  placeholder={selected.eventName || selected.title}
                  onChange={(event) => setEventName(event.target.value)}
                  aria-invalid={!!eventNameProblem}
                />
                {eventNameProblem && <p className="mt-1.5 text-xs font-medium text-red-600">{eventNameProblem}</p>}
              </div>
            )}
          </>
        )}
        {error && <InlineError>{error}</InlineError>}
      </div>
    </OrgDialog>
  );
}

type StartProps = {
  // "chip" sits beside the assistant workspace's starters; "banner" heads the wizard.
  variant?: "chip" | "banner";
};

// The entry on the RFP creation start screen. Rendered only for members who can use templates.
export default function StartFromTemplate({ variant = "chip" }: StartProps) {
  const [open, setOpen] = useState(false);
  const dialog = open && <TemplatePickerDialog onClose={() => setOpen(false)} />;

  if (variant === "banner") {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#e4e4e4] bg-white px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Have a template for this kind of event?</p>
          <p className="text-xs text-slate-500">Start with the content of a saved RFP instead of an empty one.</p>
        </div>
        <button type="button" className={secondaryButtonClass} onClick={() => setOpen(true)}>
          <LayoutTemplate size={15} aria-hidden="true" /> Start from a template
        </button>
        {dialog}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Use the content of an RFP you or your organization saved as a template"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50/60 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2"
      >
        <LayoutTemplate size={15} aria-hidden className="shrink-0 text-[#00aeb5]" />
        Start from a template
      </button>
      {dialog}
    </>
  );
}

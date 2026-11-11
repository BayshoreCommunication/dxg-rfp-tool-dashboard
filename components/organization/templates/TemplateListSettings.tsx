"use client";

import { Archive, LayoutTemplate, Lock, Pencil, RotateCcw, Search, Share2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { listTemplatesAction, publishTemplateAction, restoreTemplateAction, unpublishTemplateAction } from "@/app/actions/proposalTemplates";
import TopHeader from "@/components/settings/TopHeaser";
import {
  Badge,
  EmptyState,
  formatDate,
  InlineError,
  inputClass,
  linkButtonClass,
  OrgDialog,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  sectionClass,
  sectionTitleClass,
  Spinner,
  TableSkeleton,
} from "../members/ui";
import { ArchiveTemplateDialog, RenameTemplateDialog, type TemplateFailure } from "./TemplateDialogs";
import {
  canChangeTemplate,
  canPublishTemplate,
  canUnpublishTemplate,
  isRoleRefusal,
  isStaleTemplate,
  LAYOUT_LABELS,
  TEMPLATES_HIDDEN_MESSAGE,
  templateErrorMessage,
  type RfpTemplate,
  type TemplateAccess,
  type TemplateListScope,
} from "./templateModel";

const PAGE_SIZE = 50;
const SEARCH_DELAY_MS = 300;

type DialogState = { kind: "rename"; template: RfpTemplate } | { kind: "archive"; template: RfpTemplate } | { kind: "share"; template: RfpTemplate } | null;
type StatusFilter = "active" | "archived";
type Props = { access: TemplateAccess };

const SCOPES: ReadonlyArray<[TemplateListScope, string]> = [["all", "All"], ["organization", "Organization"], ["personal", "Mine"]];
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const toggleClass = (on: boolean) =>
  `flex-1 whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${on ? "bg-sky-50 text-[#0076b4]" : "text-slate-500 hover:text-slate-800"}`;

// ORG-605: the template management list under Settings. Every member who can use templates sees
// their own personal templates and the organization's published ones; Owners and Admins also see
// and manage unpublished and archived organization templates. The rows come from the backend,
// already scoped to the member.
export default function TemplateListSettings({ access: initialAccess }: Props) {
  const [access, setAccess] = useState(initialAccess);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<TemplateListScope>("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [templates, setTemplates] = useState<RfpTemplate[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The filters the rows on screen were loaded for; while they differ the rows are stale.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  // Only the newest list request may update the screen (typing in the search box overlaps requests).
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async (offset: number) => {
    const request = ++requestRef.current;
    const result = await listTemplatesAction({ search, scope, status, limit: PAGE_SIZE, offset });
    if (request !== requestRef.current) return;
    if (result.success && result.data) {
      const page = result.data;
      setTemplates((previous) => (offset === 0 || !previous ? page.items : [...previous, ...page.items.filter((item) => !previous.some((p) => p.id === item.id))]));
      setTotal(page.total);
      setLoadError(null);
      setLoadedFor(JSON.stringify([search, scope, status]));
    } else if (offset > 0) {
      // The rows already on screen stay; only the next page is missing.
      toast.error(templateErrorMessage(result, "More templates couldn't be loaded. Try again."));
    } else {
      setTemplates(null);
      setLoadError(isRoleRefusal(result) ? TEMPLATES_HIDDEN_MESSAGE : templateErrorMessage(result, "Your templates couldn't be loaded. Reload the page to try again."));
    }
  }, [search, scope, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(0);
  }, [load]);

  const refresh = () => void load(0);

  // The backend refused a write for the role (it changed since sign-in): stop offering what it
  // refused. A template that is gone or changed under the member reloads the list.
  const onFailure = (failure: TemplateFailure) => {
    if (isRoleRefusal(failure)) setAccess((current) => ({ ...current, canManage: false }));
    if (isStaleTemplate(failure) || isRoleRefusal(failure)) refresh();
  };

  const run = async (template: RfpTemplate, action: (id: string) => ReturnType<typeof publishTemplateAction>, done: string) => {
    setWorkingId(template.id);
    const result = await action(template.id);
    setWorkingId(null);
    if (result.success) {
      toast.success(done);
      return refresh();
    }
    toast.error(templateErrorMessage(result));
    onFailure(result);
  };

  const filtered = search !== "";
  const stale = loadedFor !== JSON.stringify([search, scope, status]);
  const loading = !loadError && (templates === null || (stale && templates.length === 0));
  const shown = templates ?? [];

  const row = (template: RfpTemplate) => {
    const working = workingId === template.id;
    const change = canChangeTemplate(template, access);
    const publish = canPublishTemplate(template, access);
    const unpublish = canUnpublishTemplate(template, access);
    return (
      <li key={template.id} className="flex flex-col gap-3 border-t border-[#e4e4e4] px-4 py-4 first:border-t-0 md:flex-row md:items-start md:gap-6">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-words text-sm font-semibold text-slate-800">{template.title}</span>
            <Badge tone={template.scope === "organization" ? "violet" : "slate"}>{template.scope === "organization" ? "Organization" : "Personal"}</Badge>
            {template.archived ? <Badge>Archived</Badge>
              : template.scope === "organization" && (template.published ? <Badge tone="emerald">Published</Badge> : <Badge tone="amber">Not published</Badge>)}
            {template.presentationLayout && <Badge tone="sky">{LAYOUT_LABELS[template.presentationLayout]} layout</Badge>}
          </p>
          {template.description && <p className="mt-1 break-words text-sm text-slate-600">{template.description}</p>}
          <p className="mt-1 text-xs text-slate-500">
            {template.ownedByMe ? "Saved by you" : "Saved by a teammate"}
            {template.createdAt ? ` on ${formatDate(template.createdAt)}` : ""}
            {template.eventName ? ` · from ${template.eventName}` : ""}
          </p>
        </div>
        {(change || publish || unpublish) && (
          <div className="flex shrink-0 flex-wrap items-center gap-1 md:justify-end">
            {working && <Spinner size={12} />}
            {template.archived ? (
              change && (
                <button type="button" className={linkButtonClass} aria-label={`Restore ${template.title}`} disabled={working} onClick={() => void run(template, restoreTemplateAction, `${template.title} restored.`)}>
                  <RotateCcw size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Restore
                </button>
              )
            ) : (
              <>
                {publish && template.scope === "organization" && (
                  <button type="button" className={linkButtonClass} aria-label={`Publish ${template.title}`} disabled={working} onClick={() => void run(template, publishTemplateAction, `${template.title} published to your organization.`)}>
                    <Share2 size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Publish
                  </button>
                )}
                {publish && template.scope === "personal" && (
                  <button type="button" className={linkButtonClass} aria-label={`Share ${template.title} with the organization`} disabled={working} onClick={() => setDialog({ kind: "share", template })}>
                    <Share2 size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Share with organization
                  </button>
                )}
                {unpublish && (
                  <button type="button" className={linkButtonClass} aria-label={`Unpublish ${template.title}`} disabled={working} onClick={() => void run(template, unpublishTemplateAction, `${template.title} unpublished.`)}>
                    <Undo2 size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Unpublish
                  </button>
                )}
                {change && (
                  <>
                    <button type="button" className={linkButtonClass} aria-label={`Edit ${template.title}`} disabled={working} onClick={() => setDialog({ kind: "rename", template })}>
                      <Pencil size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Edit
                    </button>
                    <button type="button" className={linkButtonClass} aria-label={`Archive ${template.title}`} disabled={working} onClick={() => setDialog({ kind: "archive", template })}>
                      <Archive size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Archive
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6 px-6 pb-8">
      <TopHeader templatesLink />
      <section className={sectionClass} aria-labelledby="template-list-title">
        <div>
          <h2 id="template-list-title" className={sectionTitleClass}>RFP templates</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {access.canManage
              ? "Templates hold an RFP's content and layout to start new RFPs from. Publish one to share it with everyone in your organization who creates RFPs."
              : "Templates hold an RFP's content and layout to start new RFPs from. Your personal templates are visible only to you."}
            {" "}To add one, choose Save as template on an RFP in your RFP list.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search templates"
              placeholder="Search by name or description"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          <div role="group" aria-label="Show templates from" className="flex shrink-0 rounded-md border border-[#e4e4e4] p-0.5">
            {SCOPES.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={scope === value} onClick={() => setScope(value)} className={toggleClass(scope === value)}>{label}</button>
            ))}
          </div>
          <div role="group" aria-label="Show templates" className="flex shrink-0 rounded-md border border-[#e4e4e4] p-0.5">
            {(["active", "archived"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={toggleClass(status === value)}>
                {value === "active" ? "Active" : "Archived"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5" aria-live="polite" aria-busy={loading}>
          {loadError ? (
            <InlineError>{loadError}</InlineError>
          ) : loading ? (
            <TableSkeleton rows={4} />
          ) : shown.length === 0 ? (
            filtered ? (
              <EmptyState icon={<Search size={20} />} title="No templates match" body="Try a different name." />
            ) : status === "archived" ? (
              <EmptyState icon={<Archive size={20} />} title="No archived templates" body="Templates you archive are kept here and can be restored." />
            ) : (
              <EmptyState
                icon={<LayoutTemplate size={20} />}
                title={scope === "organization" ? "No organization templates yet" : "No templates yet"}
                body="Open your RFP list and choose Save as template on an RFP you want to reuse."
              />
            )
          ) : (
            <>
              <p className="mb-2 text-xs text-slate-500">
                {shown.length < total ? `Showing ${shown.length} of ${plural(total, "template")}` : plural(total, "template")}
              </p>
              <ul className="rounded-md border border-[#e4e4e4]">{shown.map(row)}</ul>
              {shown.length < total && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={loadingMore}
                    onClick={async () => {
                      setLoadingMore(true);
                      await load(shown.length);
                      setLoadingMore(false);
                    }}
                  >
                    {loadingMore && <Spinner />} Show more templates
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {!access.canManage && (
          <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <Lock size={12} aria-hidden="true" /> Only Owners and Admins can publish, unpublish or archive organization templates.
          </p>
        )}
      </section>

      {dialog?.kind === "rename" && (
        <RenameTemplateDialog
          template={dialog.template}
          onClose={() => setDialog(null)}
          onFailure={onFailure}
          onSaved={(template) => {
            setDialog(null);
            toast.success(`${template.title} updated.`);
            refresh();
          }}
        />
      )}
      {dialog?.kind === "archive" && (
        <ArchiveTemplateDialog
          template={dialog.template}
          onClose={() => setDialog(null)}
          onFailure={onFailure}
          onArchived={(template) => {
            setDialog(null);
            toast.success(`${template.title} archived.`);
            refresh();
          }}
        />
      )}
      {dialog?.kind === "share" && (
        <OrgDialog
          title={`Share ${dialog.template.title} with your organization?`}
          description="It becomes an organization template that every member who can create RFPs can start from. It won't return to your personal templates; you can unpublish or archive it later."
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className={secondaryButtonClass} onClick={() => setDialog(null)}>Cancel</button>
              <button
                type="button"
                className={primaryButtonClass}
                style={primaryButtonStyle}
                onClick={() => {
                  const template = dialog.template;
                  setDialog(null);
                  void run(template, publishTemplateAction, `${template.title} published to your organization.`);
                }}
              >
                <Share2 size={15} aria-hidden="true" /> Share template
              </button>
            </>
          }
        />
      )}
    </div>
  );
}

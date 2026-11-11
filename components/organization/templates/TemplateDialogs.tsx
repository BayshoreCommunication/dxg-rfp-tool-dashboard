"use client";

import { Archive, BookmarkPlus } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { archiveTemplateAction, renameTemplateAction, saveTemplateAction } from "@/app/actions/proposalTemplates";
import { dangerButtonClass, InlineError, inputClass, labelClass, OrgDialog, primaryButtonClass, primaryButtonStyle, secondaryButtonClass, Spinner } from "../members/ui";
import {
  descriptionError,
  LAYOUT_LABELS,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_TITLE_LENGTH,
  templateErrorMessage,
  tidyTitle,
  titleError,
  type PresentationLayout,
  type RfpTemplate,
  type TemplateAccess,
  type TemplateScope,
} from "./templateModel";

export type TemplateFailure = { code?: string; status?: number };

const textareaClass = `${inputClass} h-auto min-h-[84px] resize-y py-2`;
const fieldErrorClass = "mt-1.5 text-xs font-medium text-red-600";

type SaveProps = {
  proposalId: string;
  // The RFP's event name, offered as the template's name.
  defaultTitle: string;
  access: TemplateAccess;
  onClose: () => void;
  onSaved: (template: RfpTemplate) => void;
  onFailure?: (failure: TemplateFailure) => void;
};

// "Save as template" on an RFP. Personal for everyone who can use templates; an Owner or Admin
// can also save it straight to the organization (which publishes it).
export function SaveAsTemplateDialog({ proposalId, defaultTitle, access, onClose, onSaved, onFailure }: SaveProps) {
  const [title, setTitle] = useState(defaultTitle.slice(0, MAX_TEMPLATE_TITLE_LENGTH));
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<TemplateScope>("personal");
  const [layout, setLayout] = useState<PresentationLayout | "">("");
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const layoutId = useId();

  const titleProblem = titleError(title);
  const descriptionProblem = descriptionError(description);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (titleProblem || descriptionProblem) return;
    setBusy(true);
    setError(null);
    const result = await saveTemplateAction({
      proposalId,
      title: tidyTitle(title),
      description: description.trim(),
      // Never ask for the organization scope for a member who can't manage organization templates.
      scope: access.canManage ? scope : "personal",
      presentationLayout: layout || null,
    });
    setBusy(false);
    if (result.success && result.data) return onSaved(result.data);
    setError(templateErrorMessage(result, "The template couldn't be saved. Try again."));
    onFailure?.(result);
  };

  return (
    <OrgDialog
      title="Save as template"
      description="Keeps this RFP's content to start new RFPs from. Vendors, responses, dates, contacts and uploaded files are not copied."
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form={formId} className={primaryButtonClass} style={primaryButtonStyle} disabled={busy}>
            {busy ? <Spinner /> : <BookmarkPlus size={15} aria-hidden="true" />} Save template
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor={titleId} className={labelClass}>Template name</label>
          <input
            id={titleId}
            className={inputClass}
            value={title}
            maxLength={MAX_TEMPLATE_TITLE_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={showErrors && !!titleProblem}
            aria-describedby={showErrors && titleProblem ? `${titleId}-error` : undefined}
            autoFocus
          />
          {showErrors && titleProblem && <p id={`${titleId}-error`} className={fieldErrorClass}>{titleProblem}</p>}
        </div>
        <div>
          <label htmlFor={descriptionId} className={labelClass}>Description (optional)</label>
          <textarea
            id={descriptionId}
            className={textareaClass}
            value={description}
            maxLength={MAX_TEMPLATE_DESCRIPTION_LENGTH}
            placeholder="When to use this template"
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={showErrors && !!descriptionProblem}
          />
          {showErrors && descriptionProblem && <p className={fieldErrorClass}>{descriptionProblem}</p>}
        </div>
        <div>
          <label htmlFor={layoutId} className={labelClass}>Presentation layout (optional)</label>
          <select id={layoutId} className={inputClass} value={layout} onChange={(event) => setLayout(event.target.value as PresentationLayout | "")}>
            <option value="">No layout</option>
            {(Object.keys(LAYOUT_LABELS) as PresentationLayout[]).map((value) => (
              <option key={value} value={value}>{LAYOUT_LABELS[value]}</option>
            ))}
          </select>
        </div>
        {access.canManage ? (
          <fieldset>
            <legend className={labelClass}>Who can use it</legend>
            <div className="space-y-2">
              {([
                ["personal", "Only me", "A personal template. Nobody else sees it."],
                ["organization", "Everyone in my organization", "Published now. Every member who can create RFPs can start from it."],
              ] as const).map(([value, label, hint]) => (
                <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 ${scope === value ? "border-[#008ad2] bg-sky-50" : "border-[#e4e4e4]"}`}>
                  <input type="radio" name={`${formId}-scope`} className="mt-1" checked={scope === value} onChange={() => setScope(value)} />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{label}</span>
                    <span className="block text-xs text-slate-600">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="text-xs text-slate-500">Saved as a personal template that only you see. Owners and Admins can share templates with the whole organization.</p>
        )}
        {error && <InlineError>{error}</InlineError>}
      </form>
    </OrgDialog>
  );
}

type RenameProps = {
  template: RfpTemplate;
  onClose: () => void;
  onSaved: (template: RfpTemplate) => void;
  onFailure?: (failure: TemplateFailure) => void;
};

// Name and description only: the snapshot never changes after it is saved.
export function RenameTemplateDialog({ template, onClose, onSaved, onFailure }: RenameProps) {
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formId = useId();
  const titleId = useId();
  const descriptionId = useId();

  const titleProblem = titleError(title);
  const descriptionProblem = descriptionError(description);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (titleProblem || descriptionProblem) return;
    setBusy(true);
    setError(null);
    const result = await renameTemplateAction(template.id, { title: tidyTitle(title), description: description.trim() });
    setBusy(false);
    if (result.success && result.data) return onSaved(result.data);
    setError(templateErrorMessage(result, "The template couldn't be updated. Try again."));
    onFailure?.(result);
  };

  return (
    <OrgDialog
      title="Edit template details"
      description="Changes the name and description. The RFP content saved in the template stays as it is."
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form={formId} className={primaryButtonClass} style={primaryButtonStyle} disabled={busy}>
            {busy && <Spinner />} Save changes
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor={titleId} className={labelClass}>Template name</label>
          <input
            id={titleId}
            className={inputClass}
            value={title}
            maxLength={MAX_TEMPLATE_TITLE_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={showErrors && !!titleProblem}
            aria-describedby={showErrors && titleProblem ? `${titleId}-error` : undefined}
            autoFocus
          />
          {showErrors && titleProblem && <p id={`${titleId}-error`} className={fieldErrorClass}>{titleProblem}</p>}
        </div>
        <div>
          <label htmlFor={descriptionId} className={labelClass}>Description (optional)</label>
          <textarea
            id={descriptionId}
            className={textareaClass}
            value={description}
            maxLength={MAX_TEMPLATE_DESCRIPTION_LENGTH}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={showErrors && !!descriptionProblem}
          />
          {showErrors && descriptionProblem && <p className={fieldErrorClass}>{descriptionProblem}</p>}
        </div>
        {error && <InlineError>{error}</InlineError>}
      </form>
    </OrgDialog>
  );
}

type ArchiveProps = {
  template: RfpTemplate;
  onClose: () => void;
  onArchived: (template: RfpTemplate) => void;
  onFailure?: (failure: TemplateFailure) => void;
};

export function ArchiveTemplateDialog({ template, onClose, onArchived, onFailure }: ArchiveProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const result = await archiveTemplateAction(template.id);
    setBusy(false);
    if (result.success && result.data) return onArchived(result.data);
    setError(templateErrorMessage(result));
    onFailure?.(result);
  };

  return (
    <OrgDialog
      title={`Archive ${template.title}?`}
      description={
        template.scope === "organization"
          ? "The template leaves the list people start RFPs from. RFPs already created from it are not affected. If you restore it later, it stays unpublished until an Owner or Admin publishes it again."
          : "The template leaves the list you start RFPs from. RFPs already created from it are not affected, and you can restore it later."
      }
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={dangerButtonClass} onClick={confirm} disabled={busy}>
            {busy ? <Spinner /> : <Archive size={15} aria-hidden="true" />} Archive template
          </button>
        </>
      }
    >
      {error && <InlineError>{error}</InlineError>}
    </OrgDialog>
  );
}

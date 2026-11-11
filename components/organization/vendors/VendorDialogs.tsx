"use client";

import { Archive, ClipboardPaste, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import {
  addContactsToVendorAction,
  archiveVendorAction,
  createVendorAction,
  findVendorByCompanyAction,
  updateVendorAction,
} from "@/app/actions/vendorList";
import {
  dangerButtonClass,
  InlineError,
  inputClass,
  labelClass,
  linkButtonClass,
  OrgDialog,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  Spinner,
} from "../members/ui";
import {
  cleanContacts,
  isCompanyTaken,
  MAX_CATEGORY_LENGTH,
  MAX_COMPANY_LENGTH,
  MAX_CONTACTS,
  parsePastedContacts,
  toVendorInput,
  vendorErrorMessage,
  vendorInputError,
  type Vendor,
  type VendorContact,
  type VendorInput,
} from "./vendorListModel";

export type VendorSaveOutcome = "created" | "updated" | "contacts-added" | "contacts-already-listed";

// A refusal the page behind the dialog may want to react to (role changed, vendor gone or archived).
export type VendorFailure = { code?: string; status?: number };

type FormProps = {
  // Edit this vendor; without it the dialog adds a new one.
  vendor?: Vendor;
  // Contacts to start a new vendor with (the addresses typed while sending an RFP).
  initialContacts?: VendorContact[];
  categories?: string[];
  onClose: () => void;
  onSaved: (vendor: Vendor, outcome: VendorSaveOutcome) => void;
  onFailure?: (failure: VendorFailure) => void;
};

const EMPTY_CONTACT: VendorContact = { name: "", email: "" };
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

// The message sits at the end of a scrolling form, under a fixed footer: bring it into view.
const intoView = (element: HTMLElement | null) => {
  element?.scrollIntoView?.({ block: "nearest" });
};

const sameContactList = (a: readonly VendorContact[], b: readonly VendorContact[]) =>
  a.length === b.length && a.every((contact, index) => contact.name === b[index].name && contact.email === b[index].email);

// Add a vendor, or edit one when `vendor` is given. Contacts can be typed row by row or pasted
// in bulk. A new vendor whose company is already on the list offers to add its contacts there.
export function VendorFormDialog({ vendor, initialContacts, categories = [], onClose, onSaved, onFailure }: FormProps) {
  const formId = useId();
  const categoryListId = useId();
  const [company, setCompany] = useState(vendor?.company ?? "");
  const [category, setCategory] = useState(vendor?.category ?? "");
  const [contacts, setContacts] = useState<VendorContact[]>(() => {
    const start = vendor?.contacts ?? initialContacts ?? [];
    return start.length > 0 ? start.map((contact) => ({ ...contact })) : [{ ...EMPTY_CONTACT }];
  });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when a new vendor's company is already on the list: the vendor that holds the name.
  const [existing, setExisting] = useState<Vendor | null>(null);

  const fail = (result: VendorFailure & { message?: string }, message = vendorErrorMessage(result)) => {
    setError(message);
    onFailure?.(result);
  };

  const changeContact = (index: number, field: keyof VendorContact, value: string) => {
    setContacts((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    setExisting(null);
  };

  const importPasted = () => {
    const filled = cleanContacts(contacts);
    const pasted = parsePastedContacts(pasteText, filled);
    const room = Math.max(MAX_CONTACTS - filled.length, 0);
    const added = pasted.contacts.slice(0, room);
    const overLimit = pasted.contacts.length - added.length;
    if (added.length > 0) setContacts([...filled, ...added]);
    const notes = [added.length > 0 ? `Added ${plural(added.length, "contact")}.` : "No new contacts were found."];
    if (pasted.duplicates.length > 0) notes.push(`${pasted.duplicates.length} ${pasted.duplicates.length === 1 ? "address" : "addresses"} already listed.`);
    if (pasted.skipped.length > 0) notes.push(`Skipped ${plural(pasted.skipped.length, "line")} without a valid email address.`);
    if (overLimit > 0) notes.push(`${plural(overLimit, "contact")} left out: a vendor can have at most ${MAX_CONTACTS}.`);
    setPasteNote(notes.join(" "));
    if (added.length > 0) {
      setPasteText("");
      setError(null);
      setExisting(null);
    }
  };

  const save = async () => {
    const input: VendorInput = toVendorInput({ company, category, contacts });
    const invalid = vendorInputError(input);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    setExisting(null);

    if (vendor) {
      const changes: Partial<VendorInput> = {};
      if (input.company !== vendor.company) changes.company = input.company;
      if (input.category !== vendor.category) changes.category = input.category;
      if (!sameContactList(input.contacts, vendor.contacts)) changes.contacts = input.contacts;
      if (Object.keys(changes).length === 0) {
        setBusy(false);
        return onSaved(vendor, "updated");
      }
      const result = await updateVendorAction(vendor.id, changes);
      setBusy(false);
      if (result.success && result.data) return onSaved(result.data, "updated");
      return fail(result, isCompanyTaken(result) ? "Another vendor on the list already has this company name." : vendorErrorMessage(result));
    }

    const result = await createVendorAction(input);
    if (result.success && result.data) {
      setBusy(false);
      return onSaved(result.data, "created");
    }
    if (isCompanyTaken(result) && input.contacts.length > 0) {
      // Offer to add the contacts to the vendor that already has this company name.
      const found = await findVendorByCompanyAction(input.company);
      setBusy(false);
      if (found.success && found.data) return setExisting(found.data);
      return fail(result);
    }
    setBusy(false);
    fail(result);
  };

  const addToExisting = async () => {
    if (!existing) return;
    setBusy(true);
    setError(null);
    const result = await addContactsToVendorAction(existing.id, cleanContacts(contacts));
    setBusy(false);
    if (result.success && result.data) onSaved(result.data, result.details?.unchanged ? "contacts-already-listed" : "contacts-added");
    else fail(result);
  };

  const filledCount = cleanContacts(contacts).length;

  return (
    <OrgDialog
      wide
      title={vendor ? `Edit ${vendor.company}` : "Add vendor"}
      description={vendor ? undefined : "Vendors on this list can be picked by anyone in your organization who sends an RFP."}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form={formId} className={primaryButtonClass} style={primaryButtonStyle} disabled={busy}>
            {busy && <Spinner />} {vendor ? "Save changes" : "Add vendor"}
          </button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-company`} className={labelClass}>Company</label>
            <input
              id={`${formId}-company`}
              value={company}
              onChange={(event) => {
                setCompany(event.target.value);
                setExisting(null);
              }}
              maxLength={MAX_COMPANY_LENGTH + 20}
              placeholder="e.g. Brightline AV"
              className={inputClass}
              disabled={busy}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor={`${formId}-category`} className={labelClass}>Category <span className="font-normal">(optional)</span></label>
            <input
              id={`${formId}-category`}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={MAX_CATEGORY_LENGTH + 20}
              placeholder="e.g. Lighting"
              list={categoryListId}
              className={inputClass}
              disabled={busy}
            />
            <datalist id={categoryListId}>
              {categories.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>
        </div>

        <fieldset className="space-y-3" disabled={busy}>
          <legend className={labelClass}>Contacts{filledCount > 0 ? ` (${filledCount})` : ""}</legend>
          <ul className="space-y-2">
            {contacts.map((contact, index) => (
              <li key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
                <input
                  aria-label={`Contact ${index + 1} name`}
                  value={contact.name}
                  onChange={(event) => changeContact(index, "name", event.target.value)}
                  placeholder="Name (optional)"
                  className={`${inputClass} col-span-2 sm:col-span-1`}
                />
                <input
                  aria-label={`Contact ${index + 1} email`}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={contact.email}
                  onChange={(event) => changeContact(index, "email", event.target.value)}
                  placeholder="name@company.com"
                  className={inputClass}
                />
                <button
                  type="button"
                  aria-label={`Remove contact ${index + 1}`}
                  onClick={() => {
                    setContacts((rows) => (rows.length === 1 ? [{ ...EMPTY_CONTACT }] : rows.filter((_, i) => i !== index)));
                    setExisting(null);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={linkButtonClass}
              onClick={() => setContacts((rows) => [...rows, { ...EMPTY_CONTACT }])}
              disabled={contacts.length >= MAX_CONTACTS}
            >
              <Plus size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Add contact
            </button>
            <button type="button" className={linkButtonClass} onClick={() => setPasteOpen((open) => !open)} aria-expanded={pasteOpen}>
              <ClipboardPaste size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Paste contacts
            </button>
          </div>

          {pasteOpen && (
            <div className="rounded-md border border-[#e4e4e4] bg-[#fafbfc] p-3">
              <label htmlFor={`${formId}-paste`} className="mb-1.5 block text-xs font-semibold text-slate-600">
                Paste a list of contacts
              </label>
              <p id={`${formId}-paste-help`} className="mb-2 text-xs leading-5 text-slate-500">
                One person per line, from an email or a spreadsheet: “Jane Doe &lt;jane@company.com&gt;”, “Jane Doe, jane@company.com” or just the address.
              </p>
              <textarea
                id={`${formId}-paste`}
                aria-describedby={`${formId}-paste-help`}
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-3 py-2 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button type="button" className={secondaryButtonClass} onClick={importPasted} disabled={!pasteText.trim()}>
                  Add pasted contacts
                </button>
                {pasteNote && <p role="status" className="text-xs text-slate-600">{pasteNote}</p>}
              </div>
            </div>
          )}
        </fieldset>
      </form>

      {existing && (
        <div role="alert" ref={intoView} className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-900">
          <p>
            <span className="font-semibold">{existing.company}</span> is already on your vendor list. Add {filledCount === 1 ? "this contact" : "these contacts"} to it instead?
          </p>
          <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => void addToExisting()} disabled={busy}>
            Add to {existing.company}
          </button>
        </div>
      )}
      {error && <div ref={intoView} className="mt-5"><InlineError>{error}</InlineError></div>}
    </OrgDialog>
  );
}

type ArchiveProps = { vendor: Vendor; onClose: () => void; onArchived: (vendor: Vendor) => void; onFailure?: (failure: VendorFailure) => void };

export function ArchiveVendorDialog({ vendor, onClose, onArchived, onFailure }: ArchiveProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const result = await archiveVendorAction(vendor.id);
    setBusy(false);
    if (result.success && result.data) return onArchived(result.data);
    setError(vendorErrorMessage(result));
    onFailure?.(result);
  };

  return (
    <OrgDialog
      title={`Archive ${vendor.company}?`}
      description="The vendor leaves the list people pick from when sending an RFP. RFPs already sent are not affected, and you can restore the vendor later."
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={dangerButtonClass} onClick={confirm} disabled={busy}>
            {busy ? <Spinner /> : <Archive size={15} aria-hidden="true" />} Archive vendor
          </button>
        </>
      }
    >
      {error && <InlineError>{error}</InlineError>}
    </OrgDialog>
  );
}

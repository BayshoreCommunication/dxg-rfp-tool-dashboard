"use client";

import { BookUser, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getVendorListAccessAction, listVendorCategoriesAction, listVendorsAction } from "@/app/actions/vendorList";
import { VendorFormDialog } from "@/components/organization/vendors/VendorDialogs";
import {
  MAX_CONTACTS,
  contactSummary,
  emailsNotOnList,
  isRoleRefusal,
  vendorErrorMessage,
  type Vendor,
  type VendorListAccess,
} from "@/components/organization/vendors/vendorListModel";

// ORG-607: pick recipients from the organization's shared vendor list while sending an RFP, and
// offer to save typed addresses as a new vendor when the member's role can edit the list.

const PICKER_LIMIT = 200;
const SEARCH_DELAY_MS = 300;

type Props = {
  // The recipients already on the invitation (lower-case emails).
  recipients: string[];
  onAdd: (emails: string[]) => void;
  onRemove: (emails: string[]) => void;
};

export default function VendorListPicker({ recipients, onAdd, onRemove }: Props) {
  const headingId = useId();
  const [access, setAccess] = useState<VendorListAccess | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  // From the last unfiltered load: how many vendors the list holds (null until one has answered).
  const [listSize, setListSize] = useState<number | null>(null);
  // Every vendor seen so far, so an address picked earlier still counts as "on the list".
  const [known, setKnown] = useState<Record<string, Vendor>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    let active = true;
    getVendorListAccessAction()
      .then((result) => {
        if (active) setAccess(result);
      })
      .catch(() => {
        if (active) setAccess({ canRead: false, canEdit: false });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const canRead = access?.canRead === true;

  useEffect(() => {
    if (!canRead) return;
    const request = ++requestRef.current;
    void listVendorsAction({ search, status: "active", limit: PICKER_LIMIT }).then((result) => {
      if (request !== requestRef.current) return;
      if (result.success && result.data) {
        const page = result.data;
        setVendors(page.items);
        setTotal(page.total);
        setLoadError(null);
        if (search === "") setListSize(page.total);
        setKnown((previous) => ({ ...previous, ...Object.fromEntries(page.items.map((vendor) => [vendor.id, vendor])) }));
      } else if (isRoleRefusal(result)) {
        // The member's role can no longer read the list: the picker goes away, typing still works.
        setAccess({ canRead: false, canEdit: false });
      } else {
        setVendors(null);
        setLoadError(vendorErrorMessage(result, "Your vendor list couldn't be loaded. You can still type the addresses."));
      }
    });
  }, [canRead, search, version]);

  const selected = useMemo(() => new Set(recipients), [recipients]);
  const newEmails = useMemo(() => emailsNotOnList(recipients, Object.values(known)), [recipients, known]);

  if (!access || !canRead) return null;

  const loading = vendors === null && !loadError;
  const shown = vendors ?? [];
  // The first load decides whether there is a list at all; a search that finds nothing is different.
  const listIsEmpty = listSize === 0 && searchInput.trim() === "" && !loadError;
  // "Not on the list" can only be said once the list has answered; past the picker's limit it is a guess.
  const canJudgeNew = listSize !== null && !loadError;
  const listTruncated = listSize !== null && listSize > PICKER_LIMIT;

  const toggle = (emails: string[], checked: boolean) => (checked ? onAdd(emails) : onRemove(emails));

  const openSave = () => {
    setSaving(true);
    void listVendorCategoriesAction().then((result) => {
      if (result.success) setCategories(result.data ?? []);
    });
  };

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <h4 id={headingId} className="flex items-center gap-2 text-[13px] !font-semibold text-slate-800">
        <BookUser size={14} className="shrink-0 text-teal-800 dark:text-teal-300" aria-hidden="true" /> Pick from your vendor list
      </h4>

      {listIsEmpty ? (
        <p className="mt-0.5 text-xs leading-5 text-slate-600">
          Your organization&apos;s vendor list is empty.{" "}
          {access.canEdit ? (
            <Link href="/settings/vendors" className="!font-semibold text-teal-800 underline dark:text-teal-200">Add vendors in Settings</Link>
          ) : (
            "An Owner, Admin or Team Manager can add vendors in Settings."
          )}
        </p>
      ) : (
        <>
          <div className="relative mt-2">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search your vendor list"
              placeholder="Search by company or category"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#008ad2]"
            />
          </div>

          <div className="mt-2" aria-live="polite" aria-busy={loading}>
            {loadError ? (
              <p role="alert" className="text-[12px] text-red-600">{loadError}</p>
            ) : loading ? (
              <p role="status" className="text-[12px] text-slate-500">Loading your vendor list…</p>
            ) : shown.length === 0 ? (
              <p className="text-[12px] text-slate-500">{search ? `No vendors match “${search}”.` : "Loading your vendor list…"}</p>
            ) : (
              <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {shown.map((vendor) => {
                  const emails = vendor.contacts.map((contact) => contact.email);
                  const picked = emails.filter((email) => selected.has(email)).length;
                  const all = emails.length > 0 && picked === emails.length;
                  return (
                    <li key={vendor.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <label className={`flex min-h-6 items-start gap-2 text-[13px] ${emails.length === 0 ? "text-slate-400" : "cursor-pointer text-slate-800"}`}>
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#008ad2]"
                          checked={all}
                          disabled={emails.length === 0}
                          ref={(element) => {
                            if (element) element.indeterminate = picked > 0 && !all;
                          }}
                          onChange={(event) => toggle(emails, event.target.checked)}
                          aria-label={`${vendor.company}: all contacts`}
                        />
                        <span className="min-w-0">
                          <span className="break-words font-semibold">{vendor.company}</span>
                          <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                            {vendor.category ? `${vendor.category} · ` : ""}{contactSummary(vendor)}
                          </span>
                        </span>
                      </label>
                      {vendor.contacts.length > 0 && (
                        <ul className="ml-6 mt-1.5 space-y-1">
                          {vendor.contacts.map((contact) => (
                            <li key={contact.email}>
                              <label className="flex min-h-6 cursor-pointer items-start gap-2 text-[12px] text-slate-700">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#008ad2]"
                                  checked={selected.has(contact.email)}
                                  onChange={(event) => toggle([contact.email], event.target.checked)}
                                />
                                <span className="min-w-0 break-all">
                                  {contact.name && <span className="break-normal font-medium">{contact.name} · </span>}
                                  {contact.email}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!loadError && !loading && shown.length < total && (
              <p className="mt-2 text-[11px] text-slate-500">Showing the first {shown.length} of {total} vendors. Search to find the others.</p>
            )}
          </div>
        </>
      )}

      {access.canEdit && canJudgeNew && newEmails.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 break-words text-[12px] leading-5 text-slate-600">
            {listTruncated
              ? `${newEmails.length === 1 ? newEmails[0] : `${newEmails.length} recipients`} may not be on your vendor list yet.`
              : newEmails.length === 1 ? `${newEmails[0]} isn't on your vendor list.` : `${newEmails.length} recipients aren't on your vendor list.`}
          </p>
          <button
            type="button"
            onClick={openSave}
            className="shrink-0 rounded-lg border border-[#008ad2]/40 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0076b4] hover:bg-[#008ad2]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Save new vendor to the list
          </button>
        </div>
      )}

      {saving && (
        <VendorFormDialog
          initialContacts={newEmails.slice(0, MAX_CONTACTS).map((email) => ({ name: "", email }))}
          categories={categories}
          onClose={() => setSaving(false)}
          onSaved={(vendor, outcome) => {
            setSaving(false);
            setKnown((previous) => ({ ...previous, [vendor.id]: vendor }));
            setVersion((value) => value + 1);
            toast.success(
              outcome === "contacts-added" ? `Contacts added to ${vendor.company}.`
                : outcome === "contacts-already-listed" ? `${vendor.company} already has these contacts.`
                : `${vendor.company} saved to the vendor list.`,
            );
          }}
        />
      )}
    </section>
  );
}

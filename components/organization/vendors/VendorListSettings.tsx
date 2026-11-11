"use client";

import { Building2, Lock, Pencil, Plus, RotateCcw, Search, Archive } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { listVendorCategoriesAction, listVendorsAction, restoreVendorAction } from "@/app/actions/vendorList";
import TopHeader from "@/components/settings/TopHeaser";
import {
  Badge,
  EmptyState,
  InlineError,
  inputClass,
  linkButtonClass,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  sectionClass,
  sectionTitleClass,
  Spinner,
  TableSkeleton,
} from "../members/ui";
import { ArchiveVendorDialog, VendorFormDialog, type VendorFailure, type VendorSaveOutcome } from "./VendorDialogs";
import {
  contactSummary,
  isCompanyTaken,
  isRoleRefusal,
  isVendorGone,
  VENDOR_LIST_HIDDEN_MESSAGE,
  vendorErrorMessage,
  type Vendor,
} from "./vendorListModel";

const PAGE_SIZE = 50;
const SEARCH_DELAY_MS = 300;
const CONTACTS_SHOWN = 3;

type DialogState = { kind: "add" } | { kind: "edit"; vendor: Vendor } | { kind: "archive"; vendor: Vendor } | null;
type StatusFilter = "active" | "archived";

type Props = {
  // Owner, Admin or Team Manager. A Planner gets the same list, read-only.
  canEdit: boolean;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export default function VendorListSettings({ canEdit: initialCanEdit }: Props) {
  const [canEdit, setCanEdit] = useState(initialCanEdit);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [categories, setCategories] = useState<string[]>([]);
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The filters the rows on screen were loaded for; while they differ the rows are stale.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogState>(null);
  // Only the newest list request may update the screen (typing in the search box overlaps requests).
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async (offset: number) => {
    const request = ++requestRef.current;
    const result = await listVendorsAction({ search, category, status, limit: PAGE_SIZE, offset });
    if (request !== requestRef.current) return;
    if (result.success && result.data) {
      const page = result.data;
      setVendors((previous) => (offset === 0 || !previous ? page.items : [...previous, ...page.items.filter((item) => !previous.some((p) => p.id === item.id))]));
      setTotal(page.total);
      setLoadError(null);
      setLoadedFor(JSON.stringify([search, category, status]));
    } else if (offset > 0) {
      // The rows already on screen stay; only the next page is missing.
      toast.error(vendorErrorMessage(result, "More vendors couldn't be loaded. Try again."));
    } else {
      setVendors(null);
      setLoadError(
        isRoleRefusal(result) ? VENDOR_LIST_HIDDEN_MESSAGE : vendorErrorMessage(result, "The vendor list couldn't be loaded. Reload the page to try again."),
      );
    }
  }, [search, category, status]);

  const loadCategories = useCallback(async () => {
    const result = await listVendorCategoriesAction();
    if (result.success) setCategories(result.data ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(0);
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCategories();
  }, [loadCategories]);

  const refresh = () => {
    void load(0);
    void loadCategories();
  };

  // The backend refused a write for the role (it changed since sign-in): stop offering edits.
  const noteRefusal = (error: { status?: number }) => {
    if (isRoleRefusal(error)) setCanEdit(false);
  };

  // A dialog was refused: drop the edit controls for a role refusal, and reload when the vendor
  // it was opened for is gone or archived, so the row behind the dialog is not stale.
  const onDialogFailure = (failure: VendorFailure) => {
    noteRefusal(failure);
    if (isVendorGone(failure) || failure.code === "VENDOR_ARCHIVED") refresh();
  };

  const restore = async (vendor: Vendor) => {
    setRestoringId(vendor.id);
    const result = await restoreVendorAction(vendor.id);
    setRestoringId(null);
    if (result.success) {
      toast.success(`${vendor.company} is back on the vendor list.`);
      return refresh();
    }
    noteRefusal(result);
    toast.error(
      isCompanyTaken(result)
        ? `Another vendor on the list is now called ${vendor.company}. Rename or archive it, then restore this one.`
        : vendorErrorMessage(result),
    );
    if (isVendorGone(result)) refresh();
  };

  const onSaved = (vendor: Vendor, outcome: VendorSaveOutcome) => {
    setDialog(null);
    toast.success(
      outcome === "created" ? `${vendor.company} added to the vendor list.`
        : outcome === "contacts-added" ? `Contacts added to ${vendor.company}.`
        : outcome === "contacts-already-listed" ? `${vendor.company} already has these contacts.`
        : `${vendor.company} updated.`,
    );
    refresh();
  };

  const toggleExpanded = (vendorId: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });

  const filtered = search !== "" || category !== "";
  const stale = loadedFor !== JSON.stringify([search, category, status]);
  const loading = !loadError && (vendors === null || (stale && vendors.length === 0));
  const shown = vendors ?? [];
  const addButton = canEdit ? (
    <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={() => setDialog({ kind: "add" })}>
      <Plus size={15} aria-hidden="true" /> Add vendor
    </button>
  ) : undefined;

  const vendorRow = (vendor: Vendor) => {
    const open = expanded.has(vendor.id);
    const contacts = open ? vendor.contacts : vendor.contacts.slice(0, CONTACTS_SHOWN);
    const hidden = vendor.contacts.length - contacts.length;
    return (
      <li key={vendor.id} className="flex flex-col gap-3 border-t border-[#e4e4e4] px-4 py-4 first:border-t-0 md:flex-row md:items-start md:gap-6">
        <div className="min-w-0 md:w-[32%]">
          <p className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-words text-sm font-semibold text-slate-800">{vendor.company}</span>
            {vendor.archived && <Badge>Archived</Badge>}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {vendor.category ? <Badge tone="sky">{vendor.category}</Badge> : "No category"}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500">{contactSummary(vendor)}</p>
          {contacts.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {contacts.map((contact) => (
                <li key={contact.email} className="break-all text-sm text-slate-700">
                  {contact.name && <span className="break-normal font-medium">{contact.name} · </span>}
                  <span className="text-slate-600">{contact.email}</span>
                </li>
              ))}
            </ul>
          )}
          {(hidden > 0 || open) && vendor.contacts.length > CONTACTS_SHOWN && (
            <button
              type="button"
              className={`${linkButtonClass} -ml-2 mt-1`}
              onClick={() => toggleExpanded(vendor.id)}
              aria-expanded={open}
              aria-label={`${open ? "Show fewer contacts" : `Show ${hidden} more contacts`} for ${vendor.company}`}
            >
              {open ? "Show fewer contacts" : `Show ${hidden} more`}
            </button>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-1 md:justify-end">
            {vendor.archived ? (
              <button type="button" className={linkButtonClass} aria-label={`Restore ${vendor.company}`} onClick={() => void restore(vendor)} disabled={restoringId === vendor.id}>
                {restoringId === vendor.id ? <Spinner size={12} /> : <RotateCcw size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />} Restore
              </button>
            ) : (
              <>
                <button type="button" className={linkButtonClass} aria-label={`Edit ${vendor.company}`} onClick={() => setDialog({ kind: "edit", vendor })}>
                  <Pencil size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Edit
                </button>
                <button type="button" className={linkButtonClass} aria-label={`Archive ${vendor.company}`} onClick={() => setDialog({ kind: "archive", vendor })}>
                  <Archive size={12} className="-mt-0.5 mr-1 inline" aria-hidden="true" />Archive
                </button>
              </>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6 px-6 pb-8">
      <TopHeader vendorsLink />
      <section className={sectionClass} aria-labelledby="vendor-list-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="vendor-list-title" className={sectionTitleClass}>Vendor list</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              {canEdit
                ? "One shared list of vendor companies and contacts. Anyone in your organization who sends a proposal can pick recipients from it."
                : "Your organization's shared vendors. Pick from this list when you send a proposal."}
            </p>
          </div>
          {addButton}
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search vendors"
              placeholder="Search by company or category"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className={`${inputClass} md:w-52`}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            {category && !categories.includes(category) && <option value={category}>{category}</option>}
          </select>
          {canEdit && (
            <div role="group" aria-label="Show vendors" className="flex shrink-0 rounded-md border border-[#e4e4e4] p-0.5">
              {(["active", "archived"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                  className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${status === value ? "bg-sky-50 text-[#0076b4]" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {value === "active" ? "Active" : "Archived"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5" aria-live="polite" aria-busy={loading}>
          {loadError ? (
            <InlineError>{loadError}</InlineError>
          ) : loading ? (
            <TableSkeleton rows={4} />
          ) : shown.length === 0 ? (
            filtered ? (
              <EmptyState icon={<Search size={20} />} title="No vendors match" body="Try a different company name or category." />
            ) : status === "archived" ? (
              <EmptyState icon={<Archive size={20} />} title="No archived vendors" body="Vendors you archive are kept here and can be restored." />
            ) : (
              <EmptyState
                icon={<Building2 size={20} />}
                title="No vendors yet"
                body={canEdit
                  ? "Add the companies you send proposals to, with the people to contact at each one."
                  : "An Owner, Admin or Team Manager can add vendors here."}
                action={addButton}
              />
            )
          ) : (
            <>
              <p className="mb-2 text-xs text-slate-500">
                {shown.length < total ? `Showing ${shown.length} of ${plural(total, "vendor")}` : plural(total, "vendor")}
              </p>
              <ul className="rounded-md border border-[#e4e4e4]">{shown.map(vendorRow)}</ul>
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
                    {loadingMore && <Spinner />} Show more vendors
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {!canEdit && (
          <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <Lock size={12} aria-hidden="true" /> Only Owners, Admins and Team Managers can add, edit or archive vendors.
          </p>
        )}
      </section>

      {dialog?.kind === "add" && <VendorFormDialog categories={categories} onClose={() => setDialog(null)} onSaved={onSaved} onFailure={onDialogFailure} />}
      {dialog?.kind === "edit" && (
        <VendorFormDialog vendor={dialog.vendor} categories={categories} onClose={() => setDialog(null)} onSaved={onSaved} onFailure={onDialogFailure} />
      )}
      {dialog?.kind === "archive" && (
        <ArchiveVendorDialog
          vendor={dialog.vendor}
          onClose={() => setDialog(null)}
          onFailure={onDialogFailure}
          onArchived={(vendor) => {
            setDialog(null);
            toast.success(`${vendor.company} archived.`);
            refresh();
          }}
        />
      )}
    </div>
  );
}

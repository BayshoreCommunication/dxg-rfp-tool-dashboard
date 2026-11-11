// ORG-607: the organization's shared vendor list (backend docs/API.md "Organization vendor
// list", ORG-606). The backend has no generated contract for it, so every response is read
// defensively here. Pure logic only: no React, no server imports.

export type VendorContact = { name: string; email: string };

export type Vendor = {
  id: string;
  company: string;
  category: string;
  contacts: VendorContact[];
  addedBy: string | null;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type VendorPage = { items: Vendor[]; total: number; limit: number; offset: number };
export type VendorStatus = "active" | "archived" | "all";
export type VendorListQuery = { search?: string; category?: string; status?: VendorStatus; limit?: number; offset?: number };
export type VendorInput = { company: string; category: string; contacts: VendorContact[] };

// What the signed-in member may do with the list. The backend enforces it on every request;
// the UI uses this only to hide what would be refused.
export type VendorListAccess = { canRead: boolean; canEdit: boolean };

// Limits copied from the backend (manageOrganizationVendors.ts).
export const MAX_COMPANY_LENGTH = 200;
export const MAX_CATEGORY_LENGTH = 80;
export const MAX_CONTACT_NAME_LENGTH = 120;
export const MAX_CONTACTS = 50;
const MAX_EMAIL_LENGTH = 254;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === "string" ? value : "");
const dateOrNull = (value: unknown): string | null => (typeof value === "string" && value ? value : null);
const tidy = (value: string): string => value.trim().replace(/\s+/g, " ");

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();
export const isValidEmail = (value: string): boolean => {
  const email = normalizeEmail(value);
  return email.length > 0 && email.length <= MAX_EMAIL_LENGTH && EMAIL.test(email);
};

export const parseContacts = (value: unknown): VendorContact[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const contacts: VendorContact[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const email = normalizeEmail(str(entry.email));
    if (!email || seen.has(email)) continue;
    seen.add(email);
    contacts.push({ name: tidy(str(entry.name)), email });
  }
  return contacts;
};

// Null when the payload is not a vendor (no id or no company), so a bad row is dropped, not shown.
export const parseVendor = (value: unknown): Vendor | null => {
  if (!isRecord(value)) return null;
  const id = str(value.id) || str(value._id);
  const company = str(value.company).trim();
  if (!id || !company) return null;
  return {
    id,
    company,
    category: str(value.category).trim(),
    contacts: parseContacts(value.contacts),
    addedBy: typeof value.addedBy === "string" && value.addedBy ? value.addedBy : null,
    archived: value.archived === true,
    archivedAt: dateOrNull(value.archivedAt),
    createdAt: dateOrNull(value.createdAt),
    updatedAt: dateOrNull(value.updatedAt),
  };
};

const wholeNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;

export const parseVendorPage = (value: unknown): VendorPage => {
  const data = isRecord(value) ? value : {};
  const items = (Array.isArray(data.items) ? data.items : []).flatMap((item) => {
    const vendor = parseVendor(item);
    return vendor ? [vendor] : [];
  });
  return {
    items,
    total: Math.max(wholeNumber(data.total, items.length), items.length),
    limit: wholeNumber(data.limit, 50),
    offset: wholeNumber(data.offset, 0),
  };
};

export const parseCategories = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim() !== "").map((item) => item.trim()))] : [];

// Role names in the backend access token (authorizationPolicy.ts): Owner, Admin, Team Manager
// and the two platform roles hold `vendor-list:write`; a Planner (and the legacy producer role) holds `vendor-list:read` only;
// a Viewer holds neither.
const EDIT_ROLES = ["owner", "organization_admin", "team_manager", "dxg_admin", "super_admin"];
const READ_ROLES = [...EDIT_ROLES, "planner", "dxg_producer"];

export const vendorListAccessForRoles = (roles: readonly string[]): VendorListAccess => ({
  canRead: roles.some((role) => READ_ROLES.includes(role)),
  canEdit: roles.some((role) => EDIT_ROLES.includes(role)),
});

// --- Form checks (same rules as the backend, so most refusals never leave the browser) ---

export const companyError = (company: string): string | null => {
  const value = tidy(company);
  if (!value) return "Enter the company name.";
  if (value.length > MAX_COMPANY_LENGTH) return `Company names can be at most ${MAX_COMPANY_LENGTH} characters.`;
  return null;
};

export const categoryError = (category: string): string | null =>
  tidy(category).length > MAX_CATEGORY_LENGTH ? `Categories can be at most ${MAX_CATEGORY_LENGTH} characters.` : null;

// Rows the person left completely empty are ignored; anything else must be a valid, unique email.
export const cleanContacts = (rows: readonly VendorContact[]): VendorContact[] =>
  rows
    .map((row) => ({ name: tidy(row.name), email: normalizeEmail(row.email) }))
    .filter((row) => row.name !== "" || row.email !== "");

export const contactsError = (rows: readonly VendorContact[]): string | null => {
  const contacts = cleanContacts(rows);
  if (contacts.length > MAX_CONTACTS) return `A vendor can have at most ${MAX_CONTACTS} contacts.`;
  const seen = new Set<string>();
  for (const contact of contacts) {
    if (!contact.email) return `Add an email address for ${contact.name}.`;
    if (!isValidEmail(contact.email)) return `“${contact.email}” isn't a valid email address.`;
    if (contact.name.length > MAX_CONTACT_NAME_LENGTH) return `Contact names can be at most ${MAX_CONTACT_NAME_LENGTH} characters.`;
    if (seen.has(contact.email)) return `${contact.email} is listed twice.`;
    seen.add(contact.email);
  }
  return null;
};

export const vendorInputError = (input: VendorInput): string | null =>
  companyError(input.company) ?? categoryError(input.category) ?? contactsError(input.contacts);

export const toVendorInput = (input: VendorInput): VendorInput => ({
  company: tidy(input.company),
  category: tidy(input.category),
  contacts: cleanContacts(input.contacts),
});

// --- Paste-import of contacts ---

export type PastedContacts = {
  contacts: VendorContact[];
  // Lines with text but no usable email address.
  skipped: string[];
  // Addresses already on the vendor or repeated in the paste.
  duplicates: string[];
};

// An address inside free text. Brackets, quotes, separators and URL punctuation end it; an
// apostrophe may be part of it (o'brien@…), so wrapping apostrophes are trimmed afterwards.
const ANY_EMAIL = /[^\s<>(),;:"/?=&]+@[^\s<>(),;:"'/?=&]+\.[^\s<>(),;:"'/?=&]+/g;
const LABEL = /^(e-?mail|mailto|to|cc|bcc|contact|name)$/i;

const emailsIn = (text: string): string[] => [
  ...new Set((text.match(ANY_EMAIL) ?? []).map((match) => match.replace(/^'+|'+$/g, "").replace(/[.,;]+$/, ""))),
];

// The name is what stands before the address: the cell before it in a spreadsheet row, or the
// text before it on a plain line. Labels ("Email:") and a repeat of the address are not names.
const nameBefore = (line: string, email: string): string => {
  const before = line.slice(0, Math.max(line.indexOf(email), 0));
  const source = line.includes("\t") ? before.split("\t").map((cell) => cell.trim()).filter(Boolean).pop() ?? "" : before;
  const name = tidy(source.replace(/[<>()"]/g, " ").replace(/^[\s,;:|\-–—']+|[\s,;:|\-–—']+$/g, ""));
  return !name || LABEL.test(name) || name.includes("@") ? "" : name;
};

// Commas inside double quotes ("Doe, Jane") do not separate people.
const splitOutsideQuotes = (line: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    if (char === "," && !quoted) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
};

// Reads contacts pasted from an email "To" line, a spreadsheet or a plain list. One line (or one
// semicolon-separated entry) is one person: `Jane Doe <jane@acme.com>`, `Jane Doe, jane@acme.com`,
// `Jane Doe<TAB>jane@acme.com` or just `jane@acme.com`. A line holding several addresses adds
// each of them, with names when it reads as `Name <a@x>, Name <b@x>`.
export const parsePastedContacts = (text: string, existing: readonly VendorContact[] = []): PastedContacts => {
  const seen = new Set(existing.map((contact) => normalizeEmail(contact.email)).filter(Boolean));
  const result: PastedContacts = { contacts: [], skipped: [], duplicates: [] };
  const add = (name: string, rawEmail: string) => {
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) return false;
    if (seen.has(email)) {
      if (!result.duplicates.includes(email)) result.duplicates.push(email);
      return true;
    }
    seen.add(email);
    result.contacts.push({ name: name.slice(0, MAX_CONTACT_NAME_LENGTH), email });
    return true;
  };

  for (const rawLine of text.split(/[\r\n;]+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const emails = emailsIn(line);
    if (emails.length === 0) {
      result.skipped.push(line);
      continue;
    }
    if (emails.length === 1) {
      if (!add(nameBefore(line, emails[0]), emails[0])) result.skipped.push(line);
      continue;
    }
    // Several addresses on one line: `Name <a@x>, Name <b@x>` keeps the names, a bare list does not.
    const parts = splitOutsideQuotes(line);
    const namedParts = parts.every((part) => emailsIn(part).length === 1);
    if (namedParts) {
      for (const part of parts) {
        const [email] = emailsIn(part);
        if (!add(nameBefore(part, email), email)) result.skipped.push(part);
      }
    } else {
      for (const email of emails) if (!add("", email)) result.skipped.push(email);
    }
  }
  return result;
};

// --- Picking recipients when sending an RFP ---

// Existing contacts first, then the new ones whose email is not there yet.
export const mergeContacts = (existing: readonly VendorContact[], added: readonly VendorContact[]): VendorContact[] => {
  const merged = existing.map((contact) => ({ ...contact }));
  const seen = new Set(merged.map((contact) => normalizeEmail(contact.email)));
  for (const contact of cleanContacts(added)) {
    if (!contact.email || seen.has(contact.email)) continue;
    seen.add(contact.email);
    merged.push(contact);
  }
  return merged;
};

export const sameCompany = (a: string, b: string): boolean => tidy(a).toLowerCase() === tidy(b).toLowerCase();

// Recipient addresses that are not a contact of any vendor seen so far.
export const emailsNotOnList = (recipients: readonly string[], vendors: readonly Vendor[]): string[] => {
  const known = new Set(vendors.flatMap((vendor) => vendor.contacts.map((contact) => contact.email)));
  return [...new Set(recipients.map(normalizeEmail))].filter((email) => email && !known.has(email));
};

export const contactLabel = (contact: VendorContact): string =>
  contact.name ? `${contact.name} (${contact.email})` : contact.email;

export const contactSummary = (vendor: Pick<Vendor, "contacts">): string => {
  const count = vendor.contacts.length;
  if (count === 0) return "No contacts yet";
  return `${count} contact${count === 1 ? "" : "s"}`;
};

// --- Error codes as messages people can act on. Raw codes never reach the screen. ---

type ErrorLike = { code?: string; message?: string; status?: number };

const MESSAGES: Record<string, string> = {
  VENDOR_NOT_FOUND: "That vendor is no longer on your organization's list. It may have been removed by someone else.",
  VENDOR_COMPANY_TAKEN: "A vendor with this company name is already on the list.",
  VENDOR_ARCHIVED: "This vendor is archived. Restore it before editing it.",
  INVALID_VENDOR_COMPANY: `Company names must be 1 to ${MAX_COMPANY_LENGTH} characters.`,
  INVALID_VENDOR_CATEGORY: `Categories can be at most ${MAX_CATEGORY_LENGTH} characters.`,
  INVALID_VENDOR_CONTACTS: `A vendor can have at most ${MAX_CONTACTS} contacts, and contact names at most ${MAX_CONTACT_NAME_LENGTH} characters.`,
  INVALID_VENDOR_CONTACT_EMAIL: "Every contact needs a valid email address.",
  DUPLICATE_VENDOR_CONTACT_EMAIL: "Each email address can appear only once for a vendor.",
  INVALID_VENDOR_STATUS: "That filter isn't available. Reload the page and try again.",
  VENDOR_LIST_ACCESS_DENIED: "Your role can't see the organization's vendor list.",
  VENDOR_LIST_EDIT_DENIED: "Only Owners, Admins and Team Managers can edit the vendor list.",
  VENDOR_LIST_INTERNAL_ERROR: "The vendor list couldn't be updated. Try again.",
  AUTHENTICATION_REQUIRED: "Your session has ended. Sign in again.",
  NETWORK_ERROR: "We couldn't reach the server. Check your connection and try again.",
};

// A role refusal from the route guard is a 403 with a message and no code.
export const vendorErrorMessage = (error: ErrorLike, fallback = "Something went wrong. Try again."): string => {
  const known = error.code ? MESSAGES[error.code] : undefined;
  if (known) return known;
  if (error.status === 403) return "Your role doesn't allow this. Only Owners, Admins and Team Managers can edit the vendor list.";
  if (error.status === 404) return MESSAGES.VENDOR_NOT_FOUND;
  if (error.status === 429) return "Too many requests. Try again in a few minutes.";
  return fallback;
};

// A refused read (the member's role changed since they signed in).
export const VENDOR_LIST_HIDDEN_MESSAGE = MESSAGES.VENDOR_LIST_ACCESS_DENIED;

export const isRoleRefusal = (error: ErrorLike): boolean => error.status === 403;
export const isCompanyTaken = (error: ErrorLike): boolean => error.code === "VENDOR_COMPANY_TAKEN";
export const isVendorGone = (error: ErrorLike): boolean => error.code === "VENDOR_NOT_FOUND" || error.status === 404;

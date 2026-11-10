"use server";

import {
  mergeContacts,
  parseCategories,
  parseVendor,
  parseVendorPage,
  rolesFromAccessToken,
  sameCompany,
  vendorListAccessForRoles,
  type Vendor,
  type VendorContact,
  type VendorInput,
  type VendorListAccess,
  type VendorListQuery,
  type VendorPage,
} from "@/components/organization/vendors/vendorListModel";
import { getBackendSession } from "@/lib/server/backendSession";
import { orgRequest, segment, type OrgActionResult } from "./organizationApi";

// ORG-607: the organization's shared vendor list (backend routes/organizationVendorsRoute.ts,
// ORG-606). Every route acts on the caller's own organization; another organization's vendor is
// a 404. Owner, Admin and Team Manager edit, a Planner reads, a Viewer gets 403 on every route.

const BASE = "/api/v1/vendor-list";

const pickVendor = (payload: Record<string, unknown>): Vendor | undefined => parseVendor(payload.data) ?? undefined;

// A 2xx whose body is not a vendor is reported as a failure, never as an empty success.
const vendorResult = (result: OrgActionResult<Vendor | undefined>): OrgActionResult<Vendor> => {
  if (result.success && !result.data) {
    return { success: false, message: "The vendor list sent an answer we couldn't read.", status: result.status };
  }
  return result as OrgActionResult<Vendor>;
};

// What the signed-in member may do with the list, from the roles in their backend access token.
// It only decides what the screen offers; the backend checks the role again on every request.
export async function getVendorListAccessAction(): Promise<VendorListAccess> {
  try {
    const session = await getBackendSession();
    return vendorListAccessForRoles(rolesFromAccessToken(session.accessToken));
  } catch {
    return { canRead: false, canEdit: false };
  }
}

export async function listVendorsAction(query: VendorListQuery = {}): Promise<OrgActionResult<VendorPage>> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.category?.trim()) params.set("category", query.category.trim());
  if (query.status) params.set("status", query.status);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  const suffix = params.toString();
  return orgRequest<VendorPage>(`${BASE}${suffix ? `?${suffix}` : ""}`, {}, (payload) => parseVendorPage(payload.data));
}

export async function listVendorCategoriesAction(): Promise<OrgActionResult<string[]>> {
  return orgRequest<string[]>(`${BASE}/categories`, {}, (payload) => parseCategories(payload.data));
}

export async function getVendorAction(vendorId: string): Promise<OrgActionResult<Vendor>> {
  return vendorResult(await orgRequest(`${BASE}/${segment(vendorId)}`, {}, pickVendor));
}

export async function createVendorAction(input: VendorInput): Promise<OrgActionResult<Vendor>> {
  return vendorResult(await orgRequest(BASE, { method: "POST", body: input }, pickVendor));
}

// Only the fields sent change. `contacts` replaces the vendor's whole contact list.
export async function updateVendorAction(vendorId: string, changes: Partial<VendorInput>): Promise<OrgActionResult<Vendor>> {
  return vendorResult(await orgRequest(`${BASE}/${segment(vendorId)}`, { method: "PATCH", body: changes }, pickVendor));
}

export async function archiveVendorAction(vendorId: string): Promise<OrgActionResult<Vendor>> {
  return vendorResult(await orgRequest(`${BASE}/${segment(vendorId)}/archive`, { method: "POST", body: {} }, pickVendor));
}

export async function restoreVendorAction(vendorId: string): Promise<OrgActionResult<Vendor>> {
  return vendorResult(await orgRequest(`${BASE}/${segment(vendorId)}/restore`, { method: "POST", body: {} }, pickVendor));
}

// "Save new vendor to the list" hit a company that is already there: add the contacts to that
// vendor instead. Reads the vendor again first, so contacts someone else just added are kept.
export async function addContactsToVendorAction(vendorId: string, contacts: VendorContact[]): Promise<OrgActionResult<Vendor>> {
  const current = await getVendorAction(vendorId);
  if (!current.success || !current.data) return current;
  const merged = mergeContacts(current.data.contacts, contacts);
  if (merged.length === current.data.contacts.length) return current;
  return updateVendorAction(vendorId, { contacts: merged });
}

// The active vendor holding a company name (names are unique per organization, ignoring case).
export async function findVendorByCompanyAction(company: string): Promise<OrgActionResult<Vendor | null>> {
  const page = await listVendorsAction({ search: company, status: "active", limit: 200 });
  if (!page.success) return { success: false, message: page.message, code: page.code, status: page.status };
  return { success: true, message: "OK", data: page.data?.items.find((vendor) => sameCompany(vendor.company, company)) ?? null };
}

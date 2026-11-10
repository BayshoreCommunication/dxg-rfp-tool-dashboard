/** @jest-environment node */

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));
jest.mock("@/lib/server/backendSession", () => ({
  getBackendSession: jest.fn(),
}));

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { getBackendSession } from "@/lib/server/backendSession";
import {
  addContactsToVendorAction,
  archiveVendorAction,
  createVendorAction,
  findVendorByCompanyAction,
  getVendorListAccessAction,
  listVendorCategoriesAction,
  listVendorsAction,
  restoreVendorAction,
  updateVendorAction,
} from "./vendorList";

const mockedFetch = jest.mocked(authenticatedBackendFetch);
const mockedSession = jest.mocked(getBackendSession);

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, headers: new Headers(), json: async () => body }) as unknown as Response;

const vendor = {
  id: "v1", company: "Brightline AV", category: "Lighting", contacts: [{ name: "Jane Doe", email: "jane@brightline.test" }],
  addedBy: "u1", archived: false, archivedAt: null, createdAt: "2026-11-10T00:00:00.000Z", updatedAt: "2026-11-10T00:00:00.000Z",
};
const token = (roles: string[]) => `h.${Buffer.from(JSON.stringify({ userId: "u1", roles })).toString("base64url")}.s`;
const lastCall = () => {
  const [url, init] = mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1];
  return { path: new URL(String(url)).pathname + new URL(String(url)).search, method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined };
};

describe("vendor list actions", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedSession.mockReset();
  });

  test.each([
    [["owner"], { canRead: true, canEdit: true }],
    [["planner"], { canRead: true, canEdit: false }],
    [["viewer"], { canRead: false, canEdit: false }],
  ])("access for %j comes from the session's access token", async (roles, expected) => {
    mockedSession.mockResolvedValue({ accessToken: token(roles) } as Awaited<ReturnType<typeof getBackendSession>>);
    await expect(getVendorListAccessAction()).resolves.toEqual(expected);
  });

  test("no session means no access", async () => {
    mockedSession.mockRejectedValue(new Error("no cookies"));
    await expect(getVendorListAccessAction()).resolves.toEqual({ canRead: false, canEdit: false });
  });

  test("listing sends search, category, status and paging to the scoped endpoint", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { items: [vendor], total: 1, limit: 50, offset: 50 } }));
    const result = await listVendorsAction({ search: " bright ", category: "Lighting", status: "archived", limit: 50, offset: 50 });
    expect(lastCall()).toMatchObject({ path: "/api/v1/vendor-list?search=bright&category=Lighting&status=archived&limit=50&offset=50", method: "GET" });
    expect(result.data).toEqual({ items: [vendor], total: 1, limit: 50, offset: 50 });
  });

  test("categories come back as a list of strings", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: ["Audio", "Lighting"] }));
    expect((await listVendorCategoriesAction()).data).toEqual(["Audio", "Lighting"]);
    expect(lastCall().path).toBe("/api/v1/vendor-list/categories");
  });

  test("create posts the vendor and returns it", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(201, { success: true, data: vendor }));
    const input = { company: "Brightline AV", category: "Lighting", contacts: [{ name: "Jane Doe", email: "jane@brightline.test" }] };
    const result = await createVendorAction(input);
    expect(lastCall()).toEqual({ path: "/api/v1/vendor-list", method: "POST", body: input });
    expect(result).toMatchObject({ success: true, data: vendor });
  });

  test("a refusal keeps its code and status for the screen to explain", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(409, { success: false, code: "VENDOR_COMPANY_TAKEN", message: "A vendor with this company name is already on the list." }));
    expect(await createVendorAction({ company: "Brightline AV", category: "", contacts: [] })).toMatchObject({ success: false, code: "VENDOR_COMPANY_TAKEN", status: 409 });
  });

  test("another organization's vendor is a 404, passed on as a failure", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(404, { success: false, code: "VENDOR_NOT_FOUND", message: "Vendor not found." }));
    expect(await updateVendorAction("foreign", { company: "X" })).toMatchObject({ success: false, code: "VENDOR_NOT_FOUND", status: 404 });
    expect(lastCall()).toMatchObject({ path: "/api/v1/vendor-list/foreign", method: "PATCH", body: { company: "X" } });
  });

  test("a role refusal has a status and no code", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(403, { success: false, message: "You don't have permission to perform this action" }));
    const result = await archiveVendorAction("v1");
    expect(result).toMatchObject({ success: false, status: 403 });
    expect(result.code).toBeUndefined();
  });

  test("archive and restore post to the vendor's own routes, with the id escaped", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { ...vendor, archived: true } }));
    await archiveVendorAction("v/1");
    expect(lastCall()).toMatchObject({ path: "/api/v1/vendor-list/v%2F1/archive", method: "POST" });
    await restoreVendorAction("v1");
    expect(lastCall()).toMatchObject({ path: "/api/v1/vendor-list/v1/restore", method: "POST" });
  });

  test("a success without a readable vendor is reported as a failure", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { unexpected: true } }));
    expect(await restoreVendorAction("v1")).toMatchObject({ success: false });
  });

  test("the existing vendor is found by company name, ignoring case", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { items: [{ ...vendor, id: "v0", company: "Brightline AV Rentals" }, vendor], total: 2, limit: 200, offset: 0 } }));
    const result = await findVendorByCompanyAction("brightline av");
    expect(lastCall().path).toBe("/api/v1/vendor-list?search=brightline+av&status=active&limit=200");
    expect(result.data?.id).toBe("v1");
  });

  test("adding contacts to an existing vendor re-reads it and sends the merged list", async () => {
    mockedFetch
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: vendor }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ...vendor, contacts: [...vendor.contacts, { name: "", email: "sam@brightline.test" }] } }));
    const result = await addContactsToVendorAction("v1", [{ name: "", email: "JANE@brightline.test" }, { name: "", email: "sam@brightline.test" }]);
    expect(lastCall()).toEqual({
      path: "/api/v1/vendor-list/v1", method: "PATCH",
      body: { contacts: [{ name: "Jane Doe", email: "jane@brightline.test" }, { name: "", email: "sam@brightline.test" }] },
    });
    expect(result.data?.contacts).toHaveLength(2);
  });

  test("adding contacts that are all there already changes nothing", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, { success: true, data: vendor }));
    const result = await addContactsToVendorAction("v1", [{ name: "", email: "jane@brightline.test" }]);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true, data: vendor, details: { unchanged: true } });
  });
});

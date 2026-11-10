import {
  companyError,
  contactsError,
  emailsNotOnList,
  mergeContacts,
  parseCategories,
  parsePastedContacts,
  parseVendor,
  parseVendorPage,
  rolesFromAccessToken,
  toVendorInput,
  vendorErrorMessage,
  vendorInputError,
  vendorListAccessForRoles,
  type Vendor,
} from "./vendorListModel";

const vendor = (over: Partial<Vendor> = {}): Vendor => ({
  id: "v1", company: "Brightline AV", category: "Lighting", contacts: [{ name: "Jane Doe", email: "jane@brightline.test" }],
  addedBy: "u1", archived: false, archivedAt: null, createdAt: "2026-11-10T00:00:00.000Z", updatedAt: "2026-11-10T00:00:00.000Z", ...over,
});

const token = (claims: unknown) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;

describe("reading the backend's answers defensively", () => {
  test("a vendor keeps its fields and lower-cases contact emails", () => {
    expect(parseVendor({
      id: "v1", company: " Brightline AV ", category: "Lighting", addedBy: "u1", archived: false, archivedAt: null,
      contacts: [{ name: "Jane  Doe", email: "Jane@Brightline.test" }, { email: "jane@brightline.test" }, { name: "No email" }, "junk"],
      createdAt: "2026-11-10T00:00:00.000Z", updatedAt: "2026-11-10T00:00:00.000Z",
    })).toEqual(vendor());
  });

  test("a payload without an id or a company is not a vendor", () => {
    expect(parseVendor({ company: "No id" })).toBeNull();
    expect(parseVendor({ id: "v1" })).toBeNull();
    expect(parseVendor(null)).toBeNull();
    expect(parseVendor("vendor")).toBeNull();
  });

  test("a page drops unreadable rows and never reports fewer than it holds", () => {
    expect(parseVendorPage({ items: [vendor(), { nope: true }], total: 1, limit: 50, offset: 0 })).toEqual({ items: [vendor()], total: 1, limit: 50, offset: 0 });
    expect(parseVendorPage(undefined)).toEqual({ items: [], total: 0, limit: 50, offset: 0 });
    expect(parseVendorPage({ items: "x", total: -3 })).toEqual({ items: [], total: 0, limit: 50, offset: 0 });
  });

  test("categories are trimmed, unique strings", () => {
    expect(parseCategories(["Lighting", " Audio ", "Lighting", 4, ""])).toEqual(["Lighting", "Audio"]);
    expect(parseCategories({})).toEqual([]);
  });
});

describe("who may see and edit the list", () => {
  test.each([
    ["owner", true, true],
    ["organization_admin", true, true],
    ["team_manager", true, true],
    ["planner", true, false],
    ["viewer", false, false],
  ])("%s: read %s, edit %s", (role, canRead, canEdit) => {
    expect(vendorListAccessForRoles([role])).toEqual({ canRead, canEdit });
  });

  test("no role means no access", () => {
    expect(vendorListAccessForRoles([])).toEqual({ canRead: false, canEdit: false });
  });

  test("roles come from the access token's claims", () => {
    expect(rolesFromAccessToken(token({ userId: "u1", roles: ["team_manager", 7] }))).toEqual(["team_manager"]);
  });

  test("an unreadable token has no roles", () => {
    expect(rolesFromAccessToken(null)).toEqual([]);
    expect(rolesFromAccessToken("opaque-token")).toEqual([]);
    expect(rolesFromAccessToken("a.%%%.c")).toEqual([]);
    expect(rolesFromAccessToken(token({ roles: "owner" }))).toEqual([]);
  });
});

describe("form checks match the backend's limits", () => {
  test("company is required and at most 200 characters", () => {
    expect(companyError("  ")).toBe("Enter the company name.");
    expect(companyError("x".repeat(201))).toMatch(/at most 200/);
    expect(companyError("x".repeat(200))).toBeNull();
  });

  test("contacts need a valid email, once each, and at most 50", () => {
    expect(contactsError([{ name: "Jane", email: "" }])).toBe("Add an email address for Jane.");
    expect(contactsError([{ name: "", email: "not-an-email" }])).toMatch(/isn't a valid email/);
    expect(contactsError([{ name: "", email: "a@x.test" }, { name: "", email: "A@x.test" }])).toBe("a@x.test is listed twice.");
    expect(contactsError(Array.from({ length: 51 }, (_, i) => ({ name: "", email: `p${i}@x.test` })))).toMatch(/at most 50/);
    expect(contactsError([{ name: "", email: "" }, { name: "Jane", email: "jane@x.test" }])).toBeNull();
  });

  test("a category over 80 characters is refused", () => {
    expect(vendorInputError({ company: "Acme", category: "c".repeat(81), contacts: [] })).toMatch(/at most 80/);
  });

  test("the payload is trimmed and empty contact rows are left out", () => {
    expect(toVendorInput({ company: "  Acme   AV ", category: " Audio ", contacts: [{ name: "", email: "" }, { name: " Jo ", email: " Jo@Acme.test " }] }))
      .toEqual({ company: "Acme AV", category: "Audio", contacts: [{ name: "Jo", email: "jo@acme.test" }] });
  });
});

describe("paste-import of contacts", () => {
  test("reads names and addresses from an email line, a spreadsheet row and a plain list", () => {
    const pasted = parsePastedContacts([
      "Jane Doe <jane@acme.test>",
      "Sam Lee, sam@acme.test",
      "Ada Park\tada@acme.test",
      "bare@acme.test",
      "\"Roe, Kim\" <kim@acme.test>; Lou <lou@acme.test>",
    ].join("\n"));
    expect(pasted.contacts).toEqual([
      { name: "Jane Doe", email: "jane@acme.test" },
      { name: "Sam Lee", email: "sam@acme.test" },
      { name: "Ada Park", email: "ada@acme.test" },
      { name: "", email: "bare@acme.test" },
      { name: "Roe, Kim", email: "kim@acme.test" },
      { name: "Lou", email: "lou@acme.test" },
    ]);
    expect(pasted.skipped).toEqual([]);
  });

  test("several addresses on one line each become a contact", () => {
    expect(parsePastedContacts("a@acme.test, b@acme.test c@acme.test").contacts.map((c) => c.email)).toEqual(["a@acme.test", "b@acme.test", "c@acme.test"]);
    expect(parsePastedContacts("Jo <jo@acme.test>, Max <max@acme.test>").contacts).toEqual([
      { name: "Jo", email: "jo@acme.test" },
      { name: "Max", email: "max@acme.test" },
    ]);
  });

  test("reports lines without an address and addresses already listed", () => {
    const pasted = parsePastedContacts("Jane <JANE@acme.test>\nno address here\nnew@acme.test\nnew@acme.test", [{ name: "Jane", email: "jane@acme.test" }]);
    expect(pasted.contacts).toEqual([{ name: "", email: "new@acme.test" }]);
    expect(pasted.duplicates).toEqual(["jane@acme.test", "new@acme.test"]);
    expect(pasted.skipped).toEqual(["no address here"]);
  });
});

describe("picking recipients", () => {
  test("merging keeps existing contacts and adds only new addresses", () => {
    expect(mergeContacts([{ name: "Jane", email: "jane@acme.test" }], [{ name: "", email: "JANE@acme.test" }, { name: "Sam", email: "sam@acme.test" }]))
      .toEqual([{ name: "Jane", email: "jane@acme.test" }, { name: "Sam", email: "sam@acme.test" }]);
  });

  test("finds the recipients that are not a contact of any known vendor", () => {
    expect(emailsNotOnList(["jane@brightline.test", "New@other.test", "new@other.test"], [vendor()])).toEqual(["new@other.test"]);
  });
});

describe("error codes become plain messages", () => {
  test.each([
    "VENDOR_NOT_FOUND", "VENDOR_COMPANY_TAKEN", "VENDOR_ARCHIVED", "INVALID_VENDOR_COMPANY", "INVALID_VENDOR_CATEGORY",
    "INVALID_VENDOR_CONTACTS", "INVALID_VENDOR_CONTACT_EMAIL", "DUPLICATE_VENDOR_CONTACT_EMAIL", "INVALID_VENDOR_STATUS",
  ])("%s has its own message and the code never shows", (code) => {
    const message = vendorErrorMessage({ code, message: code, status: 400 }, "FALLBACK");
    expect(message).not.toBe("FALLBACK");
    expect(message).not.toMatch(/[A-Z]{3,}_[A-Z_]+/);
  });

  test("a role refusal is a 403 with no code", () => {
    expect(vendorErrorMessage({ status: 403, message: "You don't have permission to perform this action" })).toMatch(/Owners, Admins and Team Managers/);
  });

  test("another organization's vendor reads as gone, and unknown codes fall back", () => {
    expect(vendorErrorMessage({ status: 404 })).toMatch(/no longer on your organization's list/);
    expect(vendorErrorMessage({ code: "SOMETHING_NEW", message: "SOMETHING_NEW", status: 500 })).toBe("Something went wrong. Try again.");
  });
});

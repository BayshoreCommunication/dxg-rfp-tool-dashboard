// ORG-607: a synthetic organization vendor list for browser checks. It follows the backend's
// rules (docs/API.md "Organization vendor list"): Owner, Admin and Team Manager edit, a Planner
// reads, a Viewer is refused, and a vendor of another organization is a 404. No database, no
// real companies or people.
import crypto from "node:crypto";

const ROLES = {
  "vendor-list-owner@example.com": { userId: "a1a1a1a1a1a1a1a1a1a1a1a1", name: "Olivia Owner", roles: ["owner"] },
  "vendor-list-admin@example.com": { userId: "a2a2a2a2a2a2a2a2a2a2a2a2", name: "Adam Admin", roles: ["organization_admin"] },
  "vendor-list-manager@example.com": { userId: "a3a3a3a3a3a3a3a3a3a3a3a3", name: "Mina Manager", roles: ["team_manager"] },
  "vendor-list-planner@example.com": { userId: "a4a4a4a4a4a4a4a4a4a4a4a4", name: "Paul Planner", roles: ["planner"] },
  "vendor-list-viewer@example.com": { userId: "a5a5a5a5a5a5a5a5a5a5a5a5", name: "Vera Viewer", roles: ["viewer"] },
};
const EDIT_ROLES = ["owner", "organization_admin", "team_manager"];
const READ_ROLES = [...EDIT_ROLES, "planner", "dxg_producer"];
// A vendor that belongs to a different organization: every route answers 404 for it.
const FOREIGN_VENDOR_ID = "ffffffffffffffffffffffff";

const stamp = () => new Date().toISOString();
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
// Shaped like the backend's access token (the `roles` claim is what the dashboard reads). Unsigned.
const accessToken = (account) => `${encode({ alg: "none", typ: "JWT" })}.${encode({ userId: account.userId, roles: account.roles })}.e2e`;

const rolesOf = (request) => {
  try {
    const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const claims = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    return Array.isArray(claims.roles) ? claims.roles : [];
  } catch {
    return [];
  }
};

const seedVendor = (company, category, contacts, archived = false) => ({
  id: crypto.randomBytes(12).toString("hex"), company, category, contacts,
  addedBy: ROLES["vendor-list-owner@example.com"].userId,
  archived, archivedAt: archived ? stamp() : null, createdAt: stamp(), updatedAt: stamp(),
});

let vendors;
let sentEmails;
const reset = (empty = false) => {
  sentEmails = [];
  vendors = empty ? [] : [
    seedVendor("Brightline AV", "Lighting", [
      { name: "Jane Doe", email: "jane@brightline.example" },
      { name: "", email: "bids@brightline.example" },
    ]),
    seedVendor("Harbor Stage Systems", "Staging", [
      { name: "Sam Lee", email: "sam@harborstage.example" },
      { name: "Ada Park", email: "ada@harborstage.example" },
      { name: "Kim Roe", email: "kim@harborstage.example" },
      { name: "Lou Marsh", email: "lou@harborstage.example" },
    ]),
    seedVendor("Soundstage Collective", "Audio", []),
    seedVendor("Old Stage Rentals", "Staging", [{ name: "", email: "hello@oldstage.example" }], true),
  ];
};
reset();

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};
const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  // Sign-in is shared with the stub's own handler: let whoever reads the body next get it again.
  request[Symbol.asyncIterator] = async function* replay() {
    if (raw.length) yield raw;
  };
  try {
    return JSON.parse(raw.toString("utf8") || "{}");
  } catch {
    return {};
  }
};
const refuse = (response, status, code, message) => json(response, status, { success: false, code, message });
const tidy = (value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");
const taken = (company, exceptId) =>
  vendors.some((vendor) => !vendor.archived && vendor.id !== exceptId && vendor.company.toLowerCase() === company.toLowerCase());

// Null after answering with the refusal.
const contactsOf = (response, value) => {
  if (!Array.isArray(value) || value.length > 50) {
    refuse(response, 400, "INVALID_VENDOR_CONTACTS", "Contacts must be a list of at most 50 people.");
    return null;
  }
  const seen = new Set();
  const contacts = [];
  for (const entry of value) {
    const email = tidy(entry?.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      refuse(response, 400, "INVALID_VENDOR_CONTACT_EMAIL", "Every contact needs a valid email address.");
      return null;
    }
    if (seen.has(email)) {
      refuse(response, 400, "DUPLICATE_VENDOR_CONTACT_EMAIL", "Each contact email can appear only once for a vendor.");
      return null;
    }
    seen.add(email);
    contacts.push({ name: tidy(entry?.name), email });
  }
  return contacts;
};

export async function handleVendorList(request, response, url) {
  const path = url.pathname;

  // Test control: reset or empty the list, and read the invitations "sent" so far.
  if (path === "/__e2e/vendor-list") {
    if (request.method === "POST") {
      const input = await readJson(request);
      reset(input.empty === true);
    }
    json(response, 200, { vendors, sentEmails });
    return true;
  }

  // One synthetic account per role; any other email falls through to the stub's own sign-in.
  if (request.method === "POST" && path === "/api/auth/login") {
    const { email } = await readJson(request);
    const account = ROLES[String(email || "").toLowerCase()];
    if (!account) return false;
    const expiresAt = Date.now() + 60 * 60_000;
    json(response, 200, {
      user: { _id: account.userId, email: String(email).toLowerCase(), name: account.name, avatar: "" },
      accessToken: accessToken(account),
      tokenExpiresAt: expiresAt,
      refreshToken: "vendor-list-e2e-refresh-token",
      refreshExpiresAt: expiresAt + 24 * 60 * 60_000,
      sessionId: crypto.randomUUID(),
    });
    return true;
  }

  // The send step of the composer: record what would have gone out.
  if (request.method === "POST" && path === "/api/emails/send") {
    sentEmails.push(await readJson(request));
    json(response, 200, { success: true, message: "Email campaign sent.", data: {} });
    return true;
  }

  if (path !== "/api/v1/vendor-list" && !path.startsWith("/api/v1/vendor-list/")) return false;

  const roles = rolesOf(request);
  const write = request.method !== "GET";
  if (!roles.some((role) => (write ? EDIT_ROLES : READ_ROLES).includes(role))) {
    // The route guard's refusal: a message and no code.
    json(response, 403, { success: false, message: "You don't have permission to perform this action" });
    return true;
  }

  if (path === "/api/v1/vendor-list" && request.method === "GET") {
    const search = tidy(url.searchParams.get("search")).toLowerCase();
    const category = tidy(url.searchParams.get("category")).toLowerCase();
    const status = url.searchParams.get("status") || "active";
    if (!["active", "archived", "all"].includes(status)) {
      refuse(response, 400, "INVALID_VENDOR_STATUS", "Status must be active, archived or all.");
      return true;
    }
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
    const matches = vendors
      .filter((vendor) => status === "all" || vendor.archived === (status === "archived"))
      .filter((vendor) => !search || vendor.company.toLowerCase().includes(search) || vendor.category.toLowerCase().includes(search))
      .filter((vendor) => !category || vendor.category.toLowerCase() === category)
      .sort((a, b) => a.company.localeCompare(b.company));
    json(response, 200, { success: true, data: { items: matches.slice(offset, offset + limit), total: matches.length, limit, offset } });
    return true;
  }

  if (path === "/api/v1/vendor-list/categories" && request.method === "GET") {
    const categories = [...new Set(vendors.filter((vendor) => !vendor.archived && vendor.category).map((vendor) => vendor.category))].sort();
    json(response, 200, { success: true, data: categories });
    return true;
  }

  if (path === "/api/v1/vendor-list" && request.method === "POST") {
    const input = await readJson(request);
    const company = tidy(input.company);
    if (!company || company.length > 200) {
      refuse(response, 400, "INVALID_VENDOR_COMPANY", "Company name must be 1 to 200 characters.");
      return true;
    }
    const contacts = contactsOf(response, input.contacts ?? []);
    if (!contacts) return true;
    if (taken(company)) {
      refuse(response, 409, "VENDOR_COMPANY_TAKEN", "A vendor with this company name is already on the list.");
      return true;
    }
    const vendor = seedVendor(company, tidy(input.category), contacts);
    vendors.push(vendor);
    json(response, 201, { success: true, data: vendor });
    return true;
  }

  const match = /^\/api\/v1\/vendor-list\/([^/]+)(\/archive|\/restore)?$/.exec(path);
  const vendor = match && match[1] !== FOREIGN_VENDOR_ID ? vendors.find((item) => item.id === match[1]) : null;
  if (!match || !vendor) {
    refuse(response, 404, "VENDOR_NOT_FOUND", "Vendor not found.");
    return true;
  }

  if (!match[2] && request.method === "GET") {
    json(response, 200, { success: true, data: vendor });
    return true;
  }

  if (!match[2] && request.method === "PATCH") {
    if (vendor.archived) {
      refuse(response, 409, "VENDOR_ARCHIVED", "Restore this vendor before editing it.");
      return true;
    }
    const input = await readJson(request);
    if (input.company !== undefined) {
      const company = tidy(input.company);
      if (!company || company.length > 200) {
        refuse(response, 400, "INVALID_VENDOR_COMPANY", "Company name must be 1 to 200 characters.");
        return true;
      }
      if (taken(company, vendor.id)) {
        refuse(response, 409, "VENDOR_COMPANY_TAKEN", "A vendor with this company name is already on the list.");
        return true;
      }
      vendor.company = company;
    }
    if (input.category !== undefined) vendor.category = tidy(input.category);
    if (input.contacts !== undefined) {
      const contacts = contactsOf(response, input.contacts);
      if (!contacts) return true;
      vendor.contacts = contacts;
    }
    vendor.updatedAt = stamp();
    json(response, 200, { success: true, data: vendor });
    return true;
  }

  if (match[2] && request.method === "POST") {
    const archive = match[2] === "/archive";
    if (!archive && vendor.archived && taken(vendor.company, vendor.id)) {
      refuse(response, 409, "VENDOR_COMPANY_TAKEN", "A vendor with this company name is already on the list.");
      return true;
    }
    vendor.archived = archive;
    vendor.archivedAt = archive ? stamp() : null;
    vendor.updatedAt = stamp();
    json(response, 200, { success: true, data: vendor });
    return true;
  }

  refuse(response, 404, "VENDOR_NOT_FOUND", "Vendor not found.");
  return true;
}

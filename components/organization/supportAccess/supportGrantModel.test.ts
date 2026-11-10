import {
  agentReference,
  currentStatus,
  grantTarget,
  operationLabel,
  parseExpiryDays,
  parseGrant,
  parseGrantDetail,
  parseGrantPage,
  parseGrantableRfps,
  supportGrantErrorMessage,
  timeLeft,
} from "./supportGrantModel";

const NOW = new Date("2026-11-10T12:00:00.000Z").getTime();
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const iso = (offset: number) => new Date(NOW + offset).toISOString();

const apiGrant = (overrides: Record<string, unknown> = {}) => ({
  id: "g1",
  scope: "rfp",
  rfp: { id: "p1", title: "Spring Sales Kickoff" },
  reason: "Ticket 4821",
  status: "active",
  grantedBy: { id: "u1", name: "Olivia Owner" },
  createdAt: iso(-DAY),
  expiresAt: iso(6 * DAY),
  revokedAt: null,
  revokedBy: null,
  activity: { useCount: 3, lastUsedAt: iso(-HOUR) },
  ...overrides,
});

describe("support grant parsing", () => {
  it("reads a grant as the API documents it", () => {
    expect(parseGrant(apiGrant(), NOW)).toEqual({
      id: "g1",
      scope: "rfp",
      rfp: { id: "p1", title: "Spring Sales Kickoff" },
      reason: "Ticket 4821",
      status: "active",
      grantedBy: { id: "u1", name: "Olivia Owner" },
      createdAt: iso(-DAY),
      expiresAt: iso(6 * DAY),
      revokedAt: null,
      revokedBy: null,
      activity: { useCount: 3, lastUsedAt: iso(-HOUR) },
    });
  });

  it("drops anything without an id and survives missing or malformed fields", () => {
    expect(parseGrant(null)).toBeNull();
    expect(parseGrant({ scope: "rfp" })).toBeNull();
    const bare = parseGrant({ id: "g2", expiresAt: iso(DAY), activity: "nope", grantedBy: 7, rfp: [] }, NOW);
    expect(bare).toMatchObject({ id: "g2", scope: "organization", rfp: null, reason: null, grantedBy: null, activity: { useCount: 0, lastUsedAt: null } });
  });

  it("never reports access as active on an unknown status, a passed expiry or an unreadable one", () => {
    expect(parseGrant(apiGrant({ status: "paused" }), NOW)?.status).toBe("active");
    expect(parseGrant(apiGrant({ status: "paused", expiresAt: iso(-1) }), NOW)?.status).toBe("expired");
    expect(parseGrant(apiGrant({ status: "active", expiresAt: "not a date" }), NOW)?.status).toBe("expired");
    expect(parseGrant(apiGrant({ status: "active", revokedAt: iso(-HOUR) }), NOW)?.status).toBe("revoked");
  });

  it("reads a page and its pagination, skipping unreadable rows", () => {
    const page = parseGrantPage({ grants: [apiGrant(), { nope: true }], pagination: { page: 2, perPage: 50, total: 51, totalPages: 2 } }, NOW);
    expect(page).toMatchObject({ page: 2, totalPages: 2, total: 51 });
    expect(page?.grants.map((grant) => grant.id)).toEqual(["g1"]);
    expect(parseGrantPage({ data: [] })).toBeNull();
    expect(parseGrantPage({ grants: [] })).toEqual({ grants: [], page: 1, totalPages: 1, total: 0 });
  });

  it("reads activity without a staff name: only the label's short reference survives", () => {
    const detail = parseGrantDetail(
      apiGrant({
        events: [
          { at: iso(-HOUR), agent: { id: "64f0c0ffee0000000000ab12", label: "RFPilot Support", name: "Sam Staff" }, operation: "rfp.read", rfp: { id: "p1", title: "Spring Sales Kickoff" } },
          { at: "x", agent: null, operation: 5, rfp: null },
          "junk",
        ],
      }),
      NOW,
    );
    expect(detail?.events).toEqual([
      { at: iso(-HOUR), agentReference: "00AB12", operation: "rfp.read", rfp: { id: "p1", title: "Spring Sales Kickoff" } },
      { at: null, agentReference: null, operation: "", rfp: null },
    ]);
    expect(JSON.stringify(detail)).not.toContain("Sam Staff");
    expect(agentReference(null)).toBeNull();
  });

  it("reads the RFP picker's rows from the dashboard list", () => {
    expect(parseGrantableRfps({ items: [{ id: "p1", eventName: "Gala", ownerName: "Paul Planner" }, { id: "p2" }, { eventName: "no id" }] })).toEqual([
      { id: "p1", title: "Gala", ownerName: "Paul Planner" },
      { id: "p2", title: "Untitled RFP", ownerName: null },
    ]);
    expect(parseGrantableRfps(undefined)).toEqual([]);
  });
});

describe("support grant display", () => {
  it("lets the clock end an access the list still calls active", () => {
    expect(currentStatus({ status: "active", expiresAt: iso(HOUR) }, NOW)).toBe("active");
    expect(currentStatus({ status: "active", expiresAt: iso(-1) }, NOW)).toBe("expired");
    expect(currentStatus({ status: "revoked", expiresAt: iso(HOUR) }, NOW)).toBe("revoked");
  });

  it("describes what is covered and how long is left", () => {
    expect(grantTarget({ scope: "organization", rfp: null })).toBe("Whole organization");
    expect(grantTarget({ scope: "rfp", rfp: { id: "p1", title: "Gala" } })).toBe("Gala");
    expect(grantTarget({ scope: "rfp", rfp: { id: "p1", title: null } })).toBe("An RFP that was deleted");
    expect(timeLeft(iso(6 * DAY + HOUR), NOW)).toBe("Expires in 6 days");
    expect(timeLeft(iso(DAY), NOW)).toBe("Expires in 1 day");
    expect(timeLeft(iso(5 * HOUR), NOW)).toBe("Expires in 5 hours");
    expect(timeLeft(iso(90_000), NOW)).toBe("Expires in 1 minute");
    expect(timeLeft(iso(10_000), NOW)).toBe("Expires in less than a minute");
    expect(timeLeft(iso(-1), NOW)).toBe("Expired");
    expect(timeLeft(null, NOW)).toBe("Expired");
  });

  it("accepts whole days from 1 to 30 only", () => {
    expect(parseExpiryDays("7")).toBe(7);
    expect(parseExpiryDays(" 30 ")).toBe(30);
    expect(parseExpiryDays(1)).toBe(1);
    for (const bad of ["0", "31", "2.5", "-3", "", "abc", "1e1"]) expect(parseExpiryDays(bad)).toBeNull();
    expect(parseExpiryDays(31)).toBeNull();
  });

  it("names operations in words and never shows an internal name", () => {
    expect(operationLabel("rfp.read")).toBe("Opened an RFP");
    expect(operationLabel("vendor_responses.list")).toBe("Viewed an RFP's vendor responses");
    expect(operationLabel("something.new")).toBe("Read RFP data");
  });

  it("turns every documented error code into a sentence that says RFP, not proposal", () => {
    const codes = ["INVALID_GRANT_EXPIRY", "INVALID_GRANT_REASON", "PROPOSAL_NOT_FOUND", "SUPPORT_GRANT_NOT_FOUND", "SUPPORT_GRANT_EXPIRED", "SUPPORT_GRANT_FORBIDDEN"];
    for (const code of codes) {
      const message = supportGrantErrorMessage({ code, message: code, status: 400 });
      expect(message).not.toMatch(/proposal|[A-Z]{3,}_/);
      expect(message.length).toBeGreaterThan(10);
    }
    expect(supportGrantErrorMessage({ code: "PROPOSAL_NOT_FOUND" })).toMatch(/RFP wasn't found/);
    expect(supportGrantErrorMessage({ code: "SUPPORT_GRANT_EXPIRED" })).toMatch(/already expired/);
  });

  it("explains a plain 403, a rate limit and a lost connection, and hides unknown wording about proposals", () => {
    expect(supportGrantErrorMessage({ status: 403, message: "Forbidden" })).toBe("Only an Owner or Admin can manage RFPilot Support access.");
    expect(supportGrantErrorMessage({ status: 429, details: { retryAfterSeconds: 120 } })).toMatch(/Try again in 2 minutes/);
    expect(supportGrantErrorMessage({ code: "NETWORK_ERROR" })).toMatch(/couldn't reach the server/);
    expect(supportGrantErrorMessage({ code: "SOMETHING_NEW", message: "Proposal store unavailable." }, "Try again.")).toBe("Try again.");
  });
});

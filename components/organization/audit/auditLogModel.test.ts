import {
  auditErrorMessage,
  auditQueryString,
  categoryValue,
  decisionOf,
  detailLines,
  EMPTY_FILTERS,
  exportFileName,
  filterProblem,
  formatAuditTime,
  hasFilters,
  neutralizeCsv,
  targetLabel,
  toAuditFilterOptions,
  toAuditPage,
  toAuditQuery,
} from "./auditLogModel";

const event = (overrides: Record<string, unknown> = {}) => ({
  id: "e1",
  occurredAt: "2026-11-10T08:30:00.000Z",
  action: "organization.member.role_changed",
  label: "Role changed",
  category: "members",
  decision: "allowed",
  reason: "role_changed",
  actor: { kind: "member", id: "u1", name: "Olivia Owner", email: "owner@example.com" },
  target: { type: "organization_membership", id: "u2", name: "Priya Planner" },
  details: { previousRole: "planner", role: "organization_admin" },
  ...overrides,
});

describe("toAuditPage", () => {
  it("reads a page of events", () => {
    const page = toAuditPage({ events: [event()], nextCursor: "abc" });
    expect(page.nextCursor).toBe("abc");
    expect(page.events[0]).toMatchObject({ id: "e1", label: "Role changed", actor: { kind: "member", name: "Olivia Owner", email: "owner@example.com" } });
  });

  it("survives a malformed payload", () => {
    for (const payload of [null, undefined, "x", [], { events: "nope" }, { events: [null, 4, {}, { id: "e", occurredAt: "not a date" }] }]) {
      expect(toAuditPage(payload)).toEqual({ events: [], nextCursor: null });
    }
    const [parsed] = toAuditPage({ events: [{ id: "e2", occurredAt: "2026-11-10T08:30:00.000Z", details: { ok: 1, nested: { a: 1 }, list: [1] } }] }).events;
    expect(parsed).toMatchObject({ label: "Activity", decision: "", reason: null, actor: { kind: "unknown", name: "Unknown user" }, target: { type: "", id: null, name: null }, details: { ok: 1 } });
  });

  it("never shows a staff name: a support actor is always RFPilot Support", () => {
    const [parsed] = toAuditPage({ events: [event({ actor: { kind: "support", id: "a1", name: "Sam Staff", email: "sam@rfpilot.example" } })] }).events;
    expect(parsed.actor).toEqual({ kind: "support", id: "a1", name: "RFPilot Support", email: null });
  });

  it("falls back to the email, then to Unknown user, for a member without a name", () => {
    expect(toAuditPage({ events: [event({ actor: { kind: "member", id: "u1", name: "", email: "x@example.com" } })] }).events[0].actor.name).toBe("x@example.com");
    expect(toAuditPage({ events: [event({ actor: { kind: "member", id: "u1" } })] }).events[0].actor.name).toBe("Unknown user");
    expect(toAuditPage({ events: [event({ actor: { kind: "robot" } })] }).events[0].actor.kind).toBe("unknown");
  });
});

describe("toAuditFilterOptions", () => {
  it("reads categories and drops malformed entries", () => {
    const options = toAuditFilterOptions({
      categories: [
        { key: "sign_in", label: "Sign-in", actions: [{ value: "auth.login.failed", label: "Sign-in failed" }, { value: "", label: "x" }, null] },
        { key: "", label: "Broken" },
        "nope",
      ],
      supportActor: { value: "someone", label: "Sam Staff" },
    });
    expect(options.categories).toEqual([{ key: "sign_in", label: "Sign-in", actions: [{ value: "auth.login.failed", label: "Sign-in failed" }] }]);
    expect(options.supportActor).toEqual({ value: "support", label: "RFPilot Support" });
    expect(toAuditFilterOptions(null).categories).toEqual([]);
  });
});

describe("filters", () => {
  it("turns local calendar days into an inclusive range of instants", () => {
    const query = toAuditQuery({ actor: "u1", action: "auth.login.failed", from: "2026-11-03", to: "2026-11-05" });
    expect(query.actor).toBe("u1");
    expect(query.action).toBe("auth.login.failed");
    expect(query.from).toBe(new Date(2026, 10, 3).toISOString());
    // The end day is included: the bound is the next local midnight, which the backend excludes.
    expect(query.to).toBe(new Date(2026, 10, 6).toISOString());
  });

  it("sends a category choice as category, not action", () => {
    expect(toAuditQuery({ ...EMPTY_FILTERS, action: categoryValue("sign_in") })).toEqual({ category: "sign_in" });
    expect(toAuditQuery(EMPTY_FILTERS)).toEqual({});
    expect(toAuditQuery({ ...EMPTY_FILTERS, from: "03/11/2026", to: "soon" })).toEqual({});
  });

  it("refuses a start after the end, and knows when filters are set", () => {
    expect(filterProblem({ ...EMPTY_FILTERS, from: "2026-11-06", to: "2026-11-05" })).toMatch(/start date/);
    expect(filterProblem({ ...EMPTY_FILTERS, from: "2026-11-05", to: "2026-11-05" })).toBeNull();
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasFilters({ ...EMPTY_FILTERS, actor: "support" })).toBe(true);
  });

  it("builds a query string from known keys only, and never an organization", () => {
    const query = { actor: "u1", from: "2026-11-03T00:00:00.000Z", organizationId: "other" } as never;
    expect(auditQueryString(query, { cursor: "c 1" })).toBe("?actor=u1&from=2026-11-03T00%3A00%3A00.000Z&cursor=c+1");
    expect(auditQueryString({})).toBe("");
  });
});

describe("display", () => {
  it("uses role labels, never role codes", () => {
    expect(detailLines(toAuditPage({ events: [event()] }).events[0])).toEqual(["Previous role: Planner", "Role: Admin"]);
    expect(detailLines({ details: { role: "team_manager", newOwnerPreviousRole: "viewer", previousOwnerNewRole: "organization_admin" }, reason: null, decision: "allowed" }))
      .toEqual(["Role: Team Manager", "New Owner's previous role: Viewer", "Previous Owner's new role: Admin"]);
    expect(detailLines({ details: { role: "something_new" }, reason: null, decision: "allowed" })).toEqual(["Role: Something new"]);
  });

  it("describes support activity, settings changes and plan changes in words", () => {
    expect(detailLines({ details: { operation: "rfp.read", grantId: "0123456789abcdef01234567" }, reason: "rfp.read", decision: "allowed" }))
      .toEqual(["Opened an RFP", "Support access ID: …234567"]);
    expect(detailLines({ details: { scope: "rfp" }, reason: null, decision: "created" })).toEqual(["Scope: One RFP"]);
    expect(detailLines({ details: { setting: "requireTwoFactor", from: false, to: true, signedOutMembers: 2 }, reason: null, decision: "allowed" }))
      .toEqual(["Require two-factor: Off → On", "Members signed out: 2"]);
    expect(detailLines({ details: { setting: "autoApproveDomain", value: true }, reason: null, decision: "allowed" })).toEqual(["Auto-approve access requests: On"]);
    expect(detailLines({ details: { fromPlan: "free_trial", toPlan: "full_access" }, reason: "staff_plan_change", decision: "allowed" }))
      .toEqual(["Previous plan: Free trial", "New plan: Full access"]);
  });

  it("shows the reason only for a refused or detected event, in words", () => {
    expect(detailLines({ details: { method: "password" }, reason: "wrong_password", decision: "denied" })).toEqual(["Method: password", "Reason: Wrong password"]);
    expect(detailLines({ details: {}, reason: "no_active_grant", decision: "denied" })).toEqual(["Reason: No active support access"]);
    expect(detailLines({ details: {}, reason: "role_changed", decision: "allowed" })).toEqual([]);
  });

  it('says "RFP", never "proposal"', () => {
    expect(detailLines({ details: { proposalId: "0123456789abcdef01234567", proposalsMoved: 3 }, reason: null, decision: "allowed" }).join(" ")).not.toMatch(/proposal/i);
    expect(targetLabel({ type: "proposal", id: "0123456789abcdef01234567", name: null })).toBe("RFP …234567");
  });

  it("labels targets", () => {
    expect(targetLabel({ type: "organization_membership", id: "u2", name: "Priya Planner" })).toBe("Member: Priya Planner");
    expect(targetLabel({ type: "organization", id: "0123456789abcdef01234567", name: null })).toBe("Organization");
    expect(targetLabel({ type: "refresh_session", id: "s1", name: null })).toBe("Session");
    expect(targetLabel({ type: "", id: null, name: null })).toBe("—");
  });

  it("maps decisions and errors to words", () => {
    expect(decisionOf("denied")).toEqual({ label: "Refused", tone: "rose" });
    expect(decisionOf("mystery").label).toBe("Recorded");
    expect(auditErrorMessage({ code: "AUDIT_FILTER_INVALID", status: 400 }, "x")).toMatch(/filters/);
    expect(auditErrorMessage({ status: 403 }, "x")).toMatch(/Owner or Admin/);
    expect(auditErrorMessage({ status: 429 }, "x")).toMatch(/Too many exports/);
    expect(auditErrorMessage({ code: "SOMETHING_NEW", status: 500 }, "Fallback.")).toBe("Fallback.");
  });

  it("formats a time in a fixed zone, and a bad one as a dash", () => {
    expect(formatAuditTime("2026-11-10T08:30:05.000Z", "UTC")).toBe("Nov 10, 2026, 8:30:05 AM");
    expect(formatAuditTime("nope")).toBe("—");
    expect(exportFileName(new Date("2026-11-11T05:00:00Z"))).toBe("audit-log-2026-11-11.csv");
  });
});

describe("neutralizeCsv", () => {
  it("prefixes formula cells with an apostrophe wherever they sit in a row", () => {
    const csv = '"Time","Actor"\r\n"=1+1","+x"\r\n"ok","  @SUM(A1)"\r\n"-2","plain"\r\n';
    expect(neutralizeCsv(csv)).toBe('"Time","Actor"\r\n"\'=1+1","\'+x"\r\n"ok","\'  @SUM(A1)"\r\n"\'-2","plain"\r\n');
  });

  it("leaves safe and already neutralized cells alone", () => {
    const csv = '"a","b - c","x=y"\r\n"\'=1+1","2026-11-10T08:30:00.000Z"\r\n';
    expect(neutralizeCsv(csv)).toBe(csv);
    expect(neutralizeCsv(neutralizeCsv('"=1"'))).toBe('"\'=1"');
  });
});

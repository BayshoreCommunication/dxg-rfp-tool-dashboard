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
  isSupportAccessEvent,
  neutralizeCsv,
  targetLabel,
  toAuditFilterOptions,
  toAuditPage,
  toAuditQuery,
  withoutSupportAccessRows,
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

  // Owner decision, 2026-11-17: Support access events are not part of the customer's audit log.
  it("drops every RFPilot Support access event the backend still returns", () => {
    const support = { kind: "support", id: "a1", name: "RFPilot Support" };
    const page = toAuditPage({
      nextCursor: "next",
      events: [
        event({ id: "s1", action: "support_access.used", label: "Support access used", category: "support_access", actor: support, target: { type: "proposal", id: "p1", name: null }, details: { grantId: "g1", operation: "rfp.read" } }),
        event({ id: "s2", action: "support_access.denied", label: "Support access refused", category: "support_access", actor: support, decision: "denied", reason: "no_active_grant", details: { operation: "rfp.list" } }),
        event({ id: "s3", action: "support_access.granted", label: "Support access granted", category: "support_access", target: { type: "support_access_grant", id: "g1", name: null }, details: { grantId: "g1", scope: "rfp" } }),
        event({ id: "s4", action: "support_access.revoked", label: "Support access revoked", category: "support_access", target: { type: "support_access_grant", id: "g1", name: null }, details: { grantId: "g1" } }),
        // Recognized by any one sign: the category, the action, the grant target, or staff acting under a grant.
        event({ id: "s5", action: "support_access.something_new", category: "" }),
        event({ id: "s6", action: "x", category: "support_access" }),
        event({ id: "s7", action: "x", category: "members", target: { type: "support_access_grant", id: "g1", name: null } }),
        event({ id: "s8", action: "x", category: "members", actor: support, details: { grantId: "g1" } }),
        event({ id: "keep-member" }),
        event({ id: "keep-staff", action: "organization.plan_changed", label: "Plan changed by RFPilot Support", category: "settings", actor: support, details: { fromPlan: "free_trial", toPlan: "full_access" } }),
      ],
    });
    expect(page.events.map((entry) => entry.id)).toEqual(["keep-member", "keep-staff"]);
    expect(page.events[1].actor.name).toBe("RFPilot Support");
    // The cursor is the backend's: the next page is still asked for.
    expect(page.nextCursor).toBe("next");
    expect(isSupportAccessEvent(page.events[0])).toBe(false);
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

  it("offers no Support access category or action", () => {
    const options = toAuditFilterOptions({
      categories: [
        { key: "support_access", label: "RFPilot Support access", actions: [{ value: "support_access.used", label: "Support access used" }] },
        { key: "settings", label: "Organization settings", actions: [{ value: "organization.plan_changed", label: "Plan changed by RFPilot Support" }, { value: "support_access.granted", label: "Support access granted" }] },
      ],
    });
    expect(options.categories).toEqual([{ key: "settings", label: "Organization settings", actions: [{ value: "organization.plan_changed", label: "Plan changed by RFPilot Support" }] }]);
    expect(JSON.stringify(options)).not.toMatch(/support_access|Support access/);
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

  it("describes scopes, settings changes and plan changes in words", () => {
    expect(detailLines({ details: { scope: "rfp" }, reason: null, decision: "created" })).toEqual(["Scope: One proposal"]);
    expect(detailLines({ details: { setting: "requireTwoFactor", from: false, to: true, signedOutMembers: 2 }, reason: null, decision: "allowed" }))
      .toEqual(["Require two-factor: Off → On", "Members signed out: 2"]);
    expect(detailLines({ details: { setting: "autoApproveDomain", value: true }, reason: null, decision: "allowed" })).toEqual(["Auto-approve access requests: On"]);
    expect(detailLines({ details: { fromPlan: "free_trial", toPlan: "full_access" }, reason: "staff_plan_change", decision: "allowed" }))
      .toEqual(["Previous plan: Free trial", "New plan: Full access"]);
  });

  it("shows the reason only for a refused or detected event, in words", () => {
    expect(detailLines({ details: { method: "password" }, reason: "wrong_password", decision: "denied" })).toEqual(["Method: password", "Reason: Wrong password"]);
    expect(detailLines({ details: {}, reason: "role_changed", decision: "allowed" })).toEqual([]);
  });

  it('says "proposal", never "RFP"', () => {
    expect(detailLines({ details: { proposalId: "0123456789abcdef01234567", proposalsMoved: 3 }, reason: null, decision: "allowed" })).toEqual(["Proposal ID: …234567", "Proposals moved: 3"]);
    expect(targetLabel({ type: "proposal", id: "0123456789abcdef01234567", name: null })).toBe("Proposal …234567");
    // Recorded values are shown as stored: a domain or a team name is never reworded.
    expect(detailLines({ details: { domain: "proposals.acme.example", placedInTeam: "Proposal Desk" }, reason: null, decision: "allowed" }))
      .toEqual(["Domain: proposals.acme.example", "Placed in team: Proposal Desk"]);
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
    expect(auditErrorMessage({ status: 429 }, "x")).toMatch(/Too many requests/);
    expect(auditErrorMessage({ code: "SOMETHING_NEW", status: 500 }, "Fallback.")).toBe("Fallback.");
  });

  it("formats a time in a fixed zone, and a bad one as a dash", () => {
    expect(formatAuditTime("2026-11-10T08:30:05.000Z", "UTC")).toBe("Nov 10, 2026, 8:30:05 AM");
    expect(formatAuditTime("nope")).toBe("—");
    expect(exportFileName(new Date("2026-11-11T05:00:00Z"))).toBe("audit-log-2026-11-11.csv");
  });
});

describe("withoutSupportAccessRows", () => {
  const header = '"Time (UTC)","Action","Category","Result","Actor","Actor email","Actor type","Target type","Target","Reason","Details","Event ID"';
  const row = (cells: string[]) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
  const signIn = row(["t1", "Signed in", "Sign-in", "created", "Olivia Owner", "owner@example.com", "member", "refresh_session", "", "authentication_succeeded", "", "e1"]);
  const plan = row(["t2", "Plan changed by RFPilot Support", "Organization settings", "allowed", "RFPilot Support", "", "support", "organization", "o1", "staff_plan_change", "fromPlan: free_trial; toPlan: full_access", "e2"]);
  const multiline = row(["t3", "Team renamed", "Teams", "allowed", "Olivia Owner", "owner@example.com", "member", "team", 'Events,\r\n "West"', "", "", "e3"]);

  it("takes out every Support access row and counts what is left", () => {
    const csv = [
      header,
      row(["t", "Support access used", "RFPilot Support access", "allowed", "RFPilot Support", "", "support", "proposal", "p1", "rfp.read", "operation: rfp.read; grantId: g1", "s1"]),
      signIn,
      row(["t", "Support access refused", "RFPilot Support access", "denied", "RFPilot Support", "", "support", "organization", "o1", "no_active_grant", "operation: rfp.list", "s2"]),
      plan,
      // Each sign alone is enough: the action label, the grant target, staff with a grant id.
      row(["t", "Support access granted", "", "created", "Adam Admin", "admin@example.com", "member", "", "", "", "", "s3"]),
      row(["t", "Something", "Members and roles", "created", "Adam Admin", "admin@example.com", "member", "support_access_grant", "g1", "", "", "s4"]),
      row(["t", "Something", "Members and roles", "allowed", "RFPilot Support", "", "support", "proposal", "p1", "", "grantId: g1", "s5"]),
      multiline,
    ].join("\r\n") + "\r\n";
    const narrowed = withoutSupportAccessRows(csv);
    expect(narrowed).toEqual({ csv: [header, signIn, plan, multiline].join("\r\n") + "\r\n", rows: 3, removed: 5 });
    expect(narrowed.csv).not.toMatch(/Support access|grantId|no_active_grant/);
  });

  it("leaves a file with nothing to take out, or an unknown header, exactly as it was", () => {
    const clean = `${header}\r\n${signIn}\r\n${multiline}\r\n`;
    expect(withoutSupportAccessRows(clean)).toEqual({ csv: clean, rows: 2, removed: 0 });
    const other = '"Time (UTC)","Actor"\r\n"t","Olivia"\r\n';
    expect(withoutSupportAccessRows(other)).toEqual({ csv: other, rows: null, removed: 0 });
    expect(withoutSupportAccessRows("")).toEqual({ csv: "", rows: null, removed: 0 });
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

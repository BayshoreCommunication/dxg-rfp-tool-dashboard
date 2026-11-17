import { RFP_NOUN } from "@/test/wording";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AuditLogSettings from "./AuditLogSettings";
import type { AuditEvent, AuditFilterOptions, AuditPage } from "./auditLogModel";

const mockList = jest.fn();
const mockExport = jest.fn();
jest.mock("@/app/actions/auditLog", () => ({
  listAuditEventsAction: (...args: unknown[]) => mockList(...args),
  exportAuditLogAction: (...args: unknown[]) => mockExport(...args),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("@/components/settings/TopHeaser", () => ({ __esModule: true, default: () => <div>settings header</div> }));
const mockToast = { error: jest.fn(), success: jest.fn(), warn: jest.fn(), info: jest.fn() };
jest.mock("react-toastify", () => ({ toast: { error: (...a: unknown[]) => mockToast.error(...a), success: (...a: unknown[]) => mockToast.success(...a), warn: (...a: unknown[]) => mockToast.warn(...a), info: (...a: unknown[]) => mockToast.info(...a) } }));

const event = (id: string, overrides: Partial<AuditEvent> = {}): AuditEvent => ({
  id,
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
const secondEvent = event("e2", {
  action: "proposal.share_granted", label: "Proposal shared", category: "sharing", reason: "shared", decision: "created",
  actor: { kind: "member", id: "u2", name: "priya@example.com", email: "priya@example.com" },
  target: { type: "proposal", id: "0123456789abcdef01234567", name: null },
  details: { role: "viewer" },
});
const options: AuditFilterOptions = {
  categories: [
    { key: "sign_in", label: "Sign-in", actions: [{ value: "auth.login.failed", label: "Sign-in failed" }] },
    { key: "members", label: "Members and roles", actions: [{ value: "organization.member.role_changed", label: "Role changed" }] },
  ],
};
const members = [
  { userId: "u1", name: "Olivia Owner", email: "owner@example.com" },
  { userId: "u2", name: null, email: "priya@example.com" },
];
const page = (events: AuditEvent[], nextCursor: string | null = null): AuditPage => ({ events, nextCursor });
const ok = <T,>(data: T) => ({ success: true, status: 200, message: "OK", data });
const rows = () => within(screen.getByRole("list", { name: "Audit events" })).getAllByRole("listitem").filter((item) => item.parentElement?.getAttribute("aria-label") === "Audit events");

const renderLog = (initial: AuditPage | null = page([event("e1"), secondEvent]), initialError: string | null = null) =>
  render(<AuditLogSettings initialPage={initial} initialError={initialError} options={options} members={members} />);

describe("AuditLogSettings", () => {
  beforeEach(() => {
    for (const mock of [mockList, mockExport, mockToast.error, mockToast.success, mockToast.warn, mockToast.info]) mock.mockReset();
  });

  it("shows events with role labels and proposal wording, without asking the backend again", () => {
    renderLog();
    expect(screen.getByRole("heading", { name: "Audit log" })).toBeInTheDocument();
    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toHaveTextContent("Role changed");
    expect(rows()[0]).toHaveTextContent("Member: Priya Planner");
    expect(rows()[0]).toHaveTextContent("Role: Admin");
    expect(rows()[0]).toHaveTextContent("Allowed");
    expect(rows()[1]).toHaveTextContent("Proposal shared");
    expect(rows()[1]).toHaveTextContent("Proposal …234567");
    expect(rows()[1]).toHaveTextContent("Role: Viewer");
    expect(screen.getByTestId("audit-log").textContent).not.toMatch(RFP_NOUN);
    expect(screen.getByTestId("audit-log").textContent).not.toMatch(/organization_admin/i);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("says nothing about RFPilot Support or its access", () => {
    renderLog();
    expect(screen.getByText("Sign-ins, security changes, invitations, role and team changes and proposal sharing in your organization. Entries can't be edited or deleted.")).toBeInTheDocument();
    expect(screen.getByTestId("audit-log").textContent).not.toMatch(/support access|RFPilot Support|RFPilot staff/i);
    expect(within(screen.getByLabelText("Action")).queryByRole("option", { name: /support access/i })).not.toBeInTheDocument();
  });

  it("counts only the events it shows, and offers older pages when the pages read so far had nothing to show", async () => {
    renderLog(page([event("e1"), secondEvent], "cursor-1"));
    expect(screen.getByRole("status")).toHaveTextContent("Showing 2 events, newest first.");

    renderLog(page([], "cursor-1"));
    expect(screen.queryByText("No activity yet")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing to show in the most recent activity. Load more to see older activity.")).toBeInTheDocument();
    mockList.mockResolvedValue(ok(page([event("e9")], null)));
    fireEvent.click(screen.getAllByRole("button", { name: /Load more/ })[1]);
    await waitFor(() => expect(screen.getAllByRole("list", { name: "Audit events" })).toHaveLength(2));
    expect(mockList).toHaveBeenCalledWith({}, "cursor-1");
  });

  it("says so when Load more brings nothing to show and older pages remain, and keeps the button", async () => {
    renderLog(page([event("e1")], "cursor-1"));
    mockList.mockResolvedValueOnce(ok(page([], "cursor-2")));
    fireEvent.click(screen.getByRole("button", { name: /Load more/ }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Showing 1 event, newest first. Nothing more to show yet. Load more to see older activity."));
    expect(rows()).toHaveLength(1);

    mockList.mockResolvedValueOnce(ok(page([event("e7")], null)));
    fireEvent.click(screen.getByRole("button", { name: /Load more/ }));
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(mockList).toHaveBeenLastCalledWith({}, "cursor-2");
    expect(screen.getByRole("status")).toHaveTextContent(/^Showing 2 events\.$/);
    expect(screen.queryByRole("button", { name: /Load more/ })).not.toBeInTheDocument();
  });

  it("keeps the filters message when a filter is on and the log has nothing more", async () => {
    renderLog();
    mockList.mockResolvedValue(ok(page([], "cursor-1")));
    fireEvent.change(screen.getByLabelText("User"), { target: { value: "u2" } });
    expect(await screen.findByText("Nothing to show in the most recent activity. Load more to see older activity.")).toBeInTheDocument();
    mockList.mockResolvedValue(ok(page([], null)));
    fireEvent.click(screen.getByRole("button", { name: /Load more/ }));
    expect(await screen.findByText("No activity matches these filters")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Load more/ })).not.toBeInTheDocument();
  });

  it("says there is nothing to export, and downloads no file, when the export has no rows", async () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    mockExport.mockResolvedValue(ok({ csv: '"Time (UTC)"\r\n', fileName: "audit-log-2026-11-11.csv", rows: 0, truncated: true }));
    renderLog();
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/ }));
    await waitFor(() => expect(mockToast.info).toHaveBeenCalledWith("There's nothing to export for this range."));
    expect(click).not.toHaveBeenCalled();
    expect(mockToast.warn).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it("offers every member and the catalogued actions as filters, and no RFPilot Support option", () => {
    renderLog();
    const user = screen.getByLabelText("User");
    expect(within(user).getAllByRole("option").map((option) => option.textContent)).toEqual(["Everyone", "Olivia Owner", "priya@example.com"]);
    const action = screen.getByLabelText("Action");
    expect(within(action).getByRole("option", { name: "Sign-in failed" })).toBeInTheDocument();
    expect(within(action).getByRole("option", { name: "All: Members and roles" })).toBeInTheDocument();
  });

  it("reloads with the chosen user, action and dates", async () => {
    mockList.mockResolvedValue(ok(page([secondEvent])));
    renderLog();
    fireEvent.change(screen.getByLabelText("User"), { target: { value: "u2" } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(mockList).toHaveBeenLastCalledWith({ actor: "u2" });

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "category:sign_in" } });
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ actor: "u2", category: "sign_in" }));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-03" } });
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ actor: "u2", category: "sign_in", from: new Date(2026, 10, 3).toISOString() }));

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({}));
  });

  it("shows the empty state for filters that match nothing, and for a quiet organization", async () => {
    mockList.mockResolvedValue(ok(page([])));
    renderLog();
    fireEvent.change(screen.getByLabelText("User"), { target: { value: "u2" } });
    expect(await screen.findByText("No activity matches these filters")).toBeInTheDocument();
    renderLog(page([]));
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("refuses a start date after the end date without calling the backend", () => {
    renderLog();
    mockList.mockResolvedValue(ok(page([])));
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-11-01" } });
    mockList.mockClear();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-05" } });
    expect(screen.getByRole("alert")).toHaveTextContent("The start date must be on or before the end date.");
    expect(mockList).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Export CSV/ })).toBeDisabled();
  });

  it("shows a readable error from the first load and from a failed reload", async () => {
    renderLog(null, "The audit log couldn't be loaded. Try again.");
    expect(screen.getByRole("alert")).toHaveTextContent("The audit log couldn't be loaded. Try again.");
    mockList.mockResolvedValue({ success: false, status: 400, code: "AUDIT_FILTER_INVALID", message: "AUDIT_FILTER_INVALID" });
    fireEvent.change(screen.getAllByLabelText("User")[0], { target: { value: "u1" } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Those filters aren't valid."));
    expect(screen.getByTestId("audit-log").textContent).not.toMatch(/AUDIT_FILTER_INVALID/);
  });

  it("offers Try again after a failed load, and recovers", async () => {
    renderLog(null, "The audit log couldn't be loaded. Try again.");
    mockList.mockResolvedValue(ok(page([event("e1")])));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(mockList).toHaveBeenCalledWith({});
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Security/ })).toHaveAttribute("href", "/settings/security");
  });

  it("loads the next page with the same filters and appends it once", async () => {
    renderLog(page([event("e1")], "cursor-1"));
    mockList.mockResolvedValue(ok(page([event("e1"), event("e3", { label: "Team created" })], null)));
    fireEvent.click(screen.getByRole("button", { name: /Load more/ }));
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(mockList).toHaveBeenCalledWith({}, "cursor-1");
    expect(screen.queryByRole("button", { name: /Load more/ })).not.toBeInTheDocument();
  });

  it("ignores a slow answer to an older filter", async () => {
    let resolveSlow: (value: unknown) => void = () => {};
    mockList.mockImplementationOnce(() => new Promise((resolve) => { resolveSlow = resolve; }));
    mockList.mockResolvedValueOnce(ok(page([secondEvent])));
    renderLog();
    fireEvent.change(screen.getByLabelText("User"), { target: { value: "u1" } });
    fireEvent.change(screen.getByLabelText("User"), { target: { value: "u2" } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    await act(async () => { resolveSlow(ok(page([event("e1"), event("e4"), event("e5")]))); });
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent("Proposal shared");
  });

  it("exports with the filters on screen and downloads the file", async () => {
    const createObjectURL = jest.fn(() => "blob:audit");
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    mockList.mockResolvedValue(ok(page([secondEvent])));
    mockExport.mockResolvedValue(ok({ csv: '"Time (UTC)"\r\n"t"\r\n', fileName: "audit-log-2026-11-11.csv", rows: 1, truncated: false }));
    renderLog();
    fireEvent.change(screen.getByLabelText("User"), { target: { value: "u2" } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/ }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Exported 1 event."));
    expect(mockExport).toHaveBeenCalledWith({ actor: "u2" });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:audit");

    mockExport.mockResolvedValue(ok({ csv: "x", fileName: "f.csv", rows: 5000, truncated: true }));
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/ }));
    await waitFor(() => expect(mockToast.warn).toHaveBeenCalledWith(expect.stringMatching(/newest 5,000 events/)));

    mockExport.mockResolvedValue({ success: false, status: 429, message: "Too many requests" });
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/ }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/Too many requests/)));
    expect(click).toHaveBeenCalledTimes(2);
    click.mockRestore();
  });
});

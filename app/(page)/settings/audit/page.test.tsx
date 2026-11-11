import { render, screen } from "@testing-library/react";
import SettingsAuditPage from "./page";

const mockList = jest.fn();
const mockOptions = jest.fn();
const mockMembers = jest.fn();
const mockIdentity = jest.fn();
jest.mock("@/app/actions/auditLog", () => ({
  listAuditEventsAction: (...args: unknown[]) => mockList(...args),
  getAuditFilterOptionsAction: (...args: unknown[]) => mockOptions(...args),
}));
jest.mock("@/app/actions/organizationMembers", () => ({ listMembersAction: (...args: unknown[]) => mockMembers(...args) }));
jest.mock("@/lib/server/memberIdentity", () => ({ getMemberIdentity: (...args: unknown[]) => mockIdentity(...args) }));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
jest.mock("@/components/organization/audit/AuditLogSettings", () => ({
  __esModule: true,
  default: ({ initialPage, initialError, members, options }: { initialPage: { events: unknown[] } | null; initialError: string | null; members: unknown[]; options: unknown }) => (
    <div data-testid="audit-log">{initialPage ? `${initialPage.events.length} events, ${members.length} members, options ${options ? "yes" : "no"}` : initialError}</div>
  ),
}));

const ok = <T,>(data: T) => ({ success: true, status: 200, message: "OK", data });

// ORG-407: the page exists for an Owner or Admin only.
describe("/settings/audit", () => {
  beforeEach(() => {
    for (const mock of [mockList, mockOptions, mockMembers, mockIdentity]) mock.mockReset();
    mockList.mockResolvedValue(ok({ events: [{ id: "e1" }], nextCursor: null }));
    mockOptions.mockResolvedValue(ok({ categories: [], supportActor: { value: "support", label: "RFPilot Support" } }));
    mockMembers.mockResolvedValue(ok([{ userId: "u1", name: "Olivia Owner", email: "owner@example.com", role: "owner" }]));
  });

  it.each([["team_manager"], ["planner"], ["viewer"]])("does not exist for %s: the backend refuses, and nothing else is asked", async (role) => {
    mockIdentity.mockResolvedValue({ userId: "u9", roles: [role] });
    mockList.mockResolvedValue({ success: false, status: 403, message: "Forbidden" });
    await expect(SettingsAuditPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockOptions).not.toHaveBeenCalled();
    expect(mockMembers).not.toHaveBeenCalled();
  });

  it("lets in a member the backend accepts even when the session's role is stale", async () => {
    // Promoted to Admin after the token was issued: the token still says Planner.
    mockIdentity.mockResolvedValue({ userId: "u1", roles: ["planner"] });
    render(await SettingsAuditPage());
    expect(screen.getByTestId("audit-log")).toHaveTextContent("1 events, 1 members, options yes");
  });

  it("asks for no member list when the log fails for someone the session doesn't show as Owner or Admin", async () => {
    mockIdentity.mockResolvedValue({ userId: "u9", roles: ["viewer"] });
    mockList.mockResolvedValue({ success: false, status: 500, message: "x" });
    render(await SettingsAuditPage());
    expect(screen.getByTestId("audit-log")).toHaveTextContent("The audit log couldn't be loaded. Try again.");
    expect(mockMembers).not.toHaveBeenCalled();
  });

  it.each([["owner"], ["organization_admin"]])("renders the first page for %s", async (role) => {
    mockIdentity.mockResolvedValue({ userId: "u1", roles: [role] });
    render(await SettingsAuditPage());
    expect(screen.getByTestId("audit-log")).toHaveTextContent("1 events, 1 members, options yes");
  });

  it("does not exist when the backend refuses, whatever the session says", async () => {
    mockIdentity.mockResolvedValue({ userId: "u1", roles: ["owner"] });
    mockList.mockResolvedValue({ success: false, status: 403, message: "Forbidden" });
    await expect(SettingsAuditPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows a readable error, not a 404, when the log can't be loaded", async () => {
    mockIdentity.mockResolvedValue({ userId: "u1", roles: ["organization_admin"] });
    mockList.mockResolvedValue({ success: false, status: 500, code: "AUDIT_LOG_INTERNAL_ERROR", message: "The audit log request could not be completed." });
    mockOptions.mockResolvedValue({ success: false, status: 500, message: "x" });
    mockMembers.mockResolvedValue({ success: false, status: 500, message: "x" });
    render(await SettingsAuditPage());
    expect(screen.getByTestId("audit-log")).toHaveTextContent("The audit log couldn't be loaded. Try again.");
  });
});

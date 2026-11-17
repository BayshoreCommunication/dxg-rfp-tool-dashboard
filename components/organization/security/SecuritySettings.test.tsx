import { render, screen } from "@testing-library/react";
import SecuritySettings from "./SecuritySettings";

const mockOrgSecurity = jest.fn();
jest.mock("@/app/actions/security", () => ({
  getTwoFactorStatusAction: jest.fn().mockResolvedValue({
    success: true, message: "OK", data: { enabled: false, pendingEnrolment: false, recoveryCodesRemaining: 0, requiredByOrganization: false },
  }),
  getOrganizationSecurityAction: (...args: unknown[]) => mockOrgSecurity(...args),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("./TwoFactorCard", () => ({ __esModule: true, default: () => <div>two-factor</div> }));
jest.mock("./OrganizationSecurityCard", () => ({ __esModule: true, default: () => <div>organization-security</div> }));
jest.mock("./DomainsCard", () => ({ __esModule: true, default: () => <div>domains</div> }));
jest.mock("./SingleSignOnCard", () => ({ __esModule: true, default: () => <div>sso</div> }));

const ownerOrAdmin = { success: true, message: "OK", data: { requireTwoFactor: false, activeMembers: 5, membersWithoutTwoFactor: 5 } };
const everyOtherRole = { success: false, message: "Forbidden", status: 403 };
const noSupportAccess = () => {
  expect(screen.queryByRole("link", { name: /support access/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /support access/i })).not.toBeInTheDocument();
  expect(document.querySelector('a[href*="support-access"]')).toBeNull();
  expect(document.body.textContent).not.toMatch(/support access/i);
};

// Owner decision, 2026-11-17: customers no longer grant, see or control RFPilot Support access.
describe("SecuritySettings", () => {
  beforeEach(() => mockOrgSecurity.mockReset());

  it("shows an Owner or Admin the audit log and the organization cards, and no Support access", async () => {
    mockOrgSecurity.mockResolvedValue(ownerOrAdmin);
    render(<SecuritySettings />);
    expect(await screen.findByRole("link", { name: /Open audit log/ })).toHaveAttribute("href", "/settings/audit");
    for (const card of ["two-factor", "organization-security", "domains", "sso"]) expect(screen.getByText(card)).toBeInTheDocument();
    expect(screen.getByText(/Two-factor sign-in for your account, your organization's security rules, verified domains and single sign-on\./)).toBeInTheDocument();
    noSupportAccess();
  });

  it("shows a Team Manager, Planner or Viewer their own two-factor and who manages the rest, and no Support access", async () => {
    mockOrgSecurity.mockResolvedValue(everyOtherRole);
    render(<SecuritySettings />);
    expect(await screen.findByText("Organization security and verified domains are managed by your organization's Owner and Admins.")).toBeInTheDocument();
    expect(screen.getByText("two-factor")).toBeInTheDocument();
    expect(screen.getByText("Two-factor sign-in for your account.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /audit log/i })).not.toBeInTheDocument();
    expect(screen.queryByText("organization-security")).not.toBeInTheDocument();
    noSupportAccess();
  });
});

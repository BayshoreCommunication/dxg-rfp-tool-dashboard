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

// ORG-405: the way in to support access sits in the Owner/Admin block of the Security page.
describe("SecuritySettings support access entry", () => {
  beforeEach(() => mockOrgSecurity.mockReset());

  it("links an Owner or Admin to support access", async () => {
    mockOrgSecurity.mockResolvedValue({ success: true, message: "OK", data: { requireTwoFactor: false, activeMembers: 5, membersWithoutTwoFactor: 5 } });
    render(<SecuritySettings />);
    expect(await screen.findByRole("link", { name: /Manage support access/ })).toHaveAttribute("href", "/settings/support-access");
    expect(screen.getByRole("heading", { name: "Support access" })).toBeInTheDocument();
  });

  it("shows no way in to a Team Manager, Planner or Viewer", async () => {
    mockOrgSecurity.mockResolvedValue({ success: false, message: "Forbidden", status: 403 });
    render(<SecuritySettings />);
    expect(await screen.findByText(/managed by your organization's Owner and Admins/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /support access/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Support access" })).not.toBeInTheDocument();
  });
});

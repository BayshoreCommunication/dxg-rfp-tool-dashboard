import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

jest.mock("@/app/actions/rfpSharing", () => ({
  getRfpAccessAction: jest.fn(),
  grantRfpShareAction: jest.fn(),
  revokeRfpShareAction: jest.fn(),
  setRfpTeamAction: jest.fn(),
  reassignRfpOwnerAction: jest.fn(),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { getRfpAccessAction, grantRfpShareAction, setRfpTeamAction } from "@/app/actions/rfpSharing";
import RfpAccessPanel from "./RfpAccessPanel";
import type { RfpAccessSnapshot } from "./rfpAccessModel";

const RFP = "a".repeat(24);
const OWNER = "b".repeat(24);
const PLANNER = "c".repeat(24);
const VIEWER = "d".repeat(24);
const ME = "e".repeat(24);

const adminSnapshot = (overrides: Partial<RfpAccessSnapshot> = {}): RfpAccessSnapshot => ({
  proposalId: RFP,
  title: "Annual summit",
  viewerUserId: ME,
  ownerUserId: OWNER,
  teamId: null,
  shares: [{ userId: PLANNER, permission: "view", grantedBy: ME, memberActive: false }],
  directory: [
    { userId: OWNER, name: "Olive Owner", email: "olive@example.test", role: "planner", roles: ["planner"], status: "active" },
    { userId: PLANNER, name: "Pat Planner", email: "pat@example.test", role: "planner", roles: ["planner"], status: "active" },
    { userId: VIEWER, name: "Vic Viewer", email: "vic@example.test", role: "viewer", roles: ["viewer"], status: "active" },
    { userId: ME, name: "Ada Admin", email: "ada@example.test", role: "organization_admin", roles: ["organization_admin"], status: "active" },
  ],
  teams: [{ id: "f".repeat(24), name: "East" }],
  ...overrides,
});

describe("RfpAccessPanel", () => {
  beforeEach(() => jest.clearAllMocks());

  test("an Owner/Admin sees Share and Reassign owner", () => {
    render(<RfpAccessPanel proposalId={RFP} initial={adminSnapshot()} />);
    expect(screen.getByRole("button", { name: /^Share$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reassign owner/ })).toBeInTheDocument();
    expect(screen.getByText("Olive Owner")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Proposal team" })).toBeInTheDocument();
  });

  test("a member the proposal was only shared with sees the team read-only and no actions", async () => {
    jest.mocked(getRfpAccessAction).mockResolvedValue({
      success: true,
      data: adminSnapshot({ shares: null, directory: null, teamId: "f".repeat(24) }),
    });
    render(<RfpAccessPanel proposalId={RFP} />);
    expect(await screen.findByText("East")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Share$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reassign owner/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Proposal team" })).not.toBeInTheDocument();
    expect(screen.getByText("Shared with you")).toBeInTheDocument();
  });

  test("a proposal owner without the member directory can share but not reassign", () => {
    render(<RfpAccessPanel proposalId={RFP} initial={adminSnapshot({ directory: null, ownerUserId: ME })} />);
    expect(screen.getByRole("button", { name: /^Share$/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reassign owner/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Share$/ }));
    expect(screen.getByText(/Only Owners and Admins can browse/)).toBeInTheDocument();
  });

  test("the share dialog lists shares with an inactive badge and upgrades View to Edit", async () => {
    jest.mocked(grantRfpShareAction).mockResolvedValue({
      success: true,
      data: [{ userId: PLANNER, permission: "edit", grantedBy: ME, memberActive: true }],
    });
    render(<RfpAccessPanel proposalId={RFP} initial={adminSnapshot()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Share$/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Inactive member")).toBeInTheDocument();
    expect(within(dialog).getByText("Shared by Ada Admin (you)")).toBeInTheDocument();

    const group = within(dialog).getByRole("group", { name: "Permission for Pat Planner" });
    fireEvent.click(within(group).getByRole("button", { name: "Edit" }));
    await waitFor(() => expect(grantRfpShareAction).toHaveBeenCalledWith(RFP, PLANNER, "edit"));
    await waitFor(() => expect(within(group).getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "true"));
    expect(within(dialog).queryByText("Inactive member")).not.toBeInTheDocument();
  });

  test("a Viewer can only be offered View", () => {
    render(<RfpAccessPanel proposalId={RFP} initial={adminSnapshot({ shares: [{ userId: VIEWER, permission: "view", grantedBy: ME, memberActive: true }] })} />);
    fireEvent.click(screen.getByRole("button", { name: /^Share$/ }));
    const group = screen.getByRole("group", { name: "Permission for Vic Viewer" });
    expect(within(group).getByRole("button", { name: "Edit" })).toBeDisabled();
  });

  test("shows the mapped message when a share is refused", async () => {
    jest.mocked(grantRfpShareAction).mockResolvedValue({ success: false, status: 422, code: "VIEWER_VIEW_ONLY", message: "Viewers can only be given View access." });
    render(<RfpAccessPanel proposalId={RFP} initial={adminSnapshot()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Share$/ }));
    fireEvent.click(within(screen.getByRole("group", { name: "Permission for Pat Planner" })).getByRole("button", { name: "Edit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Viewers can only be given View access.");
    expect(screen.queryByText("VIEWER_VIEW_ONLY")).not.toBeInTheDocument();
  });

  test("shows the mapped message when a team can't be assigned", async () => {
    jest.mocked(setRfpTeamAction).mockResolvedValue({ success: false, status: 422, code: "TEAM_NOT_ASSIGNABLE", message: "That team can't be used for this proposal. Pick an active team, or No team." });
    render(<RfpAccessPanel proposalId={RFP} initial={adminSnapshot()} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Proposal team" }));
    fireEvent.click(screen.getByRole("option", { name: "East" }));
    await waitFor(() => expect(setRfpTeamAction).toHaveBeenCalledWith(RFP, "f".repeat(24)));
    expect(await screen.findByRole("alert")).toHaveTextContent("That team can't be used for this proposal.");
  });
});

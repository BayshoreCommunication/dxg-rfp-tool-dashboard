import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InviteDialog from "./InviteDialog";

jest.mock("@/app/actions/invitations", () => ({
  createInvitationAction: jest.fn(),
  createBulkInvitationsAction: jest.fn(),
}));

import { createBulkInvitationsAction, createInvitationAction } from "@/app/actions/invitations";

const bulk = jest.mocked(createBulkInvitationsAction);
const single = jest.mocked(createInvitationAction);
const teams = [{ id: "t1", name: "East Coast Events" }, { id: "t2", name: "West" }];

describe("InviteDialog", () => {
  beforeEach(() => {
    bulk.mockReset();
    single.mockReset();
  });

  it("offers Admins every role and an optional team", () => {
    render(<InviteDialog access={{ userId: "a", role: "organization_admin", canManageMembers: true, canInvite: true }} teams={teams} onClose={jest.fn()} onInvited={jest.fn()} />);
    expect(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["organization_admin", "team_manager", "planner", "viewer"]);
    expect(screen.getByRole("option", { name: "No team" })).toBeInTheDocument();
  });

  it("limits Team Managers to Planners and Viewers in a team", () => {
    render(<InviteDialog access={{ userId: "m", role: "team_manager", canManageMembers: false, canInvite: true }} teams={teams} onClose={jest.fn()} onInvited={jest.fn()} />);
    expect(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["planner", "viewer"]);
    expect(screen.queryByRole("option", { name: "No team" })).not.toBeInTheDocument();
  });

  it("sends a pasted list in bulk and shows each row's outcome", async () => {
    bulk.mockResolvedValue({
      success: true,
      message: "OK",
      data: {
        summary: { total: 2, invited: 1, refused: 1 },
        rows: [
          { row: 1, email: "ana@x.com", outcome: "invited", invitation: {} as never },
          { row: 2, email: "bo@x.com", outcome: "refused", code: "ALREADY_MEMBER", message: "m" },
        ],
      },
    });
    const onInvited = jest.fn();
    render(<InviteDialog access={{ userId: "a", role: "owner", canManageMembers: true, canInvite: true }} teams={teams} onClose={jest.fn()} onInvited={onInvited} />);
    fireEvent.change(screen.getByLabelText("Email addresses"), { target: { value: "ana@x.com, bo@x.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send 2 invitations/i }));

    await waitFor(() => expect(screen.getByText("Invitations sent")).toBeInTheDocument());
    expect(bulk).toHaveBeenCalledWith({ emails: ["ana@x.com", "bo@x.com"], role: "planner", teamId: null });
    expect(screen.getByText("Invited as Planner")).toBeInTheDocument();
    expect(screen.getByText("This person is already a member of the organization.")).toBeInTheDocument();
    expect(onInvited).toHaveBeenCalled();
  });

  it("uses the single endpoint for one address and shows a request-level refusal inline", async () => {
    single.mockResolvedValue({ success: false, message: "", status: 429, code: "INVITATION_DAILY_LIMIT", details: { remaining: 0, retryAfterSeconds: 7200 } });
    render(<InviteDialog access={{ userId: "a", role: "owner", canManageMembers: true, canInvite: true }} teams={teams} onClose={jest.fn()} onInvited={jest.fn()} />);
    fireEvent.change(screen.getByLabelText("Email addresses"), { target: { value: "ana@x.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send invitation/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Try again in 2 hours/);
    expect(single).toHaveBeenCalledWith({ email: "ana@x.com", role: "planner", teamId: null });
  });
});

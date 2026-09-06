import { fireEvent, render, screen } from "@testing-library/react";

import ProposalSuccessfullyCreate from "./ProposalSuccessfullyCreate";

// The real composer loads the proposal and sends mail; here it is a stub that
// reports which proposal it was fixed to and lets a test "send" to two vendors.
jest.mock("@/components/Email/EmailSend", () => ({
  __esModule: true,
  default: ({ proposalId, onSent }: { proposalId: string; onSent: (recipients: string[]) => void }) => (
    <div data-testid="composer" data-proposal-id={proposalId}>
      <button type="button" onClick={() => onSent(["a@vendor.example", "b@vendor.example"])}>Send invitations</button>
    </div>
  ),
}));

const baseProps = {
  proposalId: "prop-001",
  proposalTitle: "Bayshore Summit 2026",
  onBackToList: jest.fn(),
  onViewProposal: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("ProposalSuccessfullyCreate", () => {
  it("confirms publishing and moves straight on to inviting vendors", () => {
    render(<ProposalSuccessfullyCreate {...baseProps} />);
    expect(screen.getByText("Proposal published")).toBeInTheDocument();
    expect(screen.getByText(/Bayshore Summit 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Publishing emails nobody/)).toBeInTheDocument();
    // The composer is fixed to the proposal that was just published.
    expect(screen.getByTestId("composer")).toHaveAttribute("data-proposal-id", "prop-001");
    // Progress: publish done, invite current.
    const steps = screen.getAllByRole("listitem");
    expect(steps[0]).toHaveTextContent("Publish");
    expect(steps[1]).toHaveAttribute("aria-current", "step");
  });

  it("names an update as an update", () => {
    render(<ProposalSuccessfullyCreate {...baseProps} isUpdate />);
    expect(screen.getByText("Update published")).toBeInTheDocument();
  });

  it("summarises who was invited after sending and offers to invite more", () => {
    render(<ProposalSuccessfullyCreate {...baseProps} onSaveCopy={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Send invitations" }));
    expect(screen.getByText("2 vendors invited")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Invited vendors" })).toHaveTextContent("a@vendor.example");
    expect(screen.getByText(/2 vendors have been invited/)).toBeInTheDocument();
    expect(screen.queryByTestId("composer")).not.toBeInTheDocument();
    // The closing actions only appear once inviting is done or skipped.
    expect(screen.getByRole("button", { name: "View proposal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to proposal list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Invite more vendors" }));
    expect(screen.getByTestId("composer")).toBeInTheDocument();
    // A second send adds to the tally without double counting.
    fireEvent.click(screen.getByRole("button", { name: "Send invitations" }));
    expect(screen.getByText("2 vendors invited")).toBeInTheDocument();
  });

  it("lets the planner skip inviting and says plainly that nobody was invited", () => {
    render(<ProposalSuccessfullyCreate {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(screen.getByText("Vendors have not been invited")).toBeInTheDocument();
    expect(screen.getByText(/No invitations have been sent yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save a copy" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View proposal" }));
    expect(baseProps.onViewProposal).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Back to proposal list" }));
    expect(baseProps.onBackToList).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Invite vendors now" }));
    expect(screen.getByTestId("composer")).toBeInTheDocument();
  });

  it("calls onSaveCopy when Save a copy is clicked", () => {
    const onSaveCopy = jest.fn();
    render(<ProposalSuccessfullyCreate {...baseProps} onSaveCopy={onSaveCopy} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    fireEvent.click(screen.getByRole("button", { name: "Save a copy" }));
    expect(onSaveCopy).toHaveBeenCalledTimes(1);
  });
});

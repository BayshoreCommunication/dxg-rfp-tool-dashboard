import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const push = jest.fn();
const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh, replace: jest.fn() }) }));
jest.mock("@/app/actions/proposals", () => ({ copyProposalAction: jest.fn(), deleteProposalAction: jest.fn() }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() } }));
// The proposal list's own dialogs, reduced to their contract.
jest.mock("@/components/proposals/SaveCopyModal", () => ({
  __esModule: true,
  default: ({ isOpen, onConfirm, defaultEventName, defaultStartDate, defaultEndDate }: { isOpen: boolean; onConfirm: (o: { eventName: string; startDate: string; endDate: string }) => void; defaultEventName: string; defaultStartDate?: string; defaultEndDate?: string }) =>
    isOpen ? (
      <div role="dialog" aria-label="Save a Copy" data-start={defaultStartDate} data-end={defaultEndDate}>
        <button type="button" onClick={() => onConfirm({ eventName: `${defaultEventName} copy`, startDate: defaultStartDate ?? "", endDate: "" })}>Save Copy</button>
      </div>
    ) : null,
}));
jest.mock("@/components/proposals/ProposalDeletionDialog", () => ({
  __esModule: true,
  default: ({ proposalName, mode, error, onCancel, onConfirm }: { proposalName: string; mode: string; error?: string; onCancel: () => void; onConfirm: () => void }) => (
    <div role="alertdialog" aria-label={`${mode} ${proposalName}`}>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onCancel}>Cancel</button>
      <button type="button" onClick={onConfirm}>Move to archive</button>
    </div>
  ),
}));

import { toast } from "react-toastify";
import { copyProposalAction, deleteProposalAction } from "@/app/actions/proposals";
import ProposalRowActions, { type ProposalRowActionsProps } from "./ProposalRowActions";

const mockedCopy = jest.mocked(copyProposalAction);
const mockedArchive = jest.mocked(deleteProposalAction);
const ID = "a".repeat(24);
const all = { canEdit: true, canDuplicate: true, canArchive: true };

const props = (overrides: Partial<ProposalRowActionsProps> = {}): ProposalRowActionsProps => ({
  proposal: { id: ID, eventName: "Spring Gala", eventStartDate: "2027-03-01T00:00:00.000Z", eventEndDate: "2027-03-03" },
  actions: all,
  editHref: `/proposals/proposal-edit?proposalId=${ID}`,
  viewHref: `/proposal/spring-gala-${ID}`,
  usage: null,
  ...overrides,
});

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Actions for Spring Gala" }));
const choose = (name: RegExp | string) => {
  openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name }));
};

beforeEach(() => jest.clearAllMocks());

describe("ProposalRowActions", () => {
  test("offers Edit, Preview, Duplicate and Archive on a row the member may change", () => {
    render(<ProposalRowActions {...props()} />);
    openMenu();
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Edit", "Preview", "Duplicate", "Archive"]);
  });

  test("renders nothing for a row the member can only read", () => {
    const { container } = render(<ProposalRowActions {...props({ actions: { canEdit: false, canDuplicate: false, canArchive: false } })} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("shows only the actions the row allows", () => {
    render(<ProposalRowActions {...props({ actions: { canEdit: true, canDuplicate: false, canArchive: false } })} />);
    openMenu();
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Edit", "Preview"]);
  });

  test("Edit and Preview go to the edit page and the read-only page", () => {
    render(<ProposalRowActions {...props()} />);
    choose("Edit");
    expect(push).toHaveBeenLastCalledWith(`/proposals/proposal-edit?proposalId=${ID}`);
    choose("Preview");
    expect(push).toHaveBeenLastCalledWith(`/proposal/spring-gala-${ID}`);
  });

  test("Archive asks first: Cancel calls nothing, confirming archives through the existing action and reloads the list", async () => {
    mockedArchive.mockResolvedValue({ success: true, message: "Proposal archived" });
    render(<ProposalRowActions {...props()} />);
    choose("Archive");
    expect(screen.getByRole("alertdialog", { name: "archive Spring Gala" })).toBeInTheDocument();
    expect(mockedArchive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockedArchive).not.toHaveBeenCalled();

    choose("Archive");
    fireEvent.click(screen.getByRole("button", { name: "Move to archive" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(mockedArchive).toHaveBeenCalledWith(ID);
    expect(toast.success).toHaveBeenCalledWith("Proposal moved to archive.");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("a refused archive keeps the dialog open with the reason and reloads nothing", async () => {
    mockedArchive.mockResolvedValue({ success: false, message: "Your role doesn't allow this." });
    render(<ProposalRowActions {...props()} />);
    choose("Archive");
    fireEvent.click(screen.getByRole("button", { name: "Move to archive" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your role doesn't allow this.");
    expect(refresh).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  test("Duplicate opens the copy dialog with the row's name and dates and saves through the existing action", async () => {
    mockedCopy.mockResolvedValue({ success: true, message: "Proposal copied" });
    render(<ProposalRowActions {...props()} />);
    choose("Duplicate");
    const dialog = screen.getByRole("dialog", { name: "Save a Copy" });
    expect(dialog).toHaveAttribute("data-start", "2027-03-01");
    expect(dialog).toHaveAttribute("data-end", "2027-03-03");
    fireEvent.click(screen.getByRole("button", { name: "Save Copy" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(mockedCopy).toHaveBeenCalledWith(ID, { eventName: "Spring Gala copy", startDate: "2027-03-01", isDraft: false });
    expect(toast.success).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("at the plan's limit Duplicate says why and never opens the dialog or calls the backend", () => {
    const usage = { used: 2, limit: 2, atLimit: true, planName: "Free trial", onPlan: "on the free trial" };
    render(<ProposalRowActions {...props({ usage })} />);
    openMenu();
    expect(screen.getByRole("menuitem", { name: /Duplicate/ })).toHaveTextContent("Your plan's proposal limit is reached");
    fireEvent.click(screen.getByRole("menuitem", { name: /Duplicate/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/^2 of 2 /));
    expect(mockedCopy).not.toHaveBeenCalled();
  });

  test("the backend refusing a copy for the plan limit is a notice, not an error", async () => {
    mockedCopy.mockResolvedValue({ success: false, code: "PLAN_LIMIT_REACHED", message: "Your plan's limit is reached." });
    render(<ProposalRowActions {...props()} />);
    choose("Duplicate");
    fireEvent.click(screen.getByRole("button", { name: "Save Copy" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Your plan's limit is reached."));
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("any other failed copy keeps the dialog open and says so", async () => {
    mockedCopy.mockResolvedValue({ success: false, message: "Copy failed" });
    render(<ProposalRowActions {...props()} />);
    choose("Duplicate");
    fireEvent.click(screen.getByRole("button", { name: "Save Copy" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Copy failed"));
    expect(screen.getByRole("dialog", { name: "Save a Copy" })).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});

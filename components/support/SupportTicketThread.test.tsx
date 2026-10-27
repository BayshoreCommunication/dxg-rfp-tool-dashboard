import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SupportTicketThread from "./SupportTicketThread";

const refresh = jest.fn();
const replySupportTicketAction = jest.fn();
const resolveSupportTicketAction = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh }),
}));
jest.mock("@/app/actions/supportDesk", () => ({
  replySupportTicketAction: (...args: unknown[]) => replySupportTicketAction(...args),
  resolveSupportTicketAction: (...args: unknown[]) => resolveSupportTicketAction(...args),
}));
jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
const uploadSupportAttachments = jest.fn();
jest.mock("@/lib/support/attachments", () => ({
  ...jest.requireActual("@/lib/support/attachments"),
  uploadSupportAttachments: (...args: unknown[]) => uploadSupportAttachments(...args),
}));

const ticket = {
  id: "t1",
  ticketNumber: 12,
  subject: "PDF export hangs",
  category: "bug" as const,
  priority: "normal" as const,
  status: "waiting_on_customer" as const,
  messageCount: 2,
  unreadForRequester: 0,
  lastMessageAt: "2026-10-18T10:00:00.000Z",
  lastAgentMessageAt: "2026-10-18T10:00:00.000Z",
  resolvedAt: null,
  closedAt: null,
  createdAt: "2026-10-18T09:00:00.000Z",
};

const messages = [
  { id: "m1", authorRole: "customer" as const, kind: "message" as const, body: "It spins forever.", attachments: [], createdAt: "2026-10-18T09:00:00.000Z" },
  {
    id: "m2",
    authorRole: "agent" as const,
    kind: "message" as const,
    body: "Which proposal?",
    attachments: [{ id: "22222222-2222-4222-8222-222222222222", fileName: "guide.pdf", mimeType: "application/pdf", sizeBytes: 2048 }],
    createdAt: "2026-10-18T10:00:00.000Z",
  },
  { id: "m3", authorRole: "system" as const, kind: "system" as const, body: "Dana RFPilot set priority to high.", attachments: [], createdAt: "2026-10-18T10:01:00.000Z" },
];

describe("SupportTicketThread", () => {
  beforeEach(() => {
    refresh.mockReset();
    replySupportTicketAction.mockReset();
    resolveSupportTicketAction.mockReset();
    uploadSupportAttachments.mockReset();
    uploadSupportAttachments.mockResolvedValue({ ok: true, attachments: [] });
  });

  test("renders the conversation with the agent's name and status", () => {
    render(<SupportTicketThread ticket={ticket} messages={messages} assignee={{ id: "a", name: "Dana" }} />);
    expect(screen.getByRole("heading", { name: "PDF export hangs" })).toBeInTheDocument();
    expect(screen.getByText("RFPilot replied")).toBeInTheDocument();
    expect(screen.getByText("It spins forever.")).toBeInTheDocument();
    // Planners see one "RFPilot support", never an agent's name or role.
    expect(screen.getByText("RFPilot support")).toBeInTheDocument();
    expect(screen.queryByText(/Dana ·|Dana at RFPilot/)).not.toBeInTheDocument();
    expect(screen.getByText(/set priority to high/)).toBeInTheDocument();
    expect(screen.getByText(/RFPilot replied — your turn/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /guide\.pdf/ })).toHaveAttribute(
      "href",
      "/api/support/attachments/t1/22222222-2222-4222-8222-222222222222",
    );
  });

  test("tells the planner who is on it while the ticket is open", () => {
    render(<SupportTicketThread ticket={{ ...ticket, status: "open" }} messages={messages} assignee={{ id: "a", name: "Dana" }} />);
    expect(screen.getByText(/RFPilot support is on it/)).toBeInTheDocument();
    expect(screen.queryByText(/Dana ·|Dana at RFPilot/)).not.toBeInTheDocument();
    const { unmount } = render(<SupportTicketThread ticket={{ ...ticket, status: "open" }} messages={messages} assignee={null} />);
    expect(screen.getByText(/waiting for RFPilot support/)).toBeInTheDocument();
    unmount();
  });

  test("sends a reply and refreshes", async () => {
    replySupportTicketAction.mockResolvedValue({ success: true, data: {} });
    render(<SupportTicketThread ticket={ticket} messages={messages} assignee={null} />);
    fireEvent.change(screen.getByLabelText("Reply to RFPilot support"), { target: { value: "  Momentum 2027  " } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(replySupportTicketAction).toHaveBeenCalledWith("t1", "Momentum 2027", []));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  test("lets the planner mark it solved, and a resolved ticket can still be reopened by replying", async () => {
    resolveSupportTicketAction.mockResolvedValue({ success: true, data: { ...ticket, status: "resolved" } });
    const { unmount } = render(<SupportTicketThread ticket={ticket} messages={messages} assignee={null} />);
    fireEvent.click(screen.getByRole("button", { name: /This is solved/ }));
    await waitFor(() => expect(resolveSupportTicketAction).toHaveBeenCalledWith("t1"));
    unmount();

    render(
      <SupportTicketThread
        ticket={{ ...ticket, status: "resolved", resolvedAt: "2026-10-18T11:00:00.000Z" }}
        messages={messages}
        assignee={null}
      />,
    );
    expect(screen.queryByRole("button", { name: /This is solved/ })).not.toBeInTheDocument();
    // Resolved is a grace period: the planner can still reply to reopen it.
    expect(screen.getByLabelText("Reply to RFPilot support")).toHaveAttribute("placeholder", "Reply to reopen this request…");
    expect(screen.getByText(/This request is resolved\. Still need help\? Reply below to reopen it/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new request/i })).not.toBeInTheDocument();
  });

  test("shows the automatic acknowledgement as a plain RFPilot support message, never as a bot", () => {
    const withAck = [
      messages[0],
      { id: "ack", authorRole: "system" as const, kind: "message" as const, body: "Hi, thanks for contacting RFPilot support.", attachments: [], createdAt: "2026-10-18T09:00:00.001Z" },
    ];
    render(<SupportTicketThread ticket={{ ...ticket, status: "open" }} messages={withAck} assignee={{ id: "a", name: "Dana" }} />);
    expect(screen.getByText("Hi, thanks for contacting RFPilot support.")).toBeInTheDocument();
    expect(screen.getByText("RFPilot support")).toBeInTheDocument();
    expect(screen.queryByText(/automatic/i)).not.toBeInTheDocument();
    // The assigned agent did not write it, so it is not attributed to them.
    expect(screen.queryByText("Dana · RFPilot support")).not.toBeInTheDocument();
  });

  test("Enter sends, Shift+Enter does not, and the message shows as sending", async () => {
    let finish: (value: unknown) => void = () => undefined;
    replySupportTicketAction.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<SupportTicketThread ticket={ticket} messages={messages} assignee={null} />);
    const box = screen.getByLabelText("Reply to RFPilot support");
    fireEvent.change(box, { target: { value: "Line one" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(replySupportTicketAction).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(await screen.findByText("Sending…")).toBeInTheDocument();
    await waitFor(() => expect(replySupportTicketAction).toHaveBeenCalledWith("t1", "Line one", []));
    finish({ success: true, data: {} });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  test("a failed send removes the pending bubble and keeps the draft", async () => {
    replySupportTicketAction.mockResolvedValue({ success: false, message: "Nope" });
    render(<SupportTicketThread ticket={ticket} messages={messages} assignee={null} />);
    const box = screen.getByLabelText("Reply to RFPilot support");
    fireEvent.change(box, { target: { value: "Keep me" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(replySupportTicketAction).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Sending…")).not.toBeInTheDocument());
    expect(box).toHaveValue("Keep me");
  });

  test("a closed ticket is read-only", () => {
    render(
      <SupportTicketThread
        ticket={{ ...ticket, status: "closed", closedAt: "2026-10-21T11:00:00.000Z" }}
        messages={messages}
        assignee={null}
      />,
    );
    expect(screen.getByText("This request is closed.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Reply to RFPilot support")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /This is solved/ })).not.toBeInTheDocument();
  });
});

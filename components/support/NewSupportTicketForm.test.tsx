import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewSupportTicketForm from "./NewSupportTicketForm";

const push = jest.fn();
const createSupportTicketAction = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: jest.fn() }),
}));
jest.mock("@/app/actions/supportDesk", () => ({
  createSupportTicketAction: (...args: unknown[]) => createSupportTicketAction(...args),
}));
jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
const uploadSupportAttachments = jest.fn();
jest.mock("@/lib/support/attachments", () => ({
  ...jest.requireActual("@/lib/support/attachments"),
  uploadSupportAttachments: (...args: unknown[]) => uploadSupportAttachments(...args),
}));

describe("NewSupportTicketForm", () => {
  beforeEach(() => {
    push.mockReset();
    createSupportTicketAction.mockReset();
    uploadSupportAttachments.mockReset();
    uploadSupportAttachments.mockResolvedValue({ ok: true, attachments: [] });
  });

  test("validates locally before contacting the backend", () => {
    render(<NewSupportTicketForm />);
    fireEvent.click(screen.getByRole("button", { name: /Send to DXG support/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Give your request a short subject.");
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Export" } });
    fireEvent.click(screen.getByRole("button", { name: /Send to DXG support/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Tell us what happened so we can help.");
    expect(createSupportTicketAction).not.toHaveBeenCalled();
  });

  test("sends subject, category, and body, then opens the new ticket", async () => {
    createSupportTicketAction.mockResolvedValue({
      success: true,
      data: { ticket: { id: "abc", ticketNumber: 4 }, message: { id: "m" } },
    });
    render(<NewSupportTicketForm />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "  Vendors say the link expired  " } });
    fireEvent.click(screen.getByLabelText(/Vendors & email/));
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "Three vendors reported it today." } });
    fireEvent.click(screen.getByRole("button", { name: /Send to DXG support/ }));
    await waitFor(() =>
      expect(createSupportTicketAction).toHaveBeenCalledWith({
        subject: "Vendors say the link expired",
        category: "vendor_email",
        body: "Three vendors reported it today.",
        attachments: [],
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/support/abc"));
  });

  test("uploads chosen files first and cites their ids", async () => {
    uploadSupportAttachments.mockResolvedValue({
      ok: true,
      attachments: [{ id: "11111111-1111-4111-8111-111111111111", fileName: "shot.png", mimeType: "image/png", sizeBytes: 5 }],
    });
    createSupportTicketAction.mockResolvedValue({ success: true, data: { ticket: { id: "t", ticketNumber: 1 }, message: {} } });
    render(<NewSupportTicketForm />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Export" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "Stuck" } });
    fireEvent.change(screen.getByLabelText(/Attach screenshot or PDF/), {
      target: { files: [new File(["x"], "shot.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send to DXG support/ }));
    await waitFor(() =>
      expect(createSupportTicketAction).toHaveBeenCalledWith(
        expect.objectContaining({ attachments: ["11111111-1111-4111-8111-111111111111"] }),
      ),
    );
    expect(uploadSupportAttachments).toHaveBeenCalledTimes(1);
  });

  test("stops when the upload is rejected", async () => {
    uploadSupportAttachments.mockResolvedValue({ ok: false, message: "shot.png was rejected by the malware scanner." });
    render(<NewSupportTicketForm />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Export" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "Stuck" } });
    fireEvent.click(screen.getByRole("button", { name: /Send to DXG support/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/malware scanner/));
    expect(createSupportTicketAction).not.toHaveBeenCalled();
  });

  test("shows the backend message when creation fails", async () => {
    createSupportTicketAction.mockResolvedValue({ success: false, message: "Too many requests. Try again later." });
    render(<NewSupportTicketForm />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "y" } });
    fireEvent.click(screen.getByRole("button", { name: /Send to DXG support/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Too many requests. Try again later."));
    expect(push).not.toHaveBeenCalled();
  });
});

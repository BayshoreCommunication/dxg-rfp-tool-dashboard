import { createManualVendorResponseAction } from "@/app/actions/vendorResponse";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "react-toastify";
import ManualVendorResponseDialog from "./ManualVendorResponseDialog";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("@/app/actions/vendorResponse", () => ({
  createManualVendorResponseAction: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const recordAction = jest.mocked(createManualVendorResponseAction);

const openDialog = () =>
  fireEvent.click(screen.getByRole("button", { name: /add response manually/i }));

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/vendor or company/i), {
    target: { value: "Apex AV" },
  });
  fireEvent.change(screen.getByLabelText(/sent by/i), {
    target: { value: "Avery Vendor" },
  });
  fireEvent.change(screen.getByLabelText(/vendor email/i), {
    target: { value: "sales@apex.example" },
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  recordAction.mockResolvedValue({
    success: true,
    message: "The vendor response was recorded.",
    responseId: "response-1",
    versionNumber: 1,
    isUpdate: false,
    extractionStarted: false,
  });
});

it("records a response and refreshes the proposal page", async () => {
  render(<ManualVendorResponseDialog proposalId="proposal-1" existingVendors={[]} />);
  openDialog();
  fillRequiredFields();
  fireEvent.change(screen.getByLabelText(/notes/i), {
    target: { value: "Received by email." },
  });
  fireEvent.click(screen.getByRole("button", { name: /record response/i }));

  await waitFor(() => expect(recordAction).toHaveBeenCalledTimes(1));
  const payload = recordAction.mock.calls[0][0];
  expect(payload.get("proposalId")).toBe("proposal-1");
  expect(payload.get("vendorName")).toBe("Apex AV");
  expect(payload.get("email")).toBe("sales@apex.example");
  expect(payload.get("message")).toBe("Received by email.");
  expect(payload.get("submissionIdempotencyKey")).toEqual(expect.any(String));
  expect(payload.get("submissionReason")).toBeNull();
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(toast.success).toHaveBeenCalledWith("The vendor response was recorded.");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("leaves page focus alone until the dialog has actually been opened", () => {
  render(<ManualVendorResponseDialog proposalId="proposal-1" existingVendors={[]} />);
  expect(document.body).toHaveFocus();

  openDialog();
  expect(screen.getByLabelText(/vendor or company/i)).toHaveFocus();

  fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
  expect(screen.getByRole("button", { name: /add response manually/i })).toHaveFocus();
});

it("says the sources are being read when extraction was queued", async () => {
  recordAction.mockResolvedValue({
    success: true,
    message: "The vendor response was recorded.",
    responseId: "response-1",
    versionNumber: 1,
    isUpdate: false,
    extractionStarted: true,
  });
  render(<ManualVendorResponseDialog proposalId="proposal-1" existingVendors={[]} />);
  openDialog();
  fillRequiredFields();
  fireEvent.click(screen.getByRole("button", { name: /record response/i }));

  await waitFor(() =>
    expect(toast.success).toHaveBeenCalledWith(
      "The vendor response was recorded. Reading the attached sources now.",
    ),
  );
});

it("blocks an incomplete response before it reaches the server", async () => {
  render(<ManualVendorResponseDialog proposalId="proposal-1" existingVendors={[]} />);
  openDialog();
  fireEvent.change(screen.getByLabelText(/vendor email/i), {
    target: { value: "not-an-email" },
  });
  fireEvent.click(screen.getByRole("button", { name: /record response/i }));

  expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
  expect(screen.getByText(/enter the vendor or company name/i)).toBeInTheDocument();
  expect(recordAction).not.toHaveBeenCalled();
});

it("announces the next version and sends a reason for a vendor that already responded", async () => {
  render(
    <ManualVendorResponseDialog
      proposalId="proposal-1"
      existingVendors={[
        { email: "sales@apex.example", vendorName: "Apex AV", versionNumber: 2 },
      ]}
    />,
  );
  openDialog();
  fillRequiredFields();

  expect(screen.getByText(/becomes version 3 for Apex AV/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/why is there a new version/i), {
    target: { value: "bafo" },
  });
  fireEvent.click(screen.getByRole("button", { name: /record response/i }));

  await waitFor(() => expect(recordAction).toHaveBeenCalledTimes(1));
  expect(recordAction.mock.calls[0][0].get("submissionReason")).toBe("bafo");
});

it("keeps the dialog open and shows why the server refused the response", async () => {
  recordAction.mockResolvedValue({
    success: false,
    message: "You don't have access to this proposal.",
  });
  render(<ManualVendorResponseDialog proposalId="proposal-1" existingVendors={[]} />);
  openDialog();
  fillRequiredFields();
  fireEvent.click(screen.getByRole("button", { name: /record response/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "You don't have access to this proposal.",
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(refresh).not.toHaveBeenCalled();
});

it("rejects an attachment over the size limit without dropping the rest", () => {
  render(<ManualVendorResponseDialog proposalId="proposal-1" existingVendors={[]} />);
  openDialog();
  const input = screen.getByLabelText(/attach vendor files/i);
  fireEvent.change(input, {
    target: {
      files: [
        new File([new Uint8Array(11 * 1024 * 1024)], "huge.pdf"),
        new File(["quote"], "quote.pdf"),
      ],
    },
  });

  expect(screen.getByText(/huge\.pdf exceeds the 10 MB limit/i)).toBeInTheDocument();
  expect(screen.getByText("quote.pdf")).toBeInTheDocument();
});

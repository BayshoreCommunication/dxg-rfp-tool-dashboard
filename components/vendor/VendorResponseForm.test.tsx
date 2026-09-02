import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import VendorResponseForm from "./VendorResponseForm";

const defaultProps = {
  slug: "general-av-services-rfp-6a7aa6f2c7e1575700216e0a",
  proposalId: "6a7aa6f2c7e1575700216e0a",
  proposalTitle: "General AV Services RFP",
};

const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  global.fetch = mockFetch as typeof fetch;
});

describe("VendorResponseForm", () => {
  it("presents the proposal context and three clear response sections", () => {
    render(<VendorResponseForm {...defaultProps} />);

    expect(screen.getByRole("heading", { name: "Submit your proposal" })).toBeInTheDocument();
    expect(screen.getByText("General AV Services RFP")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contact information" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Proposal details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Supporting documents" })).toBeInTheDocument();
    expect(screen.getByText("Secure response portal")).toBeInTheDocument();
  });

  it("shows field-level guidance and focuses the first invalid field", async () => {
    render(<VendorResponseForm {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit response" }));

    expect(await screen.findByText("Enter your company or vendor name.")).toBeInTheDocument();
    expect(screen.getByText("Enter the name of the person submitting this response.")).toBeInTheDocument();
    expect(screen.getByText("Enter the email address that should receive confirmation.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/company \/ vendor name/i)).toHaveFocus());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("accepts drag-and-drop files, shows readiness, and supports removal", () => {
    render(<VendorResponseForm {...defaultProps} />);
    const file = new File(["pricing"], "pricing.pdf", { type: "application/pdf", lastModified: 123 });

    fireEvent.drop(screen.getByTestId("vendor-file-dropzone"), {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText("pricing.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Ready to upload/)).toBeInTheDocument();
    expect(screen.getByText("1 / 10 new files")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove pricing.pdf" }));
    expect(screen.queryByText("pricing.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("0 / 10 new files")).toBeInTheDocument();
  });

  it("explains why oversized and duplicate files are not added", () => {
    render(<VendorResponseForm {...defaultProps} />);
    const validFile = new File(["quote"], "quote.pdf", { type: "application/pdf", lastModified: 456 });
    const oversizedFile = new File(["video"], "show-video.mp4", { type: "video/mp4", lastModified: 789 });
    Object.defineProperty(oversizedFile, "size", { value: 10 * 1024 * 1024 + 1 });

    fireEvent.drop(screen.getByTestId("vendor-file-dropzone"), {
      dataTransfer: { files: [validFile, oversizedFile] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("show-video.mp4 exceeded the 10 MB limit");

    fireEvent.drop(screen.getByTestId("vendor-file-dropzone"), {
      dataTransfer: { files: [validFile] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("quote.pdf was already selected");
    expect(screen.getAllByText("quote.pdf")).toHaveLength(1);
  });

  it("submits valid values and shows a useful confirmation state", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({
        success: true,
        isUpdate: false,
        submission: {
          submissionId: "submission-1",
          versionId: "version-1",
          versionNumber: 1,
          receivedAt: "2026-08-12T10:00:00.000Z",
          manifestChecksum: "a".repeat(64),
        },
      }),
    });
    render(<VendorResponseForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/company \/ vendor name/i), { target: { value: "Acme AV" } });
    fireEvent.change(screen.getByLabelText(/submitted by/i), { target: { value: "Jordan Lee" } });
    fireEvent.change(screen.getByLabelText(/response contact email/i), { target: { value: "jordan@acme.test" } });
    fireEvent.change(screen.getByLabelText(/message or executive summary/i), { target: { value: "Complete AV proposal attached." } });
    fireEvent.submit(screen.getByRole("form", { name: "Submit vendor response" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [, request] = mockFetch.mock.calls[0];
    expect(request.method).toBe("POST");
    expect(request.body).toBeInstanceOf(FormData);
    expect((request.body as FormData).get("submissionIdempotencyKey")).toEqual(expect.any(String));
    expect((request.body as FormData).get("submissionReason")).toBe("initial");
    expect(await screen.findByRole("heading", { name: "Thank you, Jordan Lee." })).toBeInTheDocument();
    expect(screen.getByText("Confirmation sent to jordan@acme.test")).toBeInTheDocument();
    expect(screen.getByText("version-1")).toBeInTheDocument();
  });

  it("allows an invited vendor to use a different response contact email", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ alreadySubmitted: false, existingResponse: null }),
    });
    render(<VendorResponseForm {...defaultProps} initialEmail="invited@acme.test" />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const contactEmail = screen.getByLabelText(/response contact email/i);
    expect(contactEmail).toHaveValue("invited@acme.test");
    expect(screen.getByText(/can be different from the email address that received the invitation/i)).toBeInTheDocument();

    fireEvent.change(contactEmail, { target: { value: "proposals@acme.test" } });
    expect(contactEmail).toHaveValue("proposals@acme.test");
  });

  it("loads an existing response into update mode", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        alreadySubmitted: true,
        existingResponse: {
          _id: "response-1",
          vendorName: "Acme AV",
          submittedBy: "Jordan Lee",
          email: "jordan@acme.test",
          message: "Original response",
          documents: [{ name: "quote.pdf", url: "https://files.test/quote.pdf" }],
          updatedAt: "2026-08-10T10:00:00.000Z",
          currentVersionNumber: 3,
          currentVersionId: "version-3",
        },
      }),
    });

    render(<VendorResponseForm {...defaultProps} initialEmail="jordan@acme.test" />);

    expect(await screen.findByRole("heading", { name: "Update your proposal" })).toBeInTheDocument();
    expect(screen.getByText("We found your earlier response")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Acme AV")).toBeInTheDocument();
    expect(screen.getByText(/current response is version 3/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit version 4" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open quote.pdf" })).toHaveAttribute("href", "https://files.test/quote.pdf");
  });

  it("surfaces an invalid invitation before the vendor tries to upload", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: "This invitation link is no longer valid.",
      }),
    });

    render(<VendorResponseForm {...defaultProps} initialEmail="invited@acme.test" accessGrant="expired-grant" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("This invitation link is no longer valid.");
  });

  it("reuses one idempotency key when an uncertain submission is retried", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("connection lost"))
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          isUpdate: false,
          isReplay: true,
          submission: {
            submissionId: "submission-1",
            versionId: "version-1",
            versionNumber: 1,
            receivedAt: "2026-08-12T10:00:00.000Z",
            manifestChecksum: "a".repeat(64),
          },
        }),
      });
    render(<VendorResponseForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/company \/ vendor name/i), { target: { value: "Acme AV" } });
    fireEvent.change(screen.getByLabelText(/submitted by/i), { target: { value: "Jordan Lee" } });
    fireEvent.change(screen.getByLabelText(/response contact email/i), { target: { value: "jordan@acme.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit response" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not reach the server");

    fireEvent.click(screen.getByRole("button", { name: "Submit response" }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    const firstKey = (mockFetch.mock.calls[0][1].body as FormData).get("submissionIdempotencyKey");
    const secondKey = (mockFetch.mock.calls[1][1].body as FormData).get("submissionIdempotencyKey");
    expect(firstKey).toBeTruthy();
    expect(secondKey).toBe(firstKey);
  });
});

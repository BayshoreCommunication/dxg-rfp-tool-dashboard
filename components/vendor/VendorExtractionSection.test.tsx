import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createEvidenceExtractionAction,
  getEvidenceExtractionsAction,
} from "@/app/actions/evidenceExtraction";
import VendorExtractionSection from "./VendorExtractionSection";

jest.mock("@/app/actions/evidenceExtraction", () => ({
  createEvidenceExtractionAction: jest.fn(),
  getEvidenceExtractionsAction: jest.fn(),
}));

const getExtraction = jest.mocked(getEvidenceExtractionsAction);
const createExtraction = jest.mocked(createEvidenceExtractionAction);
const props = {
  proposalId: "6a7ad926334f978be434d136",
  submissionId: "6a7ad926334f978be434d137",
  versionId: "6a7ad926334f978be434d138",
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => "11111111-1111-4111-8111-111111111111",
  });
});

it("renders bounded evidence with its source locator and checksum-reuse state", async () => {
  getExtraction.mockResolvedValue({
    success: true,
    data: {
      status: "ready",
      runs: [{
        runId: "run-1",
        jobId: null,
        sourceKind: "document",
        sourceLabel: "Technical response.pdf",
        mimeType: "application/pdf",
        status: "succeeded",
        method: "native_with_ocr",
        coverage: 1,
        fragmentCount: 12,
        tableCount: 1,
        pageCount: 3,
        warnings: [],
        reused: true,
        preview: [{
          ordinal: 0,
          kind: "paragraph",
          content: "The show caller and technical director are assigned for all general sessions.",
          locator: { page: 2 },
          trustClass: "untrusted_vendor_content",
        }],
        createdAt: "2026-08-12T10:00:00.000Z",
        completedAt: "2026-08-12T10:01:00.000Z",
      }],
    },
  });
  render(<VendorExtractionSection {...props} />);
  expect(await screen.findByText("Technical response.pdf")).toBeInTheDocument();
  expect(screen.getByText(/checksum reused/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Preview extracted evidence"));
  expect(screen.getByText("page 2")).toBeInTheDocument();
  expect(screen.getByText(/show caller and technical director/)).toBeInTheDocument();
});

it("starts extraction only after the planner confirms with the button", async () => {
  getExtraction
    .mockResolvedValueOnce({ success: true, data: { status: "not_started", runs: [] } })
    .mockResolvedValueOnce({ success: true, data: { status: "processing", runs: [] } });
  createExtraction.mockResolvedValue({ success: true, data: { runs: [], unavailable: [] } });
  render(<VendorExtractionSection {...props} />);
  const button = await screen.findByRole("button", { name: "Extract evidence" });
  await waitFor(() => expect(button).toBeEnabled());
  expect(createExtraction).not.toHaveBeenCalled();
  fireEvent.click(button);
  await waitFor(() => expect(createExtraction).toHaveBeenCalledWith(
    props.proposalId,
    props.submissionId,
    props.versionId,
    expect.any(String),
  ));
});

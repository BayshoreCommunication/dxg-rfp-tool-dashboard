import { fireEvent, render, screen } from "@testing-library/react";
import PrivateDocumentStatusPanel from "./PrivateDocumentStatusPanel";

jest.mock("@/app/actions/durableJobs", () => ({
  completePrivateUpload: jest.fn(), createPrivateUploadSession: jest.fn(), createSourceScanJob: jest.fn(), getDurableJob: jest.fn(),
  listPrivateDocumentSources: jest.fn().mockResolvedValue({ success: true, data: [], correlationId: "test-correlation" }),
}));

describe("PrivateDocumentStatusPanel", () => {
  beforeEach(() => window.sessionStorage.clear());

  test("provides accessible file guidance and prevents empty submission", () => {
    render(<PrivateDocumentStatusPanel proposalId="507f1f77bcf86cd799439011" />);
    expect(screen.getByRole("heading", { name: /private document security check/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Reference file")).toHaveAttribute("accept", ".pdf,.docx,.xlsx,.csv,.txt");
    expect(screen.getByRole("button", { name: "Upload and check" })).toBeDisabled();
  });

  test("enables the action after an approved file is selected", () => {
    render(<PrivateDocumentStatusPanel proposalId="507f1f77bcf86cd799439011" />);
    const file = new File(["safe synthetic fixture"], "fixture.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Reference file"), { target: { files: [file] } });
    expect(screen.getByRole("button", { name: "Upload and check" })).toBeEnabled();
  });
});

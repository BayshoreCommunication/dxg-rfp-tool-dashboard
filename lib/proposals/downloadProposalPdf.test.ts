import { proposalPdfFilename } from "./downloadProposalPdf";

describe("proposalPdfFilename", () => {
  it("creates a safe PDF filename from the proposal title", () => {
    expect(proposalPdfFilename("  LA Seminar 2026! ")).toBe(
      "la-seminar-2026-rfp.pdf",
    );
  });

  it("falls back when the title has no usable characters", () => {
    expect(proposalPdfFilename("***")).toBe("proposal-rfp.pdf");
  });
});

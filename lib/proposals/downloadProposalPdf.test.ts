import { fitPageToA4, proposalPdfFilename } from "./downloadProposalPdf";

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

describe("fitPageToA4", () => {
  it("keeps an A4 page at full size", () => {
    expect(fitPageToA4(210, 297)).toEqual({
      width: 210,
      height: 297,
      x: 0,
      y: 0,
    });
  });

  it("fits an over-height page without cropping or stretching", () => {
    const result = fitPageToA4(210, 320);
    expect(result.height).toBe(297);
    expect(result.width).toBeCloseTo(194.90625);
    expect(result.x).toBeCloseTo(7.546875);
    expect(result.y).toBe(0);
  });
});

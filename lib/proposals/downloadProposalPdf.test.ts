import {
  fitPageToA4,
  preparePageCloneForPdf,
  proposalPdfFilename,
} from "./downloadProposalPdf";

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

describe("preparePageCloneForPdf", () => {
  it("keeps long page content in flow and prevents footer overlap", () => {
    const page = document.createElement("section");
    const footer = document.createElement("footer");
    footer.className = "footer";
    footer.style.position = "absolute";
    page.appendChild(footer);

    preparePageCloneForPdf(page);

    expect(page.style.display).toBe("flex");
    expect(page.style.flexDirection).toBe("column");
    expect(page.style.height).toBe("auto");
    expect(page.style.minHeight).toBe("297mm");
    expect(page.style.overflow).toBe("visible");
    expect(footer.style.position).toBe("static");
    expect(footer.style.marginTop).toBe("auto");
    expect(footer.style.flexShrink).toBe("0");
  });
});

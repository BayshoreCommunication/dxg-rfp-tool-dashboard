import {
  downloadProposalPdf,
  fitPageToA4,
  proposalPdfFilename,
} from "./downloadProposalPdf";

const html2canvasMock = jest.fn();
const saveMock = jest.fn();

jest.mock("html2canvas", () => ({
  __esModule: true,
  default: (...args: unknown[]) => html2canvasMock(...args),
}));

jest.mock("jspdf", () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addPage: jest.fn(),
    setFillColor: jest.fn(),
    rect: jest.fn(),
    addImage: jest.fn(),
    save: saveMock,
  })),
}));

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

describe("downloadProposalPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    html2canvasMock.mockResolvedValue({
      width: 794,
      height: 1123,
      toDataURL: () => "data:image/jpeg;base64,test",
    });
  });

  it("captures every proposal page in document coordinates", async () => {
    const container = document.createElement("div");
    container.innerHTML = '<div class="rfp-root"><div class="page"></div></div>';
    const page = container.querySelector<HTMLElement>(".page")!;
    Object.defineProperties(page, {
      scrollWidth: { value: 794 },
      scrollHeight: { value: 1123 },
    });
    page.getBoundingClientRect = () =>
      ({ width: 794, height: 1123 }) as DOMRect;

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 1800,
    });

    await downloadProposalPdf(container, "proposal-rfp.pdf");

    const capturedPage = html2canvasMock.mock.calls[0][0] as HTMLElement;
    expect(capturedPage).not.toBe(page);
    expect(capturedPage.classList).toContain("page");
    expect(html2canvasMock).toHaveBeenCalledWith(
      capturedPage,
      expect.objectContaining({ scrollX: 0, scrollY: 0 }),
    );
    expect(document.body.querySelector(".rfp-root .page")).toBeNull();
    expect(saveMock).toHaveBeenCalledWith("proposal-rfp.pdf");
  });
});

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export const fitPageToA4 = (width: number, height: number) => {
  if (width <= 0 || height <= 0) {
    return { width: A4_WIDTH_MM, height: A4_HEIGHT_MM, x: 0, y: 0 };
  }

  const scale = Math.min(A4_WIDTH_MM / width, A4_HEIGHT_MM / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;

  return {
    width: fittedWidth,
    height: fittedHeight,
    x: (A4_WIDTH_MM - fittedWidth) / 2,
    y: (A4_HEIGHT_MM - fittedHeight) / 2,
  };
};

const waitForPageAssets = async (pages: HTMLElement[]) => {
  await document.fonts?.ready;
  const images = pages.flatMap((page) =>
    Array.from(page.querySelectorAll<HTMLImageElement>("img")),
  );
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
};

const createCapturePage = (page: HTMLElement, width: number, height: number) => {
  const stage = document.createElement("div");
  stage.className = "rfp-root";
  Object.assign(stage.style, {
    position: "fixed",
    top: "0",
    left: `${-(width + 100)}px`,
    width: `${width}px`,
    height: `${height}px`,
    overflow: "hidden",
    pointerEvents: "none",
    background: "#ffffff",
  });

  const capturePage = page.cloneNode(true) as HTMLElement;
  Object.assign(capturePage.style, {
    width: `${width}px`,
    height: `${height}px`,
    minHeight: `${height}px`,
    margin: "0",
  });
  stage.append(capturePage);
  document.body.append(stage);

  return {
    page: capturePage,
    remove: () => stage.remove(),
  };
};

export const proposalPdfFilename = (title?: string) => {
  const safeTitle = (title || "proposal")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safeTitle || "proposal"}-rfp.pdf`;
};

export const downloadProposalPdf = async (
  container: HTMLElement,
  filename: string,
) => {
  const pages = Array.from(
    container.querySelectorAll<HTMLElement>(".rfp-root .page"),
  );
  if (pages.length === 0) {
    throw new Error("Proposal pages are not available.");
  }

  await waitForPageAssets(pages);

  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const bounds = page.getBoundingClientRect();
    const captureWidth = Math.ceil(Math.max(bounds.width, page.scrollWidth));
    const captureHeight = Math.ceil(Math.max(bounds.height, page.scrollHeight));
    const capture = createCapturePage(page, captureWidth, captureHeight);
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(capture.page, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (element) => element.classList.contains("no-print"),
      });
    } finally {
      capture.remove();
    }

    const fitted = fitPageToA4(canvas.width, canvas.height);

    if (index > 0) pdf.addPage("a4", "portrait");
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, "F");
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.94),
      "JPEG",
      fitted.x,
      fitted.y,
      fitted.width,
      fitted.height,
      undefined,
      "FAST",
    );
  }

  pdf.save(filename);
};

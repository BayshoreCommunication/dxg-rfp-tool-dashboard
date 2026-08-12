const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

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
    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      ignoreElements: (element) => element.classList.contains("no-print"),
    });

    if (index > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.94),
      "JPEG",
      0,
      0,
      A4_WIDTH_MM,
      A4_HEIGHT_MM,
      undefined,
      "FAST",
    );
  }

  pdf.save(filename);
};

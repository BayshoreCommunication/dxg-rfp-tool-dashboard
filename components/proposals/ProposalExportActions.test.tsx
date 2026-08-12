import { downloadProposalPdf } from "@/lib/proposals/downloadProposalPdf";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProposalExportActions from "./ProposalExportActions";

jest.mock("@/lib/proposals/downloadProposalPdf", () => ({
  downloadProposalPdf: jest.fn().mockResolvedValue(undefined),
  proposalPdfFilename: (title?: string) =>
    `${(title || "proposal").toLowerCase().replace(/\s+/g, "-")}-rfp.pdf`,
}));

describe("ProposalExportActions", () => {
  const proposal = {
    event: { eventName: "LA Seminar" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("places direct PDF download above the print action", () => {
    const container = document.createElement("div");
    render(
      <ProposalExportActions
        proposal={proposal}
        containerRef={{ current: container }}
      />,
    );

    const downloadButton = screen.getByRole("button", {
      name: "Download PDF",
    });
    const printButton = screen.getByRole("button", { name: "Print" });
    expect(
      downloadButton.compareDocumentPosition(printButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("downloads without opening print and keeps print as a separate action", async () => {
    const container = document.createElement("div");
    const print = jest.spyOn(window, "print").mockImplementation(() => {});
    render(
      <ProposalExportActions
        proposal={proposal}
        containerRef={{ current: container }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => {
      expect(downloadProposalPdf).toHaveBeenCalledWith(
        container,
        "la-seminar-rfp.pdf",
      );
    });
    expect(print).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});

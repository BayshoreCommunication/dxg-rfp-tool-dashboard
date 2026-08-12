import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProposalExportActions from "./ProposalExportActions";

jest.mock("@/lib/proposals/downloadProposalPdf", () => ({
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
    render(
      <ProposalExportActions proposal={proposal} />,
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
    const print = jest.spyOn(window, "print").mockImplementation(() => {});
    const linkClick = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<ProposalExportActions proposal={proposal} />);

    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(linkClick).toHaveBeenCalledTimes(1));
    expect(print).not.toHaveBeenCalled();

    const printButton = screen.getByRole("button", { name: "Print" });
    await waitFor(() => expect(printButton).toBeEnabled());
    fireEvent.click(printButton);
    expect(print).toHaveBeenCalledTimes(1);
    linkClick.mockRestore();
    print.mockRestore();
  });
});

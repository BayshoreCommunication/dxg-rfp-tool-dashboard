import { fireEvent, render, screen, within } from "@testing-library/react";
import ResponseDocumentList, { displayFileName, documentKind, formatFileSize } from "./ResponseDocumentList";

const doc = (overrides: Record<string, unknown>) => ({
  name: "file.pdf",
  url: "https://files.example.test/file.pdf",
  documentId: "d1",
  mimeType: "application/pdf",
  sizeBytes: 2048,
  scanStatus: "clean" as const,
  purposeId: "insurance",
  scopeType: "proposal" as const,
  scopeId: null,
  versionDisposition: "added" as const,
  inheritedFromVersionId: null,
  ...overrides,
});

const context = {
  purposeLabel: (id: string | null | undefined) => (id === "insurance" ? "Certificate of insurance" : "Other proposal document"),
  scopeLabel: () => "Whole proposal",
};

describe("ResponseDocumentList", () => {
  it("shows the vendor's file name without the storage UUID prefix", () => {
    expect(displayFileName("80ce8bb1-6084-410a-a282-52dedd9c9b61-Screenshot_2026-11-12.png")).toBe("Screenshot_2026-11-12.png");
    expect(displayFileName("northstar-leadership-summit-2027-rfp.pdf")).toBe("northstar-leadership-summit-2027-rfp.pdf");
  });

  it("recognises file kinds from the MIME type or the extension", () => {
    expect(documentKind("image/png", "a.png")).toBe("image");
    expect(documentKind("application/pdf", "a")).toBe("pdf");
    expect(documentKind("application/octet-stream", "rider.docx")).toBe("word");
    expect(documentKind("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "x")).toBe("sheet");
    expect(documentKind("", "deck.pptx")).toBe("slides");
    expect(documentKind("application/zip", "bundle.zip")).toBe("other");
    expect(formatFileSize(604)).toBe("604 B");
    expect(formatFileSize(40_707)).toBe("40 KB");
    expect(formatFileSize(5.3 * 1024 * 1024)).toBe("5.3 MB");
    expect(formatFileSize(null)).toBe("");
  });

  it("lists each file with category, scope, version and scan state, required categories first", () => {
    render(
      <ResponseDocumentList
        context={context}
        documents={[
          doc({ documentId: "o", name: "agenda.xlsx", purposeId: "other", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", scanStatus: "skipped", versionDisposition: "inherited" }),
          doc({ documentId: "i", name: "coi.pdf" }),
        ]}
      />,
    );
    const rows = within(screen.getByTestId("response-documents")).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("coi.pdf");
    expect(rows[0]).toHaveTextContent("Certificate of insurance");
    expect(rows[0]).toHaveTextContent("Scanned · clean");
    expect(rows[1]).toHaveTextContent("Excel spreadsheet");
    expect(rows[1]).toHaveTextContent("Carried over");
    expect(rows[1]).toHaveTextContent("Not scanned");
    expect(screen.getByRole("link", { name: "Open coi.pdf" })).toHaveAttribute("href", "https://files.example.test/file.pdf");
  });

  it("previews images and falls back to an icon when the preview cannot load", () => {
    const { container } = render(
      <ResponseDocumentList context={context} documents={[doc({ name: "stage.png", mimeType: "image/png" })]} />,
    );
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://files.example.test/file.pdf");
    fireEvent.error(image!);
    expect(container.querySelector("img")).toBeNull();
  });

  it("offers no open link for a file without a safe URL", () => {
    render(<ResponseDocumentList context={context} documents={[doc({ url: "" })]} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("file.pdf")).toBeInTheDocument();
  });

  it("says when nothing was attached", () => {
    render(<ResponseDocumentList context={context} documents={[]} />);
    expect(screen.getByText("No documents attached.")).toBeInTheDocument();
  });
});

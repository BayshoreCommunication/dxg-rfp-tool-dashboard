import { fireEvent, render, screen } from "@testing-library/react";
import AttachmentPicker from "./AttachmentPicker";

const makeFile = (name: string, type: string, size: number) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("AttachmentPicker", () => {
  test("accepts images and PDFs, rejects other types and oversized files", () => {
    const onChange = jest.fn();
    render(<AttachmentPicker files={[]} onChange={onChange} />);
    const input = screen.getByLabelText(/Attach screenshot or PDF/) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          makeFile("shot.png", "image/png", 2048),
          makeFile("malware.exe", "application/x-msdownload", 10),
          makeFile("huge.pdf", "application/pdf", 11 * 1024 * 1024),
        ],
      },
    });
    const accepted = onChange.mock.calls[0][0] as File[];
    expect(accepted.map((file) => file.name)).toEqual(["shot.png"]);
    expect(screen.getByRole("alert")).toHaveTextContent(/huge\.pdf/);
  });

  test("caps the selection at three files and lets the user remove one", () => {
    const onChange = jest.fn();
    const existing = [makeFile("a.png", "image/png", 1), makeFile("b.png", "image/png", 1), makeFile("c.png", "image/png", 1)];
    render(<AttachmentPicker files={existing} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Attach screenshot or PDF/), {
      target: { files: [makeFile("d.png", "image/png", 1)] },
    });
    expect((onChange.mock.calls[0][0] as File[]).length).toBe(3);
    expect(screen.getByRole("alert")).toHaveTextContent("At most 3 attachments per message.");
    fireEvent.click(screen.getByRole("button", { name: "Remove b.png" }));
    expect((onChange.mock.calls[1][0] as File[]).map((file) => file.name)).toEqual(["a.png", "c.png"]);
  });
});

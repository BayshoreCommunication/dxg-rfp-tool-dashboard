import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ProposalEntry, { type ProposalEntryProps } from "./ProposalEntry";

const baseProps = (overrides: Partial<ProposalEntryProps> = {}): ProposalEntryProps => ({
  greeting: "Good Morning, Sam",
  composer: <textarea aria-label="Message the proposal assistant" />,
  onExample: jest.fn(),
  onUpload: jest.fn(),
  onScratch: jest.fn(),
  exampleBusy: false,
  attachDisabled: false,
  attachDisabledTitle: "You can attach up to 3 files per message.",
  starterError: null,
  acceptedLabel: "PDF, DOCX, XLSX, CSV or TXT",
  maxFiles: 3,
  ...overrides,
});

describe("ProposalEntry", () => {
  test("shows the greeting, the product definition, the starters and the composer slot", () => {
    render(<ProposalEntry {...baseProps()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Good Morning, Sam" })).toBeInTheDocument();
    expect(screen.getByTestId("assistant-product-definition")).toHaveTextContent(/AV production proposal/);
    const starters = screen.getByRole("group", { name: "Ways to start" });
    expect(starters.querySelectorAll("button")).toHaveLength(3);
    expect(screen.getByLabelText("Message the proposal assistant")).toBeInTheDocument();
    expect(screen.getByTestId("attachment-caption")).toHaveTextContent("PDF, DOCX, XLSX, CSV or TXT, up to 3 per message.");
  });

  test("each starter calls its handler", async () => {
    const props = baseProps();
    render(<ProposalEntry {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Try an example brief" }));
    await userEvent.click(screen.getByRole("button", { name: "Upload my brief or old proposal" }));
    await userEvent.click(screen.getByRole("button", { name: "Describe it from scratch" }));
    expect(props.onExample).toHaveBeenCalledTimes(1);
    expect(props.onUpload).toHaveBeenCalledTimes(1);
    expect(props.onScratch).toHaveBeenCalledTimes(1);
  });

  test("starter hints are exposed as descriptions, not only as tooltips", () => {
    render(<ProposalEntry {...baseProps()} />);
    expect(screen.getByRole("button", { name: "Try an example brief" })).toHaveAccessibleDescription(/fictional summit brief/);
    expect(screen.getByRole("button", { name: "Upload my brief or old proposal" })).toHaveAccessibleDescription("PDF, DOCX, XLSX, CSV or TXT");
    expect(screen.getByRole("button", { name: "Describe it from scratch" })).toHaveAccessibleDescription(/sample description/);
  });

  test("when attaching is blocked the file starters are disabled and say why", () => {
    render(<ProposalEntry {...baseProps({ attachDisabled: true })} />);
    expect(screen.getByRole("button", { name: "Try an example brief" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload my brief or old proposal" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload my brief or old proposal" })).toHaveAccessibleDescription(/up to 3 files/);
    expect(screen.getByRole("button", { name: "Describe it from scratch" })).toBeEnabled();
  });

  test("a busy example starter is marked busy and disabled", () => {
    render(<ProposalEntry {...baseProps({ exampleBusy: true })} />);
    const button = screen.getByRole("button", { name: "Try an example brief" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  test("a starter error is announced", () => {
    render(<ProposalEntry {...baseProps({ starterError: "The example brief could not be loaded." })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("The example brief could not be loaded.");
  });

  test("an extra starter such as templates renders after the built-in ones", () => {
    render(<ProposalEntry {...baseProps({ extraStarter: <button type="button">Start from a template</button> })} />);
    const buttons = screen.getByRole("group", { name: "Ways to start" }).querySelectorAll("button");
    expect(buttons[buttons.length - 1]).toHaveTextContent("Start from a template");
  });

  test("uses semantic tokens only: no hex colours in its classes", () => {
    const { container } = render(<ProposalEntry {...baseProps()} />);
    const classes = Array.from(container.querySelectorAll("[class]")).map((el) => el.getAttribute("class") ?? "").join(" ");
    expect(classes).not.toMatch(/\[#[0-9a-f]{3,8}\]/i);
  });
});

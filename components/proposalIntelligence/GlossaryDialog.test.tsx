import { fireEvent, render, screen } from "@testing-library/react";
import GlossaryDialog from "./GlossaryDialog";

it("stays closed until asked, then opens as a dialog", () => {
  render(<GlossaryDialog />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /What do these words mean/ }));
  expect(
    screen.getByRole("dialog", { name: "What the words mean" }),
  ).toBeInTheDocument();
});

it("defines the term the assistant used to get wrong", () => {
  render(<GlossaryDialog />);
  fireEvent.click(screen.getByRole("button", { name: /What do these words mean/ }));
  expect(screen.getByText("Proposal Intelligence")).toBeInTheDocument();
  expect(screen.getByText(/not the chat assistant/i)).toBeInTheDocument();
});

it("finds a term by an alias the screens actually show", () => {
  render(<GlossaryDialog />);
  fireEvent.click(screen.getByRole("button", { name: /What do these words mean/ }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "normalized" } });
  expect(screen.getByText("Comparable total")).toBeInTheDocument();
  expect(screen.queryByText("Weight")).not.toBeInTheDocument();
});

it("says so plainly when nothing matches", () => {
  render(<GlossaryDialog />);
  fireEvent.click(screen.getByRole("button", { name: /What do these words mean/ }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzzz" } });
  expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
});

it("closes on Escape and on the close button", () => {
  render(<GlossaryDialog />);
  const open = () =>
    fireEvent.click(screen.getByRole("button", { name: /What do these words mean/ }));
  open();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  open();
  fireEvent.click(screen.getByRole("button", { name: "Close glossary" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

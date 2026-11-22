import { render, screen } from "@testing-library/react";
import Card from "./Card";

describe("Card", () => {
  test("renders a tokenised default card as the requested element", () => {
    render(<Card as="section" aria-label="Summary">Body</Card>);
    const card = screen.getByRole("region", { name: "Summary" });
    expect(card).toHaveAttribute("data-tone", "default");
    expect(card).toHaveClass("bg-surface", "border-line", "rounded-card", "p-5");
  });

  test.each([["muted", "bg-surface-muted"], ["brand", "bg-brand-soft"]] as const)("%s tone", (tone, cls) => {
    render(<Card tone={tone} padding="none" data-testid="c">x</Card>);
    expect(screen.getByTestId("c")).toHaveClass(cls);
    expect(screen.getByTestId("c")).not.toHaveClass("p-5");
  });

  test("exposes Header, Body and Footer parts", () => {
    render(<Card><Card.Header>H</Card.Header><Card.Body>B</Card.Body><Card.Footer>F</Card.Footer></Card>);
    expect(screen.getByText("H")).toHaveClass("border-b");
    expect(screen.getByText("F")).toHaveClass("border-t");
  });
});

import { render, screen } from "@testing-library/react";
import IntelligenceStatusChip from "./IntelligenceStatusChip";

it("uses the shared status identity and permits contextual labels", () => {
  render(<IntelligenceStatusChip status="partial" label="Partially readable" />);
  const chip = screen.getByText("Partially readable");
  expect(chip).toHaveAttribute("data-intelligence-status", "partial");
  expect(chip).toHaveClass("rounded-full", "border-gray", "bg-gray-panel");
});


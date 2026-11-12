import { render, screen } from "@testing-library/react";
import Badge, { type BadgeTone } from "./Badge";

describe("Badge", () => {
  test("renders its text in the gray tone by default", () => {
    render(<Badge>Draft</Badge>);
    const badge = screen.getByText("Draft");
    expect(badge).toHaveAttribute("data-tone", "gray");
    expect(badge).toHaveClass("rounded-full", "bg-slate-50", "text-slate-700");
  });

  test.each<[BadgeTone, string, string]>([
    ["gray", "bg-slate-50", "text-slate-700"],
    ["blue", "bg-sky-50", "text-sky-800"],
    ["amber", "bg-amber-50", "text-amber-900"],
    ["purple", "bg-violet-50", "text-violet-800"],
    ["green", "bg-emerald-50", "text-emerald-800"],
    ["muted", "bg-slate-100", "text-slate-600"],
  ])("the %s tone pairs its surface with readable text", (tone, surface, text) => {
    render(<Badge tone={tone}>Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass(surface, text);
    expect(screen.getByText("Label")).toHaveAttribute("data-tone", tone);
  });

  test("keeps the caller's extra classes", () => {
    render(<Badge tone="green" className="ml-2">Awarded</Badge>);
    expect(screen.getByText("Awarded")).toHaveClass("ml-2", "bg-emerald-50");
  });
});

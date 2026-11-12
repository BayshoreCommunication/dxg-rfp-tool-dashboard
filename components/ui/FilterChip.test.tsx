import { fireEvent, render, screen } from "@testing-library/react";
import FilterChip from "./FilterChip";

describe("FilterChip", () => {
  test("shows the filter and its value, with a link that removes it", () => {
    render(<FilterChip label="Planner" value="Dana Whitfield" removeHref="/dashboard?team=abc" />);
    expect(screen.getByTestId("filter-chip")).toHaveTextContent("Planner: Dana Whitfield");
    expect(screen.getByRole("link", { name: "Remove filter Planner: Dana Whitfield" })).toHaveAttribute("href", "/dashboard?team=abc");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("removes through a handler when the filter isn't in the URL", () => {
    const onRemove = jest.fn();
    render(<FilterChip label="Status" value="Sent" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter Status: Sent" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  test("with no way to remove it, it only shows the filter", () => {
    render(<FilterChip label="View" value="Organization" />);
    expect(screen.getByTestId("filter-chip")).toHaveTextContent("View: Organization");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

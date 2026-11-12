import { act, fireEvent, render, screen, within } from "@testing-library/react";

const push = jest.fn();
const replace = jest.fn();
let query = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh: jest.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(query),
}));

import DashboardFilters, { SEARCH_DEBOUNCE_MS, type DashboardFiltersProps } from "./DashboardFilters";

const PRIYA = "b".repeat(24);
const TEAM = "c".repeat(24);

const base: DashboardFiltersProps = {
  search: "", owner: "", team: "", venueCity: "", eventFrom: "", eventTo: "",
  offered: ["search", "owner", "team", "eventDates", "venueCity"],
  owners: [{ id: PRIYA, name: "Priya Planner" }],
  teams: [{ id: TEAM, name: "Corporate Events" }],
};

const type = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const pause = (ms = SEARCH_DEBOUNCE_MS) => act(() => void jest.advanceTimersByTime(ms));
const searchBox = () => screen.getByRole("searchbox", { name: "Search proposals by event name" });
const openFilters = () => fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));

beforeEach(() => {
  jest.useFakeTimers();
  push.mockClear();
  replace.mockClear();
  query = "";
});
afterEach(() => jest.useRealTimers());

describe("DashboardFilters", () => {
  test("search waits 300 ms after the last keystroke, then replaces the URL once and drops the page", () => {
    query = "stage=sent&page=3";
    render(<DashboardFilters {...base} />);
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
    type(searchBox(), "sum");
    pause(200);
    type(searchBox(), "summit ");
    pause(299);
    expect(replace).not.toHaveBeenCalled();
    pause(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/dashboard?stage=sent&search=summit", { scroll: false });
    expect(push).not.toHaveBeenCalled();
    // The box keeps what was typed.
    expect(searchBox()).toHaveValue("summit ");
  });

  test("Enter applies the search at once; clearing the box removes it from the URL", () => {
    query = "search=gala";
    render(<DashboardFilters {...base} search="gala" />);
    expect(searchBox()).toHaveValue("gala");
    type(searchBox(), "");
    fireEvent.submit(screen.getByRole("search"));
    expect(replace).toHaveBeenCalledWith("/dashboard", { scroll: false });
    pause();
    expect(replace).toHaveBeenCalledTimes(1);
  });

  test("the box follows the URL when it changes elsewhere, but never undoes what is being typed", () => {
    const { rerender } = render(<DashboardFilters {...base} />);
    type(searchBox(), "ab");
    pause();
    type(searchBox(), "abc");
    // The server answers the first request while the person has typed on.
    rerender(<DashboardFilters {...base} search="ab" />);
    expect(searchBox()).toHaveValue("abc");
    pause();
    rerender(<DashboardFilters {...base} search="abc" />);
    expect(searchBox()).toHaveValue("abc");
    // Back, a removed chip or Clear all: the URL's value wins.
    rerender(<DashboardFilters {...base} search="" />);
    expect(searchBox()).toHaveValue("");
    rerender(<DashboardFilters {...base} search="gala" />);
    expect(searchBox()).toHaveValue("gala");
  });

  test("a view that offers only search has no Filters button", () => {
    render(<DashboardFilters {...base} offered={["search"]} />);
    expect(searchBox()).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("the popover holds only the filters the view offers", () => {
    render(<DashboardFilters {...base} offered={["search", "owner", "team"]} />);
    const button = screen.getByRole("button", { name: /^Filters/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    openFilters();
    expect(button).toHaveAttribute("aria-expanded", "true");
    const panel = within(screen.getByRole("dialog", { name: "Filters" }));
    expect(panel.getByLabelText("Planner")).toHaveFocus();
    expect(panel.getByLabelText("Team")).toBeInTheDocument();
    expect(panel.queryByLabelText("Venue city")).not.toBeInTheDocument();
    expect(panel.queryByRole("button", { name: /Event dates/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
  });

  test("picking a planner or team pushes a history entry; a second pick builds on the first", () => {
    query = "view=team&page=2";
    render(<DashboardFilters {...base} />);
    openFilters();
    fireEvent.change(screen.getByLabelText("Planner"), { target: { value: PRIYA } });
    expect(push).toHaveBeenLastCalledWith(`/dashboard?view=team&owner=${PRIYA}`, { scroll: false });
    // The URL hasn't caught up yet: the team is added to the planner, not instead of it.
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: TEAM } });
    expect(push).toHaveBeenLastCalledWith(`/dashboard?view=team&owner=${PRIYA}&team=${TEAM}`, { scroll: false });
    expect(replace).not.toHaveBeenCalled();
  });

  test("venue city is typed, so it waits and replaces; choosing 'All' removes a filter", () => {
    query = `owner=${PRIYA}`;
    render(<DashboardFilters {...base} owner={PRIYA} />);
    openFilters();
    type(screen.getByLabelText("Venue city"), "Chicago");
    expect(replace).not.toHaveBeenCalled();
    pause();
    expect(replace).toHaveBeenCalledWith(`/dashboard?owner=${PRIYA}&venueCity=Chicago`, { scroll: false });
    fireEvent.change(screen.getByLabelText("Planner"), { target: { value: "" } });
    expect(push).toHaveBeenLastCalledWith("/dashboard?venueCity=Chicago", { scroll: false });
  });

  test("the button counts the popover's applied filters and a planner no longer listed stays selectable", () => {
    const gone = "d".repeat(24);
    render(<DashboardFilters {...base} owner={gone} venueCity="Chicago" eventFrom="2026-11-11" eventTo="2026-11-14" search="x" />);
    expect(screen.getByRole("button", { name: /^Filters/ })).toHaveTextContent("3, 3 applied");
    openFilters();
    expect(within(screen.getByLabelText("Planner")).getAllByRole("option").map((option) => option.textContent)).toEqual(["All planners", "Priya Planner", "Selected planner"]);
    expect(screen.getByRole("button", { name: /Event dates/ })).toHaveTextContent("Nov 11, 2026 – Nov 14, 2026");
  });

  test("one end of a date range from a link is shown as such", () => {
    render(<DashboardFilters {...base} eventFrom="2026-11-11" />);
    openFilters();
    expect(screen.getByRole("button", { name: /Event dates/ })).toHaveTextContent("From Nov 11, 2026");
  });

  test("Escape and the close button shut the popover and return focus to its button; a press outside shuts it", () => {
    render(<div><DashboardFilters {...base} /><p>elsewhere</p></div>);
    const button = screen.getByRole("button", { name: /^Filters/ });
    openFilters();
    fireEvent.keyDown(screen.getByLabelText("Planner"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    openFilters();
    fireEvent.click(screen.getByRole("button", { name: "Close filters" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    openFilters();
    fireEvent.pointerDown(screen.getByLabelText("Planner"));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("elsewhere"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

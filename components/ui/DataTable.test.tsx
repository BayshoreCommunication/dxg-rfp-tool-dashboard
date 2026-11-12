import { render, screen, within } from "@testing-library/react";
import DataTable, { type DataTableColumn } from "./DataTable";

type Venue = { id: string; name: string; city: string; seats: number };

const venues: Venue[] = [
  { id: "v1", name: "Harbor Hall", city: "Boston", seats: 400 },
  { id: "v2", name: "Lakeside Pavilion", city: "Chicago", seats: 250 },
];

const columns: DataTableColumn<Venue>[] = [
  {
    id: "name",
    header: "Venue",
    rowHeader: true,
    sorts: [
      { label: "Venue", href: "/venues?sortBy=name&sortOrder=desc", direction: "asc" },
      { label: "City", href: "/venues?sortBy=city", direction: null },
    ],
    cell: (venue) => <a href={`/venues/${venue.id}`}>{venue.name}</a>,
  },
  { id: "city", header: "City", className: "hidden md:table-cell", cell: (venue) => venue.city },
  { id: "seats", header: "Seats", align: "right", sorts: [{ label: "Seats", href: "/venues?sortBy=seats", direction: null }], cell: (venue) => venue.seats },
  { id: "actions", header: "Actions", headerHidden: true, cell: (venue) => <button type="button">Open {venue.name}</button> },
];

describe("DataTable", () => {
  test("renders a captioned table with one row per item, keyed by rowKey", () => {
    render(<DataTable caption="Venues" columns={columns} rows={venues} rowKey={(venue) => venue.id} />);
    const table = screen.getByRole("table", { name: "Venues" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveAttribute("data-row-id", "v1");
    // The naming column is a row header, so a screen reader announces the venue with each cell.
    expect(within(rows[1]).getByRole("rowheader")).toHaveTextContent("Harbor Hall");
    expect(within(rows[1]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Boston", "400", "Open Harbor Hall"]);
    expect(within(rows[2]).getByRole("link", { name: "Lakeside Pavilion" })).toHaveAttribute("href", "/venues/v2");
  });

  test("sortable headers are links, and aria-sort names the active direction", () => {
    render(<DataTable caption="Venues" columns={columns} rows={venues} rowKey={(venue) => venue.id} />);
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((header) => header.getAttribute("aria-sort"))).toEqual(["ascending", null, "none", null]);
    const [venue, city] = within(headers[0]).getAllByRole("link");
    expect(venue).toHaveAttribute("href", "/venues?sortBy=name&sortOrder=desc");
    expect(venue).toHaveAttribute("data-sort-direction", "asc");
    expect(venue).toHaveTextContent("Venue, sorted ascending. Sort descending");
    expect(city).toHaveAttribute("href", "/venues?sortBy=city");
    expect(city).toHaveAttribute("data-sort-direction", "none");
    expect(within(headers[2]).getByRole("link", { name: /^Seats/ })).toHaveAttribute("href", "/venues?sortBy=seats");
    // A column that can't be sorted has plain text, no link.
    expect(within(headers[1]).queryByRole("link")).not.toBeInTheDocument();
    expect(headers[1]).toHaveTextContent("City");
  });

  test("a descending sort offers ascending next", () => {
    const sorted: DataTableColumn<Venue>[] = [
      { id: "seats", header: "Seats", sorts: [{ label: "Seats", href: "/venues", direction: "desc" }], cell: (venue) => venue.seats },
    ];
    render(<DataTable caption="Venues" columns={sorted} rows={venues} rowKey={(venue) => venue.id} />);
    expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("link")).toHaveTextContent("Seats, sorted descending. Sort ascending");
  });

  test("column classes reach the header and every cell; a hidden header keeps its name", () => {
    render(<DataTable caption="Venues" columns={columns} rows={venues} rowKey={(venue) => venue.id} className="mt-4" />);
    expect(screen.getByRole("columnheader", { name: "City" })).toHaveClass("hidden", "md:table-cell");
    for (const cell of screen.getAllByText(/Boston|Chicago/)) expect(cell).toHaveClass("hidden", "md:table-cell");
    expect(screen.getByRole("columnheader", { name: "Actions" }).firstElementChild).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: /Seats/ })).toHaveClass("text-right");
    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto", "mt-4");
  });

  test("no rows: the header alone", () => {
    render(<DataTable caption="Venues" columns={columns} rows={[]} rowKey={(venue) => venue.id} />);
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});

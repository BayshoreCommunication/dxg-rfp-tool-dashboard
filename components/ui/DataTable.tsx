import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

// A typed table for lists that are filtered, sorted and paged on the server. Server component:
// a sortable header is a plain link to the same page with the sort changed, so sorting works
// without JavaScript and the sorted list can be bookmarked. Narrow screens hide the less
// important columns through each column's `className` (for example "hidden md:table-cell"), so
// the table never makes the page scroll sideways.

export type SortDirection = "asc" | "desc";

export type DataTableSort = {
  // Shown as the header text, for example "Updated".
  label: string;
  // Where this sort leads.
  href: string;
  // The current direction when the list is sorted by this; null when it isn't.
  direction: SortDirection | null;
};

export type DataTableColumn<Row> = {
  id: string;
  // Header text. With `sorts` it is not shown, the sort links are (each has its own label).
  header: string;
  // Hide the header text from sight (an actions column still needs a name for screen readers).
  headerHidden?: boolean;
  // One sort, or several when a cell shows more than one sortable thing.
  sorts?: DataTableSort[];
  cell: (row: Row) => ReactNode;
  // Applied to the header and every cell of the column.
  className?: string;
  cellClassName?: string;
  // The column that names the row: rendered as a row header.
  rowHeader?: boolean;
  align?: "left" | "right";
};

export type DataTableProps<Row> = {
  // What the table lists, read out by screen readers.
  caption: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  className?: string;
};

const headClass = "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600";
const cellClass = "px-4 py-3 align-middle text-sm text-slate-600";
const sortLinkClass =
  "inline-flex items-center gap-1 rounded-sm uppercase tracking-wider hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

const SortLink = ({ sort }: { sort: DataTableSort }) => {
  const Icon = sort.direction === "asc" ? ArrowUp : sort.direction === "desc" ? ArrowDown : ChevronsUpDown;
  const next = sort.direction === "asc" ? "descending" : sort.direction === "desc" ? "ascending" : null;
  return (
    <Link
      href={sort.href}
      scroll={false}
      data-sort-direction={sort.direction ?? "none"}
      className={`${sortLinkClass} ${sort.direction ? "text-slate-900" : ""}`}
    >
      {sort.label}
      <Icon size={13} aria-hidden="true" className={sort.direction ? "text-sky-700" : "text-slate-400"} />
      <span className="sr-only">
        {sort.direction ? `, sorted ${sort.direction === "asc" ? "ascending" : "descending"}. Sort ${next}` : ", sort"}
      </span>
    </Link>
  );
};

export default function DataTable<Row>({ caption, columns, rows, rowKey, className = "" }: DataTableProps<Row>) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 ${className}`.trim()}>
      <table className="w-full min-w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => {
              const active = column.sorts?.find((sort) => sort.direction);
              const align = column.align === "right" ? "text-right" : "text-left";
              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={column.sorts ? (active ? (active.direction === "asc" ? "ascending" : "descending") : "none") : undefined}
                  className={`${headClass} ${align} ${column.className ?? ""}`}
                >
                  {column.sorts ? (
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {column.sorts.map((sort) => <SortLink key={sort.label} sort={sort} />)}
                    </span>
                  ) : column.headerHidden ? (
                    <span className="sr-only">{column.header}</span>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={rowKey(row)} data-row-id={rowKey(row)}>
              {columns.map((column) => {
                const align = column.align === "right" ? "text-right" : "text-left";
                return column.rowHeader ? (
                  <th key={column.id} scope="row" className={`px-4 py-3 align-middle font-normal ${align} ${column.className ?? ""} ${column.cellClassName ?? ""}`}>
                    {column.cell(row)}
                  </th>
                ) : (
                  <td key={column.id} className={`${cellClass} ${align} ${column.className ?? ""} ${column.cellClassName ?? ""}`}>
                    {column.cell(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

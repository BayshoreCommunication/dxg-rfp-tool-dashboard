import { X } from "lucide-react";
import Link from "next/link";

// One applied filter, with a way to remove it. Removing is a plain link when the filter lives
// in the URL (`removeHref`), or a button when the caller keeps it in state (`onRemove`). No
// hooks, so it renders on the server unless it is handed a handler.

export type FilterChipProps = {
  // What the filter is, for example "Planner".
  label: string;
  // What it is set to, for example "Dana Whitfield".
  value: string;
  removeHref?: string;
  onRemove?: () => void;
  className?: string;
};

const removeClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sky-800 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";

export default function FilterChip({ label, value, removeHref, onRemove, className = "" }: FilterChipProps) {
  const removeLabel = `Remove filter ${label}: ${value}`;
  return (
    <span
      data-testid="filter-chip"
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-sky-200 bg-sky-50 py-0.5 pl-3 pr-1 text-xs text-sky-900 ${className}`.trim()}
    >
      <span className="min-w-0 truncate">
        <span className="font-semibold">{label}:</span> {value}
      </span>
      {removeHref ? (
        <Link href={removeHref} aria-label={removeLabel} className={removeClass}>
          <X size={13} aria-hidden="true" />
        </Link>
      ) : onRemove ? (
        <button type="button" onClick={onRemove} aria-label={removeLabel} className={removeClass}>
          <X size={13} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

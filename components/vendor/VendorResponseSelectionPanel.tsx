"use client";

import VendorResponseDeleteControl from "@/components/vendor/VendorResponseDeleteControl";
import { cn } from "@/lib/utils";
import { CheckSquare2, SquareMousePointer } from "lucide-react";
import { Children, type ReactNode, useState } from "react";

type SelectableResponse = {
  responseId: string;
  vendorName: string;
};

export default function VendorResponseSelectionPanel({
  responses,
  actions,
  children,
}: {
  responses: SelectableResponse[];
  actions: ReactNode;
  children: ReactNode;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const cards = Children.toArray(children);
  const allSelected =
    responses.length > 0 && selectedIds.size === responses.length;
  const selectedResponseIds = responses.flatMap((response) =>
    selectedIds.has(response.responseId) ? [response.responseId] : [],
  );

  const leaveSelection = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const toggleResponse = (responseId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(responseId)) next.delete(responseId);
      else next.add(responseId);
      return next;
    });
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        {selecting ? (
          <>
            <label className="mr-auto inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-gray-border bg-white px-3 text-sm font-bold text-navy focus-within:ring-2 focus-within:ring-brand">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelectedIds(
                    allSelected
                      ? new Set()
                      : new Set(responses.map((response) => response.responseId)),
                  )
                }
                className="h-4 w-4 accent-[#008ad2]"
              />
              Select all
            </label>
            <span
              aria-live="polite"
              className="text-sm font-semibold text-gray"
            >
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={leaveSelection}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-border bg-white px-4 text-sm font-bold text-navy transition hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Cancel
            </button>
            {selectedIds.size > 0 ? (
              <VendorResponseDeleteControl
                scope="selected"
                count={selectedIds.size}
                responseIds={selectedResponseIds}
                emphasis="danger"
                onDeleted={leaveSelection}
              />
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-400"
              >
                <CheckSquare2 size={15} aria-hidden="true" /> Delete selected
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSelecting(true)}
              className="mr-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-border bg-white px-4 text-sm font-bold text-navy transition hover:border-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <SquareMousePointer size={15} aria-hidden="true" /> Select responses
            </button>
            {actions}
          </>
        )}
      </div>

      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {responses.map((response, index) => {
          const checked = selectedIds.has(response.responseId);
          return (
            <div
              key={response.responseId}
              data-selected={checked ? "true" : "false"}
              className={cn(
                "rounded-3xl transition",
                checked &&
                  "[&_article]:border-brand [&_article]:shadow-[0_8px_24px_rgba(0,138,210,0.10)]",
              )}
            >
              {selecting ? (
                <label
                  className={cn(
                    "mb-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm font-bold transition focus-within:ring-2 focus-within:ring-brand",
                    checked
                      ? "border-brand bg-brand-muted text-brand-dark"
                      : "border-gray-border bg-white text-navy hover:border-brand",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleResponse(response.responseId)}
                    className="h-4 w-4 accent-[#008ad2]"
                  />
                  <span className="truncate">
                    Select {response.vendorName || "vendor response"}
                  </span>
                </label>
              ) : null}
              {cards[index]}
            </div>
          );
        })}
      </div>
    </>
  );
}

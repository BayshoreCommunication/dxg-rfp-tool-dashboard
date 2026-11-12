"use client";

import { Check, ChevronDown, CircleDot, Minus } from "lucide-react";
import { Fragment, useId, useState } from "react";
import { ROLE_LABELS } from "./orgAccess";
import {
  ACCESS_LEVEL_LABELS,
  ROLE_ACCESS_GROUPS,
  ROLE_ORDER,
  ROLE_SUMMARIES,
  type AccessLevel,
  type RoleAccessCell,
} from "./roleAccess";
import type { CustomerRole } from "./types";
import { Badge, inputClass, ROLE_TONES, sectionClass, sectionTitleClass } from "./ui";

// "What each role can do" on the Users page: the signed-in member's role, one line per role, and
// a role-by-capability comparison. Every word comes from roleAccess.ts; nothing here calls an API.

const LEVEL_ICONS: Record<AccessLevel, typeof Check> = { yes: Check, limited: CircleDot, no: Minus };
// Shape carries the meaning (tick, dot-in-circle, dash); colour only reinforces it.
const LEVEL_TONES: Record<AccessLevel, string> = { yes: "text-emerald-600", limited: "text-amber-600", no: "text-slate-400" };

const Mark = ({ level }: { level: AccessLevel }) => {
  const Icon = LEVEL_ICONS[level];
  return <Icon size={16} strokeWidth={2.5} aria-hidden="true" className={`shrink-0 ${LEVEL_TONES[level]}`} />;
};

// A mark with its words. With a note the level is read out first ("Limited: their own…"); without
// one the level itself is the text, visible in the stacked layout and screen-reader-only in the table.
const AccessCell = ({ cell, showLabel = false }: { cell: RoleAccessCell; showLabel?: boolean }) => (
  <span className="flex items-start gap-2" data-level={cell.level}>
    <span className="mt-0.5"><Mark level={cell.level} /></span>
    <span className="min-w-0 text-xs leading-5 text-slate-600">
      <span className={showLabel ? "font-semibold text-slate-700" : "sr-only"}>
        {ACCESS_LEVEL_LABELS[cell.level]}
        {cell.note ? ": " : ""}
      </span>
      {cell.note}
    </span>
  </span>
);

type Props = {
  // The signed-in member's role, when it is known.
  role: CustomerRole | null;
};

export default function RoleAccessGuide({ role }: Props) {
  const titleId = useId();
  const tableCaptionId = useId();
  const pickerId = useId();
  // The stacked layout shows one role at a time, starting with the member's own.
  const [shownRole, setShownRole] = useState<CustomerRole>(role ?? "planner");

  return (
    <section className={sectionClass} aria-labelledby={titleId} data-testid="role-access-guide">
      <h2 id={titleId} className={sectionTitleClass}>What each role can do</h2>
      <p className="mt-2 text-sm text-slate-500">
        A role decides what a member can see and change. RFPilot checks it on every action, so this is what people actually get.
      </p>

      {role && (
        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" data-testid="your-role">
          <span className="font-semibold text-slate-800">Your role:</span>
          <Badge tone={ROLE_TONES[role] ?? "slate"}>{ROLE_LABELS[role]}</Badge>
          <span className="min-w-0">{ROLE_SUMMARIES[role]}</span>
        </p>
      )}

      <dl className="mt-5 divide-y divide-slate-100 rounded-md border border-slate-200" data-testid="role-summaries">
        {ROLE_ORDER.map((entry) => (
          <div key={entry} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
            <dt className="shrink-0 sm:w-32">
              <Badge tone={ROLE_TONES[entry] ?? "slate"}>{ROLE_LABELS[entry]}</Badge>
              {entry === role && <span className="ml-1.5 text-xs font-medium text-slate-500">(you)</span>}
            </dt>
            <dd className="min-w-0 text-sm leading-6 text-slate-600">{ROLE_SUMMARIES[entry]}</dd>
          </div>
        ))}
      </dl>

      <details className="group mt-5" data-testid="role-comparison">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded px-1 py-1 text-sm font-semibold text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
          <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
          Compare roles in detail
        </summary>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600" aria-label="Key">
          <li className="flex items-center gap-1.5"><Mark level="yes" /> Yes</li>
          <li className="flex items-center gap-1.5"><Mark level="limited" /> Limited, as described</li>
          <li className="flex items-center gap-1.5"><Mark level="no" /> No</li>
        </ul>

        {/* Wide screens: the full comparison. It scrolls inside its own box if it ever runs out of room. */}
        <div className="mt-4 hidden overflow-x-auto rounded-md border border-slate-200 lg:block" data-testid="role-table">
          <table className="w-full min-w-[920px] table-fixed text-left text-sm" aria-describedby={tableCaptionId}>
            <caption id={tableCaptionId} className="sr-only">
              What each role can do, by capability. Each cell says Yes, Limited with the limit, or No.
            </caption>
            <colgroup>
              <col className="w-[26%]" />
              {ROLE_ORDER.map((entry) => <col key={entry} />)}
            </colgroup>
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Capability</th>
                {ROLE_ORDER.map((entry) => (
                  <th key={entry} scope="col" className="px-3 py-3">
                    {ROLE_LABELS[entry]}
                    {entry === role && <span className="ml-1 normal-case tracking-normal text-slate-500">(you)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            {ROLE_ACCESS_GROUPS.map((group) => (
              <tbody key={group.id} className="divide-y divide-slate-100 border-t border-slate-200">
                <tr className="bg-slate-50">
                  <th scope="rowgroup" colSpan={ROLE_ORDER.length + 1} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <th scope="row" className="px-4 py-3 text-sm font-medium text-slate-800">
                      {row.capability}
                      {row.note && <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{row.note}</span>}
                    </th>
                    {ROLE_ORDER.map((entry) => (
                      <td key={entry} className="px-3 py-3">
                        <AccessCell cell={row.access[entry]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>

        {/* Phones and tablets: one role at a time, so nothing needs sideways scrolling. */}
        <div className="mt-4 lg:hidden" data-testid="role-stack">
          <label htmlFor={pickerId} className="mb-2 block text-sm font-semibold text-slate-600">Show access for</label>
          <select
            id={pickerId}
            className={`${inputClass} appearance-auto sm:max-w-xs`}
            value={shownRole}
            onChange={(event) => setShownRole(event.target.value as CustomerRole)}
          >
            {ROLE_ORDER.map((entry) => (
              <option key={entry} value={entry}>
                {ROLE_LABELS[entry]}{entry === role ? " (you)" : ""}
              </option>
            ))}
          </select>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            {ROLE_ACCESS_GROUPS.map((group) => (
              <Fragment key={group.id}>
                <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 [&:not(:first-child)]:border-t">
                  {group.title}
                </h3>
                <ul className="divide-y divide-slate-100" aria-label={`${group.title}: ${ROLE_LABELS[shownRole]}`}>
                  {group.rows.map((row) => (
                    <li key={row.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{row.capability}</p>
                      <div className="mt-1.5">
                        <AccessCell cell={row.access[shownRole]} showLabel />
                      </div>
                      {row.note && <p className="mt-1 pl-6 text-xs leading-5 text-slate-500">{row.note}</p>}
                    </li>
                  ))}
                </ul>
              </Fragment>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

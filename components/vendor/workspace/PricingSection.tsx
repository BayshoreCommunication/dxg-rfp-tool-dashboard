import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { formatMoney, moneyFromInput, moneyInput, workspaceTotals } from "@/lib/vendorResponses/workspaceModel";
import WorkspaceSection, { fieldClass, labelClass } from "./WorkspaceSection";

export default function PricingSection({ questionnaire, response, onChange, sectionNumber, disabled }: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  onChange: (response: VendorResponseV1) => void;
  sectionNumber: number;
  disabled: boolean;
}) {
  const [expandedRoomId, setExpandedRoomId] = useState("");
  const section = questionnaire.sections.find((entry) => entry.sectionId === "pricing");
  const pricing = response.pricing;
  const precision = questionnaire.pricing.decimalPrecision;
  const currency = questionnaire.pricing.currency;
  const totals = workspaceTotals(questionnaire, response);
  const equipmentMinor = response.rooms.flatMap((room) => room.categoryTotals).reduce((sum, entry) => sum + entry.amount.amountMinor, 0);
  const laborMinor = response.rooms.reduce((sum, room) => sum + room.laborSubtotal.amountMinor, 0);
  const responsesByRoomId = new Map(response.rooms.map((room) => [room.roomId, room]));
  const roomSummaries = questionnaire.rooms.map((room) => {
    const roomResponse = responsesByRoomId.get(room.roomId);
    const equipment = roomResponse?.categoryTotals.reduce((sum, entry) => sum + entry.amount.amountMinor, 0) ?? 0;
    const labor = roomResponse?.laborSubtotal.amountMinor ?? 0;
    return { ...room, equipment, labor, total: equipment + labor };
  });
  const update = (patch: Partial<typeof pricing>) => onChange({ ...response, pricing: { ...pricing, ...patch } });

  return (
    <WorkspaceSection number={sectionNumber} title={section?.title ?? "All-in pricing summary"} helperText={section?.helperText ?? "Room equipment and labor subtotals roll up live. Final calculations are verified by RFPilot when you submit."} evaluationMappings={section?.evaluationMappings}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-extrabold tracking-[-0.015em] text-[#16283c]">Room-by-room summary</h2>
            <dl className="grid grid-cols-2 gap-6 sm:min-w-[340px] sm:gap-10">
              <div>
                <dt className="text-xs font-bold text-[#607487]">Equipment</dt>
                <dd className="mt-0.5 text-xl font-extrabold tabular-nums text-[#16283c]">{formatMoney(equipmentMinor, currency, precision)}</dd>
              </div>
              <div className="border-l border-[#dce4eb] pl-6 sm:pl-10">
                <dt className="text-xs font-bold text-[#607487]">Labor</dt>
                <dd className="mt-0.5 text-xl font-extrabold tabular-nums text-[#16283c]">{formatMoney(laborMinor, currency, precision)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-[#dce4eb]">
            {roomSummaries.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead className="bg-[#f7fafc] text-xs font-extrabold text-[#607487]">
                    <tr>
                      <th className="px-4 py-3" scope="col">Room</th>
                      <th className="px-4 py-3" scope="col">Equipment</th>
                      <th className="px-4 py-3" scope="col">Labor</th>
                      <th className="bg-[#eef8fd] px-4 py-3 text-[#16283c]" scope="col">Room total</th>
                      <th className="px-4 py-3" scope="col">Status / action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6ebef]">
                    {roomSummaries.map((room) => {
                      const roomResponse = responsesByRoomId.get(room.roomId);
                      const expanded = expandedRoomId === room.roomId;
                      const detailsId = `pricing-room-details-${room.roomId}`;
                      return (
                        <Fragment key={room.roomId}>
                          <tr className={expanded ? "bg-[#fbfdff]" : "bg-white"}>
                            <th className="px-4 py-3.5 font-extrabold text-[#16283c]" scope="row">{room.name}</th>
                            <td className="px-4 py-3.5 tabular-nums text-[#42576a]">{formatMoney(room.equipment, currency, precision)}</td>
                            <td className="px-4 py-3.5 tabular-nums text-[#42576a]">{formatMoney(room.labor, currency, precision)}</td>
                            <td className="bg-[#f3faff] px-4 py-3.5 font-extrabold tabular-nums text-[#16283c]">{formatMoney(room.total, currency, precision)}</td>
                            <td className="px-4 py-2.5">
                              <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#008ad2] px-3 text-xs font-extrabold text-[#0075b4] transition hover:bg-[#eef8fd] focus:outline-none focus:ring-3 focus:ring-[#dff3fc]" aria-controls={detailsId} aria-expanded={expanded} onClick={() => setExpandedRoomId(expanded ? "" : room.roomId)}>
                                {expanded ? "Hide details" : "View details"}
                                <ChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} size={14} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                          {expanded ? (
                            <tr id={detailsId}>
                              <td className="border-t border-[#dce4eb] bg-[#f8fbfd] px-4 py-4" colSpan={5}>
                                <div className="grid gap-4 lg:grid-cols-2">
                                  <section className="rounded-md border border-[#dce4eb] bg-white p-4" aria-labelledby={`${detailsId}-equipment`}>
                                    <div className="flex items-center justify-between gap-3">
                                      <h3 className="text-sm font-extrabold text-[#16283c]" id={`${detailsId}-equipment`}>Equipment breakdown</h3>
                                      <strong className="text-sm tabular-nums text-[#16283c]">{formatMoney(room.equipment, currency, precision)}</strong>
                                    </div>
                                    {roomResponse?.categoryTotals.length ? (
                                      <dl className="mt-3 divide-y divide-[#edf1f4]">
                                        {roomResponse.categoryTotals.map((entry) => (
                                          <div className="flex justify-between gap-3 py-2 text-xs" key={entry.categoryId}>
                                            <dt className="font-bold text-[#607487]">{questionnaire.pricing.equipmentCategories.find((category) => category.id === entry.categoryId)?.label ?? entry.categoryId}</dt>
                                            <dd className="font-extrabold tabular-nums text-[#16283c]">{formatMoney(entry.amount.amountMinor, currency, precision)}</dd>
                                          </div>
                                        ))}
                                      </dl>
                                    ) : <p className="mt-3 text-xs leading-5 text-[#718496]">No equipment subtotals entered yet.</p>}
                                    {roomResponse?.equipmentLines.length ? (
                                      <ul className="mt-3 space-y-2 border-t border-[#edf1f4] pt-3">
                                        {roomResponse.equipmentLines.map((line) => (
                                          <li className="flex justify-between gap-3 text-xs" key={line.equipmentLineId}>
                                            <span className="text-[#42576a]">{line.description || "Equipment item"}</span>
                                            <span className="shrink-0 font-bold text-[#607487]">Qty {line.quantity}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </section>

                                  <section className="rounded-md border border-[#dce4eb] bg-white p-4" aria-labelledby={`${detailsId}-labor`}>
                                    <div className="flex items-center justify-between gap-3">
                                      <h3 className="text-sm font-extrabold text-[#16283c]" id={`${detailsId}-labor`}>Labor plan</h3>
                                      <strong className="text-sm tabular-nums text-[#16283c]">{formatMoney(room.labor, currency, precision)}</strong>
                                    </div>
                                    {roomResponse?.laborLines.length ? (
                                      <ul className="mt-3 divide-y divide-[#edf1f4]">
                                        {roomResponse.laborLines.map((line) => (
                                          <li className="flex items-start justify-between gap-4 py-2 text-xs" key={line.laborLineId}>
                                            <div>
                                              <p className="font-bold text-[#42576a]">{questionnaire.crew.roles.find((role) => role.id === line.roleId)?.label ?? line.roleId}</p>
                                              {line.notes ? <p className="mt-0.5 text-[#718496]">{line.notes}</p> : null}
                                            </div>
                                            <span className="shrink-0 text-right text-[#607487]">{line.days} day{line.days === 1 ? "" : "s"} · {line.regularHours}h{line.overtimeHours ? ` + ${line.overtimeHours}h OT` : ""}{line.travel ? " · Travel" : ""}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : <p className="mt-3 text-xs leading-5 text-[#718496]">No labor breakdown entered yet.</p>}
                                  </section>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="bg-[#f8fafb] p-4 text-sm text-[#607487]">No room pricing is available for this proposal.</p>
            )}
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Travel subtotal {questionnaire.pricing.travelSubtotalRequired ? "*" : ""}<div className="relative"><span className="pointer-events-none absolute left-3 top-3 text-sm text-[#718496]">{currency}</span><input className={`${fieldClass} pl-12 text-right tabular-nums`} inputMode="decimal" value={moneyInput(pricing.travelSubtotal.amountMinor, precision)} disabled={disabled} onChange={(event) => update({ travelSubtotal: { amountMinor: moneyFromInput(event.target.value, precision), currency } })} /></div></label>
            <label className={labelClass}>Discount {questionnaire.pricing.discountRequired ? "*" : ""}<div className="relative"><span className="pointer-events-none absolute left-3 top-3 text-sm text-[#718496]">{currency}</span><input className={`${fieldClass} pl-12 text-right tabular-nums`} inputMode="decimal" value={moneyInput(pricing.discount.amountMinor, precision)} disabled={disabled} onChange={(event) => update({ discount: { amountMinor: moneyFromInput(event.target.value, precision), currency } })} /></div></label>
            {questionnaire.pricing.feeLines.map((fee) => {
              const amount = pricing.fees.find((entry) => entry.feeId === fee.feeId)?.amount.amountMinor;
              return <label className={labelClass} key={fee.feeId}>{fee.label} {fee.required ? "*" : ""}<div className="relative"><span className="pointer-events-none absolute left-3 top-3 text-sm text-[#718496]">{currency}</span><input className={`${fieldClass} pl-12 text-right tabular-nums`} inputMode="decimal" value={amount === undefined ? "" : moneyInput(amount, precision)} disabled={disabled} placeholder={fee.required ? "0.00 if waived" : "Optional"} onChange={(event) => {
                const fees = pricing.fees.filter((entry) => entry.feeId !== fee.feeId);
                if (event.target.value !== "") fees.push({ feeId: fee.feeId, amount: { amountMinor: moneyFromInput(event.target.value, precision), currency } });
                update({ fees });
              }} /></div></label>;
            })}
          </div>

          {questionnaire.pricing.assumptionsAllowed ? <div className="mt-7 border-t border-[#e6ebef] pt-6">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-extrabold text-[#16283c]">Assumptions and exclusions</h3><p className="mt-1 text-sm text-[#718496]">List one clear commercial assumption per line.</p></div><button type="button" disabled={disabled} className="inline-flex items-center gap-1.5 rounded-md border border-[#008ad2] px-3 py-2 text-xs font-extrabold text-[#0075b4] hover:bg-[#eef8fd] disabled:opacity-50" onClick={() => update({ assumptionsExclusions: [...pricing.assumptionsExclusions, ""] })}><Plus size={14} aria-hidden="true" /> Add line</button></div>
            <div className="mt-3 space-y-2">{pricing.assumptionsExclusions.map((entry, index) => <div className="flex gap-2" key={index}><label className="sr-only" htmlFor={`assumption-${index}`}>Assumption {index + 1}</label><input id={`assumption-${index}`} className={fieldClass} value={entry} disabled={disabled} onChange={(event) => update({ assumptionsExclusions: pricing.assumptionsExclusions.map((value, candidate) => candidate === index ? event.target.value : value) })} /><button type="button" disabled={disabled} className="mt-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-md text-[#718496] hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove assumption ${index + 1}`} onClick={() => update({ assumptionsExclusions: pricing.assumptionsExclusions.filter((_, candidate) => candidate !== index) })}><Trash2 size={16} aria-hidden="true" /></button></div>)}</div>
          </div> : null}
        </div>

        <aside className="h-fit rounded-lg bg-[#16283c] p-5 text-white shadow-[0_12px_30px_rgba(15,42,67,0.12)] xl:sticky xl:top-6" aria-label="Live pricing rollup">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#9fb2c4]">Live rollup</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[#c6d3df]">Equipment</dt><dd className="font-bold tabular-nums">{formatMoney(equipmentMinor, currency, precision)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#c6d3df]">Labor</dt><dd className="font-bold tabular-nums">{formatMoney(laborMinor, currency, precision)}</dd></div>
            <div className="border-t border-[#3a506b] pt-3">
              <div className="flex justify-between gap-3"><dt className="text-[#c6d3df]">Travel</dt><dd className="font-bold tabular-nums">{formatMoney(pricing.travelSubtotal.amountMinor, currency, precision)}</dd></div>
            </div>
            {questionnaire.pricing.feeLines.map((fee) => (
              <div className="flex justify-between gap-3" key={fee.feeId}><dt className="text-[#c6d3df]">{fee.label}</dt><dd className="font-bold tabular-nums">{formatMoney(pricing.fees.find((entry) => entry.feeId === fee.feeId)?.amount.amountMinor ?? 0, currency, precision)}</dd></div>
            ))}
            <div className="flex justify-between gap-3"><dt className="text-[#c6d3df]">Discount</dt><dd className="font-bold tabular-nums">− {formatMoney(pricing.discount.amountMinor, currency, precision)}</dd></div>
          </dl>
          <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-[#3a506b] pt-5"><span className="text-sm font-bold">Grand total</span><strong className="text-2xl tabular-nums">{formatMoney(totals.grandMinor, currency, precision)}</strong></div>
          <p className="mt-2 text-xs text-[#f0b860]">Running total until every required section is complete.</p>
        </aside>
      </div>
    </WorkspaceSection>
  );
}

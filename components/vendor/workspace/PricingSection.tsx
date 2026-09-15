import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import { Plus, Trash2 } from "lucide-react";
import { formatMoney, moneyFromInput, moneyInput, workspaceTotals } from "@/lib/vendorResponses/workspaceModel";
import WorkspaceSection, { fieldClass, labelClass } from "./WorkspaceSection";

export default function PricingSection({ questionnaire, response, onChange, sectionNumber, disabled }: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  onChange: (response: VendorResponseV1) => void;
  sectionNumber: number;
  disabled: boolean;
}) {
  const section = questionnaire.sections.find((entry) => entry.sectionId === "pricing");
  const pricing = response.pricing;
  const precision = questionnaire.pricing.decimalPrecision;
  const currency = questionnaire.pricing.currency;
  const totals = workspaceTotals(questionnaire, response);
  const equipmentMinor = response.rooms.flatMap((room) => room.categoryTotals).reduce((sum, entry) => sum + entry.amount.amountMinor, 0);
  const laborMinor = response.rooms.reduce((sum, room) => sum + room.laborSubtotal.amountMinor, 0);
  const update = (patch: Partial<typeof pricing>) => onChange({ ...response, pricing: { ...pricing, ...patch } });

  return (
    <WorkspaceSection number={sectionNumber} title={section?.title ?? "All-in pricing summary"} helperText={section?.helperText ?? "Room equipment and labor subtotals roll up live. Final calculations are verified by RFPilot when you submit."} evaluationMappings={section?.evaluationMappings}>
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
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

        <aside className="h-fit rounded-md bg-[#16283c] p-5 text-white" aria-label="Live pricing rollup">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#9fb2c4]">Live rollup</p>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[#c6d3df]">Equipment</dt><dd className="font-bold tabular-nums">{formatMoney(equipmentMinor, currency, precision)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#c6d3df]">Labor</dt><dd className="font-bold tabular-nums">{formatMoney(laborMinor, currency, precision)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#c6d3df]">Travel</dt><dd className="font-bold tabular-nums">{formatMoney(pricing.travelSubtotal.amountMinor, currency, precision)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#c6d3df]">Fees & tax</dt><dd className="font-bold tabular-nums">{formatMoney(pricing.fees.reduce((sum, fee) => sum + fee.amount.amountMinor, 0), currency, precision)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#c6d3df]">Discount</dt><dd className="font-bold tabular-nums">− {formatMoney(pricing.discount.amountMinor, currency, precision)}</dd></div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-[#3a506b] pt-4"><span className="text-sm font-bold">Grand total</span><strong className="text-xl tabular-nums">{formatMoney(totals.grandMinor, currency, precision)}</strong></div>
          <p className="mt-2 text-xs text-[#f0b860]">Running total until every required section is complete.</p>
        </aside>
      </div>
    </WorkspaceSection>
  );
}

import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import {
  moneyInput,
  signedMoneyFromInput,
} from "@/lib/vendorResponses/workspaceModel";
import { BadgeDollarSign, Plus, Trash2 } from "lucide-react";
import WorkspaceSection, {
  fieldClass,
  labelClass,
  textAreaClass,
} from "./WorkspaceSection";

const newId = () =>
  `alternate-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;

export default function AlternatesSection({
  questionnaire,
  response,
  onChange,
  sectionNumber,
  disabled,
}: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  onChange: (response: VendorResponseV1) => void;
  sectionNumber: number;
  disabled: boolean;
}) {
  const section = questionnaire.sections.find(
    (entry) => entry.sectionId === "alternates",
  );
  const precision = questionnaire.pricing.decimalPrecision;
  return (
    <WorkspaceSection
      number={sectionNumber}
      title={section?.title ?? "Alternates & value engineering"}
      helperText={
        section?.helperText ??
        "Scope each alternate to the whole project or a specific client-defined room. Cost deltas stay separate from the base grand total."
      }
      evaluationMappings={section?.evaluationMappings}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-[#d8ebf5] bg-[#eef8fd] p-4">
        <BadgeDollarSign
          size={20}
          className="text-[#008ad2]"
          aria-hidden="true"
        />
        <p className="text-sm text-[#52687b]">
          <b className="text-[#16283c]">{response.alternates.length}</b> of{" "}
          {questionnaire.alternates.maximumCount} allowed · enter savings as a
          negative amount.
        </p>
        {questionnaire.alternates.minimumCount ? (
          <span className="ml-auto text-xs font-extrabold text-[#0069a0]">
            Minimum {questionnaire.alternates.minimumCount}
          </span>
        ) : null}
      </div>
      <div className="space-y-4">
        {response.alternates.map((alternate, index) => (
          <fieldset
            key={alternate.alternateId}
            className="rounded-md border border-[#dce4eb] p-4 sm:p-5"
          >
            <legend className="px-1 text-xs font-extrabold uppercase tracking-[0.08em] text-[#607487]">
              Alternate {index + 1}
            </legend>
            <div className="grid gap-4 md:grid-cols-[220px_1fr_170px_auto] md:items-end">
              <label className={labelClass}>
                Applies to *
                <select
                  className={fieldClass}
                  disabled={disabled}
                  value={
                    alternate.scope.type === "room"
                      ? `room:${alternate.scope.roomId}`
                      : "project"
                  }
                  onChange={(event) =>
                    onChange({
                      ...response,
                      alternates: response.alternates.map((entry) =>
                        entry.alternateId === alternate.alternateId
                          ? {
                              ...entry,
                              scope:
                                event.target.value === "project"
                                  ? { type: "project" }
                                  : {
                                      type: "room",
                                      roomId: event.target.value.slice(5),
                                    },
                            }
                          : entry,
                      ),
                    })
                  }
                >
                  <option value="project">Project-wide</option>
                  {questionnaire.rooms.map((room) => (
                    <option key={room.roomId} value={`room:${room.roomId}`}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Title *
                <input
                  className={fieldClass}
                  value={alternate.title}
                  disabled={disabled}
                  placeholder="Freight consolidation"
                  onChange={(event) =>
                    onChange({
                      ...response,
                      alternates: response.alternates.map((entry) =>
                        entry.alternateId === alternate.alternateId
                          ? { ...entry, title: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
              </label>
              <label className={labelClass}>
                Cost delta ({questionnaire.pricing.currency})
                <input
                  className={`${fieldClass} text-right tabular-nums`}
                  inputMode="decimal"
                  value={moneyInput(alternate.costDelta.amountMinor, precision)}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...response,
                      alternates: response.alternates.map((entry) =>
                        entry.alternateId === alternate.alternateId
                          ? {
                              ...entry,
                              costDelta: {
                                ...entry.costDelta,
                                amountMinor: signedMoneyFromInput(
                                  event.target.value,
                                  precision,
                                ),
                              },
                            }
                          : entry,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove alternate ${index + 1}`}
                className="grid h-10 w-10 place-items-center rounded-md text-[#718496] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                onClick={() =>
                  onChange({
                    ...response,
                    alternates: response.alternates.filter(
                      (entry) => entry.alternateId !== alternate.alternateId,
                    ),
                  })
                }
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
            <label className={`${labelClass} mt-4`}>
              Trade-off and evaluator impact *
              <textarea
                className={textAreaClass}
                value={alternate.tradeoff}
                disabled={disabled}
                placeholder="Explain what changes, what is preserved, and the client impact."
                onChange={(event) =>
                  onChange({
                    ...response,
                    alternates: response.alternates.map((entry) =>
                      entry.alternateId === alternate.alternateId
                        ? { ...entry, tradeoff: event.target.value }
                        : entry,
                    ),
                  })
                }
              />
            </label>
            <label className="mt-3 flex items-center gap-2 text-xs font-bold text-[#42576a]">
              <input
                className="h-4 w-4 accent-[#008ad2]"
                type="checkbox"
                checked={alternate.recommended}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...response,
                    alternates: response.alternates.map((entry) =>
                      entry.alternateId === alternate.alternateId
                        ? { ...entry, recommended: event.target.checked }
                        : entry,
                    ),
                  })
                }
              />
              Mark as vendor recommended
            </label>
          </fieldset>
        ))}
      </div>
      {response.alternates.length < questionnaire.alternates.maximumCount ? (
        <button
          type="button"
          disabled={disabled}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#008ad2] px-4 py-2.5 text-sm font-extrabold text-[#0075b4] hover:bg-[#eef8fd] disabled:opacity-50"
          onClick={() =>
            onChange({
              ...response,
              alternates: [
                ...response.alternates,
                {
                  alternateId: newId(),
                  scope: { type: "project" },
                  title: "",
                  tradeoff: "",
                  costDelta: {
                    amountMinor: 0,
                    currency: questionnaire.pricing.currency,
                  },
                  recommended: false,
                },
              ],
            })
          }
        >
          <Plus size={15} aria-hidden="true" /> Add alternate
        </button>
      ) : null}
    </WorkspaceSection>
  );
}

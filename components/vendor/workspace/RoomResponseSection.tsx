import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { RoomResponse, VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import { Plus, Search, Trash2 } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import WorkspaceSection, { fieldClass, labelClass, textAreaClass } from "./WorkspaceSection";
import { moneyFromInput, moneyInput } from "@/lib/vendorResponses/workspaceModel";

type QuestionnaireRoom = VendorResponseQuestionnaireV1["rooms"][number];

const emptyRoomResponse = (room: QuestionnaireRoom, questionnaire: VendorResponseQuestionnaireV1): RoomResponse => ({
  roomId: room.roomId,
  specResponses: [],
  equipmentLines: [],
  categoryTotals: [],
  laborLines: [],
  laborSubtotal: { amountMinor: 0, currency: questionnaire.pricing.currency },
  ...(room.streamingApplicable ? { hybrid: { feedHandoff: "", redundancy: "", virtualAudienceExperience: "" } } : {}),
});

const newId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;

export default function RoomResponseSection({ questionnaire, response, onChange, sectionNumber, disabled }: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  onChange: (response: VendorResponseV1) => void;
  sectionNumber: number;
  disabled: boolean;
}) {
  const section = questionnaire.sections.find((entry) => entry.sectionId === "rooms");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [activeRoomId, setActiveRoomId] = useState(questionnaire.rooms[0]?.roomId ?? "");
  const filteredRooms = useMemo(() => questionnaire.rooms.filter((room) =>
    !deferredQuery || [room.name, room.location, room.setup].some((value) => value?.toLowerCase().includes(deferredQuery))), [deferredQuery, questionnaire.rooms]);
  const activeDefinition = questionnaire.rooms.find((room) => room.roomId === activeRoomId) ?? filteredRooms[0] ?? questionnaire.rooms[0];
  const activeResponse = activeDefinition
    ? response.rooms.find((room) => room.roomId === activeDefinition.roomId) ?? emptyRoomResponse(activeDefinition, questionnaire)
    : null;

  const updateRoom = (nextRoom: RoomResponse) => {
    const rooms = response.rooms.filter((room) => room.roomId !== nextRoom.roomId);
    onChange({ ...response, rooms: [...rooms, nextRoom] });
  };
  const precision = questionnaire.pricing.decimalPrecision;

  return (
    <WorkspaceSection number={sectionNumber} title={section?.title ?? "Room-by-room response"} helperText={section?.helperText ?? "Rooms and requirements are defined by the client. Respond to each specification; room names cannot be changed."} evaluationMappings={section?.evaluationMappings}>
      {questionnaire.rooms.length === 0 ? (
        <p className="rounded-md border border-[#dce4eb] bg-[#f8fafb] p-4 text-sm text-[#607487]">This proposal does not include room requirements.</p>
      ) : (
        <>
          <div className="grid gap-3 rounded-md border border-[#dce4eb] bg-[#f8fafb] p-4 sm:grid-cols-[1fr_1fr]">
            <label className={labelClass}>Search {questionnaire.rooms.length} room{questionnaire.rooms.length === 1 ? "" : "s"}
              <span className="relative block"><Search className="pointer-events-none absolute left-3 top-3 text-[#718496]" size={15} aria-hidden="true" /><input className={`${fieldClass} pl-9`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Room name, location, or setup" /></span>
            </label>
            <label className={labelClass}>Selected room
              <select className={fieldClass} value={activeDefinition?.roomId ?? ""} onChange={(event) => setActiveRoomId(event.target.value)}>
                {filteredRooms.map((room) => {
                  const answered = response.rooms.find((entry) => entry.roomId === room.roomId)?.specResponses.length ?? 0;
                  return <option value={room.roomId} key={room.roomId}>{room.name} · {answered}/{room.specs.length} specs</option>;
                })}
              </select>
            </label>
          </div>
          {filteredRooms.length === 0 ? <p className="mt-4 text-sm text-[#607487]">No rooms match “{query}”.</p> : null}

          {activeDefinition && activeResponse ? (
            <div className="mt-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dce4eb] pb-4">
                <div><h2 className="text-lg font-extrabold text-[#16283c]">{activeDefinition.name}</h2>
                  <p className="mt-1 text-sm text-[#607487]">{[activeDefinition.location, activeDefinition.setup, activeDefinition.estimatedAttendees ? `${activeDefinition.estimatedAttendees.toLocaleString()} attendees` : "", activeDefinition.scheduleSummary].filter(Boolean).join(" · ") || "Client-defined room"}</p>
                </div>
                <span className="rounded-full bg-[#eef8fd] px-3 py-1 text-xs font-bold text-[#0069a0]">{activeDefinition.specs.length} specifications</span>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#42576a]">A · Specification verdicts</h3>
                <div className="mt-3 divide-y divide-[#e6ebef] rounded-md border border-[#dce4eb]">
                  {activeDefinition.specs.length ? activeDefinition.specs.map((spec) => {
                    const answer = activeResponse.specResponses.find((entry) => entry.specId === spec.specId);
                    return (
                      <fieldset className="p-4" key={spec.specId}>
                        <legend className="sr-only">{spec.label} response</legend>
                        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                          <div><p className="text-sm font-extrabold text-[#16283c]">{spec.label}</p><p className="mt-1 text-[13px] leading-5 text-[#607487]">Client requirement: {spec.requirementText}</p></div>
                          <div className="inline-flex w-fit overflow-hidden rounded-md border border-[#ccd8e2]" role="radiogroup" aria-label={`${spec.label} verdict`}>
                            {spec.allowedResponses.map((status) => (
                              <label key={status} className={`cursor-pointer border-r border-[#ccd8e2] px-3 py-2 text-xs font-extrabold capitalize last:border-r-0 ${answer?.status === status ? status === "comply" ? "bg-emerald-600 text-white" : status === "substitute" ? "bg-amber-500 text-white" : "bg-rose-600 text-white" : "bg-white text-[#42576a] hover:bg-[#f4f7f9]"}`}>
                                <input className="sr-only" type="radio" name={`spec-${spec.specId}`} value={status} checked={answer?.status === status} disabled={disabled} onChange={() => {
                                  const next = activeResponse.specResponses.filter((entry) => entry.specId !== spec.specId);
                                  next.push({ specId: spec.specId, status, note: answer?.note ?? "" });
                                  updateRoom({ ...activeResponse, specResponses: next });
                                }} />{status}
                              </label>
                            ))}
                          </div>
                        </div>
                        {answer?.status === "substitute" || answer?.status === "exception" ? (
                          <label className={`${labelClass} mt-3 block rounded-md ${answer.status === "substitute" ? "bg-amber-50" : "bg-rose-50"} p-3`}>Required note
                            <input className={fieldClass} maxLength={spec.noteMaxLength} value={answer.note} disabled={disabled} placeholder={answer.status === "substitute" ? "Describe the substitution and how it meets the requirement." : "Describe the exception and its impact."} onChange={(event) => updateRoom({ ...activeResponse, specResponses: activeResponse.specResponses.map((entry) => entry.specId === spec.specId ? { ...entry, note: event.target.value } : entry) })} />
                            <span className="mt-1 block text-right font-normal text-[#718496]">{answer.note.length}/{spec.noteMaxLength}</span>
                          </label>
                        ) : null}
                      </fieldset>
                    );
                  }) : <p className="p-4 text-sm text-[#607487]">No explicit specification lines were supplied for this room.</p>}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#42576a]">B · Equipment schedule</h3><button type="button" disabled={disabled} className="inline-flex items-center gap-1.5 rounded-md border border-[#008ad2] px-3 py-2 text-xs font-extrabold text-[#0075b4] hover:bg-[#eef8fd] disabled:opacity-50" onClick={() => updateRoom({ ...activeResponse, equipmentLines: [...activeResponse.equipmentLines, { equipmentLineId: newId("equipment"), categoryId: questionnaire.pricing.equipmentCategories[0]?.id ?? "other", description: "", quantity: 1 }] })}><Plus size={14} aria-hidden="true" /> Add equipment</button></div>
                {activeResponse.equipmentLines.length ? <div className="mt-3 space-y-3">{activeResponse.equipmentLines.map((line) => <div className="grid gap-3 rounded-md border border-[#dce4eb] p-3 sm:grid-cols-[150px_1fr_90px_auto] sm:items-end" key={line.equipmentLineId}>
                  <label className={labelClass}>Category<select className={fieldClass} value={line.categoryId} disabled={disabled} onChange={(event) => updateRoom({ ...activeResponse, equipmentLines: activeResponse.equipmentLines.map((entry) => entry.equipmentLineId === line.equipmentLineId ? { ...entry, categoryId: event.target.value } : entry) })}>{questionnaire.pricing.equipmentCategories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label>
                  <label className={labelClass}>Description, including make/model<input className={fieldClass} value={line.description} disabled={disabled} onChange={(event) => updateRoom({ ...activeResponse, equipmentLines: activeResponse.equipmentLines.map((entry) => entry.equipmentLineId === line.equipmentLineId ? { ...entry, description: event.target.value } : entry) })} /></label>
                  <label className={labelClass}>Quantity<input className={fieldClass} type="number" min="1" value={line.quantity} disabled={disabled} onChange={(event) => updateRoom({ ...activeResponse, equipmentLines: activeResponse.equipmentLines.map((entry) => entry.equipmentLineId === line.equipmentLineId ? { ...entry, quantity: Number(event.target.value) } : entry) })} /></label>
                  <button type="button" disabled={disabled} className="mb-0.5 grid h-10 w-10 place-items-center rounded-md text-[#718496] hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${line.description || "equipment line"}`} onClick={() => updateRoom({ ...activeResponse, equipmentLines: activeResponse.equipmentLines.filter((entry) => entry.equipmentLineId !== line.equipmentLineId) })}><Trash2 size={16} aria-hidden="true" /></button>
                </div>)}</div> : <p className="mt-3 rounded-md border border-dashed border-[#ccd8e2] p-4 text-sm text-[#718496]">No equipment lines added. Add only the equipment you are proposing for this room.</p>}

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...new Set(activeResponse.equipmentLines.map((line) => line.categoryId))].map((categoryId) => {
                  const category = questionnaire.pricing.equipmentCategories.find((entry) => entry.id === categoryId);
                  const total = activeResponse.categoryTotals.find((entry) => entry.categoryId === categoryId);
                  return <label className={labelClass} key={categoryId}>{category?.label ?? categoryId} subtotal
                    <div className="relative"><span className="pointer-events-none absolute left-3 top-3 text-sm text-[#718496]">{questionnaire.pricing.currency}</span><input className={`${fieldClass} pl-12 text-right tabular-nums`} inputMode="decimal" value={total ? moneyInput(total.amount.amountMinor, precision) : ""} disabled={disabled} onChange={(event) => {
                      const totals = activeResponse.categoryTotals.filter((entry) => entry.categoryId !== categoryId);
                      totals.push({ categoryId, amount: { amountMinor: moneyFromInput(event.target.value, precision), currency: questionnaire.pricing.currency } });
                      updateRoom({ ...activeResponse, categoryTotals: totals });
                    }} /></div>
                  </label>;
                })}</div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#42576a]">C · Room labor</h3><button type="button" disabled={disabled || questionnaire.crew.roles.length === 0} className="inline-flex items-center gap-1.5 rounded-md border border-[#008ad2] px-3 py-2 text-xs font-extrabold text-[#0075b4] hover:bg-[#eef8fd] disabled:opacity-50" onClick={() => updateRoom({ ...activeResponse, laborLines: [...activeResponse.laborLines, { laborLineId: newId("labor"), roleId: questionnaire.crew.roles[0]?.id ?? "", days: 1, regularHours: 0, overtimeHours: 0, travel: false, notes: "" }] })}><Plus size={14} aria-hidden="true" /> Add labor</button></div>
                <div className="mt-3 space-y-3">{activeResponse.laborLines.map((line) => <div className="grid gap-3 rounded-md border border-[#dce4eb] p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_70px_80px_80px_1fr_auto] lg:items-end" key={line.laborLineId}>
                  <label className={labelClass}>Position<select className={fieldClass} value={line.roleId} disabled={disabled} onChange={(event) => updateRoom({ ...activeResponse, laborLines: activeResponse.laborLines.map((entry) => entry.laborLineId === line.laborLineId ? { ...entry, roleId: event.target.value } : entry) })}>{questionnaire.crew.roles.map((role) => <option value={role.id} key={role.id}>{role.label}</option>)}</select></label>
                  {(["days", "regularHours", "overtimeHours"] as const).map((key) => <label className={labelClass} key={key}>{key === "regularHours" ? "Reg hrs" : key === "overtimeHours" ? "OT hrs" : "Days"}<input className={fieldClass} type="number" min="0" value={line[key]} disabled={disabled} onChange={(event) => updateRoom({ ...activeResponse, laborLines: activeResponse.laborLines.map((entry) => entry.laborLineId === line.laborLineId ? { ...entry, [key]: Number(event.target.value) } : entry) })} /></label>)}
                  <label className={labelClass}>Notes<input className={fieldClass} value={line.notes} disabled={disabled} onChange={(event) => updateRoom({ ...activeResponse, laborLines: activeResponse.laborLines.map((entry) => entry.laborLineId === line.laborLineId ? { ...entry, notes: event.target.value } : entry) })} /></label>
                  <button type="button" disabled={disabled} className="mb-0.5 grid h-10 w-10 place-items-center rounded-md text-[#718496] hover:bg-rose-50 hover:text-rose-600" aria-label="Remove labor line" onClick={() => updateRoom({ ...activeResponse, laborLines: activeResponse.laborLines.filter((entry) => entry.laborLineId !== line.laborLineId) })}><Trash2 size={16} aria-hidden="true" /></button>
                  <label className="flex items-center gap-2 text-xs font-bold text-[#42576a] lg:col-span-full"><input type="checkbox" className="h-4 w-4 accent-[#008ad2]" checked={line.travel} disabled={disabled} onChange={(event) => updateRoom({ ...activeResponse, laborLines: activeResponse.laborLines.map((entry) => entry.laborLineId === line.laborLineId ? { ...entry, travel: event.target.checked } : entry) })} />This position requires travel</label>
                </div>)}</div>
                <label className={`${labelClass} mt-4 block max-w-xs`}>Room labor subtotal<div className="relative"><span className="pointer-events-none absolute left-3 top-3 text-sm text-[#718496]">{questionnaire.pricing.currency}</span><input className={`${fieldClass} pl-12 text-right tabular-nums`} inputMode="decimal" value={moneyInput(activeResponse.laborSubtotal.amountMinor, precision)} disabled={disabled} onChange={(event) => updateRoom({ ...activeResponse, laborSubtotal: { amountMinor: moneyFromInput(event.target.value, precision), currency: questionnaire.pricing.currency } })} /></div></label>
              </div>

              {activeDefinition.streamingApplicable && activeResponse.hybrid ? <fieldset className="mt-8 border-t border-[#e6ebef] pt-6"><legend className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#42576a]">D · Streaming delivery</legend><div className="mt-3 grid gap-4">{([
                ["feedHandoff", "Stream feed handoff", "Describe format, protocol, and handoff point."],
                ["redundancy", "Broadcast redundancy", "Describe encoder, network, power, and failover coverage."],
                ["virtualAudienceExperience", "Virtual audience experience", "Describe what remote attendees see and hear."],
              ] as const).map(([key, label, placeholder]) => <label className={labelClass} key={key}>{label} *<textarea className={textAreaClass} value={activeResponse.hybrid?.[key] ?? ""} disabled={disabled} placeholder={placeholder} onChange={(event) => updateRoom({ ...activeResponse, hybrid: { ...activeResponse.hybrid!, [key]: event.target.value } })} /></label>)}</div></fieldset> : null}
            </div>
          ) : null}

          {questionnaire.hybrid.platformPlanRequired ? <label className={`${labelClass} mt-8 block border-t border-[#e6ebef] pt-6`}>Event-wide platform integration plan *<textarea className={textAreaClass} value={response.platformIntegrationPlan} disabled={disabled} placeholder="Explain how room feeds integrate with the client’s event platform." onChange={(event) => onChange({ ...response, platformIntegrationPlan: event.target.value })} /><span className="mt-1 block text-right font-normal text-[#718496]">{response.platformIntegrationPlan.trim() ? response.platformIntegrationPlan.trim().split(/\s+/).length : 0}/{questionnaire.hybrid.platformPlanMaxWords} words</span></label> : null}
        </>
      )}
    </WorkspaceSection>
  );
}

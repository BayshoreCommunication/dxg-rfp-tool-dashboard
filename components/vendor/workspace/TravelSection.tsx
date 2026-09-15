import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type {
  LodgingRequest,
  VendorResponseV1,
} from "@/contracts/generated/vendor-response-v1";
import { CalendarDays, Hotel } from "lucide-react";
import WorkspaceSection, { fieldClass } from "./WorkspaceSection";

const nights = (start?: string, end?: string) => {
  if (!start || !end || end <= start) return 0;
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000,
  );
};

export default function TravelSection({
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
    (entry) => entry.sectionId === "travel",
  );
  const roomNames = new Map(
    questionnaire.rooms.map((room) => [room.roomId, room.name]),
  );
  const roleNames = new Map(
    questionnaire.crew.roles.map((role) => [role.id, role.label]),
  );
  const lines = response.rooms.flatMap((room) =>
    room.laborLines
      .filter((line) => line.travel)
      .map((line) => ({ roomId: room.roomId, line })),
  );
  const update = (
    roomId: string,
    laborLineId: string,
    patch: Partial<LodgingRequest>,
  ) => {
    const existing = response.travel.lodgingRequests.find(
      (entry) => entry.laborLineId === laborLineId,
    );
    const base: LodgingRequest = existing ?? {
      roomId,
      laborLineId,
      clientProvidedRoom: false,
    };
    const next = { ...base, ...patch };
    if (!next.clientProvidedRoom) {
      delete next.checkIn;
      delete next.checkOut;
    }
    onChange({
      ...response,
      travel: {
        lodgingRequests: [
          ...response.travel.lodgingRequests.filter(
            (entry) => entry.laborLineId !== laborLineId,
          ),
          next,
        ],
      },
    });
  };
  const totalNights = lines.reduce((sum, { line }) => {
    const request = response.travel.lodgingRequests.find(
      (entry) => entry.laborLineId === line.laborLineId,
    );
    return sum + nights(request?.checkIn, request?.checkOut);
  }, 0);
  return (
    <WorkspaceSection
      number={sectionNumber}
      title={section?.title ?? "Travel & crew housing"}
      helperText={
        section?.helperText ??
        "Traveling room-labor positions appear here automatically. Confirm whether each person needs a client-provided hotel room."
      }
      evaluationMappings={section?.evaluationMappings}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-[#d8ebf5] bg-[#eef8fd] p-4">
        <Hotel size={20} className="text-[#008ad2]" aria-hidden="true" />
        <div>
          <p className="text-sm font-extrabold text-[#16283c]">
            {lines.length} traveling position{lines.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-[#607487]">
            Travel dollars remain in the pricing summary; hotel room nights are
            tracked here.
          </p>
        </div>
        <span className="ml-auto rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#0069a0]">
          {totalNights} room night{totalNights === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-3">
        {lines.map(({ roomId, line }) => {
          const request = response.travel.lodgingRequests.find(
            (entry) => entry.laborLineId === line.laborLineId,
          );
          const clientProvided = request?.clientProvidedRoom ?? false;
          return (
            <fieldset
              key={line.laborLineId}
              className="rounded-md border border-[#dce4eb] p-4"
            >
              <legend className="sr-only">
                Travel for {roleNames.get(line.roleId) ?? line.roleId}
              </legend>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-[#16283c]">
                    {roleNames.get(line.roleId) ?? line.roleId}
                  </p>
                  <p className="text-xs text-[#607487]">
                    {roomNames.get(roomId) ?? roomId} · {line.days} day
                    {line.days === 1 ? "" : "s"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-[#42576a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#008ad2]"
                    checked={clientProvided}
                    disabled={disabled}
                    onChange={(event) =>
                      update(roomId, line.laborLineId, {
                        clientProvidedRoom: event.target.checked,
                      })
                    }
                  />
                  Client-provided room
                </label>
              </div>
              {clientProvided ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-[#42576a]">
                    Check-in *
                    <input
                      className={fieldClass}
                      type="date"
                      value={request?.checkIn ?? ""}
                      disabled={disabled}
                      onChange={(event) =>
                        update(roomId, line.laborLineId, {
                          checkIn: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="text-xs font-bold text-[#42576a]">
                    Check-out *
                    <input
                      className={fieldClass}
                      type="date"
                      value={request?.checkOut ?? ""}
                      disabled={disabled}
                      onChange={(event) =>
                        update(roomId, line.laborLineId, {
                          checkOut: event.target.value,
                        })
                      }
                    />
                  </label>
                  <p className="flex items-center gap-2 text-xs font-bold text-[#607487] sm:col-span-2">
                    <CalendarDays size={14} aria-hidden="true" />
                    {nights(request?.checkIn, request?.checkOut) ||
                      "Valid dates required"}{" "}
                    {nights(request?.checkIn, request?.checkOut) === 1
                      ? "night"
                      : "nights"}
                  </p>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </WorkspaceSection>
  );
}

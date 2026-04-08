"use client";

import { RotateCcw } from "lucide-react";
import GlobalDateTimeInput from "@/components/shared/GlobalDateTimeInput";
import type { ProposalSettings, RoomByRoomData } from "../AddNewProposal";

const labelClass =
  "mb-2 block text-sm font-semibold text-[#8f98bf] uppercase tracking-wide";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

const normalizeDateFormat = (format: string) =>
  (format || "MM/DD/YYYY").replaceAll("_", "-").toUpperCase();

type DateTimePickerFormat = "dd-MM-yyyy" | "yyyy-MM-dd" | "MM-dd-yyyy";

const toPickerFormat = (displayFormat: string): DateTimePickerFormat => {
  const f = displayFormat.toUpperCase();
  if (f === "DD/MM/YYYY") return "dd-MM-yyyy";
  if (f === "YYYY-MM-DD") return "yyyy-MM-dd";
  return "MM-dd-yyyy"; 
};

const fromStringToDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date;
};

const fromDateToString = (value: Date | null) => {
  if (!value) return "";
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface RoombyRoomAvFormProps {
  data: RoomByRoomData;
  onChange: (updates: Partial<RoomByRoomData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

type RoomByRoomStringKey = {
  [K in keyof RoomByRoomData]: RoomByRoomData[K] extends string ? K : never;
}[keyof RoomByRoomData];

const YesNoField = ({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex gap-6">
    {["Yes", "No"].map((opt) => (
      <label
        key={`${name}-${opt}`}
        className="flex items-center gap-2 cursor-pointer text-sm text-[#1f2d5d]"
      >
        <input
          type="radio"
          name={name}
          checked={value === opt}
          onChange={() => onChange(opt)}
          className="accent-[#35bdf2] h-4 w-4"
        />
        {opt}
      </label>
    ))}
  </div>
);

const YesNoWithQty = ({
  name,
  value,
  qty,
  onValueChange,
  onQtyChange,
}: {
  name: string;
  value: string;
  qty: string;
  onValueChange: (value: string) => void;
  onQtyChange: (qty: string) => void;
}) => (
  <div className="space-y-3">
    <YesNoField name={name} value={value} onChange={onValueChange} />
    {value === "Yes" && (
      <input
        className={inputClass}
        placeholder="How many?"
        value={qty}
        onChange={(e) => onQtyChange(e.target.value)}
      />
    )}
  </div>
);

const RadioOptionsField = ({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-wrap gap-6">
    {options.map((opt) => (
      <label
        key={`${name}-${opt}`}
        className="flex items-center gap-2 cursor-pointer text-sm text-[#1f2d5d]"
      >
        <input
          type="radio"
          name={name}
          checked={value === opt}
          onChange={() => onChange(opt)}
          className="accent-[#35bdf2] h-4 w-4"
        />
        {opt}
      </label>
    ))}
  </div>
);

const ACTIVE_ROOM_BY_ROOM_FIELDS: Array<keyof RoomByRoomData> = [
  "roomFunction",
  "estimatedAttendeesInRoom",
  "loadInDateTime",
  "rehearsalDateTime",
  "showStartDateTime",
  "showEndDateTime",
  "audioSystemForHowManyPpl",
  "podiumMic",
  "wirelessMics",
  "audioRecording",
  "largeMonitorsOrScreenProjector",
  "ledWall",
  "clientProvideOwnPresentationLaptop",
  "presentationLaptops",
  "videoPlayback",
  "videoFormatAspectRatio",
  "audienceQa",
  "cameras",
  "videoRecording",
  "stageWashLighting",
  "backlightingFor",
  "drapeOrScenicUplighting",
  "audienceLighting",
  "programConfidenceMonitor",
  "notesConfidenceMonitor",
  "speakerTimer",
  "scenicStageDesign",
  "contentVideoNeeds",
];

const RoombyRoomAvForm = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
}: RoombyRoomAvFormProps) => {
  const currentDateFormat = normalizeDateFormat(
    proposalSettings.proposals.dateFormat,
  );
  const pickerFormat = toPickerFormat(currentDateFormat);

  const handleYesNoChange = (
    valueField: RoomByRoomStringKey,
    value: string,
    resetFields: RoomByRoomStringKey[] = [],
  ) => {
    const updates: Partial<RoomByRoomData> = {
      [valueField]: value,
    } as Partial<RoomByRoomData>;

    if (value !== "Yes") {
      resetFields.forEach((field) => {
        updates[field] = "";
      });
    }

    onChange(updates);
  };

  const handleYesNoWithQtyValueChange = (
    valueField: RoomByRoomStringKey,
    qtyField: RoomByRoomStringKey,
    value: string,
  ) => {
    onChange({
      [valueField]: value,
      [qtyField]: value === "Yes" ? data[qtyField] : "",
    } as Partial<RoomByRoomData>);
  };

  const handleClear = () => {
    onChange({
      roomFunction: "",
      estimatedAttendeesInRoom: "",
      loadInDateTime: "",
      rehearsalDateTime: "",
      showStartDateTime: "",
      showEndDateTime: "",
      audioSystemForHowManyPpl: "",
      podiumMic: { podiumMic: "", podiumMicQty: "" },
      wirelessMics: { wirelessMics: "", wirelessMicsQty: "", wirelessMicsType: "" },
      audioRecording: "",
      largeMonitorsOrScreenProjector: { largeMonitorsOrScreenProjector: "", largeMonitorsQty: "" },
      ledWall: "",
      clientProvideOwnPresentationLaptop: { clientProvideOwnPresentationLaptop: "", clientLaptopQty: "" },
      presentationLaptops: { presentationLaptops: "", presentationLaptopQty: "" },
      videoPlayback: { videoPlayback: "", videoPlaybackCount: "" },
      videoFormatAspectRatio: "",
      audienceQa: { audienceQa: "", audienceQaMethod: "" },
      cameras: { cameras: "", camerasQty: "" },
      videoRecording: { videoRecording: "", videoRecordingType: "" },
      stageWashLighting: { stageWashLighting: "", stageWashLightingStageSize: "" },
      backlightingFor: "",
      drapeOrScenicUplighting: "",
      audienceLighting: "",
      programConfidenceMonitor: { programConfidenceMonitor: "", programConfidenceMonitorQty: "" },
      notesConfidenceMonitor: { notesConfidenceMonitor: "", notesConfidenceMonitorQty: "" },
      speakerTimer: "",
      scenicStageDesign: "",
      contentVideoNeeds: "",
    });
  };

  const requiredError = (value: string) => showErrors && !value.trim();
  const confidenceMonitors = {
    program: {
      value: data.programConfidenceMonitor?.programConfidenceMonitor || "",
      qty: data.programConfidenceMonitor?.programConfidenceMonitorQty || "",
    },
    notes: {
      value: data.notesConfidenceMonitor?.notesConfidenceMonitor || "",
      qty: data.notesConfidenceMonitor?.notesConfidenceMonitorQty || "",
    },
  };

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{
        fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)`,
      }}
    >
      <div className="px-6 py-5 border-b border-[#d7dce3]">
        <h2 className="text-[20px] font-semibold text-[#0f1b57]">
          Room-by-Room AV Needs
        </h2>
      </div>

      <div className="flex-1 px-6 py-6 space-y-6">
        <div>
          <label className={labelClass}>
            Room Name or Function <span className="text-red-500">*</span>
          </label>
          <input
            className={`${inputClass} ${requiredError(data.roomFunction) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            value={data.roomFunction}
            onChange={(e) => onChange({ roomFunction: e.target.value })}
            placeholder="Enter room/function"
          />
        </div>

        <div>
          <label className={labelClass}>
            Estimated Attendees in this Room{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            className={`${inputClass} ${requiredError(data.estimatedAttendeesInRoom) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            value={data.estimatedAttendeesInRoom}
            onChange={(e) =>
              onChange({ estimatedAttendeesInRoom: e.target.value })
            }
            placeholder="Enter attendee count"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <GlobalDateTimeInput
              label="Load-in"
              value={fromStringToDate(data.loadInDateTime)}
              onChange={(date) => onChange({ loadInDateTime: fromDateToString(date) })}
              format={pickerFormat}
              showTime
              use12Hours
              hideLabel={false}
              showFormatInLabel={false}
              showErrorMessage={false}
              labelClassName={`${labelClass} lowercase capitalize-first`}
              inputClassName={`${inputClass} pr-10 ${requiredError(data.loadInDateTime) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            />
            {requiredError(data.loadInDateTime) && (
              <p className="mt-1 text-sm text-red-500">Load-in time is required.</p>
            )}
          </div>
          <div>
            <GlobalDateTimeInput
              label="Rehearsal"
              value={fromStringToDate(data.rehearsalDateTime)}
              onChange={(date) => onChange({ rehearsalDateTime: fromDateToString(date) })}
              format={pickerFormat}
              showTime
              use12Hours
              hideLabel={false}
              showFormatInLabel={false}
              showErrorMessage={false}
              labelClassName={`${labelClass} lowercase capitalize-first`}
              inputClassName={`${inputClass} pr-10 ${requiredError(data.rehearsalDateTime) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            />
            {requiredError(data.rehearsalDateTime) && (
              <p className="mt-1 text-sm text-red-500">Rehearsal time is required.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <GlobalDateTimeInput
              label="Show Start"
              value={fromStringToDate(data.showStartDateTime)}
              onChange={(date) => onChange({ showStartDateTime: fromDateToString(date) })}
              format={pickerFormat}
              showTime
              use12Hours
              hideLabel={false}
              showFormatInLabel={false}
              showErrorMessage={false}
              labelClassName={`${labelClass} lowercase capitalize-first`}
              inputClassName={`${inputClass} pr-10 ${requiredError(data.showStartDateTime) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            />
            {requiredError(data.showStartDateTime) && (
              <p className="mt-1 text-sm text-red-500">Show start time is required.</p>
            )}
          </div>
          <div>
            <GlobalDateTimeInput
              label="Show End"
              value={fromStringToDate(data.showEndDateTime)}
              onChange={(date) => onChange({ showEndDateTime: fromDateToString(date) })}
              format={pickerFormat}
              showTime
              use12Hours
              hideLabel={false}
              showFormatInLabel={false}
              showErrorMessage={false}
              labelClassName={`${labelClass} lowercase capitalize-first`}
              inputClassName={`${inputClass} pr-10 ${requiredError(data.showEndDateTime) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            />
            {requiredError(data.showEndDateTime) && (
              <p className="mt-1 text-sm text-red-500">Show end time is required.</p>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Audio System For How Many PPL (Planner Enter How Many PPL)
          </label>
          <input
            className={inputClass}
            value={data.audioSystemForHowManyPpl}
            onChange={(e) =>
              onChange({ audioSystemForHowManyPpl: e.target.value })
            }
            placeholder="Enter people count"
          />
        </div>

        <div>
          <label className={labelClass}>Podium Mic</label>
          <YesNoField
            name="podiumMic"
            value={data.podiumMic.podiumMic}
            onChange={(v) =>
              onChange({
                podiumMic: { ...data.podiumMic, podiumMic: v, podiumMicQty: v !== "Yes" ? "" : data.podiumMic.podiumMicQty },
              })
            }
          />
        </div>

        <div>
          <label className={labelClass}>Wireless Mics</label>
          <div className="space-y-3">
            <YesNoWithQty
              name="wirelessMics"
              value={data.wirelessMics.wirelessMics}
              qty={data.wirelessMics.wirelessMicsQty}
              onValueChange={(v) =>
                onChange({
                  wirelessMics: { wirelessMics: v, wirelessMicsQty: v !== "Yes" ? "" : data.wirelessMics.wirelessMicsQty, wirelessMicsType: v !== "Yes" ? "" : data.wirelessMics.wirelessMicsType },
                })
              }
              onQtyChange={(v) => onChange({ wirelessMics: { ...data.wirelessMics, wirelessMicsQty: v } })}
            />
            {data.wirelessMics.wirelessMics === "Yes" && (
              <div>
                <label className={labelClass}>Wireless Mic Type</label>
                <RadioOptionsField
                  name="wirelessMicsType"
                  value={data.wirelessMics.wirelessMicsType}
                  options={["Handhelds", "Headset Mics"]}
                  onChange={(v) => onChange({ wirelessMics: { ...data.wirelessMics, wirelessMicsType: v } })}
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Audio Recording</label>
          <YesNoField
            name="audioRecording"
            value={data.audioRecording}
            onChange={(v) => onChange({ audioRecording: v })}
          />
        </div>

        <div>
          <label className={labelClass}>
            Large Monitors or Screen &amp; Projector
          </label>
          <YesNoWithQty
            name="largeMonitorsOrScreenProjector"
            value={data.largeMonitorsOrScreenProjector.largeMonitorsOrScreenProjector}
            qty={data.largeMonitorsOrScreenProjector.largeMonitorsQty}
            onValueChange={(v) =>
              onChange({
                largeMonitorsOrScreenProjector: {
                  largeMonitorsOrScreenProjector: v,
                  largeMonitorsQty: v !== "Yes" ? "" : data.largeMonitorsOrScreenProjector.largeMonitorsQty,
                },
              })
            }
            onQtyChange={(v) =>
              onChange({ largeMonitorsOrScreenProjector: { ...data.largeMonitorsOrScreenProjector, largeMonitorsQty: v } })
            }
          />
        </div>

        <div>
          <label className={labelClass}>LED Wall</label>
          <YesNoField
            name="ledWall"
            value={data.ledWall}
            onChange={(v) => onChange({ ledWall: v })}
          />
        </div>

        <div>
          <label className={labelClass}>
            Client Provide Own Presentation Laptop
          </label>
          <YesNoWithQty
            name="clientProvideOwnPresentationLaptop"
            value={data.clientProvideOwnPresentationLaptop.clientProvideOwnPresentationLaptop}
            qty={data.clientProvideOwnPresentationLaptop.clientLaptopQty}
            onValueChange={(v) =>
              onChange({
                clientProvideOwnPresentationLaptop: {
                  clientProvideOwnPresentationLaptop: v,
                  clientLaptopQty: v !== "Yes" ? "" : data.clientProvideOwnPresentationLaptop.clientLaptopQty,
                },
              })
            }
            onQtyChange={(v) =>
              onChange({ clientProvideOwnPresentationLaptop: { ...data.clientProvideOwnPresentationLaptop, clientLaptopQty: v } })
            }
          />
        </div>

        <div>
          <label className={labelClass}>Presentation Laptops</label>
          <YesNoWithQty
            name="presentationLaptops"
            value={data.presentationLaptops.presentationLaptops}
            qty={data.presentationLaptops.presentationLaptopQty}
            onValueChange={(v) =>
              onChange({
                presentationLaptops: {
                  presentationLaptops: v,
                  presentationLaptopQty: v !== "Yes" ? "" : data.presentationLaptops.presentationLaptopQty,
                },
              })
            }
            onQtyChange={(v) =>
              onChange({ presentationLaptops: { ...data.presentationLaptops, presentationLaptopQty: v } })
            }
          />
        </div>

        <div>
          <label className={labelClass}>Video Playback</label>
          <div className="space-y-3">
            <YesNoField
              name="videoPlayback"
              value={data.videoPlayback.videoPlayback}
              onChange={(v) =>
                onChange({
                  videoPlayback: {
                    videoPlayback: v,
                    videoPlaybackCount: v !== "Yes" ? "" : data.videoPlayback.videoPlaybackCount,
                  },
                })
              }
            />
            {data.videoPlayback.videoPlayback === "Yes" && (
              <input
                className={inputClass}
                value={data.videoPlayback.videoPlaybackCount}
                onChange={(e) =>
                  onChange({ videoPlayback: { ...data.videoPlayback, videoPlaybackCount: e.target.value } })
                }
                placeholder="How many?"
              />
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Select format/aspect ratio</label>
          <RadioOptionsField
            name="videoFormatAspectRatio"
            value={data.videoFormatAspectRatio}
            options={["16:9 format", "Unique Aspect Ratio", "Both"]}
            onChange={(v) => onChange({ videoFormatAspectRatio: v })}
          />
        </div>

        <div>
          <label className={labelClass}>Audience Q&amp;A</label>
          <div className="space-y-3">
            <YesNoField
              name="audienceQa"
              value={data.audienceQa.audienceQa}
              onChange={(v) =>
                onChange({
                  audienceQa: {
                    audienceQa: v,
                    audienceQaMethod: v !== "Yes" ? "" : data.audienceQa.audienceQaMethod,
                  },
                })
              }
            />
            {data.audienceQa.audienceQa === "Yes" && (
              <RadioOptionsField
                name="audienceQaMethod"
                value={data.audienceQa.audienceQaMethod}
                options={[
                  "Via an App",
                  "Passing a Microphone",
                  "Both",
                ]}
                onChange={(v) => onChange({ audienceQa: { ...data.audienceQa, audienceQaMethod: v } })}
              />
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Cameras</label>
          <YesNoWithQty
            name="cameras"
            value={data.cameras.cameras}
            qty={data.cameras.camerasQty}
            onValueChange={(v) =>
              onChange({
                cameras: {
                  cameras: v,
                  camerasQty: v !== "Yes" ? "" : data.cameras.camerasQty,
                },
              })
            }
            onQtyChange={(v) => onChange({ cameras: { ...data.cameras, camerasQty: v } })}
          />
        </div>

        <div>
          <label className={labelClass}>Video Recording</label>
          <div className="space-y-3">
            <YesNoField
              name="videoRecording"
              value={data.videoRecording.videoRecording}
              onChange={(v) =>
                onChange({
                  videoRecording: {
                    videoRecording: v,
                    videoRecordingType: v !== "Yes" ? "" : data.videoRecording.videoRecordingType,
                  },
                })
              }
            />
            {data.videoRecording.videoRecording === "Yes" && (
              <RadioOptionsField
                name="videoRecordingType"
                value={data.videoRecording.videoRecordingType}
                options={[
                  "Camera Feed Only",
                  "Presentation Only",
                  "Side by Side (Camera and Presentation)",
                  "All The Above",
                ]}
                onChange={(v) => onChange({ videoRecording: { ...data.videoRecording, videoRecordingType: v } })}
              />
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Stage Wash Lighting</label>
          <div className="space-y-3">
            <YesNoField
              name="stageWashLighting"
              value={data.stageWashLighting.stageWashLighting}
              onChange={(v) =>
                onChange({
                  stageWashLighting: {
                    stageWashLighting: v,
                    stageWashLightingStageSize: v !== "Yes" ? "" : data.stageWashLighting.stageWashLightingStageSize,
                  },
                })
              }
            />
            {data.stageWashLighting.stageWashLighting === "Yes" && (
              <input
                className={inputClass}
                value={data.stageWashLighting.stageWashLightingStageSize}
                onChange={(e) =>
                  onChange({ stageWashLighting: { ...data.stageWashLighting, stageWashLightingStageSize: e.target.value } })
                }
                placeholder="Enter stage size"
              />
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Backlighting for Video</label>
          <YesNoField
            name="backlightingFor"
            value={data.backlightingFor}
            onChange={(v) => onChange({ backlightingFor: v })}
          />
        </div>

        <div>
          <label className={labelClass}>Drape or Scenic Uplighting</label>
          <YesNoField
            name="drapeOrScenicUplighting"
            value={data.drapeOrScenicUplighting}
            onChange={(v) => onChange({ drapeOrScenicUplighting: v })}
          />
        </div>

        <div>
          <label className={labelClass}>Audience Lighting</label>
          <YesNoField
            name="audienceLighting"
            value={data.audienceLighting}
            onChange={(v) => onChange({ audienceLighting: v })}
          />
        </div>

        <div>
          <label className={labelClass}>
            Program Confidence Monitor - If yes how many add
          </label>
          <YesNoWithQty
            name="programConfidenceMonitor"
            value={confidenceMonitors.program.value}
            qty={confidenceMonitors.program.qty}
            onValueChange={(v) =>
              onChange({
                programConfidenceMonitor: {
                  ...data.programConfidenceMonitor,
                  programConfidenceMonitor: v,
                  programConfidenceMonitorQty:
                    v === "Yes"
                      ? data.programConfidenceMonitor
                          ?.programConfidenceMonitorQty || ""
                      : "",
                },
              })
            }
            onQtyChange={(v) =>
              onChange({
                programConfidenceMonitor: {
                  ...data.programConfidenceMonitor,
                  programConfidenceMonitorQty: v,
                },
              })
            }
          />
        </div>

        <div>
          <label className={labelClass}>
            Notes Confidence Monitor - Yes How many
          </label>
          <YesNoWithQty
            name="notesConfidenceMonitor"
            value={confidenceMonitors.notes.value}
            qty={confidenceMonitors.notes.qty}
            onValueChange={(v) =>
              onChange({
                notesConfidenceMonitor: {
                  ...data.notesConfidenceMonitor,
                  notesConfidenceMonitor: v,
                  notesConfidenceMonitorQty:
                    v === "Yes"
                      ? data.notesConfidenceMonitor?.notesConfidenceMonitorQty ||
                        ""
                      : "",
                },
              })
            }
            onQtyChange={(v) =>
              onChange({
                notesConfidenceMonitor: {
                  ...data.notesConfidenceMonitor,
                  notesConfidenceMonitorQty: v,
                },
              })
            }
          />
        </div>

        <div>
          <label className={labelClass}>Speaker Timer</label>
          <YesNoField
            name="speakerTimer"
            value={data.speakerTimer}
            onChange={(v) => onChange({ speakerTimer: v })}
          />
        </div>

        <div>
          <label className={labelClass}>Scenic / Stage Design?</label>
          <YesNoField
            name="scenicStageDesign"
            value={data.scenicStageDesign}
            onChange={(v) => onChange({ scenicStageDesign: v })}
          />
        </div>

        <div>
          <label className={labelClass}>
            Describe your content or video needs
          </label>
          <textarea
            rows={4}
            className="w-full rounded-md border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
            placeholder="Describe your requirements..."
            value={data.contentVideoNeeds}
            onChange={(e) => onChange({ contentVideoNeeds: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-2 text-sm font-semibold text-[#8f98bf] hover:text-red-400 transition-colors"
        >
          <RotateCcw size={15} />
          CLEAR
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-6 rounded-md border border-[#d7dce3] text-sm font-semibold text-[#1f2d5d] hover:bg-gray-50 transition-colors"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-10 px-8 rounded-md bg-[#35bdf2] hover:bg-[#20A4D5] text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </section>
  );
};

export default RoombyRoomAvForm;

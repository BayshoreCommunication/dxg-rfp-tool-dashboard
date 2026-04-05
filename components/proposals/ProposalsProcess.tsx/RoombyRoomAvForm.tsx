"use client";

import { RotateCcw } from "lucide-react";
import type { ProposalSettings, RoomByRoomData } from "../AddNewProposal";

const labelClass =
  "mb-2 block text-sm font-semibold text-[#8f98bf] uppercase tracking-wide";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

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

const RoombyRoomAvForm = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
}: RoombyRoomAvFormProps) => {
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
      podiumMic: "",
      podiumMicQty: "",
      wirelessMics: "",
      wirelessMicsQty: "",
      wirelessMicsType: "",
      audioRecording: "",
      largeMonitorsOrScreenProjector: "",
      largeMonitorsQty: "",
      ledWall: "",
      clientProvideOwnPresentationLaptop: "",
      clientLaptopQty: "",
      presentationLaptops: "",
      presentationLaptopQty: "",
      videoPlayback: "",
      videoPlaybackCount: "",
      videoFormatAspectRatio: "",
      audienceQa: "",
      audienceQaMethod: "",
      cameras: "",
      camerasQty: "",
      videoRecording: "",
      videoRecordingType: "",
      stageWashLighting: "",
      stageWashLightingStageSize: "",
      backlightingFor: "",
      drapeOrScenicUplighting: "",
      audienceLighting: "",
      programConfidenceMonitor: "",
      programConfidenceMonitorQty: "",
      notesConfidenceMonitor: "",
      notesConfidenceMonitorQty: "",
      speakerTimer: "",
      scenicStageDesign: "",
      contentVideoNeeds: "",
      // legacy room-by-room keys reset too
      numberOfRooms: "",
      ceilingHeight: "",
      roomSetup: "",
      showPrep: "",
      showSize: "",
      hasPipeAndDrape: false,
      showRig: false,
      rigPowerSize: "",
      preferredRigging: [],
      decibelLimitation: "",
      avSpec: "",
      avPa: "",
      mainSound: "",
      mainSoundSize: "",
      hearingImpaired: "",
      preferredA1: "",
      recordAudio: "",
      chairs: "",
      stageRisers: [],
      backdropsWallSize: "",
      scenicElements: false,
      videoStage: false,
      frontScreen: "",
      stageDimensions: "",
      confidenceMonitor: "",
      confidenceMonitorCount: "",
      projectorsProvided: "",
      projectorCount: "",
      cameraPackage: "",
      cameraCount: "",
      livestreamNeeded: "",
      lightingPackage: "",
      lightingConsole: "",
      teleprompterNeeded: "",
      showCallingRequired: "",
    });
  };

  const requiredError = (value: string) => showErrors && !value.trim();

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
            <label className={labelClass}>
              Load-in <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className={`${inputClass} ${requiredError(data.loadInDateTime) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              value={data.loadInDateTime}
              onChange={(e) => onChange({ loadInDateTime: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>
              Rehearsal <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className={`${inputClass} ${requiredError(data.rehearsalDateTime) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              value={data.rehearsalDateTime}
              onChange={(e) => onChange({ rehearsalDateTime: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Show Start <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className={`${inputClass} ${requiredError(data.showStartDateTime) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              value={data.showStartDateTime}
              onChange={(e) => onChange({ showStartDateTime: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>
              Show End <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className={`${inputClass} ${requiredError(data.showEndDateTime) ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              value={data.showEndDateTime}
              onChange={(e) => onChange({ showEndDateTime: e.target.value })}
            />
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
            value={data.podiumMic}
            onChange={(v) => handleYesNoChange("podiumMic", v, ["podiumMicQty"])}
          />
        </div>

        <div>
          <label className={labelClass}>Wireless Mics</label>
          <div className="space-y-3">
            <YesNoWithQty
              name="wirelessMics"
              value={data.wirelessMics}
              qty={data.wirelessMicsQty}
              onValueChange={(v) =>
                handleYesNoChange("wirelessMics", v, [
                  "wirelessMicsQty",
                  "wirelessMicsType",
                ])
              }
              onQtyChange={(v) => onChange({ wirelessMicsQty: v })}
            />
            {data.wirelessMics === "Yes" && (
              <div>
                <label className={labelClass}>Wireless Mic Type</label>
                <RadioOptionsField
                  name="wirelessMicsType"
                  value={data.wirelessMicsType}
                  options={["Handhelds", "Headset Mics"]}
                  onChange={(v) => onChange({ wirelessMicsType: v })}
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
            value={data.largeMonitorsOrScreenProjector}
            qty={data.largeMonitorsQty}
            onValueChange={(v) =>
              handleYesNoWithQtyValueChange(
                "largeMonitorsOrScreenProjector",
                "largeMonitorsQty",
                v,
              )
            }
            onQtyChange={(v) => onChange({ largeMonitorsQty: v })}
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
            value={data.clientProvideOwnPresentationLaptop}
            qty={data.clientLaptopQty}
            onValueChange={(v) =>
              handleYesNoWithQtyValueChange(
                "clientProvideOwnPresentationLaptop",
                "clientLaptopQty",
                v,
              )
            }
            onQtyChange={(v) => onChange({ clientLaptopQty: v })}
          />
        </div>

        <div>
          <label className={labelClass}>Presentation Laptops</label>
          <YesNoWithQty
            name="presentationLaptops"
            value={data.presentationLaptops}
            qty={data.presentationLaptopQty}
            onValueChange={(v) =>
              handleYesNoWithQtyValueChange(
                "presentationLaptops",
                "presentationLaptopQty",
                v,
              )
            }
            onQtyChange={(v) => onChange({ presentationLaptopQty: v })}
          />
        </div>

        <div>
          <label className={labelClass}>Video Playback</label>
          <div className="space-y-3">
            <YesNoField
              name="videoPlayback"
              value={data.videoPlayback}
              onChange={(v) =>
                handleYesNoChange("videoPlayback", v, ["videoPlaybackCount"])
              }
            />
            {data.videoPlayback === "Yes" && (
              <input
                className={inputClass}
                value={data.videoPlaybackCount}
                onChange={(e) =>
                  onChange({ videoPlaybackCount: e.target.value })
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
              value={data.audienceQa}
              onChange={(v) =>
                handleYesNoChange("audienceQa", v, ["audienceQaMethod"])
              }
            />
            {data.audienceQa === "Yes" && (
              <RadioOptionsField
                name="audienceQaMethod"
                value={data.audienceQaMethod}
                options={[
                  "Via an App",
                  "Passing a Microphone",
                  "Both",
                ]}
                onChange={(v) => onChange({ audienceQaMethod: v })}
              />
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Cameras</label>
          <YesNoWithQty
            name="cameras"
            value={data.cameras}
            qty={data.camerasQty}
            onValueChange={(v) =>
              handleYesNoWithQtyValueChange("cameras", "camerasQty", v)
            }
            onQtyChange={(v) => onChange({ camerasQty: v })}
          />
        </div>

        <div>
          <label className={labelClass}>Video Recording</label>
          <div className="space-y-3">
            <YesNoField
              name="videoRecording"
              value={data.videoRecording}
              onChange={(v) =>
                handleYesNoChange("videoRecording", v, ["videoRecordingType"])
              }
            />
            {data.videoRecording === "Yes" && (
              <RadioOptionsField
                name="videoRecordingType"
                value={data.videoRecordingType}
                options={[
                  "Camera Feed Only",
                  "Presentation Only",
                  "Side by Side (Camera and Presentation)",
                  "All The Above",
                ]}
                onChange={(v) => onChange({ videoRecordingType: v })}
              />
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Stage Wash Lighting</label>
          <div className="space-y-3">
            <YesNoField
              name="stageWashLighting"
              value={data.stageWashLighting}
              onChange={(v) =>
                handleYesNoChange("stageWashLighting", v, [
                  "stageWashLightingStageSize",
                ])
              }
            />
            {data.stageWashLighting === "Yes" && (
              <input
                className={inputClass}
                value={data.stageWashLightingStageSize}
                onChange={(e) =>
                  onChange({ stageWashLightingStageSize: e.target.value })
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
            value={data.programConfidenceMonitor}
            qty={data.programConfidenceMonitorQty}
            onValueChange={(v) =>
              handleYesNoWithQtyValueChange(
                "programConfidenceMonitor",
                "programConfidenceMonitorQty",
                v,
              )
            }
            onQtyChange={(v) => onChange({ programConfidenceMonitorQty: v })}
          />
        </div>

        <div>
          <label className={labelClass}>
            Notes Confidence Monitor - Yes How many
          </label>
          <YesNoWithQty
            name="notesConfidenceMonitor"
            value={data.notesConfidenceMonitor}
            qty={data.notesConfidenceMonitorQty}
            onValueChange={(v) =>
              handleYesNoWithQtyValueChange(
                "notesConfidenceMonitor",
                "notesConfidenceMonitorQty",
                v,
              )
            }
            onQtyChange={(v) => onChange({ notesConfidenceMonitorQty: v })}
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

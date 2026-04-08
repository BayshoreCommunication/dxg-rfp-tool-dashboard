import type { TemplateOneData } from "../TemplateOne";

type Step2RoombyRoomAVNeedsProps = {
  proposalData?: any;
};

export default function Step2RoombyRoomAVNeeds({
  proposalData,
}: Step2RoombyRoomAVNeedsProps) {
  const data = proposalData || {};

  // Formatter to extract a clean string from either a flat string or a nested object
  const formatValue = (field: any, prefix?: string): string => {
    if (!field) return "";
    
    // If string
    if (typeof field === "string") {
      return field === "No" ? "" : field;
    }

    // If array
    if (Array.isArray(field)) {
      return field.filter(Boolean).join(", ");
    }
    
    // If object (e.g. { wirelessMics: "Yes", wirelessMicsQty: "141", wirelessMicsType: "Headset Mics" })
    let isYes = false;
    const details: string[] = [];
    
    // Scan inner keys
    for (const [key, val] of Object.entries(field)) {
      if (typeof val === "string") {
        if (val.toLowerCase() === "yes") {
          isYes = true;
        } else if (val && val.toLowerCase() !== "no") {
          details.push(val);
        }
      }
    }
    
    if (!isYes && details.length === 0) return "";
    
    if (isYes && details.length > 0) {
      return `Yes (${details.join(", ")})`;
    } else if (details.length > 0) {
      return details.join(", ");
    }
    
    return isYes ? "Yes" : "";
  };

  const avItems = [
    { label: "Function", value: formatValue(data.roomFunction) },
    { label: "Attendees", value: formatValue(data.estimatedAttendeesInRoom) },
    { label: "Show Timing", value: [formatValue(data.showStartDateTime), formatValue(data.showEndDateTime)].filter(Boolean).join(" - ") },
    { label: "Podium Mic", value: formatValue(data.podiumMic) },
    { label: "Wireless Mics", value: formatValue(data.wirelessMics) },
    { label: "Audio Recording", value: formatValue(data.audioRecording) },
    { label: "Cameras", value: formatValue(data.cameras) },
    { label: "LED Wall", value: formatValue(data.ledWall) },
    { label: "Large Monitors", value: formatValue(data.largeMonitorsOrScreenProjector) },
    { label: "Presentation Laptops", value: formatValue(data.presentationLaptops) },
    { label: "Client Laptops", value: formatValue(data.clientProvideOwnPresentationLaptop) },
    { label: "Video Playback", value: formatValue(data.videoPlayback) },
    { label: "Video Format", value: formatValue(data.videoFormatAspectRatio) },
    { label: "Audience Q&A", value: formatValue(data.audienceQa) },
    { label: "Video Recording", value: formatValue(data.videoRecording) },
    { label: "Stage Wash Lighting", value: formatValue(data.stageWashLighting) },
    { label: "Backlighting", value: formatValue(data.backlightingFor) },
    { label: "Scenic Uplighting", value: formatValue(data.drapeOrScenicUplighting) },
    { label: "Audience Lighting", value: formatValue(data.audienceLighting) },
    { label: "Program Confidence", value: formatValue(data.programConfidenceMonitor) },
    { label: "Notes Confidence", value: formatValue(data.notesConfidenceMonitor) },
    { label: "Speaker Timer", value: formatValue(data.speakerTimer) },
    { label: "Scenic Stage Design", value: formatValue(data.scenicStageDesign) },
  ].filter((item) => item.value?.trim());

  const hasLedSection = Boolean(data?.contentVideoNeeds);

  if (avItems.length === 0 && !hasLedSection) {
    return null;
  }

  return (
    <section className="bg-white py-24 relative">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className="h-[2px] w-10 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          <span
            className="font-bold tracking-[0.14em] text-sm uppercase"
            style={{ color: "var(--color-primary)" }}
          >
            Step 2: Technical Specifications
          </span>
          <div
            className="h-[2px] w-10 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-12 text-center">
          Room-by-Room <span style={{ color: "var(--color-primary)" }}>AV Needs</span>
        </h2>

        {avItems.length > 0 && (
          <div
            className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-[2.5rem] mb-12 shadow-sm"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-primary) 3%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--color-primary) 10%, transparent)",
            }}
          >
            {avItems.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="bg-white p-6 rounded-[1.5rem] border border-slate-200/70 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 transition-all duration-300"
              >
                <p className="text-xs uppercase tracking-[0.08em] mb-2 font-bold text-slate-500">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-slate-800 leading-tight">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {hasLedSection && (
          <div
            className="w-full p-8 md:p-12 rounded-[2.5rem] border shadow-xl shadow-slate-200/40 transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              backgroundImage:
                "linear-gradient(135deg, color-mix(in srgb, var(--color-primary-start) 6%, white), color-mix(in srgb, var(--color-primary-end) 6%, white))",
              borderColor:
                "color-mix(in srgb, var(--color-primary) 20%, transparent)",
            }}
          >
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start text-center lg:text-left">
              <div className="flex-1">
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                  Content & Video Needs
                </h3>
                <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-4xl font-medium">
                  {data.contentVideoNeeds}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

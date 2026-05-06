type Step2RoombyRoomAVNeedsProps = {
  // Accepts either a full rooms array OR a single legacy room object
  proposalData?: Record<string, unknown>[] | Record<string, unknown> | null;
};

export default function Step2RoombyRoomAVNeeds({
  proposalData,
}: Step2RoombyRoomAVNeedsProps) {

  // Normalise to array regardless of format
  const allRooms: Record<string, unknown>[] = Array.isArray(proposalData)
    ? (proposalData as Record<string, unknown>[]).filter(Boolean)
    : proposalData && typeof proposalData === "object"
      ? [proposalData as Record<string, unknown>]
      : [];

  // Formatter: handles string | string[] | nested object
  const formatValue = (field: any): string => {
    if (!field) return "";
    if (typeof field === "string") return field === "No" ? "" : field;
    if (Array.isArray(field)) return field.filter(Boolean).join(", ");

    let isYes = false;
    const details: string[] = [];
    for (const val of Object.values(field)) {
      if (typeof val === "string") {
        if (val.toLowerCase() === "yes") isYes = true;
        else if (val && val.toLowerCase() !== "no") details.push(val);
      }
    }
    if (!isYes && details.length === 0) return "";
    if (isYes && details.length > 0) return `Yes (${details.join(", ")})`;
    return details.length > 0 ? details.join(", ") : "Yes";
  };

  // Build AV items for a single room (excludes production fields handled in Step3)
  const buildRoomAvItems = (r: Record<string, unknown>) =>
    [
      { label: "Attendees",           value: formatValue(r.estimatedAttendeesInRoom) },
      { label: "Load In",             value: formatValue(r.loadInDateTime) },
      { label: "Rehearsal",           value: formatValue(r.rehearsalDateTime) },
      { label: "Show Start",          value: formatValue(r.showStartDateTime) },
      { label: "Show End",            value: formatValue(r.showEndDateTime) },
      { label: "Audio Sys for Ppl",   value: formatValue(r.audioSystemForHowManyPpl) },
      { label: "Podium Mic",          value: formatValue(r.podiumMic) },
      { label: "Wireless Mics",       value: formatValue(r.wirelessMics) },
      { label: "Large Monitors",      value: formatValue(r.largeMonitorsOrScreenProjector) },
      { label: "Client Laptops",      value: formatValue(r.clientProvideOwnPresentationLaptop) },
      { label: "Presentation Laptops",value: formatValue(r.presentationLaptops) },
      { label: "Video Playback",      value: formatValue(r.videoPlayback) },
      { label: "Audience Q&A",        value: formatValue(r.audienceQa) },
      { label: "Cameras",             value: formatValue(r.cameras) },
      { label: "Video Recording",     value: formatValue(r.videoRecording) },
      { label: "Audio Recording",     value: formatValue(r.audioRecording) },
      { label: "Stage Wash Lighting", value: formatValue(r.stageWashLighting) },
      { label: "LED Wall",            value: formatValue(r.ledWall) },
      { label: "Video Format",        value: formatValue(r.videoFormatAspectRatio) },
      { label: "Backlighting",        value: formatValue(r.backlightingFor) },
      { label: "Scenic Uplighting",   value: formatValue(r.drapeOrScenicUplighting) },
      { label: "Audience Lighting",   value: formatValue(r.audienceLighting) },
      { label: "Program Confidence",  value: formatValue(r.programConfidenceMonitor) },
      { label: "Notes Confidence",    value: formatValue(r.notesConfidenceMonitor) },
      { label: "Speaker Timer",       value: formatValue(r.speakerTimer) },
    ].filter((item) => item.value?.trim());

  // Per-room sections — only include rooms that have at least one AV item
  const roomSections = allRooms.map((r, idx) => ({
    roomName: (r.roomFunction as string)?.trim() || `Room ${idx + 1}`,
    avItems: buildRoomAvItems(r),
  })).filter((rs) => rs.avItems.length > 0);

  // Collect contentVideoNeeds from first room that has it
  const contentVideoNeeds = allRooms
    .map((r) => (r.contentVideoNeeds as string)?.trim())
    .find(Boolean);

  if (roomSections.length === 0 && !contentVideoNeeds) return null;

  return (
    <section className="bg-white py-24 relative">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center">
        {/* Section label */}
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

        {/* One block per room */}
        {roomSections.map((rs, roomIdx) => (
          <div key={roomIdx} className="w-full mb-10">
            {/* Room name header */}
            <div className="flex items-center gap-3 mb-5">
              <span
                className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-black shrink-0 shadow-sm"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {roomIdx + 1}
              </span>
              <h3
                className="text-xl font-black uppercase tracking-widest"
                style={{ color: "var(--color-primary)" }}
              >
                {rs.roomName}
              </h3>
            </div>

            {/* AV items grid */}
            <div
              className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-[2.5rem] shadow-sm"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-primary) 3%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-primary) 10%, transparent)",
              }}
            >
              {rs.avItems.map((item, index) => (
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

            {/* Divider between rooms */}
            {roomIdx < roomSections.length - 1 && (
              <div className="mt-10 border-t border-slate-100" />
            )}
          </div>
        ))}

        {/* Content & Video Needs — shown once from first room that has it */}
        {contentVideoNeeds && (
          <div
            className="w-full p-8 md:p-12 rounded-[2.5rem] border shadow-xl shadow-slate-200/40 mt-4 transition-transform duration-300 hover:-translate-y-0.5"
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
                  Content &amp; Video Needs
                </h3>
                <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-4xl font-medium">
                  {contentVideoNeeds}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

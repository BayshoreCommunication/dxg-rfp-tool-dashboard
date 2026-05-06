type RoomData = Record<string, unknown>;

type CombinedRoomAVProductionProps = {
  proposalData?: RoomData[] | RoomData | null;
};

export default function Step2RoombyRoomAVNeeds({
  proposalData,
}: CombinedRoomAVProductionProps) {

  // ── Normalise to array ───────────────────────────────────────────────────────
  const allRooms: RoomData[] = Array.isArray(proposalData)
    ? (proposalData as RoomData[]).filter(Boolean)
    : proposalData && typeof proposalData === "object"
      ? [proposalData as RoomData]
      : [];

  // ── Value formatter ──────────────────────────────────────────────────────────
  const fv = (field: any): string => {
    if (!field && field !== 0) return "";
    if (typeof field === "string") return field === "No" ? "" : field;
    if (Array.isArray(field)) return field.filter(Boolean).join(", ");
    // Guard: only process plain objects (prevents string chars being iterated)
    if (typeof field !== "object" || field === null) return "";
    let isYes = false;
    const details: string[] = [];
    for (const [key, val] of Object.entries(field as object)) {
      // Skip numeric-string index keys (artefact of corrupted string spread)
      if (/^\d+$/.test(key)) continue;
      if (typeof val === "string") {
        if (val.toLowerCase() === "yes") isYes = true;
        else if (val && val.toLowerCase() !== "no") details.push(val);
      }
    }
    if (!isYes && details.length === 0) return "";
    if (isYes && details.length > 0) return `Yes — ${details.join(", ")}`;
    return details.length > 0 ? details.join(", ") : "Yes";
  };

  // ── AV items per room ────────────────────────────────────────────────────────
  const buildAvItems = (r: RoomData) =>
    [
      { label: "Attendees",             value: fv(r.estimatedAttendeesInRoom) },
      { label: "Load In",               value: fv(r.loadInDateTime) },
      { label: "Rehearsal",             value: fv(r.rehearsalDateTime) },
      { label: "Show Start",            value: fv(r.showStartDateTime) },
      { label: "Show End",              value: fv(r.showEndDateTime) },
      { label: "Audio Sys · Capacity",  value: fv(r.audioSystemForHowManyPpl) },
      { label: "Podium Mic",            value: fv(r.podiumMic) },
      { label: "Wireless Mics",         value: fv(r.wirelessMics) },
      { label: "Large Monitors",        value: fv(r.largeMonitorsOrScreenProjector) },
      { label: "Client Laptops",        value: fv(r.clientProvideOwnPresentationLaptop) },
      { label: "Pres. Laptops",         value: fv(r.presentationLaptops) },
      { label: "Video Playback",        value: fv(r.videoPlayback) },
      { label: "Audience Q&A",          value: fv(r.audienceQa) },
      { label: "Cameras",               value: fv(r.cameras) },
      { label: "Video Recording",       value: fv(r.videoRecording) },
      { label: "Audio Recording",       value: fv(r.audioRecording) },
      { label: "Stage Wash",            value: fv(r.stageWashLighting) },
      { label: "LED Wall",              value: fv(r.ledWall) },
      { label: "Video Format",          value: fv(r.videoFormatAspectRatio) },
      { label: "Backlighting",          value: fv(r.backlightingFor) },
      { label: "Scenic Uplighting",     value: fv(r.drapeOrScenicUplighting) },
      { label: "Audience Lighting",     value: fv(r.audienceLighting) },
      { label: "Prog. Monitor",         value: fv(r.programConfidenceMonitor) },
      { label: "Notes Monitor",         value: fv(r.notesConfidenceMonitor) },
      { label: "Speaker Timer",         value: fv(r.speakerTimer) },
    ].filter((i) => i.value?.trim());

  // ── Production fields per room ───────────────────────────────────────────────
  const getProduction = (r: RoomData) => ({
    scenic:       (r.scenicStageDesign as string)?.trim(),
    union:        (r.unionLabor as string)?.trim(),
    contentVideo: (r.contentVideoNeeds as string)?.trim(),
    crew:         Array.isArray(r.showCrewNeeded) ? (r.showCrewNeeded as string[]) : [],
    otherRoles:   (r.otherRolesNeeded as string)?.trim(),
  });

  // ── Filter to rooms that have at least something to show ─────────────────────
  const roomSections = allRooms.map((r, idx) => {
    const avItems = buildAvItems(r);
    const prod    = getProduction(r);
    const roomName = (r.roomFunction as string)?.trim() || `Room ${idx + 1}`;
    const hasProd  = Boolean(
      (prod.scenic && prod.scenic !== "No") ||
      (prod.union  && prod.union  !== "No") ||
      prod.contentVideo ||
      prod.crew.length > 0 ||
      prod.otherRoles,
    );
    return { roomName, avItems, prod, hasProd };
  }).filter((rs) => rs.avItems.length > 0 || rs.hasProd);

  if (roomSections.length === 0) return null;

  return (
    <>
      {roomSections.map((rs, roomIdx) => (
        <section
          key={roomIdx}
          className="relative overflow-hidden py-24"
          style={{
            backgroundColor: "#ffffff",
            backgroundImage: `
              radial-gradient(circle at 0% 0%,   color-mix(in srgb, var(--color-primary-start) 12%, transparent) 0%, transparent 42%),
              radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-primary-end) 9%,  transparent) 0%, transparent 45%)
            `,
          }}
        >
          <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center">

            {/* ── Section badge ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div
                className="h-[2px] w-10 rounded-full"
                style={{ backgroundColor: "var(--color-primary)" }}
              />
              <span
                className="font-bold tracking-[0.14em] text-sm uppercase"
                style={{ color: "var(--color-primary)" }}
              >
                {roomSections.length === 1
                  ? "Step 2 · Room AV & Production"
                  : `Room ${roomIdx + 1} of ${roomSections.length}`}
              </span>
              <div
                className="h-[2px] w-10 rounded-full"
                style={{ backgroundColor: "var(--color-primary)" }}
              />
            </div>

            {/* ── Room heading ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 mb-12 text-center">
              <span
                className="flex items-center justify-center w-11 h-11 rounded-full text-white text-base font-black shrink-0 shadow-lg"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {roomIdx + 1}
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900">
                {rs.roomName}
                {roomSections.length > 1 && (
                  <span className="ml-3 font-normal text-2xl text-slate-400"> · AV &amp; Production</span>
                )}
              </h2>
            </div>

            {/* ── AV Items grid (same style as Step1 info cards) ────────────── */}
            {rs.avItems.length > 0 && (
              <>
                <div
                  className="w-full mb-4 pb-4 flex items-center gap-3"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Technical AV Specifications
                  </p>
                </div>

                <div
                  className="w-full mb-16 p-4 sm:p-6 rounded-[2rem] border border-slate-200/80 backdrop-blur-xl shadow-xl shadow-slate-200/40"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {rs.avItems.map((item, idx) => (
                      <article
                        key={`${item.label}-${idx}`}
                        className="group relative min-h-[140px] rounded-2xl p-5 bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 ease-out hover:-translate-y-0.5"
                      >
                        <h3 className="inline-flex items-center gap-2 text-slate-500 text-[11px] uppercase tracking-[0.12em] mb-3 font-semibold group-hover:text-slate-800 transition-colors">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: "var(--color-primary)" }}
                          />
                          {item.label}
                        </h3>
                        <div className="flex h-full flex-col justify-center">
                          <p className="text-lg sm:text-xl font-bold text-slate-900 leading-snug break-words">
                            {item.value}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Production Support (same bg, accent panel) ────────────────── */}
            {rs.hasProd && (
              <>
                <div className="w-full mb-4 flex items-center gap-3">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Production &amp; Crew
                  </p>
                </div>

                <div
                  className="w-full rounded-[2rem] overflow-hidden border border-slate-200/80 shadow-xl shadow-slate-200/40"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
                  }}
                >
                  {/* Scenic + Union badges row */}
                  {((rs.prod.scenic && rs.prod.scenic !== "No") ||
                    (rs.prod.union  && rs.prod.union  !== "No")) && (
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100">
                      {rs.prod.scenic && rs.prod.scenic !== "No" && (
                        <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                          <span className="text-slate-700 font-bold uppercase text-sm tracking-[0.04em]">
                            Scenic / Stage Design
                          </span>
                          <span
                            className="px-4 py-1.5 rounded-full text-sm font-black uppercase text-white shadow-sm"
                            style={{ backgroundColor: "var(--color-primary)" }}
                          >
                            {rs.prod.scenic}
                          </span>
                        </div>
                      )}
                      {rs.prod.union && rs.prod.union !== "No" && (
                        <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                          <span className="text-slate-700 font-bold uppercase text-sm tracking-[0.04em]">
                            Union Labor
                          </span>
                          <span className="px-4 py-1.5 bg-amber-400 text-amber-950 rounded-full text-sm font-black uppercase shadow-sm">
                            {rs.prod.union}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content / Video Needs */}
                  {rs.prod.contentVideo && (
                    <div className="px-6 py-5 border-b border-slate-100">
                      <p className="text-xs uppercase tracking-[0.1em] text-slate-400 mb-2 font-bold">
                        Content / Video Needs
                      </p>
                      <p className="text-slate-800 text-lg font-semibold leading-relaxed">
                        {rs.prod.contentVideo}
                      </p>
                    </div>
                  )}

                  {/* Crew Roster */}
                  {rs.prod.crew.length > 0 && (
                    <div className="px-6 py-6 border-b border-slate-100">
                      <p className="text-xs uppercase tracking-[0.1em] text-slate-400 mb-4 font-bold">
                        Assigned Crew Roster
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {rs.prod.crew.map((role) => (
                          <div
                            key={role}
                            className="group py-4 px-3 rounded-xl text-center border border-slate-200 bg-white shadow-sm hover:shadow-md hover:scale-[1.03] transition-all duration-300"
                            style={{
                              borderTopWidth: "3px",
                              borderTopColor: "var(--color-primary)",
                            }}
                          >
                            <span className="text-xs font-black text-slate-800 uppercase tracking-[0.04em]">
                              {role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Roles */}
                  {rs.prod.otherRoles && (
                    <div className="px-6 py-5">
                      <p className="text-xs uppercase tracking-[0.1em] text-slate-400 mb-2 font-bold">
                        Additional Roles / Notes
                      </p>
                      <p className="text-slate-800 text-lg font-semibold leading-relaxed">
                        {rs.prod.otherRoles}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </section>
      ))}
    </>
  );
}

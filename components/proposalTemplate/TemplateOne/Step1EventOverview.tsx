import type { TemplateOneData } from "../TemplateOne";

type Step1EventOverviewProps = {
  proposalData?: Partial<TemplateOneData>;
};

const toLabelValue = (entry: string) => {
  const idx = entry.indexOf(":");
  if (idx === -1) {
    return { label: "Detail", value: entry.trim() };
  }
  return {
    label: entry.slice(0, idx).trim(),
    value: entry.slice(idx + 1).trim(),
  };
};

const formatDateByPattern = (value?: string, dateFormat?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  switch ((dateFormat || "").trim().toUpperCase()) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    default:
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  }
};

const CalendarIcon = () => (
  <svg
    className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

export default function Step1EventOverview({
  proposalData
}: Step1EventOverviewProps) {
  const data = proposalData;

  const parsedSummary = (data?.summaryBullets || []).map(toLabelValue);
  const parsedMeta = (data?.metaChips || []).map(toLabelValue);
  const findValue = (labels: string[]) => {
    const all = [...parsedSummary, ...parsedMeta];
    const found = all.find((entry) =>
      labels.some((label) => entry.label.toLowerCase() === label.toLowerCase()),
    );
    return found?.value || "";
  };

  const startDateValue = findValue(["Start Date", "Start"]);
  const endDateValue = findValue(["End Date", "End"]);
  const eventFormatValue = findValue(["Event Format", "Format"]);
  const attendeesValue = findValue(["Attendees", "Number of Attendees"]);
  const eventVenueValue = findValue(["Venue", "Event Venue"]);

  const infoItems = [
    startDateValue || endDateValue
      ? {
          label: "Event Dates",
          value: "",
        }
      : null,
    eventFormatValue
      ? { label: "Event Format", value: eventFormatValue }
      : null,
    attendeesValue
      ? { label: "Number of Attendees", value: attendeesValue }
      : null,
    eventVenueValue ? { label: "Event Venue", value: eventVenueValue } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  const formattedCreatedAt = formatDateByPattern(
    data?.createdAt,
    data?.proposalSetting?.proposals?.dateFormat,
  );

  return (
    <section
      className="font-sans min-h-[90vh] flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundColor: "#ffffff",
        backgroundImage: `
            radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--color-primary-start) 15%, transparent) 0%, transparent 40%),
            radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-primary-end) 12%, transparent) 0%, transparent 45%)
          `,
      }}
    >
      <div className="max-w-[1280px] w-full mx-auto px-6 py-20 flex flex-col items-center text-center relative z-10">
        {formattedCreatedAt && (
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="h-[2px] w-12 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            />
            <span
              className="font-bold tracking-[0.14em] text-sm md:text-base uppercase"
              style={{ color: "var(--color-primary)" }}
            >
              {`Proposal Submitted: ${formattedCreatedAt}`}
            </span>
            <div
              className="h-[2px] w-12 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            />
          </div>
        )}

        {(data?.titleLineOne || data?.titleLineTwo) && (
          <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-black tracking-tight leading-[1.05] mb-8 text-slate-900">
            {data?.titleLineOne || ""} {data?.titleLineTwo ? <br /> : null}
            {data?.titleLineTwo && (
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, var(--color-primary-start), var(--color-primary-end))",
                }}
              >
                {data.titleLineTwo}
              </span>
            )}
          </h1>
        )}

        {data?.heroText && (
          <p className="text-slate-700 text-xl md:text-2xl max-w-3xl mb-14 leading-relaxed font-medium">
            {data.heroText}
          </p>
        )}

        {infoItems.length > 0 && (
          <section
            className="w-full max-w-6xl mx-auto mb-16 p-4 sm:p-6 rounded-[2rem] border border-slate-200/80 backdrop-blur-xl shadow-xl shadow-slate-200/40"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {infoItems.map((item, index) => (
                <article
                  key={index}
                  className="group relative h-full min-h-[168px] rounded-2xl p-5 bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 ease-out hover:-translate-y-0.5"
                >
                  <h3 className="inline-flex items-center gap-2 text-slate-500 text-[11px] sm:text-xs uppercase tracking-[0.12em] mb-3 font-semibold group-hover:text-slate-800 transition-colors">
                    <span
                      className="h-2 w-2 rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: "var(--color-primary, #3b82f6)" }}
                    />
                    {item.label}
                  </h3>

                  {item.label.toLowerCase().includes("event dates") ? (
                    <div className="space-y-3 flex h-full flex-col justify-center">
                      {startDateValue && (
                        <div className="flex items-start gap-2.5 text-slate-900 font-semibold text-sm sm:text-base leading-tight">
                          <CalendarIcon />
                          <span className="break-words">{`Start Date: ${startDateValue}`}</span>
                        </div>
                      )}
                      {endDateValue && (
                        <div className="flex items-start gap-2.5 text-slate-900 font-semibold text-sm sm:text-base leading-tight">
                          <CalendarIcon />
                          <span className="break-words">{`End Date: ${endDateValue}`}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col justify-center">
                      <p className="whitespace-pre-line text-lg sm:text-xl font-bold text-slate-900 leading-snug break-words">
                        {item.value}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

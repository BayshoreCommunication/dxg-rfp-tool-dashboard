"use client";

import {
  CalendarDays,
  CheckCircle2,
  Eye,
  Mail,
  MapPin,
  Phone,
  Presentation,
  Sparkles,
  UserRound,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  getProposalByIdAction,
  incrementProposalViewsAction,
} from "@/app/actions/proposals";

type ProposalData = {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  viewsCount?: number;
  proposalLink?: string;
  event?: {
    eventName?: string;
    startDate?: string;
    endDate?: string;
    venue?: string;
    attendees?: string;
    eventFormat?: string;
    eventType?: string;
    eventTypeOther?: string;
  };
  roomByRoom?: {
    roomFunction?: string;
    numberOfRooms?: string;
    ceilingHeight?: string;
    roomSetup?: string;
    showPrep?: string;
    showSize?: string;
    hasPipeAndDrape?: boolean;
    showRig?: boolean;
    rigPowerSize?: string;
    preferredRigging?: string[];
    decibelLimitation?: string;
    avSpec?: string;
    avPa?: string;
    mainSound?: string;
    mainSoundSize?: string;
    hearingImpaired?: string;
    preferredA1?: string;
    recordAudio?: string;
    chairs?: string;
    stageRisers?: string[];
    backdropsWallSize?: string;
    scenicElements?: boolean;
    videoStage?: boolean;
    frontScreen?: string;
    contentVideoNeeds?: string;
  };
  production?: {
    scenicStageDesign?: string;
    unionLabor?: string;
    showCrewNeeded?: string[];
    otherRolesNeeded?: string;
  };
  venue?: {
    needRiggingForFlown?: string;
    riggingPlotOrSpecs?: string;
    needDedicatedPowerDrops?: string;
    standardAmpWall?: string;
    powerDropsHowMany?: string;
  };
  uploads?: {
    supportDocuments?: string[];
    reviewExistingAvQuote?: string;
    avQuoteFiles?: string[];
  };
  budget?: {
    estimatedAvBudget?: string;
    budgetCustomAmount?: string;
    proposalFormatPreferences?: string[];
    timelineForProposal?: string;
    callWithDxgProducer?: string;
    howDidYouHear?: string;
    howDidYouHearOther?: string;
  };
  contact?: {
    contactFirstName?: string;
    contactLastName?: string;
    contactTitle?: string;
    contactOrganization?: string;
    contactEmail?: string;
    contactPhone?: string;
    anythingElse?: string;
  };
};

const extractObjectId = (slugOrId?: string | null) => {
  if (!slugOrId || typeof slugOrId !== "string") {
    return "";
  }
  const match = slugOrId.match(/[a-fA-F0-9]{24}$/);
  return match?.[0] || "";
};

const showValue = (value?: string | number | boolean | null) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined) return "-";
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : "-";
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function ProposalView({ slug }: { slug?: string }) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const incrementedRef = useRef(false);

  const proposalId = useMemo(() => extractObjectId(slug), [slug]);

  useEffect(() => {
    let mounted = true;

    const loadProposal = async () => {
      if (!proposalId) {
        if (!mounted) return;
        setError("Invalid proposal link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const res = await getProposalByIdAction(proposalId);
      if (!mounted) return;

      if (!res.success || !res.data || typeof res.data !== "object") {
        setError(res.message || "Proposal not found.");
        setProposal(null);
        setLoading(false);
        return;
      }

      const current = res.data as ProposalData;
      setProposal(current);
      setLoading(false);

      if (!incrementedRef.current) {
        incrementedRef.current = true;
        const viewsRes = await incrementProposalViewsAction(proposalId);
        if (!mounted) return;
        if (
          viewsRes.success &&
          viewsRes.data &&
          typeof viewsRes.data === "object"
        ) {
          setProposal(viewsRes.data as ProposalData);
        }
      }
    };

    void loadProposal();

    return () => {
      mounted = false;
    };
  }, [proposalId]);

  if (loading) {
    return <ProposalViewSkeleton />;
  }

  if (error || !proposal) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h2 className="text-lg font-bold">Unable to load proposal</h2>
          <p className="mt-2 text-sm">{error || "Proposal not found."}</p>
        </div>
      </div>
    );
  }

  const title = proposal.event?.eventName || "Untitled Proposal";
  const fullName =
    `${proposal.contact?.contactFirstName || ""} ${proposal.contact?.contactLastName || ""}`.trim();
  const views = proposal.viewsCount ?? 0;
  const createdAt = formatDate(proposal.createdAt);
  const updatedAt = formatDate(proposal.updatedAt);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0%,_#f8fafc_45%,_#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8 ">
      <div className="mx-auto w-full max-w-[1280px] space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-cyan-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-blue-200/35 blur-3xl" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-700">
                <Sparkles size={13} />
                Proposal Overview
              </p>
              <h1 className="mt-4 text-2xl font-black leading-tight text-slate-900 sm:text-4xl">
                {title}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <InfoBadge label="Status" value={showValue(proposal.status)} />
                <InfoBadge label="Created" value={createdAt} />
                <InfoBadge label="Updated" value={updatedAt} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="Views"
                value={showValue(views)}
                icon={<Eye size={16} />}
              />
              <StatCard
                label="Attendees"
                value={showValue(proposal.event?.attendees)}
                icon={<UserRound size={16} />}
              />
              <StatCard
                label="Event Type"
                value={showValue(
                  proposal.event?.eventTypeOther || proposal.event?.eventType,
                )}
                icon={<Presentation size={16} />}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Panel title="Event Details" icon={<CalendarDays size={16} />}>
            <FieldRow label="Event Name" value={proposal.event?.eventName} />
            <FieldRow label="Start Date" value={proposal.event?.startDate} />
            <FieldRow label="End Date" value={proposal.event?.endDate} />
            <FieldRow label="Venue" value={proposal.event?.venue} />
            <FieldRow label="Attendees" value={proposal.event?.attendees} />
            <FieldRow label="Format" value={proposal.event?.eventFormat} />
            <FieldRow label="Type" value={proposal.event?.eventType} />
            <FieldRow
              label="Type (Other)"
              value={proposal.event?.eventTypeOther}
            />
          </Panel>

          <Panel title="Contact Details" icon={<UserRound size={16} />}>
            <FieldRow label="Full Name" value={fullName} />
            <FieldRow label="Title" value={proposal.contact?.contactTitle} />
            <FieldRow
              label="Organization"
              value={proposal.contact?.contactOrganization}
            />
            <FieldRow
              label="Email"
              value={proposal.contact?.contactEmail}
              icon={<Mail size={13} />}
            />
            <FieldRow
              label="Phone"
              value={proposal.contact?.contactPhone}
              icon={<Phone size={13} />}
            />
            <FieldRow
              label="Notes"
              value={proposal.contact?.anythingElse}
              multiline
            />
          </Panel>

          <Panel title="Venue & Power" icon={<MapPin size={16} />}>
            <FieldRow
              label="Need Rigging"
              value={proposal.venue?.needRiggingForFlown}
            />
            <FieldRow
              label="Rigging Specs"
              value={proposal.venue?.riggingPlotOrSpecs}
              multiline
            />
            <FieldRow
              label="Dedicated Power"
              value={proposal.venue?.needDedicatedPowerDrops}
            />
            <FieldRow
              label="Standard Amp Wall"
              value={proposal.venue?.standardAmpWall}
            />
            <FieldRow
              label="Power Drop Count"
              value={proposal.venue?.powerDropsHowMany}
            />
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Room & AV Requirements"
            icon={<CheckCircle2 size={16} />}
          >
            <FieldRow
              label="Room Function"
              value={proposal.roomByRoom?.roomFunction}
            />
            <FieldRow
              label="Number of Rooms"
              value={proposal.roomByRoom?.numberOfRooms}
            />
            <FieldRow
              label="Ceiling Height"
              value={proposal.roomByRoom?.ceilingHeight}
            />
            <FieldRow
              label="Room Setup"
              value={proposal.roomByRoom?.roomSetup}
            />
            <FieldRow label="Show Prep" value={proposal.roomByRoom?.showPrep} />
            <FieldRow label="Show Size" value={proposal.roomByRoom?.showSize} />
            <FieldRow
              label="Pipe & Drape"
              value={proposal.roomByRoom?.hasPipeAndDrape}
            />
            <FieldRow label="Show Rig" value={proposal.roomByRoom?.showRig} />
            <FieldRow
              label="Rig Power Size"
              value={proposal.roomByRoom?.rigPowerSize}
            />
            <ChipRow
              label="Preferred Rigging"
              values={proposal.roomByRoom?.preferredRigging}
            />
            <FieldRow
              label="Decibel Limitation"
              value={proposal.roomByRoom?.decibelLimitation}
            />
            <FieldRow label="AV Spec" value={proposal.roomByRoom?.avSpec} />
            <FieldRow label="AV PA" value={proposal.roomByRoom?.avPa} />
            <FieldRow
              label="Main Sound"
              value={proposal.roomByRoom?.mainSound}
            />
            <FieldRow
              label="Main Sound Size"
              value={proposal.roomByRoom?.mainSoundSize}
            />
            <FieldRow
              label="Hearing Impaired"
              value={proposal.roomByRoom?.hearingImpaired}
            />
            <FieldRow
              label="Preferred A1"
              value={proposal.roomByRoom?.preferredA1}
            />
            <FieldRow
              label="Record Audio"
              value={proposal.roomByRoom?.recordAudio}
            />
            <FieldRow label="Chairs" value={proposal.roomByRoom?.chairs} />
            <ChipRow
              label="Stage Risers"
              values={proposal.roomByRoom?.stageRisers}
            />
            <FieldRow
              label="Backdrops Wall Size"
              value={proposal.roomByRoom?.backdropsWallSize}
            />
            <FieldRow
              label="Scenic Elements"
              value={proposal.roomByRoom?.scenicElements}
            />
            <FieldRow
              label="Video Stage"
              value={proposal.roomByRoom?.videoStage}
            />
            <FieldRow
              label="Front Screen"
              value={proposal.roomByRoom?.frontScreen}
            />
            <FieldRow
              label="Video Needs"
              value={proposal.roomByRoom?.contentVideoNeeds}
              multiline
            />
          </Panel>

          <div className="space-y-6">
            <Panel title="Production Plan" icon={<Presentation size={16} />}>
              <FieldRow
                label="Scenic Stage Design"
                value={proposal.production?.scenicStageDesign}
              />
              <FieldRow
                label="Union Labor"
                value={proposal.production?.unionLabor}
              />
              <ChipRow
                label="Show Crew Needed"
                values={proposal.production?.showCrewNeeded}
              />
              <FieldRow
                label="Other Roles Needed"
                value={proposal.production?.otherRolesNeeded}
                multiline
              />
            </Panel>

            <Panel title="Budget & Timeline" icon={<CalendarDays size={16} />}>
              <FieldRow
                label="Estimated AV Budget"
                value={proposal.budget?.estimatedAvBudget}
              />
              <FieldRow
                label="Custom Budget Amount"
                value={proposal.budget?.budgetCustomAmount}
              />
              <ChipRow
                label="Format Preferences"
                values={proposal.budget?.proposalFormatPreferences}
              />
              <FieldRow
                label="Proposal Timeline"
                value={proposal.budget?.timelineForProposal}
              />
              <FieldRow
                label="Call with Producer"
                value={proposal.budget?.callWithDxgProducer}
              />
              <FieldRow
                label="How Did You Hear"
                value={proposal.budget?.howDidYouHear}
              />
              <FieldRow
                label="How Did You Hear (Other)"
                value={proposal.budget?.howDidYouHearOther}
              />
            </Panel>

            <Panel title="Uploaded Files" icon={<CheckCircle2 size={16} />}>
              <ChipRow
                label="Support Documents"
                values={proposal.uploads?.supportDocuments}
              />
              <FieldRow
                label="Review Existing AV Quote"
                value={proposal.uploads?.reviewExistingAvQuote}
              />
              <ChipRow
                label="AV Quote Files"
                values={proposal.uploads?.avQuoteFiles}
              />
              <FieldRow
                label="Proposal Link"
                value={proposal.proposalLink}
                multiline
              />
            </Panel>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProposalViewSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px] space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-10 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-20 animate-pulse rounded-xl border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 6 }).map((__, row) => (
                  <div
                    key={row}
                    className="h-3 w-full animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
          {icon}
        </span>
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">
          {title}
        </h2>
      </header>
      <div className="space-y-3">{children}</div>
    </article>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
        {icon}
      </div>
      <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
      <span className="mr-1 text-slate-500">{label}:</span>
      <span className="font-bold text-slate-800">{value}</span>
    </span>
  );
}

function FieldRow({
  label,
  value,
  multiline,
  icon,
}: {
  label: string;
  value?: string | number | boolean | null;
  multiline?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-medium text-slate-800 ${
          multiline ? "whitespace-pre-wrap break-words" : ""
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {showValue(value)}
        </span>
      </p>
    </div>
  );
}

function ChipRow({ label, values }: { label: string; values?: string[] }) {
  const list = (values || []).filter(
    (value) => value && value.trim().length > 0,
  );

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      {list.length === 0 ? (
        <p className="mt-1 text-sm font-medium text-slate-800">-</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {list.map((value) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800"
            >
              {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

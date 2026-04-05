"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TemplateOne, { type TemplateOneData } from "@/components/proposalTemplate/TemplateOne";
import TemplateTwo from "@/components/proposalTemplate/TemplateTwo";
import {
  getProposalByIdAction,
  incrementProposalViewsAction,
  updateProposalMetaAction,
  updateProposalStatusAction,
} from "@/app/actions/proposals";

type ProposalData = {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  isAccepted?: boolean;
  isOpen?: boolean;
  viewsCount?: number;
  proposalLink?: string;
  templateId?: "template-one" | "template-two";
  proposalSettings?: {
    linkPrefix?: string;
    defaultFont?: "Inter" | "Poppins" | "Roboto";
    defaultCurrency?: string;
    dateFormat?: string;
  };
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
    estimatedAttendeesInRoom?: string;
    loadInDateTime?: string;
    rehearsalDateTime?: string;
    showStartDateTime?: string;
    showEndDateTime?: string;
    audioSystemForHowManyPpl?: string;
    podiumMic?: string;
    podiumMicQty?: string;
    wirelessMics?: string;
    wirelessMicsQty?: string;
    wirelessMicsType?: string;
    audioRecording?: string;
    largeMonitorsOrScreenProjector?: string;
    largeMonitorsQty?: string;
    ledWall?: string;
    clientProvideOwnPresentationLaptop?: string;
    clientLaptopQty?: string;
    presentationLaptops?: string;
    presentationLaptopQty?: string;
    videoPlayback?: string;
    videoPlaybackCount?: string;
    videoFormatAspectRatio?: string;
    audienceQa?: string;
    audienceQaMethod?: string;
    cameras?: string;
    camerasQty?: string;
    videoRecording?: string;
    videoRecordingType?: string;
    stageWashLighting?: string;
    stageWashLightingStageSize?: string;
    backlightingFor?: string;
    drapeOrScenicUplighting?: string;
    audienceLighting?: string;
    programConfidenceMonitor?: string;
    programConfidenceMonitorQty?: string;
    notesConfidenceMonitor?: string;
    notesConfidenceMonitorQty?: string;
    speakerTimer?: string;
    scenicStageDesign?: string;
    numberOfRooms?: string;
    ceilingHeight?: string;
    roomSetup?: string;
    rigPowerSize?: string;
    preferredRigging?: string[];
    avSpec?: string;
    mainSound?: string;
    hearingImpaired?: string;
    recordAudio?: string;
    chairs?: string;
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
    needDedicatedPowerDrops?: string;
    standardAmpWall?: string;
    powerDropsHowMany?: string;
  };
  budget?: {
    estimatedAvBudget?: string;
    timelineForProposal?: string;
    proposalFormatPreferences?: string[];
    callWithDxgProducer?: string;
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

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const toListText = (values?: string[]) => {
  const clean = (values || []).filter((v) => v && v.trim().length > 0);
  return clean.length > 0 ? clean.join(", ") : "";
};

const withFallback = (value: string, fallback = "Not specified") =>
  value || fallback;

const splitTitle = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { lineOne: name || "Event Proposal", lineTwo: "Overview" };
  }
  const mid = Math.ceil(parts.length / 2);
  return {
    lineOne: parts.slice(0, mid).join(" "),
    lineTwo: parts.slice(mid).join(" "),
  };
};

const mapProposalToTemplate = (proposal: ProposalData): Partial<TemplateOneData> => {
  const pick = (value?: string) => (value && value.trim() ? value.trim() : "");
  const eventName = proposal.event?.eventName?.trim() || "Event Proposal";
  const title = splitTitle(eventName);
  const organization = pick(proposal.contact?.contactOrganization);
  const createdLabel = formatDate(proposal.createdAt);
  const start = formatDate(proposal.event?.startDate);
  const end = formatDate(proposal.event?.endDate);
  const fullName =
    `${proposal.contact?.contactFirstName || ""} ${proposal.contact?.contactLastName || ""}`.trim();
  const contactTitle = pick(proposal.contact?.contactTitle);

  const formatYesNoWithQty = (value?: string, qty?: string) => {
    const safeValue = pick(value);
    const safeQty = pick(qty);
    if (!safeValue) return "";
    if (safeValue === "Yes" && safeQty) {
      return `Yes (${safeQty})`;
    }
    return safeValue;
  };
  const formatYesNoWithDetail = (value?: string, detail?: string) => {
    const safeValue = pick(value);
    const safeDetail = pick(detail);
    if (!safeValue) return "";
    if (safeValue === "Yes" && safeDetail) {
      return `Yes (${safeDetail})`;
    }
    return safeValue;
  };

  const services: Array<{ title: string; text: string }> = [];
  const eventProfile = [
    pick(proposal.event?.eventFormat)
      ? `${pick(proposal.event?.eventFormat)} format`
      : "",
    pick(proposal.event?.attendees)
      ? `${pick(proposal.event?.attendees)} attendees`
      : "",
  ]
    .filter(Boolean)
    .join(" • ");
  if (eventProfile) {
    services.push({ title: "Event Profile", text: eventProfile });
  }

  const venueSetup = [pick(proposal.event?.venue), pick(proposal.roomByRoom?.roomSetup)]
    .filter(Boolean)
    .join(" • ");
  if (venueSetup) {
    services.push({ title: "Venue & Setup", text: venueSetup });
  }

  const crewList = toListText(proposal.production?.showCrewNeeded);
  const avProduction = [
    pick(proposal.roomByRoom?.avSpec),
    crewList ? `Crew: ${crewList}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
  if (avProduction) {
    services.push({ title: "AV & Production", text: avProduction });
  }

  const powerRigging = [
    pick(proposal.venue?.needRiggingForFlown)
      ? `Rigging: ${pick(proposal.venue?.needRiggingForFlown)}`
      : "",
    pick(proposal.venue?.needDedicatedPowerDrops)
      ? `Dedicated Power: ${pick(proposal.venue?.needDedicatedPowerDrops)}`
      : "",
  ]
    .filter(Boolean)
    .join(" • ");
  if (powerRigging) {
    services.push({ title: "Power & Rigging", text: powerRigging });
  }

  const metaChips = [
    proposal.status ? `Status: ${proposal.status}` : "",
    proposal.event?.attendees ? `Attendees: ${proposal.event.attendees}` : "",
    proposal.event?.eventFormat ? `Format: ${proposal.event.eventFormat}` : "",
    start ? `Start: ${start}` : "",
    proposal.viewsCount !== undefined ? `Views: ${proposal.viewsCount}` : "",
  ].filter((item) => item.trim().length > 0);

  const summaryBullets = [
    proposal.event?.venue ? `Venue: ${proposal.event.venue}` : "",
    proposal.roomByRoom?.roomFunction
      ? `Room Function: ${proposal.roomByRoom.roomFunction}`
      : "",
    proposal.budget?.timelineForProposal
      ? `Timeline: ${proposal.budget.timelineForProposal}`
      : "",
    proposal.production?.otherRolesNeeded
      ? `Additional roles: ${proposal.production.otherRolesNeeded}`
      : "",
  ].filter((item) => item.trim().length > 0);

  const dateRange = start && end ? `${start} - ${end}` : start || end;
  const aboutParts = [dateRange, pick(proposal.event?.venue)].filter(Boolean);
  const aboutText = aboutParts.length
    ? `${aboutParts.join(". ")}. This proposal is tailored to your submitted scope and preferences.`
    : "This proposal is tailored to your submitted scope and preferences.";

  const pricing: Array<{ name: string; price: string; bullets: string[] }> = [];

  const budgetBullets = [
    pick(proposal.budget?.timelineForProposal)
      ? `Timeline: ${pick(proposal.budget?.timelineForProposal)}`
      : "",
    toListText(proposal.budget?.proposalFormatPreferences)
      ? `Format: ${toListText(proposal.budget?.proposalFormatPreferences)}`
      : "",
    pick(proposal.budget?.callWithDxgProducer)
      ? `Producer Call: ${pick(proposal.budget?.callWithDxgProducer)}`
      : "",
  ].filter(Boolean);
  const budgetPrice = pick(proposal.budget?.estimatedAvBudget);
  if (budgetPrice || budgetBullets.length > 0) {
    pricing.push({
      name: "Budget",
      price: budgetPrice || "Budget",
      bullets: budgetBullets,
    });
  }

  const roomBullets = [
    pick(proposal.roomByRoom?.roomFunction)
      ? `Room Function: ${pick(proposal.roomByRoom?.roomFunction)}`
      : "",
    pick(proposal.roomByRoom?.roomSetup)
      ? `Room Setup: ${pick(proposal.roomByRoom?.roomSetup)}`
      : "",
    pick(proposal.production?.scenicStageDesign)
      ? `Scenic Design: ${pick(proposal.production?.scenicStageDesign)}`
      : "",
  ].filter(Boolean);
  const roomPrice = pick(proposal.roomByRoom?.numberOfRooms);
  if (roomPrice || roomBullets.length > 0) {
    pricing.push({
      name: "Room Planning",
      price: roomPrice || "Room Planning",
      bullets: roomBullets,
    });
  }

  const technicalBullets = [
    pick(proposal.production?.unionLabor)
      ? `Union Labor: ${pick(proposal.production?.unionLabor)}`
      : "",
    pick(proposal.venue?.standardAmpWall)
      ? `Amp Wall: ${pick(proposal.venue?.standardAmpWall)}`
      : "",
    pick(proposal.venue?.powerDropsHowMany)
      ? `Power Drops: ${pick(proposal.venue?.powerDropsHowMany)}`
      : "",
  ].filter(Boolean);
  const technicalPrice = pick(proposal.roomByRoom?.avSpec);
  if (technicalPrice || technicalBullets.length > 0) {
    pricing.push({
      name: "Technical",
      price: technicalPrice || "Technical",
      bullets: technicalBullets,
    });
  }

  const avGroups: TemplateOneData["avGroups"] = [
    {
      title: "Room & Logistics",
      items: [
        {
          label: "Function",
          value: withFallback(pick(proposal.roomByRoom?.roomFunction)),
        },
        {
          label: "Attendees",
          value: withFallback(pick(proposal.roomByRoom?.estimatedAttendeesInRoom)),
        },
        {
          label: "Room Setup",
          value: withFallback(pick(proposal.roomByRoom?.roomSetup)),
        },
        {
          label: "Show Timing",
          value: withFallback(
            [formatDate(proposal.roomByRoom?.showStartDateTime), formatDate(proposal.roomByRoom?.showEndDateTime)]
              .filter(Boolean)
              .join(" - "),
          ),
        },
      ],
    },
    {
      title: "Audio & Video",
      items: [
        {
          label: "Podium Mic",
          value: withFallback(
            formatYesNoWithQty(
              proposal.roomByRoom?.podiumMic,
              proposal.roomByRoom?.podiumMicQty,
            ),
          ),
        },
        {
          label: "Wireless Mics",
          value: withFallback(
            formatYesNoWithDetail(
              proposal.roomByRoom?.wirelessMics,
              [
                pick(proposal.roomByRoom?.wirelessMicsQty),
                pick(proposal.roomByRoom?.wirelessMicsType),
              ]
                .filter(Boolean)
                .join(", "),
            ),
          ),
        },
        {
          label: "Audio Recording",
          value: withFallback(pick(proposal.roomByRoom?.audioRecording)),
        },
        {
          label: "Cameras",
          value: withFallback(
            formatYesNoWithQty(
              proposal.roomByRoom?.cameras,
              proposal.roomByRoom?.camerasQty,
            ),
          ),
        },
        {
          label: "LED Wall",
          value: withFallback(pick(proposal.roomByRoom?.ledWall)),
        },
      ],
    },
    {
      title: "Display & Monitoring",
      items: [
        {
          label: "Large Monitors",
          value: withFallback(
            formatYesNoWithQty(
              proposal.roomByRoom?.largeMonitorsOrScreenProjector,
              proposal.roomByRoom?.largeMonitorsQty,
            ),
          ),
        },
        {
          label: "Presentation Laptops",
          value: withFallback(
            formatYesNoWithQty(
              proposal.roomByRoom?.presentationLaptops,
              proposal.roomByRoom?.presentationLaptopQty,
            ),
          ),
        },
        {
          label: "Video Playback",
          value: withFallback(
            formatYesNoWithQty(
              proposal.roomByRoom?.videoPlayback,
              proposal.roomByRoom?.videoPlaybackCount,
            ),
          ),
        },
        {
          label: "Video Format",
          value: withFallback(pick(proposal.roomByRoom?.videoFormatAspectRatio)),
        },
      ],
    },
    {
      title: "Engagement & Lighting",
      items: [
        {
          label: "Audience Q&A",
          value: withFallback(
            formatYesNoWithDetail(
              proposal.roomByRoom?.audienceQa,
              proposal.roomByRoom?.audienceQaMethod,
            ),
          ),
        },
        {
          label: "Video Recording",
          value: withFallback(
            formatYesNoWithDetail(
              proposal.roomByRoom?.videoRecording,
              proposal.roomByRoom?.videoRecordingType,
            ),
          ),
        },
        {
          label: "Stage Wash Lighting",
          value: withFallback(
            formatYesNoWithDetail(
              proposal.roomByRoom?.stageWashLighting,
              proposal.roomByRoom?.stageWashLightingStageSize,
            ),
          ),
        },
        {
          label: "Backlighting / Scenic / Audience",
          value: withFallback(
            [
              pick(proposal.roomByRoom?.backlightingFor),
              pick(proposal.roomByRoom?.drapeOrScenicUplighting),
              pick(proposal.roomByRoom?.audienceLighting),
            ]
              .filter(Boolean)
              .join(" / "),
          ),
        },
      ],
    },
    {
      title: "Confidence & Monitoring",
      items: [
        {
          label: "Program Confidence",
          value: withFallback(
            formatYesNoWithQty(
              proposal.roomByRoom?.programConfidenceMonitor,
              proposal.roomByRoom?.programConfidenceMonitorQty,
            ),
          ),
        },
        {
          label: "Notes Confidence",
          value: withFallback(
            formatYesNoWithQty(
              proposal.roomByRoom?.notesConfidenceMonitor,
              proposal.roomByRoom?.notesConfidenceMonitorQty,
            ),
          ),
        },
      ],
    },
  ];

  const scenicLabel = pick(proposal.production?.scenicStageDesign);
  const scenicStageDesignLabel =
    scenicLabel === "Yes"
      ? "Required (Yes)"
      : scenicLabel === "No"
        ? "Not Required (No)"
        : scenicLabel || "TBD";
  const unionLaborLabel = pick(proposal.production?.unionLabor) || "TBD / Not Sure";
  const riggingMethod = toListText(proposal.roomByRoom?.preferredRigging);
  const powerDrops = pick(proposal.venue?.powerDropsHowMany);
  const ampWall = pick(proposal.venue?.standardAmpWall);
  const additionalNotes =
    pick(proposal.contact?.anythingElse) ||
    pick(proposal.roomByRoom?.contentVideoNeeds);

  return {
    badge: `Proposal${proposal.status ? ` • ${proposal.status}` : ""}${createdLabel ? ` • ${createdLabel}` : ""}`,
    ...(organization ? { brandName: organization } : {}),
    titleLineOne: title.lineOne,
    titleLineTwo: title.lineTwo,
    heroText:
      proposal.event?.eventTypeOther ||
      proposal.event?.eventType ||
      "A custom proposal prepared from your submitted event and production requirements.",
    ...(metaChips.length > 0 ? { metaChips } : {}),
    ...(fullName ? { ctaPrimary: `Send To ${fullName}` } : {}),
    ctaSecondary: "Download Brief",
    aboutTitle: "Project Snapshot",
    aboutText,
    ...(summaryBullets.length > 0 ? { summaryBullets } : {}),
    ...(services.length > 0
      ? { servicesTitle: "Scope & Requirements", services }
      : {}),
    pricingTitle: "Budget & Delivery",
    ...(pricing.length > 0 ? { pricing } : {}),
    closingTitle: "Ready To Move Forward With",
    ...(pick(proposal.event?.venue)
      ? { brandAddress: pick(proposal.event?.venue) }
      : {}),
    ...(pick(proposal.contact?.contactEmail)
      ? { brandEmail: pick(proposal.contact?.contactEmail) }
      : {}),
    ...(fullName ? { contactName: fullName } : {}),
    ...(pick(proposal.contact?.contactPhone)
      ? { contactPhone: pick(proposal.contact?.contactPhone) }
      : {}),
    ...(contactTitle || organization
      ? { closingSubtitle: [contactTitle, organization].filter(Boolean).join(" - ") }
      : {}),
    ...(additionalNotes ? { additionalNotes } : {}),
    ...(proposal.budget?.estimatedAvBudget
      ? { budgetDisplay: pick(proposal.budget?.estimatedAvBudget) }
      : {}),
    ...(proposal.budget?.proposalFormatPreferences &&
    proposal.budget.proposalFormatPreferences.length > 0
      ? { proposalFormats: proposal.budget.proposalFormatPreferences }
      : {}),
    ...(proposal.production?.showCrewNeeded &&
    proposal.production.showCrewNeeded.length > 0
      ? { crewRoles: proposal.production.showCrewNeeded }
      : {}),
    scenicStageDesignLabel,
    unionLaborLabel,
    ...(pick(proposal.roomByRoom?.rigPowerSize)
      ? { riggingMaxPointWeight: pick(proposal.roomByRoom?.rigPowerSize) }
      : {}),
    ...(riggingMethod ? { riggingMethod } : {}),
    ...(powerDrops ? { powerDropsLabel: `${powerDrops} Dedicated` } : {}),
    ...(ampWall ? { ampWallLabel: `${ampWall} Main Amp Wall` } : {}),
    avGroups,
    ...(pick(proposal.roomByRoom?.contentVideoNeeds)
      ? { ledDescription: pick(proposal.roomByRoom?.contentVideoNeeds) }
      : {}),
    ...(proposal.roomByRoom?.ledWall === "Yes"
      ? { ledHeadline: "LED Wall Requested" }
      : {}),
    ledTags: [
      pick(proposal.roomByRoom?.videoFormatAspectRatio),
      pick(proposal.roomByRoom?.videoRecordingType),
      pick(proposal.roomByRoom?.audienceQaMethod),
    ].filter(Boolean),
  };
};

export default function ProposalView({
  slug,
  source,
}: {
  slug?: string;
  source?: string;
}) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="h-12 w-60 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-[420px] animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
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

  const handleAcceptProposal = async () => {
    if (source !== "email") return;
    if (!proposalId || accepting || proposal.isAccepted) return;

    setAccepting(true);
    try {
      let updatedProposal: ProposalData = proposal;

      const acceptRes = await updateProposalMetaAction(proposalId, {
        isAccepted: true,
        isOpen: false,
      });
      if (acceptRes.success && acceptRes.data && typeof acceptRes.data === "object") {
        updatedProposal = acceptRes.data as ProposalData;
      }

      const statusRes = await updateProposalStatusAction(proposalId, "approved");
      if (statusRes.success && statusRes.data && typeof statusRes.data === "object") {
        updatedProposal = statusRes.data as ProposalData;
      }

      setProposal(updatedProposal);
    } finally {
      setAccepting(false);
    }
  };

  const handleDownloadProposal = () => {
    if (downloading) return;
    setDownloading(true);

    const originalTitle = document.title;
    const printableTitle =
      proposal.event?.eventName?.trim() ||
      proposal.contact?.contactOrganization?.trim() ||
      "proposal";
    document.title = `${printableTitle}-proposal`;

    requestAnimationFrame(() => {
      try {
        window.print();
      } finally {
        document.title = originalTitle;
        setDownloading(false);
      }
    });
  };

  const mappedTemplateData = mapProposalToTemplate(proposal);
  const showAcceptButton = source === "email";

  const templateData: Partial<TemplateOneData> = {
    ...mappedTemplateData,
    ctaPrimary: showAcceptButton
      ? proposal.isAccepted
        ? "Proposal Accepted"
        : mappedTemplateData.ctaPrimary || "Accept Proposal"
      : undefined,
    ctaSecondary: "Download PDF",
  };
  const templateFont = proposal.proposalSettings?.defaultFont || "Poppins";

  const sharedTemplateProps = {
    data: templateData,
    fontFamily: templateFont,
    onPrimaryAction: handleAcceptProposal,
    onSecondaryAction: handleDownloadProposal,
    showPrimaryAction: showAcceptButton,
    isPrimaryLoading: accepting,
    isSecondaryLoading: downloading,
    isPrimaryDisabled: Boolean(proposal.isAccepted),
  };

  if (proposal.templateId === "template-two") {
    return <TemplateTwo {...sharedTemplateProps} />;
  }

  return <TemplateOne {...sharedTemplateProps} />;
}


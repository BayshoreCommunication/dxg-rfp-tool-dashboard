"use client";
import {
  copyProposalAction,
  createProposalAction,
  extractProposalFromFile,
  getProposalByIdAction,
  updateProposalAction,
} from "@/app/actions/proposals";
import { getSettingsAction } from "@/app/actions/settings";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AddProposalUpload from "./AddProposalUpload";
import BudgetProposalPreferences from "./ProposalsProcess.tsx/BudgetProposalPreferences";
import ContactInfo from "./ProposalsProcess.tsx/ContactInfo";
import EventForm from "./ProposalsProcess.tsx/EventForm";
import ProcessList from "./ProposalsProcess.tsx/ProcessList";
import RoomAndProductionStep, { defaultRoom } from "./ProposalsProcess.tsx/RoomAndProductionStep";
import HybridVirtualStep from "./ProposalsProcess.tsx/HybridVirtualStep";
import VenueScheduleStep, { defaultVenueSchedule, type VenueScheduleData } from "./ProposalsProcess.tsx/VenueScheduleStep";
import ContentCreativeStep, { defaultContentCreative, type ContentCreativeData } from "./ProposalsProcess.tsx/ContentCreativeStep";
import VideoRecordingStep, { defaultVideoRecording, type VideoRecordingData } from "./ProposalsProcess.tsx/VideoRecordingStep";
import TemplateSelection from "./ProposalsProcess.tsx/TemplateSelection";
import UploadsReferenceMaterials from "./ProposalsProcess.tsx/UploadsReferenceMaterials";
import VenueTechnicalRequirements from "./ProposalsProcess.tsx/VenueTechnicalRequirements";
import ProposalSuccessfullyCreate from "./ProposalSuccessfullyCreate";
import SaveCopyModal from "./SaveCopyModal";

/* â”€â”€â”€ Proposal data by step â”€â”€â”€ */
export type EventData = {
  eventName: string;
  editionYear?: string;
  eventTheme?: string;
  startDate: string;
  endDate: string;
  venue: string;
  venueCity?: string;
  attendees: string;
  eventFormat: "In-Person" | "Hybrid" | "Virtual";
  eventType: {
    eventType: string;
    eventTypeOther: string;
  };
  primaryAudience?: string[];
  eventObjectives?: string;
  toneDirection?: string[];
  sacredConstraints?: string;
};

export type RoomByRoomData = {
  roomFunction: string;
  estimatedAttendeesInRoom: string;
  loadInDateTime: string;
  rehearsalDateTime: string;
  showStartDateTime: string;
  showEndDateTime: string;
  audioSystemForHowManyPpl: string;
  podiumMic: {
    podiumMic: string;
    podiumMicQty: string;
  };
  wirelessMics: {
    wirelessMics: string;
    wirelessMicsQty: string;
    wirelessMicsType: string;
  };
  audioRecording: string;
  largeMonitorsOrScreenProjector: {
    largeMonitorsOrScreenProjector: string;
    largeMonitorsQty: string;
  };
  ledWall: string;
  clientProvideOwnPresentationLaptop: {
    clientProvideOwnPresentationLaptop: string;
    clientLaptopQty: string;
  };
  presentationLaptops: {
    presentationLaptops: string;
    presentationLaptopQty: string;
  };
  videoPlayback: {
    videoPlayback: string;
    videoPlaybackCount: string;
  };
  videoFormatAspectRatio: string;
  audienceQa: {
    audienceQa: string;
    audienceQaMethod: string;
  };
  cameras: {
    cameras: string;
    camerasQty: string;
  };
  videoRecording: {
    videoRecording: string;
    videoRecordingType: string;
  };
  stageWashLighting: {
    stageWashLighting: string;
    stageWashLightingStageSize: string;
  };
  backlightingFor: string;
  drapeOrScenicUplighting: string;
  audienceLighting: string;
  programConfidenceMonitor: {
    programConfidenceMonitor: string;
    programConfidenceMonitorQty: string;
  };
  notesConfidenceMonitor: {
    notesConfidenceMonitor: string;
    notesConfidenceMonitorQty: string;
  };
  speakerTimer: string;
  scenicStageDesign: "Yes" | "No" | "";
  contentVideoNeeds: string;
  unionLabor: "Yes" | "No" | "Not Sure" | "";
  showCrewNeeded: string[];
  otherRolesNeeded: string;
  /* ── new fields matching HTML page 2B ── */
  stageDimensions: string;
  audioSystemRequired: "Yes" | "No" | "";
  ledWallSpecs: string;
  ledWallWidth: string;
  ledWallHeight: string;
  ledWallShape: string;
  ledWallPixelPitch: string;
  ledWallSwitcher: string;
  ledWallNotes: string;
  scenicStageDesignNotes: string;
  lightingRequirements: string[];
  teleprompterRequired: "Yes" | "No" | "";
  teleprompterBilingual: "Yes" | "No" | "";
  teleprompterLanguages: string[];
  confidenceMonitorsRequired: "Yes" | "No" | "";
  showCrewQty: Record<string, string>;
};

export type ProductionSupportData = Pick<
  RoomByRoomData,
  "scenicStageDesign" | "unionLabor" | "showCrewNeeded" | "otherRolesNeeded"
>;

export type VenueTechnicalData = {
  /* Rigging */
  needRiggingForFlown: {
    needRiggingForFlown: "YES" | "NO" | "";
    riggingPlotOrSpecs: string;
  };
  riggingTypes: string[];
  pointLoadLimitKnown: "YES" | "NO" | "";
  /* Power */
  needDedicatedPowerDrops: {
    needDedicatedPowerDrops: "YES" | "NO" | "";
    standardAmpWall: string;
  };
  powerDropsHowMany: string;
  generatorBackup: "YES" | "NO" | "";
  /* Internet & Connectivity */
  hardlineInternet: {
    hardlineInternet: "YES" | "NO" | "";
    hardlineInternetPurpose: string;
  };
  wirelessInternetAttendees: "YES" | "NO" | "";
  streamingBandwidthRequired: "YES" | "NO" | "";
  streamingMbpsNeeded: string;
  /* Livestream */
  livestreamVirtual: {
    livestreamVirtual: "YES" | "NO" | "";
    livestreamPlatform: string;
  };
  /* COI */
  coiRequiredByVenue: "YES" | "NO" | "";
  coiCoverageTypes: string[];
  additionalInsured: "YES" | "NO" | "";
  coiSubmissionDeadline: string;
  /* Venue Access */
  venueContactName: string;
  loadingDockAccess: "YES" | "NO" | "";
  freightElevatorAvailable: "YES" | "NO" | "";
  ceilingHeight: string;
  inHouseAvExclusivity: "YES" | "NO" | "";
  inHouseAvCompanyName: string;
};

export type UploadsData = {
  supportDocuments: Array<File | string>;
  reviewExistingAvQuote: {
    reviewExistingAvQuote: "YES" | "NO" | "";
    avQuoteFiles: Array<File | string>;
  };
  hasCoVendors: "YES" | "NO" | "";
  coVendorDetails: string;
  vendorConflicts: "YES" | "NO" | "";
  vendorConflictDetails: string;
};

export type BudgetData = {
  estimatedAvBudget: string;
  budgetCustomAmount: string;
  proposalFormatPreferences: string[];
  timelineForProposal: string;
  decisionDate: string;
  competitiveBid: "YES" | "NO" | "";
  numberOfProposals: string;
  scoringPriorities: string[];
  scoringNotes: string;
  callWithDxgProducer: "YES" | "NO" | "";
  howDidYouHear: string;
  howDidYouHearOther: string;
};

export type HybridVirtualData = {
  virtualAttendeeEstimate: string;
  streamingPlatform: string;
  streamingPlatformOther: string;
  platformIntegrationWithAv: "YES" | "NO" | "";
  streamOwnership: string;
  remoteSpeakers: {
    remoteSpeakers: "YES" | "NO" | "";
    howManyRemoteSpeakers: string;
    remoteFeedPlatform: string;
    techRehearsalOwner: string;
  };
  liveVirtualQa: "YES" | "NO" | "";
  virtualOnlyBreakouts: "YES" | "NO" | "";
  dedicatedVirtualProducer: "YES" | "NO" | "";
  closedCaptions: {
    closedCaptions: "YES" | "NO" | "";
    captionLanguages: string[];
    captionType: string;
  };
  onDemandRecording: "YES" | "NO" | "";
  sponsorOverlays: "YES" | "NO" | "";
  virtualNetworking: "YES" | "NO" | "";
};

export type { VenueScheduleData };
export type { ContentCreativeData };
export type { VideoRecordingData };

export type ContactData = {
  contactFirstName: string;
  contactLastName: string;
  contactTitle: string;
  contactOrganization: string;
  contactEmail: string;
  contactPhone: string;
  preferredContactMethod: "Email" | "Phone" | "Either" | "";
  bestTimeToReach: string;
  anythingElse: string;
};

export type ProposalSettings = {
  branding: {
    linkPrefix: string;
    defaultFont: "Inter" | "Poppins" | "Roboto";
  };
  proposals: {
    proposalLanguage: string;
    defaultCurrency: string;
    expiryDate: string;
    priceSeparator: string;
    dateFormat: string;
    decimalPrecision: string;
  };
};

export interface ProposalData {
  templateId: "template-one" | "template-two" | "";
  proposalStatus: "unsubmitted" | "submitted";
  proposalSettings: {
    linkPrefix: string;
    defaultFont: "Inter" | "Poppins" | "Roboto";
    proposalLanguage: string;
    defaultCurrency: string;
    priceSeparator: string;
    decimalPrecision: string;
    dateFormat: string;
  };
  event: EventData;
  venueSchedule: VenueScheduleData;
  roomByRoom: RoomByRoomData[];
  hybridVirtual: HybridVirtualData;
  contentCreative: ContentCreativeData;
  videoRecordingStep: VideoRecordingData;
  venue: VenueTechnicalData;
  uploads: UploadsData;
  budget: BudgetData;
  contact: ContactData;
}

type AddNewProposalProps = {
  mode?: "create" | "edit";
  proposalId?: string;
};

type ProposalSectionKey = {
  [K in keyof ProposalData]: ProposalData[K] extends object ? K : never;
}[keyof ProposalData];

const defaultProposalData: ProposalData = {
  templateId: "",
  proposalStatus: "submitted",
  proposalSettings: {
    linkPrefix: "abuco",
    defaultFont: "Poppins",
    proposalLanguage: "English",
    defaultCurrency: "$",
    priceSeparator: "NONE",
    decimalPrecision: "2",
    dateFormat: "MM/DD/YYYY",
  },
  event: {
    eventName: "",
    startDate: "",
    endDate: "",
    venue: "",
    attendees: "",
    eventFormat: "In-Person",
    eventType: {
      eventType: "",
      eventTypeOther: "",
    },
  },
  venueSchedule: defaultVenueSchedule(),
  roomByRoom: [],
  contentCreative: defaultContentCreative(),
  videoRecordingStep: defaultVideoRecording(),
  hybridVirtual: {
    virtualAttendeeEstimate: "",
    streamingPlatform: "",
    streamingPlatformOther: "",
    platformIntegrationWithAv: "",
    streamOwnership: "",
    remoteSpeakers: {
      remoteSpeakers: "",
      howManyRemoteSpeakers: "",
      remoteFeedPlatform: "",
      techRehearsalOwner: "",
    },
    liveVirtualQa: "",
    virtualOnlyBreakouts: "",
    dedicatedVirtualProducer: "",
    closedCaptions: {
      closedCaptions: "",
      captionLanguages: [],
      captionType: "",
    },
    onDemandRecording: "",
    sponsorOverlays: "",
    virtualNetworking: "",
  },
  venue: {
    needRiggingForFlown: { needRiggingForFlown: "", riggingPlotOrSpecs: "" },
    riggingTypes: [],
    pointLoadLimitKnown: "",
    needDedicatedPowerDrops: { needDedicatedPowerDrops: "", standardAmpWall: "" },
    powerDropsHowMany: "",
    generatorBackup: "",
    hardlineInternet: { hardlineInternet: "", hardlineInternetPurpose: "" },
    wirelessInternetAttendees: "",
    streamingBandwidthRequired: "",
    streamingMbpsNeeded: "",
    livestreamVirtual: { livestreamVirtual: "", livestreamPlatform: "" },
    coiRequiredByVenue: "",
    coiCoverageTypes: [],
    additionalInsured: "",
    coiSubmissionDeadline: "",
    venueContactName: "",
    loadingDockAccess: "",
    freightElevatorAvailable: "",
    ceilingHeight: "",
    inHouseAvExclusivity: "",
    inHouseAvCompanyName: "",
  },
  uploads: {
    supportDocuments: [],
    reviewExistingAvQuote: {
      reviewExistingAvQuote: "",
      avQuoteFiles: [],
    },
    hasCoVendors: "",
    coVendorDetails: "",
    vendorConflicts: "",
    vendorConflictDetails: "",
  },
  budget: {
    estimatedAvBudget: "",
    budgetCustomAmount: "",
    proposalFormatPreferences: [],
    timelineForProposal: "",
    decisionDate: "",
    competitiveBid: "",
    numberOfProposals: "",
    scoringPriorities: [],
    scoringNotes: "",
    callWithDxgProducer: "",
    howDidYouHear: "",
    howDidYouHearOther: "",
  },
  contact: {
    contactFirstName: "",
    contactLastName: "",
    contactTitle: "",
    contactOrganization: "",
    contactEmail: "",
    contactPhone: "",
    preferredContactMethod: "",
    bestTimeToReach: "",
    anythingElse: "",
  },
};

const defaultProposalSettings: ProposalSettings = {
  branding: {
    linkPrefix: "",
    defaultFont: "Poppins",
  },
  proposals: {
    proposalLanguage: "English",
    defaultCurrency: "$",
    expiryDate: "None",
    priceSeparator: "NONE",
    dateFormat: "MM/DD/YYYY",
    decimalPrecision: "2",
  },
};

const ALLOWED_PROPOSAL_FONTS = ["Inter", "Poppins", "Roboto"] as const;

const normalizeProposalFont = (
  value: string | undefined,
): "Inter" | "Poppins" | "Roboto" => {
  const fallback: "Inter" | "Poppins" | "Roboto" = "Poppins";
  if (!value) return fallback;
  const matched = ALLOWED_PROPOSAL_FONTS.find(
    (font) => font.toLowerCase() === value.trim().toLowerCase(),
  );
  return matched || fallback;
};

const toProposalSlug = (title: string, id: string): string => {
  const slugTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return id ? `${slugTitle || "proposal"}-${id}` : slugTitle || "proposal";
};

/* ─── Normalize AI-extracted values to exactly match option strings ─── */
const matchOption = (value: string | undefined, options: string[]): string => {
  if (!value) return "";
  const v = value.trim().toLowerCase();
  return (
    options.find((o) => o.toLowerCase() === v) ??
    options.find((o) => o.toLowerCase().includes(v)) ??
    options.find((o) => v.includes(o.toLowerCase())) ??
    ""
  );
};

const matchOptionsArray = (
  values: string[] | string | undefined,
  options: string[],
): string[] => {
  if (!values) return [];
  const valArray = Array.isArray(values)
    ? values
    : values.split(",").map((v) => v.trim());

  const matched = valArray.map((v) => matchOption(v, options)).filter(Boolean);

  // Deduplicate
  return Array.from(new Set(matched));
};

const normalizeExtracted = (
  raw: Omit<Partial<ProposalData>, "roomByRoom"> & {
    roomByRoom?: Partial<RoomByRoomData> | Partial<RoomByRoomData>[];
    production?: Partial<ProductionSupportData>;
  },
): Partial<ProposalData> => ({
  event: raw.event
    ? {
        ...raw.event,
        attendees: matchOption(raw.event.attendees, [
          "< 100",
          "100 - 150",
          "200 - 500",
          "500 - 1,000",
          "1,000+",
        ]),
        eventFormat: (matchOption(raw.event.eventFormat, [
          "In-Person",
          "Hybrid",
          "Virtual",
        ]) || raw.event.eventFormat) as EventData["eventFormat"],
        eventType: {
          eventType: matchOption(
            typeof raw.event.eventType === "object"
              ? (raw.event.eventType as { eventType?: string }).eventType
              : (raw.event.eventType as unknown as string),
            [
              "Conference",
              "Meeting",
              "Gala",
              "Trade Show",
              "Awards Show",
              "Other",
            ],
          ),
          eventTypeOther:
            typeof raw.event.eventType === "object"
              ? ((raw.event.eventType as { eventTypeOther?: string })
                  .eventTypeOther ?? "")
              : "",
        },
      }
    : undefined,
  roomByRoom: ((): RoomByRoomData[] | undefined => {
    // AI extraction returns a single flat room object; resolve from array or object
    const rbr = Array.isArray(raw.roomByRoom) ? raw.roomByRoom[0] : raw.roomByRoom;
    if (!rbr && !raw.production) return undefined;
    const r = rbr as Partial<RoomByRoomData> | undefined;
    const rRec = (rbr ?? {}) as Record<string, unknown>;
    return [{
      ...defaultRoom(),
      ...(r ?? {}),
      audioRecording: matchOption(r?.audioRecording, ["Yes", "No"]) as RoomByRoomData["audioRecording"],
      videoFormatAspectRatio:
        matchOption(r?.videoFormatAspectRatio, ["16:9 format", "Unique Aspect Ratio", "Both"]) ||
        r?.videoFormatAspectRatio ||
        "",
      audienceQa: ((): RoomByRoomData["audienceQa"] => {
        const raw_n = r?.audienceQa;
        if (raw_n && typeof raw_n === "object") {
          const v = raw_n as { audienceQa?: string; audienceQaMethod?: string };
          return {
            audienceQa: matchOption(v.audienceQa ?? "", ["Yes", "No"]),
            audienceQaMethod: matchOption(v.audienceQaMethod ?? "", ["Via an App", "Passing a Microphone", "Both"]),
          };
        }
        return {
          audienceQa: matchOption((raw_n as unknown as string) ?? "", ["Yes", "No"]),
          audienceQaMethod: matchOption((rRec.audienceQaMethod as string) ?? "", ["Via an App", "Passing a Microphone", "Both"]),
        };
      })(),
      videoRecording: ((): RoomByRoomData["videoRecording"] => {
        const raw_n = r?.videoRecording;
        if (raw_n && typeof raw_n === "object") {
          const v = raw_n as { videoRecording?: string; videoRecordingType?: string };
          return {
            videoRecording: matchOption(v.videoRecording ?? "", ["Yes", "No"]),
            videoRecordingType: matchOption(v.videoRecordingType ?? "", ["Camera Feed Only", "Presentation Only", "Side by Side (Camera and Presentation)", "All The Above"]),
          };
        }
        return {
          videoRecording: matchOption((raw_n as unknown as string) ?? "", ["Yes", "No"]),
          videoRecordingType: matchOption((rRec.videoRecordingType as string) ?? "", ["Camera Feed Only", "Presentation Only", "Side by Side (Camera and Presentation)", "All The Above"]),
        };
      })(),
      stageWashLighting: ((): RoomByRoomData["stageWashLighting"] => {
        const raw_n = r?.stageWashLighting;
        if (raw_n && typeof raw_n === "object") {
          const v = raw_n as { stageWashLighting?: string; stageWashLightingStageSize?: string };
          return {
            stageWashLighting: matchOption(v.stageWashLighting ?? "", ["Yes", "No"]),
            stageWashLightingStageSize: v.stageWashLightingStageSize ?? "",
          };
        }
        return {
          stageWashLighting: matchOption((raw_n as unknown as string) ?? "", ["Yes", "No"]),
          stageWashLightingStageSize: (rRec.stageWashLightingStageSize as string) ?? "",
        };
      })(),
      programConfidenceMonitor: normalizeProgramConfidenceMonitor(rRec.programConfidenceMonitor, rRec.programConfidenceMonitorQty),
      notesConfidenceMonitor: normalizeNotesConfidenceMonitor(rRec.notesConfidenceMonitor, rRec.notesConfidenceMonitorQty),
      scenicStageDesign: matchOption(r?.scenicStageDesign || raw.production?.scenicStageDesign, ["Yes", "No"]) as RoomByRoomData["scenicStageDesign"],
      unionLabor: matchOption(r?.unionLabor || raw.production?.unionLabor, ["Yes", "No", "Not Sure"]) as RoomByRoomData["unionLabor"],
      showCrewNeeded: matchOptionsArray(
        (r?.showCrewNeeded?.length ? r.showCrewNeeded : raw.production?.showCrewNeeded) ?? [],
        ["A1 (AUDIO)", "A2 (AUDIO ASSIST)", "V1 (VIDEO)", "V2 (VIDEO ASSIST)", "TD (TECHNICAL DIRECTOR)", "L1 (LIGHTING)", "L2 (LIGHTING ASSIST)", "GRAPHICS OP", "CAMERA OPERATOR", "SHOWCALLER", "STAGE MANAGER", "PRODUCER", "TELEPROMPTER OP", "RIGGER", "STAGEHAND", "OTHER"],
      ),
      otherRolesNeeded: r?.otherRolesNeeded || raw.production?.otherRolesNeeded || "",
    }];
  })(),
  venue: raw.venue
    ? {
        powerDropsHowMany: raw.venue.powerDropsHowMany ?? "",
        needRiggingForFlown: ((): VenueTechnicalData["needRiggingForFlown"] => {
          const raw_n = raw.venue!.needRiggingForFlown;
          if (raw_n && typeof raw_n === "object") {
            const v = raw_n as {
              needRiggingForFlown?: string;
              riggingPlotOrSpecs?: string;
            };
            const matched = matchOption(v.needRiggingForFlown ?? "", [
              "YES",
              "NO",
            ]).toUpperCase();
            return {
              needRiggingForFlown: (matched || "") as "YES" | "NO" | "",
              riggingPlotOrSpecs: v.riggingPlotOrSpecs ?? "",
            };
          }
          const matched = matchOption((raw_n as unknown as string) ?? "", [
            "YES",
            "NO",
          ]).toUpperCase();
          return {
            needRiggingForFlown: (matched || "") as "YES" | "NO" | "",
            riggingPlotOrSpecs:
              ((raw.venue as Record<string, unknown>)
                .riggingPlotOrSpecs as string) ?? "",
          };
        })(),
        needDedicatedPowerDrops:
          ((): VenueTechnicalData["needDedicatedPowerDrops"] => {
            const raw_n = raw.venue!.needDedicatedPowerDrops;
            if (raw_n && typeof raw_n === "object") {
              const v = raw_n as {
                needDedicatedPowerDrops?: string;
                standardAmpWall?: string;
              };
              const amp =
                matchOption(v.standardAmpWall ?? "", [
                  "15amp",
                  "20amp",
                  "30amp",
                  "100A",
                  "200A",
                  "400A",
                ]) ||
                v.standardAmpWall ||
                "";
              const matched = matchOption(v.needDedicatedPowerDrops ?? "", [
                "YES",
                "NO",
              ]).toUpperCase();
              return {
                needDedicatedPowerDrops: (matched || "") as "YES" | "NO" | "",
                standardAmpWall: amp,
              };
            }
            const matched = matchOption((raw_n as unknown as string) ?? "", [
              "YES",
              "NO",
            ]).toUpperCase();
            const amp =
              matchOption(
                ((raw.venue as Record<string, unknown>)
                  .standardAmpWall as string) ?? "",
                ["15amp", "20amp", "30amp", "100A", "200A", "400A"],
              ) ||
              ((raw.venue as Record<string, unknown>)
                .standardAmpWall as string) ||
              "";
            return {
              needDedicatedPowerDrops: (matched || "") as "YES" | "NO" | "",
              standardAmpWall: amp,
            };
          })(),
        hardlineInternet: ((): VenueTechnicalData["hardlineInternet"] => {
          const raw_n = raw.venue!.hardlineInternet;
          if (raw_n && typeof raw_n === "object") {
            const v = raw_n as {
              hardlineInternet?: string;
              hardlineInternetPurpose?: string;
            };
            return {
              hardlineInternet: (matchOption(v.hardlineInternet ?? "", ["YES", "NO"]).toUpperCase() || "") as "YES" | "NO" | "",
              hardlineInternetPurpose: v.hardlineInternetPurpose ?? "",
            };
          }
          return {
            hardlineInternet: (matchOption((raw_n as unknown as string) ?? "", ["YES", "NO"]).toUpperCase() || "") as "YES" | "NO" | "",
            hardlineInternetPurpose: ((raw.venue as Record<string, unknown>).hardlineInternetPurpose as string) ?? "",
          };
        })(),
        livestreamVirtual: ((): VenueTechnicalData["livestreamVirtual"] => {
          const raw_n = raw.venue!.livestreamVirtual;
          if (raw_n && typeof raw_n === "object") {
            const v = raw_n as {
              livestreamVirtual?: string;
              livestreamPlatform?: string;
            };
            return {
              livestreamVirtual: (matchOption(v.livestreamVirtual ?? "", ["YES", "NO"]).toUpperCase() || "") as "YES" | "NO" | "",
              livestreamPlatform: matchOption(v.livestreamPlatform ?? "", ["Zoom", "Teams", "Vimeo", "YouTube", "Other"]) || v.livestreamPlatform || "",
            };
          }
          return {
            livestreamVirtual: (matchOption((raw_n as unknown as string) ?? "", ["YES", "NO"]).toUpperCase() || "") as "YES" | "NO" | "",
            livestreamPlatform: matchOption(((raw.venue as Record<string, unknown>).livestreamPlatform as string) ?? "", ["Zoom", "Teams", "Vimeo", "YouTube", "Other"]) || ((raw.venue as Record<string, unknown>).livestreamPlatform as string) || "",
          };
        })(),
        wirelessInternetAttendees: (matchOption(
          (raw.venue!.wirelessInternetAttendees as unknown as string) ?? "",
          ["YES", "NO"],
        ).toUpperCase() || "") as "YES" | "NO" | "",
      }
    : undefined,
  budget: raw.budget
    ? {
        ...raw.budget,
        estimatedAvBudget: matchOption(raw.budget.estimatedAvBudget, [
          "<$10K",
          "$10-25K",
          "$25-50K",
          "$50-100K",
          "$100K+",
          "Other",
        ]),
        proposalFormatPreferences: matchOptionsArray(
          raw.budget.proposalFormatPreferences,
          [
            "GEAR ITEMIZATION",
            "LABOR BREAKDOWN",
            "ALL-IN ESTIMATE",
            "ADD-ON OPTIONS",
          ],
        ),
        timelineForProposal: matchOption(raw.budget.timelineForProposal, [
          "Within 3 Business Days",
          "1 Week",
          "2 Weeks",
          "Flexible",
        ]),
        callWithDxgProducer: matchOption(raw.budget.callWithDxgProducer, [
          "YES",
          "NO",
        ]).toUpperCase() as BudgetData["callWithDxgProducer"],
        howDidYouHear:
          matchOption(raw.budget.howDidYouHear, [
            "Referral",
            "Venue",
            "Google",
            "Social Media",
            "LinkedIn",
            "Other",
          ]) || raw.budget.howDidYouHear,
      }
    : undefined,
  uploads: raw.uploads
    ? {
        supportDocuments: Array.isArray(raw.uploads.supportDocuments)
          ? raw.uploads.supportDocuments
          : [],
        reviewExistingAvQuote: ((): UploadsData["reviewExistingAvQuote"] => {
          const rv = raw.uploads!.reviewExistingAvQuote;
          if (rv && typeof rv === "object") {
            const v = rv as {
              reviewExistingAvQuote?: string;
              avQuoteFiles?: Array<File | string>;
            };
            const matched = matchOption(v.reviewExistingAvQuote ?? "", [
              "YES",
              "NO",
            ]).toUpperCase();
            return {
              reviewExistingAvQuote: (matched || "") as "YES" | "NO" | "",
              avQuoteFiles: Array.isArray(v.avQuoteFiles) ? v.avQuoteFiles : [],
            };
          }
          const matched = matchOption((rv as unknown as string) ?? "", [
            "YES",
            "NO",
          ]).toUpperCase();
          const avFiles = Array.isArray(
            (raw.uploads as Record<string, unknown>).avQuoteFiles,
          )
            ? ((raw.uploads as Record<string, unknown>).avQuoteFiles as Array<
                File | string
              >)
            : [];
          return {
            reviewExistingAvQuote: (matched || "") as "YES" | "NO" | "",
            avQuoteFiles: avFiles,
          };
        })(),
      }
    : undefined,
  contact: raw.contact
    ? {
        ...raw.contact,
      }
    : undefined,
});

type EditableProposalApiResponse = {
  _id?: string;
  status?: string;
  templateId?: ProposalData["templateId"];
  proposalSettings?: Partial<ProposalData["proposalSettings"]>;
  event?: Partial<EventData>;
  venueSchedule?: Partial<VenueScheduleData>;
  contentCreative?: Partial<ContentCreativeData>;
  videoRecordingStep?: Partial<VideoRecordingData>;
  roomByRoom?: unknown; // array (new) or single object (legacy)
  production?: Partial<ProductionSupportData>;
  hybridVirtual?: Partial<HybridVirtualData>;
  venue?: Partial<VenueTechnicalData>;
  uploads?: Partial<UploadsData>;
  budget?: Partial<BudgetData>;
  contact?: Partial<ContactData>;
};

const normalizeProgramConfidenceMonitor = (
  value: unknown,
  legacyQty?: unknown,
): RoomByRoomData["programConfidenceMonitor"] => {
  const fallbackQty = typeof legacyQty === "string" ? legacyQty : "";
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return {
      programConfidenceMonitor:
        typeof v.programConfidenceMonitor === "string"
          ? v.programConfidenceMonitor
          : "",
      programConfidenceMonitorQty:
        typeof v.programConfidenceMonitorQty === "string"
          ? v.programConfidenceMonitorQty
          : fallbackQty,
    };
  }
  if (typeof value === "string") {
    return {
      programConfidenceMonitor: value,
      programConfidenceMonitorQty: fallbackQty,
    };
  }
  return {
    programConfidenceMonitor: "",
    programConfidenceMonitorQty: fallbackQty,
  };
};

const normalizeNotesConfidenceMonitor = (
  value: unknown,
  legacyQty?: unknown,
): RoomByRoomData["notesConfidenceMonitor"] => {
  const fallbackQty = typeof legacyQty === "string" ? legacyQty : "";
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return {
      notesConfidenceMonitor:
        typeof v.notesConfidenceMonitor === "string"
          ? v.notesConfidenceMonitor
          : "",
      notesConfidenceMonitorQty:
        typeof v.notesConfidenceMonitorQty === "string"
          ? v.notesConfidenceMonitorQty
          : fallbackQty,
    };
  }
  if (typeof value === "string") {
    return {
      notesConfidenceMonitor: value,
      notesConfidenceMonitorQty: fallbackQty,
    };
  }
  return {
    notesConfidenceMonitor: "",
    notesConfidenceMonitorQty: fallbackQty,
  };
};

const mapApiProposalToFormData = (
  raw: EditableProposalApiResponse,
): ProposalData => ({
  ...defaultProposalData,
  templateId: raw.templateId || defaultProposalData.templateId,
  proposalStatus:
    raw.status === "unsubmitted" || raw.status === "submitted"
      ? raw.status
      : defaultProposalData.proposalStatus,
  proposalSettings: {
    ...defaultProposalData.proposalSettings,
    ...(raw.proposalSettings || {}),
    defaultFont: normalizeProposalFont(raw.proposalSettings?.defaultFont),
    proposalLanguage:
      raw.proposalSettings?.proposalLanguage?.trim() ||
      defaultProposalData.proposalSettings.proposalLanguage,
  },
  event: {
    ...defaultProposalData.event,
    ...(raw.event || {}),
  },
  venueSchedule: {
    ...defaultProposalData.venueSchedule,
    ...(raw.venueSchedule || {}),
  },
  roomByRoom: ((): RoomByRoomData[] => {
    // Handle both legacy single-object and new array format from the API
    const rawRooms: unknown[] = Array.isArray(raw.roomByRoom)
      ? raw.roomByRoom
      : raw.roomByRoom && typeof raw.roomByRoom === "object"
        ? [raw.roomByRoom]
        : [];

    if (rawRooms.length === 0) return [];

    return rawRooms.map((rawRoom, idx) => {
      const r = (rawRoom ?? {}) as Record<string, unknown>;
      // Merge legacy production fields only on the first room
      const isFirst = idx === 0;
      return {
        ...defaultRoom(),
        ...r,
        scenicStageDesign: ((r.scenicStageDesign || (isFirst ? raw.production?.scenicStageDesign : "")) ?? "") as RoomByRoomData["scenicStageDesign"],
        unionLabor: ((r.unionLabor || (isFirst ? raw.production?.unionLabor : "")) ?? "") as RoomByRoomData["unionLabor"],
        showCrewNeeded: Array.isArray(r.showCrewNeeded) && (r.showCrewNeeded as string[]).length > 0
          ? (r.showCrewNeeded as string[])
          : (isFirst ? (raw.production?.showCrewNeeded ?? []) : []),
        otherRolesNeeded: (r.otherRolesNeeded as string) || (isFirst ? (raw.production?.otherRolesNeeded ?? "") : "") || "",
        programConfidenceMonitor: normalizeProgramConfidenceMonitor(r.programConfidenceMonitor, r.programConfidenceMonitorQty),
        notesConfidenceMonitor: normalizeNotesConfidenceMonitor(r.notesConfidenceMonitor, r.notesConfidenceMonitorQty),
      } as RoomByRoomData;
    });
  })(),
  hybridVirtual: {
    ...defaultProposalData.hybridVirtual,
    ...(raw.hybridVirtual || {}),
  },
  contentCreative: {
    ...defaultProposalData.contentCreative,
    ...(raw.contentCreative || {}),
  },
  videoRecordingStep: {
    ...defaultProposalData.videoRecordingStep,
    ...(raw.videoRecordingStep || {}),
  },
  venue: {
    ...defaultProposalData.venue,
    needRiggingForFlown: {
      needRiggingForFlown:
        (
          raw.venue?.needRiggingForFlown as unknown as {
            needRiggingForFlown?: string;
          }
        )?.needRiggingForFlown ??
        (raw.venue?.needRiggingForFlown as unknown as string) ??
        "",
      riggingPlotOrSpecs:
        (
          raw.venue?.needRiggingForFlown as unknown as {
            riggingPlotOrSpecs?: string;
          }
        )?.riggingPlotOrSpecs ??
        (raw.venue as unknown as Record<string, string>)?.riggingPlotOrSpecs ??
        "",
    } as VenueTechnicalData["needRiggingForFlown"],
    needDedicatedPowerDrops: {
      needDedicatedPowerDrops:
        (
          raw.venue?.needDedicatedPowerDrops as unknown as {
            needDedicatedPowerDrops?: string;
          }
        )?.needDedicatedPowerDrops ??
        (raw.venue?.needDedicatedPowerDrops as unknown as string) ??
        "",
      standardAmpWall:
        (
          raw.venue?.needDedicatedPowerDrops as unknown as {
            standardAmpWall?: string;
          }
        )?.standardAmpWall ??
        (raw.venue as unknown as Record<string, string>)?.standardAmpWall ??
        "",
    } as VenueTechnicalData["needDedicatedPowerDrops"],
    powerDropsHowMany:
      (raw.venue as unknown as Record<string, string>)?.powerDropsHowMany ?? "",
    hardlineInternet: {
      hardlineInternet: (
        (raw.venue?.hardlineInternet as unknown as { hardlineInternet?: string })?.hardlineInternet ??
        (raw.venue?.hardlineInternet as unknown as string) ??
        ""
      ) as "YES" | "NO" | "",
      hardlineInternetPurpose: (
        (raw.venue?.hardlineInternet as unknown as { hardlineInternetPurpose?: string })?.hardlineInternetPurpose ??
        (raw.venue as unknown as Record<string, string>)?.hardlineInternetPurpose ??
        ""
      ),
    },
    livestreamVirtual: {
      livestreamVirtual: (
        (raw.venue?.livestreamVirtual as unknown as { livestreamVirtual?: string })?.livestreamVirtual ??
        (raw.venue?.livestreamVirtual as unknown as string) ??
        ""
      ) as "YES" | "NO" | "",
      livestreamPlatform: (
        (raw.venue?.livestreamVirtual as unknown as { livestreamPlatform?: string })?.livestreamPlatform ??
        (raw.venue as unknown as Record<string, string>)?.livestreamPlatform ??
        ""
      ),
    },
    wirelessInternetAttendees: (
      (raw.venue as unknown as Record<string, string>)?.wirelessInternetAttendees ?? ""
    ) as "YES" | "NO" | "",
  },
  uploads: {
    ...defaultProposalData.uploads,
    supportDocuments: Array.isArray(raw.uploads?.supportDocuments)
      ? raw.uploads!.supportDocuments!
      : defaultProposalData.uploads.supportDocuments,
    reviewExistingAvQuote: ((): UploadsData["reviewExistingAvQuote"] => {
      const rv = raw.uploads?.reviewExistingAvQuote;
      if (rv && typeof rv === "object") {
        const v = rv as {
          reviewExistingAvQuote?: string;
          avQuoteFiles?: Array<File | string>;
        };
        return {
          reviewExistingAvQuote: (v.reviewExistingAvQuote ?? "") as
            | "YES"
            | "NO"
            | "",
          avQuoteFiles: Array.isArray(v.avQuoteFiles) ? v.avQuoteFiles : [],
        };
      }
      const avFiles = Array.isArray(
        (raw.uploads as Record<string, unknown>)?.avQuoteFiles,
      )
        ? ((raw.uploads as Record<string, unknown>).avQuoteFiles as Array<
            File | string
          >)
        : [];
      return {
        reviewExistingAvQuote: ((rv as unknown as string) ?? "") as
          | "YES"
          | "NO"
          | "",
        avQuoteFiles: avFiles,
      };
    })(),
  },
  budget: {
    ...defaultProposalData.budget,
    ...(raw.budget || {}),
  },
  contact: {
    ...defaultProposalData.contact,
    ...(raw.contact || {}),
  },
});

const AddNewProposal = ({
  mode = "create",
  proposalId,
}: AddNewProposalProps) => {
  const isEditMode = mode === "edit";
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proposalProcessStep, setProposalProcessStep] = useState(
    isEditMode ? 1 : 0,
  );
  const [saving, setSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [showErrors, setShowErrors] = useState(false);
  const [rooms, setRooms] = useState<RoomByRoomData[]>([defaultRoom()]);
  const [createdProposal, setCreatedProposal] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [updatedProposalTitle, setUpdatedProposalTitle] = useState<
    string | null
  >(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyingSaving, setCopyingSaving] = useState(false);

  const [proposalSettings, setProposalSettings] = useState<ProposalSettings>(
    defaultProposalSettings,
  );

  useEffect(() => {
    if (isEditMode) return;

    let mounted = true;

    const loadSettings = async () => {
      const res = await getSettingsAction();
      if (!mounted) return;

      if (res.success && res.data && typeof res.data === "object") {
        const data = res.data as {
          branding?: { linkPrefix?: string; defaultFont?: string };
          proposals?: {
            proposalLanguage?: string;
            defaultCurrency?: string;
            expiryDate?: string;
            priceSeparator?: string;
            dateFormat?: string;
            decimalPrecision?: string;
          };
        };

        setProposalSettings({
          branding: {
            linkPrefix:
              data.branding?.linkPrefix?.trim() ||
              defaultProposalSettings.branding.linkPrefix,
            defaultFont: normalizeProposalFont(data.branding?.defaultFont),
          },
          proposals: {
            proposalLanguage:
              data.proposals?.proposalLanguage?.trim() ||
              defaultProposalSettings.proposals.proposalLanguage,
            defaultCurrency:
              data.proposals?.defaultCurrency?.trim() ||
              defaultProposalSettings.proposals.defaultCurrency,
            expiryDate:
              data.proposals?.expiryDate?.trim() ||
              defaultProposalSettings.proposals.expiryDate,
            priceSeparator:
              data.proposals?.priceSeparator?.trim() ||
              defaultProposalSettings.proposals.priceSeparator,
            dateFormat:
              data.proposals?.dateFormat?.trim() ||
              defaultProposalSettings.proposals.dateFormat,
            decimalPrecision:
              data.proposals?.decimalPrecision?.trim() ||
              defaultProposalSettings.proposals.decimalPrecision,
          },
        });
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, [isEditMode]);

  useEffect(() => {
    setProposalData((prev) => ({
      ...prev,
      proposalSettings: {
        linkPrefix: proposalSettings.branding.linkPrefix,
        defaultFont: proposalSettings.branding.defaultFont,
        proposalLanguage: proposalSettings.proposals.proposalLanguage,
        defaultCurrency: proposalSettings.proposals.defaultCurrency,
        priceSeparator: proposalSettings.proposals.priceSeparator,
        decimalPrecision: proposalSettings.proposals.decimalPrecision,
        dateFormat: proposalSettings.proposals.dateFormat,
      },
    }));
  }, [proposalSettings]);

  useEffect(() => {
    if (!isEditMode) {
      setLoadingExisting(false);
      return;
    }

    if (!proposalId) {
      toast.error("Missing proposal id for editing.");
      router.push("/proposals");
      return;
    }

    let mounted = true;
    const loadEditableProposal = async () => {
      setLoadingExisting(true);
      const result = await getProposalByIdAction(proposalId);
      if (!mounted) return;

      if (!result.success || !result.data || typeof result.data !== "object") {
        toast.error(result.message || "Failed to load proposal for editing.");
        router.push("/proposals");
        return;
      }

      const mapped = mapApiProposalToFormData(
        result.data as EditableProposalApiResponse,
      );
      setProposalData(mapped);
      setProposalSettings((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          linkPrefix: mapped.proposalSettings.linkPrefix,
          defaultFont: mapped.proposalSettings.defaultFont,
        },
        proposals: {
          ...prev.proposals,
          proposalLanguage: mapped.proposalSettings.proposalLanguage,
          defaultCurrency: mapped.proposalSettings.defaultCurrency,
          dateFormat: mapped.proposalSettings.dateFormat,
        },
      }));
      setProposalProcessStep(1);
      setLoadingExisting(false);
    };

    void loadEditableProposal();

    return () => {
      mounted = false;
    };
  }, [isEditMode, proposalId, router]);

  /* ─── Single source of truth for all steps ─── */
  const [proposalData, setProposalData] =
    useState<ProposalData>(defaultProposalData);

  // Sync rooms from loaded proposal data when edit mode finishes loading
  useEffect(() => {
    if (!loadingExisting && proposalData.roomByRoom.length > 0) {
      setRooms(proposalData.roomByRoom.map((r) => ({ ...defaultRoom(), ...r })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingExisting]);

  // Sync rooms array length when numberOfEventRooms stepper changes
  useEffect(() => {
    if (loadingExisting) return;
    const count = Math.min(20, Math.max(1, Number(proposalData.venueSchedule.numberOfEventRooms) || 1));
    setRooms((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        return [...prev, ...Array.from({ length: count - prev.length }, () => defaultRoom())];
      }
      return prev.slice(0, count);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalData.venueSchedule.numberOfEventRooms]);

  const updateProposalSection = <K extends ProposalSectionKey>(
    section: K,
    updates: Partial<ProposalData[K]>,
  ) => {
    setProposalData((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
  };

  const isEventStepValid = () => {
    const { eventName, startDate, endDate, venue } = proposalData.event;
    return (
      eventName.trim().length > 0 &&
      startDate.trim().length > 0 &&
      endDate.trim().length > 0 &&
      venue.trim().length > 0
    );
  };

  const isRoomAndProductionStepValid = () => {
    return rooms.every(
      (r) =>
        r.roomFunction.trim().length > 0 &&
        r.estimatedAttendeesInRoom.trim().length > 0 &&
        r.unionLabor.trim().length > 0 &&
        r.showCrewNeeded.length > 0,
    );
  };

  const isVenueStepValid = () => {
    const {
      needRiggingForFlown,
      needDedicatedPowerDrops,
      powerDropsHowMany,
      hardlineInternet,
      livestreamVirtual,
      wirelessInternetAttendees,
    } = proposalData.venue;
    if (
      !needRiggingForFlown.needRiggingForFlown.trim() ||
      !needDedicatedPowerDrops.needDedicatedPowerDrops.trim() ||
      !hardlineInternet.hardlineInternet.trim() ||
      !livestreamVirtual.livestreamVirtual.trim() ||
      !wirelessInternetAttendees.trim()
    ) {
      return false;
    }
    if (needDedicatedPowerDrops.needDedicatedPowerDrops === "YES") {
      if (
        !needDedicatedPowerDrops.standardAmpWall.trim() ||
        !powerDropsHowMany.trim()
      ) {
        return false;
      }
    }
    if (hardlineInternet.hardlineInternet === "YES") {
      if (!hardlineInternet.hardlineInternetPurpose.trim()) return false;
    }
    if (livestreamVirtual.livestreamVirtual === "YES") {
      if (!livestreamVirtual.livestreamPlatform.trim()) return false;
    }
    return true;
  };

  const isUploadsStepValid = () => {
    const { reviewExistingAvQuote } = proposalData.uploads;
    if (!reviewExistingAvQuote.reviewExistingAvQuote.trim()) {
      return false;
    }
    if (reviewExistingAvQuote.reviewExistingAvQuote === "YES") {
      return reviewExistingAvQuote.avQuoteFiles.length > 0;
    }
    return true;
  };

  const isBudgetStepValid = () => {
    const {
      estimatedAvBudget,
      budgetCustomAmount,
      timelineForProposal,
      callWithDxgProducer,
      howDidYouHear,
      howDidYouHearOther,
    } = proposalData.budget;

    if (
      !estimatedAvBudget.trim() ||
      !timelineForProposal.trim() ||
      !callWithDxgProducer.trim() ||
      !howDidYouHear.trim()
    ) {
      return false;
    }

    if (estimatedAvBudget === "Other" && !budgetCustomAmount.trim()) return false;
    if (howDidYouHear === "Other" && !howDidYouHearOther.trim()) return false;

    return true;
  };

  const isContactStepValid = () => {
    const { contactFirstName, contactLastName, contactEmail, contactPhone } =
      proposalData.contact;
    return (
      contactFirstName.trim().length > 0 &&
      contactLastName.trim().length > 0 &&
      contactEmail.trim().length > 0 &&
      contactPhone.trim().length > 0
    );
  };

  const normalizeRoomByRoomForSubmit = (
    roomByRoom: RoomByRoomData,
  ): RoomByRoomData => {
    const normalized = { ...roomByRoom };

    // Clear nested qty fields when parent is not "Yes"
    if (normalized.wirelessMics.wirelessMics !== "Yes") {
      normalized.wirelessMics = {
        ...normalized.wirelessMics,
        wirelessMicsQty: "",
        wirelessMicsType: "",
      };
    }
    if (
      normalized.largeMonitorsOrScreenProjector
        .largeMonitorsOrScreenProjector !== "Yes"
    ) {
      normalized.largeMonitorsOrScreenProjector = {
        ...normalized.largeMonitorsOrScreenProjector,
        largeMonitorsQty: "",
      };
    }
    if (
      normalized.clientProvideOwnPresentationLaptop
        .clientProvideOwnPresentationLaptop !== "Yes"
    ) {
      normalized.clientProvideOwnPresentationLaptop = {
        ...normalized.clientProvideOwnPresentationLaptop,
        clientLaptopQty: "",
      };
    }
    if (normalized.presentationLaptops.presentationLaptops !== "Yes") {
      normalized.presentationLaptops = {
        ...normalized.presentationLaptops,
        presentationLaptopQty: "",
      };
    }
    if (normalized.videoPlayback.videoPlayback !== "Yes") {
      normalized.videoPlayback = {
        ...normalized.videoPlayback,
        videoPlaybackCount: "",
      };
    }
    if (normalized.cameras.cameras !== "Yes") {
      normalized.cameras = { ...normalized.cameras, camerasQty: "" };
    }
    if (normalized.audienceQa.audienceQa !== "Yes") {
      normalized.audienceQa = {
        ...normalized.audienceQa,
        audienceQaMethod: "",
      };
    }
    if (normalized.videoRecording.videoRecording !== "Yes") {
      normalized.videoRecording = {
        ...normalized.videoRecording,
        videoRecordingType: "",
      };
    }
    if (normalized.stageWashLighting.stageWashLighting !== "Yes") {
      normalized.stageWashLighting = {
        ...normalized.stageWashLighting,
        stageWashLightingStageSize: "",
      };
    }
    if (
      normalized.programConfidenceMonitor.programConfidenceMonitor !== "Yes"
    ) {
      normalized.programConfidenceMonitor = {
        ...normalized.programConfidenceMonitor,
        programConfidenceMonitorQty: "",
      };
    }
    if (normalized.notesConfidenceMonitor.notesConfidenceMonitor !== "Yes") {
      normalized.notesConfidenceMonitor = {
        ...normalized.notesConfidenceMonitor,
        notesConfidenceMonitorQty: "",
      };
    }

    return normalized;
  };

  const handleSubmit = async (statusOverride?: "unsubmitted" | "submitted") => {
    setShowErrors(true);
    if (!isContactStepValid()) {
      toast.error("Please complete all required contact fields.");
      return;
    }

    setSaving(true);

    // Mongoose expects arrays of strings (e.g. file URLs), but state holds File objects
    // Temporarily, we just strip them out or map them to their names so validation passes.
    // (If you want true file uploading, you'd send them to S3/Cloudinary first and pass the URLs here.)
    const normalizedRooms = rooms.map((r) => normalizeRoomByRoomForSubmit(r));
    const firstRoom = normalizedRooms[0] ?? normalizeRoomByRoomForSubmit(defaultRoom());
    const payload: ProposalData & { production: ProductionSupportData } = {
      ...proposalData,
      proposalSettings: {
        linkPrefix: proposalSettings.branding.linkPrefix,
        defaultFont: proposalSettings.branding.defaultFont,
        proposalLanguage: proposalSettings.proposals.proposalLanguage,
        defaultCurrency: proposalSettings.proposals.defaultCurrency,
        priceSeparator: proposalSettings.proposals.priceSeparator,
        decimalPrecision: proposalSettings.proposals.decimalPrecision,
        dateFormat: proposalSettings.proposals.dateFormat,
      },
      roomByRoom: normalizedRooms,
      production: {
        scenicStageDesign: firstRoom.scenicStageDesign,
        unionLabor: firstRoom.unionLabor,
        showCrewNeeded: firstRoom.showCrewNeeded,
        otherRolesNeeded: firstRoom.otherRolesNeeded,
      },
      uploads: {
        supportDocuments: [],
        reviewExistingAvQuote: {
          reviewExistingAvQuote:
            proposalData.uploads.reviewExistingAvQuote.reviewExistingAvQuote,
          avQuoteFiles: proposalData.uploads.reviewExistingAvQuote.avQuoteFiles
            .map((f) => (typeof f === "string" ? f : f?.name || ""))
            .filter(
              (f) =>
                typeof f === "string" &&
                f.trim() !== "" &&
                f !== "[ {} ]" &&
                f !== "[object Object]",
            ),
        },
      },
    };

    const payloadWithStatus = {
      ...payload,
      status: statusOverride ?? proposalData.proposalStatus,
    };

    try {
      const result =
        isEditMode && proposalId
          ? await updateProposalAction(
              proposalId,
              payloadWithStatus as Partial<ProposalData>,
            )
          : await createProposalAction(payloadWithStatus);
      if (result.success) {
        toast.success(
          isEditMode
            ? "Proposal updated successfully!"
            : "Proposal created successfully!",
        );
        if (isEditMode) {
          const updatedTitle =
            proposalData.event.eventName?.trim() || "Untitled Proposal";
          setUpdatedProposalTitle(updatedTitle);
          return;
        }
        const data =
          result.data && typeof result.data === "object"
            ? (result.data as { _id?: string; event?: { eventName?: string } })
            : null;

        const createdId = data?._id || "";
        const createdTitle =
          data?.event?.eventName ||
          proposalData.event.eventName ||
          "Untitled Proposal";

        if (createdId) {
          setCreatedProposal({ id: createdId, title: createdTitle });
        } else {
          router.push("/proposals");
        }
      } else {
        toast.error(
          result.message ||
            (isEditMode
              ? "Failed to update proposal."
              : "Failed to create proposal."),
        );
      }
    } catch {
      toast.error(
        isEditMode
          ? "An error occurred while updating the proposal."
          : "An error occurred while creating the proposal.",
      );
    } finally {
      setSaving(false);
    }
  };

  /** Convert a stored date string (MM/DD/YYYY or similar) to YYYY-MM-DD for HTML date inputs */
  const toIsoDate = (raw: string): string => {
    if (!raw) return "";
    const v = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const sep = v.includes("/") ? "/" : "-";
    const parts = v.split(sep);
    if (parts.length !== 3) return "";
    const [a, b, c] = parts;
    if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    return "";
  };

  const handleSaveCopy = async (overrides: {
    eventName: string;
    startDate: string;
    endDate: string;
    templateId: "template-one" | "template-two" | "";
  }) => {
    if (!createdProposal?.id) return;
    setCopyingSaving(true);
    try {
      const result = await copyProposalAction(createdProposal.id, {
        eventName: overrides.eventName,
        startDate: overrides.startDate,
        endDate: overrides.endDate,
        templateId: overrides.templateId as "template-one" | "template-two",
      });
      if (result.success) {
        toast.success("Copy saved successfully!");
        setShowCopyModal(false);
      } else {
        toast.error(result.message || "Failed to save copy.");
      }
    } catch {
      toast.error("An error occurred while saving the copy.");
    } finally {
      setCopyingSaving(false);
    }
  };

  const isInPersonOnly = proposalData.event.eventFormat === "In-Person";

  const continueHandler = async () => {
    /* ── Step 0: extract fields from uploaded doc before advancing ── */
    if (proposalProcessStep === 0) {
      if (!selectedFile) return;

      setIsExtracting(true);
      try {
        const result = await extractProposalFromFile(selectedFile);
        if (
          result.success &&
          result.data &&
          Object.keys(result.data).length > 0
        ) {
          // Normalize enum/dropdown fields so they exactly match option strings
          const normalized = normalizeExtracted(result.data);
          setProposalData((prev) => ({
            ...prev,
            event: { ...prev.event, ...(normalized.event ?? {}) },
            roomByRoom: normalized.roomByRoom ?? prev.roomByRoom,
            venue: { ...prev.venue, ...(normalized.venue ?? {}) },
            uploads: { ...prev.uploads, ...(normalized.uploads ?? {}) },
            budget: { ...prev.budget, ...(normalized.budget ?? {}) },
            contact: { ...prev.contact, ...(normalized.contact ?? {}) },
          }));
          if (normalized.roomByRoom && normalized.roomByRoom.length > 0) {
            setRooms(normalized.roomByRoom.map((r) => ({ ...defaultRoom(), ...r })));
          }
          toast.success("✅ Fields pre-filled from your document!");
        } else {
          toast.info(
            "No matching fields found — please fill the form manually.",
          );
        }
      } catch {
        toast.info(
          "Couldn't read the document — please fill the form manually.",
        );
      } finally {
        setIsExtracting(false);
      }

      setProposalProcessStep(1);
      setShowErrors(false);
      return;
    }

    setShowErrors(true);

    if (proposalProcessStep === 1 && !isEventStepValid()) {
      return;
    }
    // Step 2 = Venue & Schedule — no required validation blocking
    if (proposalProcessStep === 3 && !isRoomAndProductionStepValid()) {
      return;
    }
    // Steps 4 (Hybrid & Virtual), 5 (Content & Creative), 6 (Video Recording) — no required validation
    if (proposalProcessStep === 7 && !isVenueStepValid()) {
      return;
    }
    if (proposalProcessStep === 8 && !isBudgetStepValid()) {
      return;
    }
    if (proposalProcessStep === 9 && !isUploadsStepValid()) {
      return;
    }

    if (proposalProcessStep === 10) {
      if (!isContactStepValid()) {
        return;
      }
      setProposalProcessStep(11);
      setShowErrors(false);
      return;
    }

    if (proposalProcessStep === 11) return;

    setProposalProcessStep((s) => {
      const next = s + 1;
      return isInPersonOnly && next === 4 ? 5 : next;
    });
    setShowErrors(false);
  };
  const handleUploadAndContinue = async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    try {
      const result = await extractProposalFromFile(selectedFile);
      if (
        result.success &&
        result.data &&
        Object.keys(result.data).length > 0
      ) {
        const normalized = normalizeExtracted(result.data);
        setProposalData((prev) => ({
          ...prev,
          event: { ...prev.event, ...(normalized.event ?? {}) },
          // roomByRoom is an array — replace entirely with extracted data
          roomByRoom: normalized.roomByRoom ?? prev.roomByRoom,
          venue: { ...prev.venue, ...(normalized.venue ?? {}) },
          uploads: { ...prev.uploads, ...(normalized.uploads ?? {}) },
          budget: { ...prev.budget, ...(normalized.budget ?? {}) },
          contact: { ...prev.contact, ...(normalized.contact ?? {}) },
        }));
        // Populate the rooms accordion state so the form fields render correctly
        if (normalized.roomByRoom && normalized.roomByRoom.length > 0) {
          setRooms(normalized.roomByRoom.map((r) => ({ ...defaultRoom(), ...r })));
        }
        toast.success("Fields pre-filled from your document.");
      } else {
        toast.info("No matching fields found. You can continue manually.");
      }
    } catch {
      toast.info("Couldn't read the document. You can continue manually.");
    } finally {
      setIsExtracting(false);
    }

    setProposalProcessStep(1);
    setShowErrors(false);
  };
  const backHandler = () =>
    setProposalProcessStep((s) => {
      const prev = Math.max(0, s - 1);
      return isInPersonOnly && prev === 4 ? 3 : prev;
    });

  if (createdProposal) {
    return (
      <>
        <ProposalSuccessfullyCreate
          proposalTitle={createdProposal.title}
          onBackToList={() => router.push("/proposals")}
          onViewProposal={() =>
            router.push(
              `/proposal/${toProposalSlug(createdProposal.title, createdProposal.id)}`,
            )
          }
          onSendEmail={() =>
            router.push(
              `/email/send-email?proposalId=${encodeURIComponent(createdProposal.id)}`,
            )
          }
          onSaveCopy={() => setShowCopyModal(true)}
        />
        <SaveCopyModal
          isOpen={showCopyModal}
          onClose={() => setShowCopyModal(false)}
          onConfirm={(overrides) => void handleSaveCopy(overrides)}
          saving={copyingSaving}
          defaultEventName={proposalData.event.eventName}
          defaultStartDate={toIsoDate(proposalData.event.startDate)}
          defaultEndDate={toIsoDate(proposalData.event.endDate)}
          defaultTemplateId={proposalData.templateId}
          proposalSettings={proposalSettings}
        />
      </>
    );
  }

  if (updatedProposalTitle) {
    return (
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-blue-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mt-2 text-center">
          <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Proposal Updated Successfully
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
            Your proposal{" "}
            <span className="font-semibold text-slate-800">
              &quot;{updatedProposalTitle}&quot;
            </span>{" "}
            has been updated.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-1">
          <button
            type="button"
            onClick={() => router.push("/proposals")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back To Proposal List
          </button>
        </div>
      </section>
    );
  }

  return (
    <div
      style={{
        fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)`,
      }}
      className="space-y-6 px-6"
    >
      {loadingExisting && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
          Loading proposal for editing...
        </div>
      )}
      {/* â”€â”€ Step 0: Upload screen â”€â”€ */}
      {!loadingExisting && !isEditMode && proposalProcessStep === 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-gray-900 leading-none">
                Your Proposals
              </h1>
            </div>
          </div>
          <AddProposalUpload
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            isExtracting={isExtracting}
            onContinueWithUpload={() => void handleUploadAndContinue()}
            onContinueWithoutUpload={() => {
              setProposalProcessStep(1);
              setShowErrors(false);
            }}
          />
        </>
      )}

      {/* â”€â”€ Steps 1â€“7: Multi-step form â”€â”€ */}
      {!loadingExisting && proposalProcessStep >= 1 && (
        <div className="flex w-full">
          {/* Form area â€” 70% */}
          <div className="w-[80%] mr-4">
            {proposalProcessStep === 1 && (
              <EventForm
                data={proposalData.event}
                onChange={(updates) => updateProposalSection("event", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 2 && (
              <VenueScheduleStep
                data={proposalData.venueSchedule ?? defaultVenueSchedule()}
                onChange={(updates) => updateProposalSection("venueSchedule", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 3 && (
              <RoomAndProductionStep
                rooms={rooms}
                onRoomsChange={setRooms}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 4 && (
              <HybridVirtualStep
                data={proposalData.hybridVirtual}
                onChange={(updates) =>
                  updateProposalSection("hybridVirtual", updates)
                }
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
                eventFormat={proposalData.event.eventFormat}
              />
            )}
            {proposalProcessStep === 5 && (
              <ContentCreativeStep
                data={proposalData.contentCreative ?? defaultContentCreative()}
                onChange={(updates) =>
                  updateProposalSection("contentCreative", updates)
                }
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
                eventFormat={proposalData.event.eventFormat}
                sponsorOverlays={proposalData.hybridVirtual.sponsorOverlays}
              />
            )}
            {proposalProcessStep === 6 && (
              <VideoRecordingStep
                data={proposalData.videoRecordingStep ?? defaultVideoRecording()}
                onChange={(updates) =>
                  updateProposalSection("videoRecordingStep", updates)
                }
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 7 && (
              <VenueTechnicalRequirements
                data={proposalData.venue}
                onChange={(updates) => updateProposalSection("venue", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 8 && (
              <BudgetProposalPreferences
                data={proposalData.budget}
                onChange={(updates) => updateProposalSection("budget", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 9 && (
              <UploadsReferenceMaterials
                data={proposalData.uploads}
                onChange={(updates) =>
                  updateProposalSection("uploads", updates)
                }
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 10 && (
              <ContactInfo
                data={proposalData.contact}
                onChange={(updates) =>
                  updateProposalSection("contact", updates)
                }
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 11 && (
              <TemplateSelection
                templateId={proposalData.templateId}
                onSelect={(templateId) =>
                  setProposalData((prev) => ({ ...prev, templateId }))
                }
                onCreate={(status) => {
                  setShowErrors(true);
                  if (!proposalData.templateId) return;
                  if (!saving) {
                    void handleSubmit(status);
                  }
                }}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
                draftActionLabel={
                  isEditMode ? "UPDATE AS DRAFT" : "SAVE AS DRAFT"
                }
                liveActionLabel={isEditMode ? "UPDATE LIVE" : "CREATE LIVE"}
              />
            )}
          </div>
          {/* Sidebar — 20% */}
          <div className="w-[20%] sticky top-0 self-start">
            <ProcessList
              activeStep={proposalProcessStep}
              hideStepIds={isInPersonOnly ? [4] : []}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AddNewProposal;

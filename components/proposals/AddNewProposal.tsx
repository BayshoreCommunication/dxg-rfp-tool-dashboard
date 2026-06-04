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
import UploadsReferenceMaterials from "./ProposalsProcess.tsx/UploadsReferenceMaterials";
import VenueTechnicalRequirements from "./ProposalsProcess.tsx/VenueTechnicalRequirements";
import ProposalSuccessfullyCreate from "./ProposalSuccessfullyCreate";
import SaveCopyModal from "./SaveCopyModal";

/* ─── Proposal data by step ─── */
export type EventData = {
  eventName: string;
  editionYear?: string;
  eventTheme?: string;
  startDate: string;
  endDate: string;
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
  /* ?? new fields matching HTML page 2B ?? */
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
  /* Venue AV Contact */
  venueAvContactName: string;
  venueAvContactPhone: string;
  venueAvContactEmail: string;
  /* In-House AV */
  inHouseAvCompanyName: string;
  /* Rigging */
  riggingRequired: "YES" | "NO" | "";
  maxWeightPerRiggingPoint: string;
  numberOfRiggingPoints: string;
  /* Power Drops */
  powerDropsRequired: "YES" | "NO" | "";
  powerDropAmperage: string;
  numberOfPowerDrops: string;
  /* Wireless Internet */
  wirelessInternetRequired: "YES" | "NO" | "";
  internetUseCases: string[];
  /* Compliance & Access */
  coiRequirements: string;
  venueAccessRequirements: string;
};

export type CoVendorEntry = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  notes: string;
};

export type ReferenceUrl = {
  url: string;
  label: string;
};

export type UploadsData = {
  brandGuideFiles: string[];
  brandGuideUrl: string;
  eventLogoFiles: string[];
  referenceFiles: string[];
  referenceUrls: ReferenceUrl[];
  venueDocs: string[];
  coVendors: {
    inHouseVenueAv: CoVendorEntry;
    eventDecorator: CoVendorEntry;
    registrationTech: CoVendorEntry;
    agencyOfRecord: CoVendorEntry;
    photographer: CoVendorEntry;
  };
  ndaRequired: "YES" | "NO" | "";
  ndaType: string;
  ndaDocumentFiles: string[];
};

export type BudgetData = {
  estimatedAvBudget: string;
  budgetFlexibility: string;
  proposalFormatPreferences: string[];
  evaluationMatrix: {
    technicalApproach: number;
    crewExperience: number;
    hybridVirtual: number;
    pricing: number;
    creativeScenic: number;
    responsiveness: number;
    sustainabilityDei: number;
  };
  timelineForProposal: string;
  decisionDate: string;
  competitiveBid: "YES" | "NO" | "";
  numberOfProposals: string;
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
    captionLanguageOther: string;
    captionType: string;
  };
  onDemandRecording: "YES" | "NO" | "";
  sponsorOverlays: "YES" | "NO" | "";
  virtualNetworking: "YES" | "NO" | "";
};

export type { VenueScheduleData };
export type { ContentCreativeData };
export type { VideoRecordingData };

export type AdditionalContact = {
  fullName: string;
  titleAndRole: string;
  email: string;
  phone: string;
  role: string;
};

export type ContactData = {
  contactFirstName: string;
  contactLastName: string;
  contactTitle: string;
  contactOrganization: string;        // display name ("Apex Dynamics")
  contactEmail: string;
  contactPhone: string;
  contactPhoneExt: string;
  contactPhoneType: string;           // "mobile" | "direct_office" | "office_main" | ""
  organizationLegalName: string;      // full legal name for formal documents
  additionalContacts: AdditionalContact[];
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
      captionLanguageOther: "",
      captionType: "",
    },
    onDemandRecording: "",
    sponsorOverlays: "",
    virtualNetworking: "",
  },
  venue: {
    venueAvContactName: "",
    venueAvContactPhone: "",
    venueAvContactEmail: "",
    inHouseAvCompanyName: "",
    riggingRequired: "",
    maxWeightPerRiggingPoint: "",
    numberOfRiggingPoints: "",
    powerDropsRequired: "",
    powerDropAmperage: "",
    numberOfPowerDrops: "",
    wirelessInternetRequired: "",
    internetUseCases: [],
    coiRequirements: "",
    venueAccessRequirements: "",
  },
  uploads: {
    brandGuideFiles: [],
    brandGuideUrl: "",
    eventLogoFiles: [],
    referenceFiles: [],
    referenceUrls: [],
    venueDocs: [],
    coVendors: {
      inHouseVenueAv:  { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
      eventDecorator:  { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
      registrationTech:{ companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
      agencyOfRecord:  { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
      photographer:    { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
    },
    ndaRequired: "",
    ndaType: "",
    ndaDocumentFiles: [],
  },
  budget: {
    estimatedAvBudget: "",
    budgetFlexibility: "",
    proposalFormatPreferences: [],
    evaluationMatrix: {
      technicalApproach: 25,
      crewExperience: 20,
      hybridVirtual: 20,
      pricing: 15,
      creativeScenic: 10,
      responsiveness: 7,
      sustainabilityDei: 3,
    },
    timelineForProposal: "",
    decisionDate: "",
    competitiveBid: "",
    numberOfProposals: "",
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
    contactPhoneExt: "",
    contactPhoneType: "mobile",
    organizationLegalName: "",
    additionalContacts: [],
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

/* ??? Normalize AI-extracted values to exactly match option strings ??? */
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
): Partial<ProposalData> => {
  const yn = (v: unknown): "YES" | "NO" | "" =>
    (matchOption((v as string) ?? "", ["YES", "NO"]).toUpperCase() || "") as "YES" | "NO" | "";

  return {
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
    ? (() => {
        const rv = raw.venue as Record<string, unknown>;
        const yn = (v: unknown): "YES" | "NO" | "" =>
          (matchOption((v as string) ?? "", ["YES", "NO"]).toUpperCase() || "") as "YES" | "NO" | "";
        return {
          venueAvContactName: (rv.venueAvContactName as string) ?? "",
          venueAvContactPhone: (rv.venueAvContactPhone as string) ?? "",
          venueAvContactEmail: (rv.venueAvContactEmail as string) ?? "",
          inHouseAvCompanyName: (rv.inHouseAvCompanyName as string) ?? "",
          riggingRequired: yn(rv.riggingRequired),
          maxWeightPerRiggingPoint: (rv.maxWeightPerRiggingPoint as string) ?? "",
          numberOfRiggingPoints: (rv.numberOfRiggingPoints as string) ?? "",
          powerDropsRequired: yn(rv.powerDropsRequired),
          powerDropAmperage: (rv.powerDropAmperage as string) ?? "",
          numberOfPowerDrops: (rv.numberOfPowerDrops as string) ?? "",
          wirelessInternetRequired: yn(rv.wirelessInternetRequired),
          internetUseCases: Array.isArray(rv.internetUseCases) ? rv.internetUseCases as string[] : [],
          coiRequirements: (rv.coiRequirements as string) ?? "",
          venueAccessRequirements: (rv.venueAccessRequirements as string) ?? "",
        } as VenueTechnicalData;
      })()
    : undefined,
  budget: raw.budget
    ? (() => {
        const rb = raw.budget as Record<string, unknown>;
        const rm = rb.evaluationMatrix as Record<string, unknown> | undefined;
        const defM = { technicalApproach: 25, crewExperience: 20, hybridVirtual: 20, pricing: 15, creativeScenic: 10, responsiveness: 7, sustainabilityDei: 3 };
        return {
          estimatedAvBudget: matchOption((rb.estimatedAvBudget as string) ?? "", ["Essential", "Standard", "Production", "Premium", "Enterprise", "Signature", "Not Yet Determined"]) || (rb.estimatedAvBudget as string) || "",
          budgetFlexibility: (rb.budgetFlexibility as string) ?? "",
          proposalFormatPreferences: Array.isArray(rb.proposalFormatPreferences) ? rb.proposalFormatPreferences as string[] : [],
          evaluationMatrix: rm && typeof rm === "object"
            ? {
                technicalApproach: Number(rm.technicalApproach) || defM.technicalApproach,
                crewExperience: Number(rm.crewExperience) || defM.crewExperience,
                hybridVirtual: Number(rm.hybridVirtual) || defM.hybridVirtual,
                pricing: Number(rm.pricing) || defM.pricing,
                creativeScenic: Number(rm.creativeScenic) || defM.creativeScenic,
                responsiveness: Number(rm.responsiveness) || defM.responsiveness,
                sustainabilityDei: Number(rm.sustainabilityDei ?? 0),
              }
            : defM,
          timelineForProposal: matchOption((rb.timelineForProposal as string) ?? "", ["Within 24 Hours", "Within 3 Business Days", "1 Week", "2 Weeks", "Flexible"]) || (rb.timelineForProposal as string) || "",
          decisionDate: (rb.decisionDate as string) ?? "",
          competitiveBid: (matchOption((rb.competitiveBid as string) ?? "", ["YES", "NO"]).toUpperCase() || "") as "YES" | "NO" | "",
          numberOfProposals: (rb.numberOfProposals as string) ?? "",
          scoringNotes: (rb.scoringNotes as string) ?? "",
          callWithDxgProducer: (matchOption((rb.callWithDxgProducer as string) ?? "", ["YES", "NO"]).toUpperCase() || "") as "YES" | "NO" | "",
          howDidYouHear: matchOption((rb.howDidYouHear as string) ?? "", ["Referral", "Venue", "Google", "Social Media", "LinkedIn", "Other"]) || (rb.howDidYouHear as string) || "",
          howDidYouHearOther: (rb.howDidYouHearOther as string) ?? "",
        } as BudgetData;
      })()
    : undefined,
  uploads: raw.uploads
    ? (() => {
        const ru = raw.uploads as Record<string, unknown>;
        const strArr = (v: unknown): string[] =>
          Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
        const refUrls = (v: unknown): ReferenceUrl[] =>
          Array.isArray(v)
            ? (v as unknown[]).filter(
                (x): x is ReferenceUrl =>
                  !!x && typeof x === "object" && "url" in (x as object),
              )
            : [];
        const coV = (v: unknown): CoVendorEntry => {
          const e = ((v ?? {}) as Record<string, unknown>);
          return {
            companyName:  (e.companyName  as string) ?? "",
            contactName:  (e.contactName  as string) ?? "",
            contactEmail: (e.contactEmail as string) ?? "",
            contactPhone: (e.contactPhone as string) ?? "",
            status:       (e.status       as string) ?? "",
            notes:        (e.notes        as string) ?? "",
          };
        };
        const cv = (ru.coVendors ?? {}) as Record<string, unknown>;
        const yn = (v: unknown): "YES" | "NO" | "" =>
          v === "YES" ? "YES" : v === "NO" ? "NO" : "";
        return {
          brandGuideFiles:  strArr(ru.brandGuideFiles),
          brandGuideUrl:    (ru.brandGuideUrl  as string) ?? "",
          eventLogoFiles:   strArr(ru.eventLogoFiles),
          referenceFiles:   strArr(ru.referenceFiles),
          referenceUrls:    refUrls(ru.referenceUrls),
          venueDocs:        strArr(ru.venueDocs),
          coVendors: {
            inHouseVenueAv:   coV(cv.inHouseVenueAv),
            eventDecorator:   coV(cv.eventDecorator),
            registrationTech: coV(cv.registrationTech),
            agencyOfRecord:   coV(cv.agencyOfRecord),
            photographer:     coV(cv.photographer),
          },
          ndaRequired:      yn(ru.ndaRequired),
          ndaType:          (ru.ndaType as string) ?? "",
          ndaDocumentFiles: strArr(ru.ndaDocumentFiles),
        } as UploadsData;
      })()
    : undefined,
  venueSchedule: raw.venueSchedule
    ? (() => {
        const rv = raw.venueSchedule as Record<string, unknown>;
        return {
          venueName: (rv.venueName as string) ?? "",
          venueCity: (rv.venueCity as string) ?? "",
          venueState: (rv.venueState as string) ?? "",
          venueAddress: (rv.venueAddress as string) ?? "",
          venueType: (rv.venueType as string) ?? "",
          venueConfirmedStatus: (rv.venueConfirmedStatus as string) ?? "",
          isUnionVenue: (matchOption((rv.isUnionVenue as string) ?? "", ["YES", "NO", "NOT_SURE"]).toUpperCase() || "") as VenueScheduleData["isUnionVenue"],
          unionJurisdictions: Array.isArray(rv.unionJurisdictions) ? rv.unionJurisdictions as string[] : [],
          unionJurisdictionOther: (rv.unionJurisdictionOther as string) ?? "",
          loadInDate: (rv.loadInDate as string) ?? "",
          loadInTime: (rv.loadInTime as string) ?? "",
          rehearsalDate: (rv.rehearsalDate as string) ?? "",
          rehearsalTime: (rv.rehearsalTime as string) ?? "",
          strikeDate: (rv.strikeDate as string) ?? "",
          strikeTime: (rv.strikeTime as string) ?? "",
          numberOfEventRooms: (rv.numberOfEventRooms as string) ?? "1",
          timeZone: (rv.timeZone as string) ?? "",
        } as VenueScheduleData;
      })()
    : undefined,
  hybridVirtual: raw.hybridVirtual
    ? (() => {
        const rh = raw.hybridVirtual as Record<string, unknown>;
        const rs = (rh.remoteSpeakers ?? {}) as Record<string, unknown>;
        const cc = (rh.closedCaptions ?? {}) as Record<string, unknown>;
        const platformOpts = ["Zoom", "Teams", "Hopin", "vMix", "StreamYard", "Webex", "Other"];
        return {
          virtualAttendeeEstimate: (rh.virtualAttendeeEstimate as string) ?? "",
          streamingPlatform: matchOption((rh.streamingPlatform as string) ?? "", platformOpts) || (rh.streamingPlatform as string) || "",
          streamingPlatformOther: (rh.streamingPlatformOther as string) ?? "",
          platformIntegrationWithAv: yn(rh.platformIntegrationWithAv),
          streamOwnership: (rh.streamOwnership as string) ?? "",
          remoteSpeakers: {
            remoteSpeakers: yn(rs.remoteSpeakers),
            howManyRemoteSpeakers: (rs.howManyRemoteSpeakers as string) ?? "",
            remoteFeedPlatform: (rs.remoteFeedPlatform as string) ?? "",
            techRehearsalOwner: (rs.techRehearsalOwner as string) ?? "",
          },
          liveVirtualQa: yn(rh.liveVirtualQa),
          virtualOnlyBreakouts: yn(rh.virtualOnlyBreakouts),
          dedicatedVirtualProducer: yn(rh.dedicatedVirtualProducer),
          closedCaptions: {
            closedCaptions: yn(cc.closedCaptions),
            captionLanguages: Array.isArray(cc.captionLanguages) ? cc.captionLanguages as string[] : [],
            captionLanguageOther: (cc.captionLanguageOther as string) ?? "",
            captionType: (cc.captionType as string) ?? "",
          },
          onDemandRecording: yn(rh.onDemandRecording),
          sponsorOverlays: yn(rh.sponsorOverlays),
          virtualNetworking: yn(rh.virtualNetworking),
        } as HybridVirtualData;
      })()
    : undefined,
  contentCreative: raw.contentCreative
    ? (() => {
        const rc = raw.contentCreative as Record<string, unknown>;
        const ownerOpts = ["Client / Internal Team", "AV Vendor", "TBD", "N/A"];
        const own = (v: unknown): string => matchOption((v as string) ?? "", ownerOpts) || (v as string) || "";
        const ld = (rc.liveDataFeeds ?? {}) as Record<string, unknown>;
        return {
          contentServicesNeeded: yn(rc.contentServicesNeeded),
          presentationTemplateDesign: own(rc.presentationTemplateDesign),
          speakerSlideCollection: own(rc.speakerSlideCollection),
          motionGraphicsOpenerVideo: own(rc.motionGraphicsOpenerVideo),
          lowerThirdsNameSupers: own(rc.lowerThirdsNameSupers),
          eventLogoBrandStandards: own(rc.eventLogoBrandStandards),
          sizzleRecapVideo: own(rc.sizzleRecapVideo),
          liveDataFeeds: {
            needed: yn(ld.needed),
            ownership: own(ld.ownership),
          },
          sponsorRecognitionContent: own(rc.sponsorRecognitionContent),
          socialMediaContentCapture: own(rc.socialMediaContentCapture),
          virtualBackgroundDesign: own(rc.virtualBackgroundDesign),
          creativeDirectionNotes: (rc.creativeDirectionNotes as string) ?? "",
        } as ContentCreativeData;
      })()
    : undefined,
  videoRecordingStep: raw.videoRecordingStep
    ? (() => {
        const rvr = raw.videoRecordingStep as Record<string, unknown>;
        const strArr = (v: unknown): string[] =>
          Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
        const ed = (rvr.editedDeliverable ?? {}) as Record<string, unknown>;
        return {
          videoRecordingRequired: yn(rvr.videoRecordingRequired),
          numberOfCameras: (rvr.numberOfCameras as string) ?? "",
          cameraPositions: strArr(rvr.cameraPositions),
          imagRequired: yn(rvr.imagRequired),
          cameraOperators: (rvr.cameraOperators as string) ?? "",
          isoRecordings: (rvr.isoRecordings as string) ?? "",
          recordingResolution: (rvr.recordingResolution as string) ?? "",
          recordingMedia: (rvr.recordingMedia as string) ?? "",
          editedDeliverable: {
            needed: yn(ed.needed),
            deliverableType: strArr(ed.deliverableType),
            turnaroundTime: (ed.turnaroundTime as string) ?? "",
            reelLengthPreference: (ed.reelLengthPreference as string) ?? "",
          },
          rawFootageTurnover: yn(rvr.rawFootageTurnover),
          deliverableFormat: strArr(rvr.deliverableFormat),
          deliveryMethod: strArr(rvr.deliveryMethod),
        } as VideoRecordingData;
      })()
    : undefined,
  contact: raw.contact
    ? {
        ...raw.contact,
      }
    : undefined,
  };
};

type EditableProposalApiResponse = {
  _id?: string;
  status?: string;
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
  venue: (() => {
    const rv = (raw.venue ?? {}) as Record<string, unknown>;
    const yn = (v: unknown): "YES" | "NO" | "" =>
      v === "YES" ? "YES" : v === "NO" ? "NO" : "";
    return {
      ...defaultProposalData.venue,
      venueAvContactName:      (rv.venueAvContactName      as string) ?? "",
      venueAvContactPhone:     (rv.venueAvContactPhone     as string) ?? "",
      venueAvContactEmail:     (rv.venueAvContactEmail     as string) ?? "",
      inHouseAvCompanyName:    (rv.inHouseAvCompanyName    as string) ?? "",
      riggingRequired:         yn(rv.riggingRequired),
      maxWeightPerRiggingPoint:(rv.maxWeightPerRiggingPoint as string) ?? "",
      numberOfRiggingPoints:   (rv.numberOfRiggingPoints   as string) ?? "",
      powerDropsRequired:      yn(rv.powerDropsRequired),
      powerDropAmperage:       (rv.powerDropAmperage       as string) ?? "",
      numberOfPowerDrops:      (rv.numberOfPowerDrops      as string) ?? "",
      wirelessInternetRequired: yn(rv.wirelessInternetRequired),
      internetUseCases: Array.isArray(rv.internetUseCases)
        ? (rv.internetUseCases as string[])
        : [],
      coiRequirements:         (rv.coiRequirements         as string) ?? "",
      venueAccessRequirements: (rv.venueAccessRequirements as string) ?? "",
    } as VenueTechnicalData;
  })(),
  uploads: (() => {
    const def = defaultProposalData.uploads;
    const ru = (raw.uploads ?? {}) as Record<string, unknown>;
    const strArr = (v: unknown): string[] =>
      Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
    const refUrls = (v: unknown): ReferenceUrl[] =>
      Array.isArray(v)
        ? (v as unknown[]).filter(
            (x): x is ReferenceUrl => !!x && typeof x === "object" && "url" in (x as object),
          )
        : [];
    const coV = (v: unknown): CoVendorEntry => {
      const e = ((v ?? {}) as Record<string, unknown>);
      return {
        companyName:  (e.companyName  as string) ?? "",
        contactName:  (e.contactName  as string) ?? "",
        contactEmail: (e.contactEmail as string) ?? "",
        contactPhone: (e.contactPhone as string) ?? "",
        status:       (e.status       as string) ?? "",
        notes:        (e.notes        as string) ?? "",
      };
    };
    const cv = (ru.coVendors ?? {}) as Record<string, unknown>;
    const yn = (v: unknown): "YES" | "NO" | "" =>
      v === "YES" ? "YES" : v === "NO" ? "NO" : "";
    return {
      brandGuideFiles:  strArr(ru.brandGuideFiles).length  ? strArr(ru.brandGuideFiles)  : def.brandGuideFiles,
      brandGuideUrl:    (ru.brandGuideUrl  as string) ?? def.brandGuideUrl,
      eventLogoFiles:   strArr(ru.eventLogoFiles).length   ? strArr(ru.eventLogoFiles)   : def.eventLogoFiles,
      referenceFiles:   strArr(ru.referenceFiles).length   ? strArr(ru.referenceFiles)   : def.referenceFiles,
      referenceUrls:    refUrls(ru.referenceUrls),
      venueDocs:        strArr(ru.venueDocs).length        ? strArr(ru.venueDocs)        : def.venueDocs,
      coVendors: {
        inHouseVenueAv:   coV(cv.inHouseVenueAv),
        eventDecorator:   coV(cv.eventDecorator),
        registrationTech: coV(cv.registrationTech),
        agencyOfRecord:   coV(cv.agencyOfRecord),
        photographer:     coV(cv.photographer),
      },
      ndaRequired:      yn(ru.ndaRequired),
      ndaType:          (ru.ndaType as string) ?? "",
      ndaDocumentFiles: strArr(ru.ndaDocumentFiles),
    } as UploadsData;
  })(),
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
  const [isExtracting, setIsExtracting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [showErrors, setShowErrors] = useState(false);
  const [rooms, setRooms] = useState<RoomByRoomData[]>([defaultRoom()]);
  const [createdProposal, setCreatedProposal] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyingSaving, setCopyingSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  /* ??? Single source of truth for all steps ??? */
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
    const { eventName, startDate, endDate } = proposalData.event;
    return (
      eventName.trim().length > 0 &&
      startDate.trim().length > 0 &&
      endDate.trim().length > 0
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
    const { riggingRequired, powerDropsRequired, wirelessInternetRequired } =
      proposalData.venue;
    return !!riggingRequired && !!powerDropsRequired && !!wirelessInternetRequired;
  };

  const isUploadsStepValid = () => {
    const { ndaRequired, ndaType } = proposalData.uploads;
    if (!ndaRequired) return false;
    if (ndaRequired === "YES" && !ndaType) return false;
    return true;
  };

  const isBudgetStepValid = () => {
    const {
      estimatedAvBudget,
      proposalFormatPreferences,
      evaluationMatrix,
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
    if (howDidYouHear === "Other" && !howDidYouHearOther.trim()) return false;
    if (!proposalFormatPreferences || proposalFormatPreferences.length === 0) return false;

    const hybridActive = proposalData.event.eventFormat !== "In-Person";
    const scenicActive =
      proposalData.roomByRoom.some((r) => r.scenicStageDesign === "Yes") ||
      proposalData.contentCreative?.contentServicesNeeded === "YES";
    const matrixSum =
      evaluationMatrix.technicalApproach +
      evaluationMatrix.crewExperience +
      (hybridActive ? evaluationMatrix.hybridVirtual : 0) +
      evaluationMatrix.pricing +
      (scenicActive ? evaluationMatrix.creativeScenic : 0) +
      evaluationMatrix.responsiveness +
      evaluationMatrix.sustainabilityDei;
    if (matrixSum !== 100) return false;

    return true;
  };

  const isContactStepValid = () => {
    const {
      contactFirstName, contactLastName, contactTitle,
      contactOrganization, contactEmail, contactPhone,
      organizationLegalName,
    } = proposalData.contact;
    return (
      contactFirstName.trim().length > 0 &&
      contactLastName.trim().length > 0 &&
      contactTitle.trim().length > 0 &&
      contactOrganization.trim().length > 0 &&
      contactEmail.trim().length > 0 &&
      contactPhone.trim().length > 0 &&
      organizationLegalName.trim().length > 0
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
    if (isSubmitting) return;
    setShowErrors(true);
    if (!isContactStepValid()) {
      toast.error("Please complete all required contact fields.");
      return;
    }
    setIsSubmitting(true);

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
          router.push("/proposals");
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
      setIsSubmitting(false);
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
  }) => {
    if (!createdProposal?.id) return;
    setCopyingSaving(true);
    try {
      const result = await copyProposalAction(createdProposal.id, {
        eventName: overrides.eventName,
        startDate: overrides.startDate,
        endDate: overrides.endDate,
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
    /* ?? Step 0: extract fields from uploaded doc before advancing ?? */
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
            venueSchedule: { ...prev.venueSchedule, ...(normalized.venueSchedule ?? {}) },
            roomByRoom: normalized.roomByRoom ?? prev.roomByRoom,
            hybridVirtual: { ...prev.hybridVirtual, ...(normalized.hybridVirtual ?? {}) },
            contentCreative: { ...prev.contentCreative, ...(normalized.contentCreative ?? {}) },
            videoRecordingStep: { ...prev.videoRecordingStep, ...(normalized.videoRecordingStep ?? {}) },
            venue: { ...prev.venue, ...(normalized.venue ?? {}) },
            uploads: { ...prev.uploads, ...(normalized.uploads ?? {}) },
            budget: { ...prev.budget, ...(normalized.budget ?? {}) },
            contact: { ...prev.contact, ...(normalized.contact ?? {}) },
          }));
          if (normalized.roomByRoom && normalized.roomByRoom.length > 0) {
            setRooms(normalized.roomByRoom.map((r) => ({ ...defaultRoom(), ...r })));
          }
          toast.success("? Fields pre-filled from your document!");
        } else {
          toast.info(
            "No matching fields found � please fill the form manually.",
          );
        }
      } catch {
        toast.info(
          "Couldn't read the document � please fill the form manually.",
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
    // Step 2 = Venue & Schedule � no required validation blocking
    if (proposalProcessStep === 3 && !isRoomAndProductionStepValid()) {
      return;
    }
    // Steps 4 (Hybrid & Virtual), 5 (Content & Creative), 6 (Video Recording) � no required validation
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
      void handleSubmit();
      return;
    }

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
          venueSchedule: { ...prev.venueSchedule, ...(normalized.venueSchedule ?? {}) },
          roomByRoom: normalized.roomByRoom ?? prev.roomByRoom,
          hybridVirtual: { ...prev.hybridVirtual, ...(normalized.hybridVirtual ?? {}) },
          contentCreative: { ...prev.contentCreative, ...(normalized.contentCreative ?? {}) },
          videoRecordingStep: { ...prev.videoRecordingStep, ...(normalized.videoRecordingStep ?? {}) },
          venue: { ...prev.venue, ...(normalized.venue ?? {}) },
          uploads: { ...prev.uploads, ...(normalized.uploads ?? {}) },
          budget: { ...prev.budget, ...(normalized.budget ?? {}) },
          contact: { ...prev.contact, ...(normalized.contact ?? {}) },
        }));
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
          proposalSettings={proposalSettings}
        />
      </>
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
        <div className="flex w-full gap-4">
          {/* Form card skeleton � 80% */}
          <div className="w-[80%] space-y-6">
            <div className="flex min-h-screen flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #00c2c9, #2563eb)" }} />
              <div className="flex-1 space-y-6 p-8">
                <div className="space-y-1">
                  <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200" />
                  <div className="h-3 w-80 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                      <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="h-24 w-full animate-pulse rounded-lg bg-slate-100" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              </div>
              <div className="flex justify-between border-t border-slate-100 px-8 py-4">
                <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-9 w-28 animate-pulse rounded-xl bg-[#00c2c9]/20" />
              </div>
            </div>
          </div>
          {/* Step sidebar skeleton � 20% */}
          <div className="w-[20%] space-y-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ── Step 0: Upload screen ── */}
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

      {/* ── Steps 1–7: Multi-step form ── */}
      {!loadingExisting && proposalProcessStep >= 1 && (
        <div className="flex w-full">
          {/* Form area — 70% */}
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
                isInPersonOnly={isInPersonOnly}
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
                onDemandRecording={proposalData.hybridVirtual.onDemandRecording}
                sizzleRecapOwner={proposalData.contentCreative?.sizzleRecapVideo}
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
                isUnionVenue={proposalData.venueSchedule.isUnionVenue}
                loadInDate={proposalData.venueSchedule.loadInDate}
                strikeDate={proposalData.venueSchedule.strikeDate}
                numberOfEventRooms={proposalData.venueSchedule.numberOfEventRooms}
                ledWallMaxWidth={(() => {
                  const widths = proposalData.roomByRoom
                    .map((r) => parseFloat(r.ledWallWidth ?? "0"))
                    .filter((w) => !isNaN(w) && w > 0);
                  return widths.length ? Math.max(...widths) : undefined;
                })()}
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
                eventFormat={proposalData.event.eventFormat}
                hasScenicOnAnyRoom={proposalData.roomByRoom.some(
                  (r) => r.scenicStageDesign === "Yes",
                )}
                hasLedWallOnAnyRoom={proposalData.roomByRoom.some(
                  (r) => !!(r.ledWall && r.ledWall.toUpperCase() === "YES"),
                )}
                contentServicesNeeded={
                  proposalData.contentCreative?.contentServicesNeeded
                }
                venueName={proposalData.venueSchedule.venueName}
              />
            )}
            {proposalProcessStep === 9 && (
              <UploadsReferenceMaterials
                data={proposalData.uploads}
                onChange={(updates) => updateProposalSection("uploads", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
                venueAvContactName={proposalData.venue.venueAvContactName}
                venueAvContactEmail={proposalData.venue.venueAvContactEmail}
                venueAvContactPhone={proposalData.venue.venueAvContactPhone}
                inHouseAvCompanyName={proposalData.venue.inHouseAvCompanyName}
                riggingRequired={proposalData.venue.riggingRequired}
                isUnionVenue={proposalData.venueSchedule.isUnionVenue}
                hasScenicOnAnyRoom={proposalData.roomByRoom.some(
                  (r) => r.scenicStageDesign === "Yes",
                )}
                eventFormat={proposalData.event.eventFormat}
                contentServicesNeeded={proposalData.contentCreative?.contentServicesNeeded}
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
                isEditMode={isEditMode}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
          {/* Sidebar � 20% */}
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

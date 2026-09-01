"use client";
import {
  copyProposalAction,
  createProposalAction,
  extractProposalFromFile,
  getProposalByIdAction,
  updateProposalAction,
} from "@/app/actions/proposals";
import { getSettingsAction } from "@/app/actions/settings";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import AddProposalUpload from "./AddProposalUpload";
import BudgetProposalPreferences from "./ProposalsProcess.tsx/BudgetProposalPreferences";
import ContactInfo from "./ProposalsProcess.tsx/ContactInfo";
import EventForm from "./ProposalsProcess.tsx/EventForm";
import ProcessList from "./ProposalsProcess.tsx/ProcessList";
import RoomAndProductionStep, { defaultRoom, firstIncompleteRoom, roomLabel } from "./ProposalsProcess.tsx/RoomAndProductionStep";
import HybridVirtualStep from "./ProposalsProcess.tsx/HybridVirtualStep";
import VenueScheduleStep, { defaultVenueSchedule, venueScheduleValidationErrors, type VenueScheduleData } from "./ProposalsProcess.tsx/VenueScheduleStep";
import ContentCreativeStep, { defaultContentCreative, type ContentCreativeData } from "./ProposalsProcess.tsx/ContentCreativeStep";
import VideoRecordingStep, { defaultVideoRecording, type VideoRecordingData } from "./ProposalsProcess.tsx/VideoRecordingStep";
import UploadsReferenceMaterials from "./ProposalsProcess.tsx/UploadsReferenceMaterials";
import VenueTechnicalRequirements from "./ProposalsProcess.tsx/VenueTechnicalRequirements";
import ProposalSuccessfullyCreate from "./ProposalSuccessfullyCreate";
import SaveCopyModal from "./SaveCopyModal";
import ProposalWorkflowShell from "./ProposalWorkflowShell";
import ProposalContextPanel from "./ProposalContextPanel";
import ProposalDraftPanel from "./ProposalDraftPanel";
import ProposalValidationSummary from "./ProposalValidationSummary";
import ProposalExperienceBar from "./ProposalExperienceBar";
import ProposalFinalReview, { type ProposalAuditEntry } from "./ProposalFinalReview";
import { CAMERA_PLAN_SPECIFIC, cameraPlanTotal } from "./cameraPlan";
import {
  ensureLedWallSlots,
  ledWallCount,
  normalizeLedWalls,
  type LedWallSpecification,
} from "./ledWallPlan";
import {
  activeExtractedProposalData,
  buildVendorReadyStatementOfWork,
  omitStandaloneVideoRecording,
  procurementTimelineIssues,
  proposalStepOrder,
  resolveProposalStep,
  STANDALONE_VIDEO_RECORDING_STEP_ENABLED,
  type AnswerProvenance,
  type AnswerSource,
  type ProposalChecklistIssue,
  type ProposalExperienceMode,
} from "@/lib/proposals/proposalExperience";

/* ─── Proposal data by step ─── */
export type EventData = {
  eventName: string;
  editionYear?: string;
  eventTheme?: string;
  eventWebsite?: string;
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
  aboutOrganization?: string;
  statementOfWork?: string;
  eventProfile?: string;
  rfpTimeline?: string;
};

export type RoomFunctionSchedule = {
  functionName: string;
  scheduleDate: string;
  scheduleDay: string;
  showStartDateTime: string;
  showEndDateTime: string;
  roomSetup: string;
  estimatedAttendees: string;
};

export type RoomByRoomData = {
  /**
   * Legacy primary-function fields remain populated for existing consumers.
   * `functions` is authoritative when present and allows one physical room to
   * host multiple scheduled functions while sharing the room-level AV spec.
   */
  functions: RoomFunctionSchedule[];
  roomFunction: string;
  roomLocation: string;
  roomSetup: string;
  scheduleDate: string;
  scheduleDay: string;
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
    wirelessMicsTypeOther: string;
  };
  audioRecording: string;
  largeMonitorsOrScreenProjector: {
    largeMonitorsOrScreenProjector: string;
    numberOfMonitors: string;
    numberOfScreens: string;
    monitorSize: string;
    monitorSizeOther: string;
    screenSize: string;
    screenSizeOther: string;
  };
  ledWall: string;
  ledWallCount: string;
  ledWalls: LedWallSpecification[];
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
    videoPlaybackFormat: string;
  };
  videoFormatAspectRatio: string;
  audienceQa: {
    audienceQa: string;
    audienceQaMethod: string;
  };
  cameras: {
    cameras: string;
    camerasQty: string;
    cameraPlanMode: string;
    cameraType: string;
    ptzCameraQty: string;
    studioCameraQty: string;
    otherCameraType: string;
    otherCameraQty: string;
  };
  videoRecording: {
    videoRecording: string;
    videoRecordingType: string;
    recordingCodec: "H.264" | "H.265" | "ProRes" | "";
    recordIn4k: "Yes" | "No" | "";
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
  "scenicStageDesign" | "showCrewNeeded" | "otherRolesNeeded"
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
  trussAndMotorsProvidedByVenue: "YES" | "NO" | "";
  liftsProvidedByVenue: "YES" | "NO" | "";
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
  scenicInspirationFiles: string[];
  venueCoiFiles: string[];
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
  /**
   * Whether the planner has actually accepted the weighting. Vendors are scored
   * on these numbers, so the shipped defaults must not reach the RFP as though
   * they were chosen — they apply only once confirmed or edited.
   */
  evaluationMatrixConfirmed: boolean;
  sustainabilityDeiNotes: string;
  vendorQuestionsDueDate: string;
  responseToVendorQuestionsDate: string;
  proposalSubmissionDueDate: string;
  shortlistNotificationDate: string;
  vendorPresentationOpportunity: "YES" | "NO" | "";
  vendorPresentationDate: string;
  vendorSelectionDate: string;
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

export type ProposalWriteData = Omit<ProposalData, "videoRecordingStep"> & {
  /** Compatibility-only while the standalone section is retired. */
  videoRecordingStep?: VideoRecordingData;
};

type AddNewProposalProps = {
  mode?: "create" | "edit";
  proposalId?: string;
};

const assistantSectionByStep = {
  1: "event_overview",
  2: "venue_schedule",
  3: "room_specifications",
  4: "hybrid_virtual",
  5: "content_creative",
  6: "video_recording",
  7: "venue_technical",
  8: "investment_evaluation",
  9: "uploads_covendors",
  10: "contact_submit",
} as const;

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
    trussAndMotorsProvidedByVenue: "",
    liftsProvidedByVenue: "",
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
    scenicInspirationFiles: [],
    venueCoiFiles: [],
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
    evaluationMatrixConfirmed: false,
    sustainabilityDeiNotes: "",
    vendorQuestionsDueDate: "",
    responseToVendorQuestionsDate: "",
    proposalSubmissionDueDate: "",
    shortlistNotificationDate: "",
    vendorPresentationOpportunity: "",
    vendorPresentationDate: "",
    vendorSelectionDate: "",
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
              "Corporate Conference",
              "User / Customer Summit",
              "Sales Kickoff (SKO)",
              "Annual Meeting / Shareholder Event",
              "Product Launch",
              "Awards Show / Gala",
              "Trade Show / Exhibition",
              "Internal Town Hall",
              "Training / Certification Event",
              "Association / Member Conference",
              "Industry Symposium",
              "Hybrid Broadcast / Studio Production",
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
      // ── Nested object fields: LLM returns flat primitives, form expects objects ──
      podiumMic: {
        podiumMic: matchOption((rRec.podiumMic as string) ?? "", ["Yes", "No"]),
        podiumMicQty: (rRec.podiumMicQty as string) ?? "",
      },
      wirelessMics: {
        wirelessMics: matchOption((rRec.wirelessMics as string) ?? "", ["Yes", "No"]),
        wirelessMicsQty: (rRec.wirelessMicsQty as string) ?? "",
        wirelessMicsType: matchOption((rRec.wirelessMicsType as string) ?? "", ["Handhelds", "Headset Mics", "Both", "Other"]),
        wirelessMicsTypeOther: (rRec.wirelessMicsTypeOther as string) ?? "",
      },
      largeMonitorsOrScreenProjector: {
        largeMonitorsOrScreenProjector: matchOption((rRec.largeMonitorsOrScreenProjector as string) ?? "", ["Yes", "No"]),
        numberOfMonitors: (rRec.numberOfMonitors as string) ?? "",
        numberOfScreens: (rRec.numberOfScreens as string) ?? "",
        monitorSize: (rRec.monitorSize as string) ?? "",
        monitorSizeOther: (rRec.monitorSizeOther as string) ?? "",
        screenSize: (rRec.screenSize as string) ?? "",
        screenSizeOther: (rRec.screenSizeOther as string) ?? "",
      },
      presentationLaptops: {
        presentationLaptops: matchOption((rRec.presentationLaptops as string) ?? "", ["Yes", "No"]),
        presentationLaptopQty: (rRec.presentationLaptopQty as string) ?? "",
      },
      videoPlayback: {
        videoPlayback: matchOption((rRec.videoPlayback as string) ?? "", ["Yes", "No"]),
        videoPlaybackCount: (rRec.videoPlaybackCount as string) ?? "",
        videoPlaybackFormat: matchOption((rRec.videoPlaybackFormat as string) ?? "", ["4:3", "16:9", "Custom Wide Screen"]),
      },
      cameras: {
        cameras: matchOption((rRec.cameras as string) ?? "", ["Yes", "No"]) || (rRec.camerasQty ? "Yes" : ""),
        camerasQty: (rRec.camerasQty as string) ?? "",
        cameraPlanMode: (rRec.cameraPlanMode as string) || (rRec.camerasQty ? CAMERA_PLAN_SPECIFIC : ""),
        cameraType: (rRec.cameraType as string) ?? "",
        ptzCameraQty: (rRec.ptzCameraQty as string) ?? "",
        studioCameraQty: (rRec.studioCameraQty as string) ?? "",
        otherCameraType: (rRec.otherCameraType as string) ?? "",
        otherCameraQty: (rRec.otherCameraQty as string) ?? "",
      },
      // ── Flat Yes/No fields ──
      audioRecording: matchOption((rRec.audioRecording as string) ?? "", ["Yes", "No"]) as RoomByRoomData["audioRecording"],
      ledWall: matchOption((rRec.ledWall as string) ?? "", ["Yes", "No"]),
      ledWallCount: String(rRec.ledWallCount ?? (normalizeLedWalls(rRec).length || "")),
      ledWalls: normalizeLedWalls(rRec),
      ledWallWidth: (rRec.ledWallWidth as string) ?? "",
      ledWallHeight: (rRec.ledWallHeight as string) ?? "",
      ledWallPixelPitch: (rRec.ledWallPixelPitch as string) ?? "",
      backlightingFor: matchOption((rRec.backlightingFor as string) ?? "", ["Yes", "No"]),
      drapeOrScenicUplighting: matchOption((rRec.drapeOrScenicUplighting as string) ?? "", ["Yes", "No"]),
      audienceLighting: matchOption((rRec.audienceLighting as string) ?? "", ["Yes", "No"]),
      speakerTimer: matchOption((rRec.speakerTimer as string) ?? "", ["Yes", "No"]),
      // ── Field name mapping: LLM returns teleprompterNeeded, form uses teleprompterRequired ──
      teleprompterRequired: matchOption(
        ((rRec.teleprompterNeeded as string) || (rRec.teleprompterRequired as string)) ?? "",
        ["Yes", "No"],
      ) as RoomByRoomData["teleprompterRequired"],
      teleprompterBilingual: matchOption(
        (rRec.teleprompterBilingual as string) ?? "",
        ["Yes", "No"],
      ) as RoomByRoomData["teleprompterBilingual"],
      teleprompterLanguages: Array.isArray(rRec.teleprompterLanguages) ? rRec.teleprompterLanguages as string[] : [],
      videoFormatAspectRatio:
        matchOption((rRec.videoFormatAspectRatio as string) ?? "", ["16:9 format", "Unique Aspect Ratio", "Both"]) ||
        (rRec.videoFormatAspectRatio as string) ||
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
          const v = raw_n as {
            videoRecording?: string;
            videoRecordingType?: string;
            recordingCodec?: string;
            recordIn4k?: string;
          };
          return {
            videoRecording: matchOption(v.videoRecording ?? "", ["Yes", "No"]),
            videoRecordingType: matchOption(v.videoRecordingType ?? "", ["Camera Feed Only", "Presentation Only", "Side by Side (Camera and Presentation)", "All The Above"]),
            recordingCodec: matchOption(v.recordingCodec ?? "", ["H.264", "H.265", "ProRes"]) as RoomByRoomData["videoRecording"]["recordingCodec"],
            recordIn4k: matchOption(v.recordIn4k ?? "", ["Yes", "No"]) as RoomByRoomData["videoRecording"]["recordIn4k"],
          };
        }
        return {
          videoRecording: matchOption((raw_n as unknown as string) ?? "", ["Yes", "No"]),
          videoRecordingType: matchOption((rRec.videoRecordingType as string) ?? "", ["Camera Feed Only", "Presentation Only", "Side by Side (Camera and Presentation)", "All The Above"]),
          recordingCodec: matchOption((rRec.recordingCodec as string) ?? "", ["H.264", "H.265", "ProRes"]) as RoomByRoomData["videoRecording"]["recordingCodec"],
          recordIn4k: matchOption((rRec.recordIn4k as string) ?? "", ["Yes", "No"]) as RoomByRoomData["videoRecording"]["recordIn4k"],
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
          trussAndMotorsProvidedByVenue: yn(rv.trussAndMotorsProvidedByVenue),
          liftsProvidedByVenue: yn(rv.liftsProvidedByVenue),
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
          proposalFormatPreferences: matchOptionsArray(
            (Array.isArray(rb.proposalFormatPreferences) ? rb.proposalFormatPreferences as string[] : []).map((value) =>
              value === "LED Wall Line-Itemed Separately"
                ? "Value Added Solutions Detailed Separately"
                : value,
            ),
            ["Itemized Gear List", "Labor Breakdown", "All-In Total Estimate", "Alternate / Value-Engineered Option", "Creative / Scenic Approach Narrative", "Crew Bios", "References", "Value Added Solutions Detailed Separately"],
          ),
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
          evaluationMatrixConfirmed: rb.evaluationMatrixConfirmed === true,
          sustainabilityDeiNotes: (rb.sustainabilityDeiNotes as string) ?? "",
          vendorQuestionsDueDate: (rb.vendorQuestionsDueDate as string) ?? "",
          responseToVendorQuestionsDate: (rb.responseToVendorQuestionsDate as string) ?? "",
          proposalSubmissionDueDate: (rb.proposalSubmissionDueDate as string) ?? "",
          shortlistNotificationDate: (rb.shortlistNotificationDate as string) ?? "",
          vendorPresentationOpportunity: (matchOption((rb.vendorPresentationOpportunity as string) ?? "", ["YES", "NO"]).toUpperCase() || "") as "YES" | "NO" | "",
          vendorPresentationDate: (rb.vendorPresentationDate as string) ?? "",
          vendorSelectionDate: (rb.vendorSelectionDate as string) ?? "",
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
          scenicInspirationFiles: strArr(ru.scenicInspirationFiles),
          venueCoiFiles: strArr(ru.venueCoiFiles),
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
          unionLaborDetails: (rv.unionLaborDetails as string) ?? "",
          loadInDate: (rv.loadInDate as string) ?? "",
          loadInTime: (rv.loadInTime as string) ?? "",
          rehearsalDate: (rv.rehearsalDate as string) ?? "",
          rehearsalTime: (rv.rehearsalTime as string) ?? "",
          showStartDate: (rv.showStartDate as string) ?? "",
          showStartTime: (rv.showStartTime as string) ?? "",
          showEndDate: (rv.showEndDate as string) ?? "",
          showEndTime: (rv.showEndTime as string) ?? "",
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
          openingClosingVideo: own(rc.openingClosingVideo),
          motionGraphicsStingersBumpers: own(rc.motionGraphicsStingersBumpers),
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
  videoRecordingStep:
    STANDALONE_VIDEO_RECORDING_STEP_ENABLED && raw.videoRecordingStep
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

const normalizeActiveExtraction = (
  raw: Parameters<typeof normalizeExtracted>[0],
): Partial<ProposalData> => {
  const activeRaw = STANDALONE_VIDEO_RECORDING_STEP_ENABLED
    ? raw
    : omitStandaloneVideoRecording(raw);
  return activeExtractedProposalData(normalizeExtracted(activeRaw));
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

const normalizeRoomFunctions = (
  room: Record<string, unknown>,
): RoomFunctionSchedule[] => {
  if (Array.isArray(room.functions) && room.functions.length > 0) {
    return room.functions.map((value) => {
      const entry = value && typeof value === "object"
        ? value as Record<string, unknown>
        : {};
      return {
        functionName: typeof entry.functionName === "string" ? entry.functionName : "",
        scheduleDate: typeof entry.scheduleDate === "string" ? entry.scheduleDate : "",
        scheduleDay: typeof entry.scheduleDay === "string" ? entry.scheduleDay : "",
        showStartDateTime: typeof entry.showStartDateTime === "string" ? entry.showStartDateTime : "",
        showEndDateTime: typeof entry.showEndDateTime === "string" ? entry.showEndDateTime : "",
        roomSetup: typeof entry.roomSetup === "string" ? entry.roomSetup : "",
        estimatedAttendees: typeof entry.estimatedAttendees === "string"
          ? entry.estimatedAttendees
          : typeof entry.estimatedAttendees === "number"
            ? String(entry.estimatedAttendees)
            : "",
      };
    });
  }

  const functionName = typeof room.roomFunction === "string" ? room.roomFunction : "";
  const scheduleDate = typeof room.scheduleDate === "string" ? room.scheduleDate : "";
  const showStartDateTime = typeof room.showStartDateTime === "string" ? room.showStartDateTime : "";
  const showEndDateTime = typeof room.showEndDateTime === "string" ? room.showEndDateTime : "";
  if (![functionName, scheduleDate, showStartDateTime, showEndDateTime].some(Boolean)) return [];
  return [{
    functionName,
    scheduleDate,
    scheduleDay: typeof room.scheduleDay === "string" ? room.scheduleDay : "",
    showStartDateTime,
    showEndDateTime,
    roomSetup: typeof room.roomSetup === "string" ? room.roomSetup : "",
    estimatedAttendees: typeof room.estimatedAttendeesInRoom === "string"
      ? room.estimatedAttendeesInRoom
      : "",
  }];
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
      const display = r.largeMonitorsOrScreenProjector && typeof r.largeMonitorsOrScreenProjector === "object"
        ? r.largeMonitorsOrScreenProjector as Partial<RoomByRoomData["largeMonitorsOrScreenProjector"]>
        : {};
      const rawCameras = r.cameras && typeof r.cameras === "object"
        ? r.cameras as Partial<RoomByRoomData["cameras"]>
        : {};
      const cameraCount = rawCameras.camerasQty || "";
      const normalizedLedWalls = normalizeLedWalls(r);
      const normalizedLedWallCount = ledWallCount(r);
      const normalizedCameras: RoomByRoomData["cameras"] = {
        ...defaultRoom().cameras,
        ...rawCameras,
        cameras: rawCameras.cameras || (cameraCount ? "Yes" : ""),
        camerasQty: cameraCount,
        cameraPlanMode: rawCameras.cameraPlanMode || (cameraCount ? CAMERA_PLAN_SPECIFIC : ""),
      };
      // Merge legacy production fields only on the first room
      const isFirst = idx === 0;
      return {
        ...defaultRoom(),
        ...r,
        largeMonitorsOrScreenProjector: {
          ...defaultRoom().largeMonitorsOrScreenProjector,
          ...display,
        },
        cameras: normalizedCameras,
        ledWallCount: normalizedLedWallCount > 0 ? String(normalizedLedWallCount) : "",
        ledWalls: ensureLedWallSlots(normalizedLedWalls, normalizedLedWallCount),
        functions: normalizeRoomFunctions(r),
        roomLocation: typeof r.roomLocation === "string" && r.roomLocation.trim()
          ? r.roomLocation
          : typeof r.roomFunction === "string"
            ? r.roomFunction
            : "",
        scenicStageDesign: ((r.scenicStageDesign || (isFirst ? raw.production?.scenicStageDesign : "")) ?? "") as RoomByRoomData["scenicStageDesign"],
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
  videoRecordingStep: STANDALONE_VIDEO_RECORDING_STEP_ENABLED
    ? {
        ...defaultProposalData.videoRecordingStep,
        ...(raw.videoRecordingStep || {}),
        recordIn4k:
          raw.videoRecordingStep?.recordIn4k ||
          (/4k/i.test(raw.videoRecordingStep?.recordingResolution ?? "")
            ? "YES"
            : /1080/i.test(raw.videoRecordingStep?.recordingResolution ?? "")
              ? "NO"
              : ""),
      }
    : defaultVideoRecording(),
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
      trussAndMotorsProvidedByVenue: yn(rv.trussAndMotorsProvidedByVenue),
      liftsProvidedByVenue:    yn(rv.liftsProvidedByVenue),
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
      scenicInspirationFiles: strArr(ru.scenicInspirationFiles),
      venueCoiFiles: strArr(ru.venueCoiFiles),
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
  const searchParams = useSearchParams();
  const requestedStep = Number(searchParams.get("step"));
  const requestedEditStep =
    Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 10
      ? requestedStep
      : 1;
  const initialEditStep = resolveProposalStep(
    requestedEditStep,
    "advanced",
    defaultProposalData.event.eventFormat,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proposalProcessStep, setProposalProcessStep] = useState(
    isEditMode ? initialEditStep : 0,
  );
  const [referenceMaterialsTarget, setReferenceMaterialsTarget] = useState<
    "scenic_inspiration" | "venue_coi" | null
  >(null);
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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [experienceMode, setExperienceMode] = useState<ProposalExperienceMode>(
    isEditMode ? "advanced" : "basic",
  );
  const [fieldProvenance, setFieldProvenance] = useState<Record<string, AnswerProvenance>>({});
  const [auditTrail, setAuditTrail] = useState<ProposalAuditEntry[]>([]);
  const [assumptionsApproved, setAssumptionsApproved] = useState(false);
  const auditHydratedRef = useRef(false);
  const auditStorageKey = `rfpilot:proposal-audit:${proposalId || "new"}`;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(auditStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          version?: number;
          trail?: ProposalAuditEntry[];
          provenance?: Record<string, AnswerProvenance>;
        };
        if (parsed.version === 1 && Array.isArray(parsed.trail)) setAuditTrail(parsed.trail.slice(-50));
        if (parsed.version === 1 && parsed.provenance && typeof parsed.provenance === "object") {
          setFieldProvenance(parsed.provenance);
        }
      }
    } catch {
      // A corrupt local audit should never block proposal authoring.
    } finally {
      auditHydratedRef.current = true;
    }
  }, [auditStorageKey]);

  useEffect(() => {
    if (!auditHydratedRef.current) return;
    try {
      window.localStorage.setItem(
        auditStorageKey,
        JSON.stringify({ version: 1, trail: auditTrail.slice(-50), provenance: fieldProvenance }),
      );
    } catch {
      // Storage can be unavailable in private browsing; the in-session audit remains visible.
    }
  }, [auditStorageKey, auditTrail, fieldProvenance]);

  // Room the step should open and scroll to after it blocked Continue. The
  // token makes a repeat attempt on the same room re-trigger the scroll.
  const [focusRoom, setFocusRoom] = useState<{ index: number; token: number } | null>(null);
  // Autosave. The wizard held hours of room-by-room detail in memory with the
  // only save on the last page, so a refresh or a stray click lost all of it.
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  /** Serialized payload last known to be on the server; guards no-op writes. */
  const savedSnapshotRef = useRef<string | null>(null);
  const autosaveInFlightRef = useRef(false);

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
      setProposalProcessStep(
        resolveProposalStep(requestedEditStep, "advanced", mapped.event.eventFormat),
      );
      setLoadingExisting(false);
    };

    void loadEditableProposal();

    return () => {
      mounted = false;
    };
  }, [isEditMode, proposalId, requestedEditStep, router]);

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
    const count = Math.min(200, Math.max(1, Number(proposalData.venueSchedule.numberOfEventRooms) || 1));
    setRooms((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        return [...prev, ...Array.from({ length: count - prev.length }, () => defaultRoom())];
      }
      return prev.slice(0, count);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalData.venueSchedule.numberOfEventRooms]);

  const addAuditEntry = (
    label: string,
    source: AnswerSource,
  ) => {
    setAuditTrail((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        label,
        source,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const updateProposalSection = <K extends ProposalSectionKey>(
    section: K,
    updates: Partial<ProposalData[K]>,
    provenance: AnswerProvenance = { source: "user" },
  ) => {
    setProposalData((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
    setFieldProvenance((current) => ({
      ...current,
      [String(section)]: provenance,
    }));
    setAssumptionsApproved(false);
  };

  const markExtractedSections = (normalized: Partial<ProposalData>) => {
    const next: Record<string, AnswerProvenance> = {};
    Object.keys(normalized).forEach((section) => {
      next[section] = {
        source: "ai",
        confidence: 0.78,
        explanation: "Extracted from the uploaded brief and left editable for review.",
      };
    });
    setFieldProvenance((current) => ({ ...current, ...next }));
    setAssumptionsApproved(false);
    addAuditEntry(`AI extracted ${Object.keys(next).length} proposal sections from the uploaded brief`, "ai");
  };

  const eventValidationIssues = () => {
    const { eventName, startDate, endDate, attendees, eventType } = proposalData.event;
    return [
      !eventName.trim() ? "Event name" : "",
      !eventType.eventType.trim() ? "Event type" : "",
      eventType.eventType === "Other" && !eventType.eventTypeOther.trim()
        ? "Custom event type"
        : "",
      !startDate.trim() ? "Start date" : "",
      !endDate.trim() ? "End date" : "",
      !(Number(attendees) > 0) ? "Total attendance" : "",
    ].filter(Boolean);
  };

  const isEventStepValid = () => eventValidationIssues().length === 0;

  const isRoomAndProductionStepValid = () => firstIncompleteRoom(
    rooms,
    experienceMode,
    toIsoDate(proposalData.event.startDate),
    toIsoDate(proposalData.event.endDate),
    proposalData.venueSchedule.timeZone,
  ) === null;

  /**
   * Blocking Continue silently is indistinguishable from a broken button when
   * the offending room is collapsed — its inline errors are not rendered. Name
   * the room and what it needs, then ask the step to open and reveal it.
   */
  const reportIncompleteRoom = () => {
    const incomplete = firstIncompleteRoom(
      rooms,
      experienceMode,
      toIsoDate(proposalData.event.startDate),
      toIsoDate(proposalData.event.endDate),
      proposalData.venueSchedule.timeZone,
    );
    if (!incomplete) return;
    toast.error(`${incomplete.label} still needs: ${incomplete.missing.join(", ")}.`);
    setFocusRoom({ index: incomplete.index, token: Date.now() });
  };

  const venueScheduleStepIssues = () => {
    const data = proposalData.venueSchedule;
    const required = [
      !data.venueName.trim() ? "Venue name" : "",
      !data.venueState.trim() ? "Venue state" : "",
      !data.venueCity.trim() ? "Venue city" : "",
      !data.venueType.trim() ? "Venue type" : "",
      !data.venueConfirmedStatus.trim() ? "Venue confirmation status" : "",
      !data.timeZone.trim() ? "Venue time zone" : "",
      experienceMode === "advanced" && !data.isUnionVenue ? "Union labor status" : "",
      experienceMode === "advanced" && !data.loadInDate ? "Load-in date and time" : "",
      experienceMode === "advanced" && !data.showStartDate ? "Show start date and time" : "",
      experienceMode === "advanced" && !data.showEndDate ? "Show end date and time" : "",
      experienceMode === "advanced" && !data.strikeDate ? "Strike date and time" : "",
    ].filter(Boolean);
    const contradictions = experienceMode === "advanced"
      ? Object.values(
          venueScheduleValidationErrors(
            data,
            toIsoDate(proposalData.event.startDate),
            toIsoDate(proposalData.event.endDate),
          ),
        ).filter(Boolean)
      : [];
    return [...required, ...contradictions];
  };

  const isVenueScheduleStepValid = () => venueScheduleStepIssues().length === 0;

  const venueValidationIssues = () => {
    const { riggingRequired, powerDropsRequired, wirelessInternetRequired } =
      proposalData.venue;
    return [
      !riggingRequired ? "Rigging requirement" : "",
      !powerDropsRequired ? "Power-drop requirement" : "",
      !wirelessInternetRequired ? "Wireless-internet requirement" : "",
    ].filter(Boolean);
  };

  const isVenueStepValid = () => venueValidationIssues().length === 0;

  const uploadsValidationIssues = () => {
    const { ndaRequired, ndaType } = proposalData.uploads;
    return [
      !ndaRequired ? "NDA sharing requirement" : "",
      ndaRequired === "YES" && !ndaType ? "NDA type" : "",
    ].filter(Boolean);
  };

  const isUploadsStepValid = () => uploadsValidationIssues().length === 0;

  const budgetValidationIssues = () => {
    const {
      estimatedAvBudget,
      proposalFormatPreferences,
      evaluationMatrix,
      vendorQuestionsDueDate,
      responseToVendorQuestionsDate,
      proposalSubmissionDueDate,
      shortlistNotificationDate,
      vendorPresentationOpportunity,
      vendorPresentationDate,
      vendorSelectionDate,
      callWithDxgProducer,
      howDidYouHear,
      howDidYouHearOther,
    } = proposalData.budget;

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
    const timelineIssues = procurementTimelineIssues(
      proposalData.budget,
      toIsoDate(proposalData.event.startDate),
    ).map((issue) => issue.message);
    return [
      !estimatedAvBudget.trim() ? "Estimated AV budget range" : "",
      !vendorQuestionsDueDate.trim() ? "Vendor questions due date" : "",
      !responseToVendorQuestionsDate.trim() ? "Response to vendor questions date" : "",
      !proposalSubmissionDueDate.trim() ? "Proposal submission due date" : "",
      !shortlistNotificationDate.trim() ? "Shortlist notification date" : "",
      !vendorPresentationOpportunity.trim() ? "Vendor presentation choice" : "",
      vendorPresentationOpportunity === "YES" && !vendorPresentationDate.trim()
        ? "Vendor presentation date"
        : "",
      !vendorSelectionDate.trim() ? "Vendor selection date" : "",
      experienceMode === "advanced" && !callWithDxgProducer.trim() ? "DXG producer call choice" : "",
      experienceMode === "advanced" && !howDidYouHear.trim() ? "How you heard about DXG" : "",
      experienceMode === "advanced" && howDidYouHear === "Other" && !howDidYouHearOther.trim()
        ? "How you heard about DXG details"
        : "",
      experienceMode === "advanced" && (!proposalFormatPreferences || proposalFormatPreferences.length === 0)
        ? "Proposal format preference"
        : "",
      experienceMode === "advanced" && matrixSum !== 100
        ? `Evaluation weights must total 100% (currently ${matrixSum}%)`
        : "",
      experienceMode === "advanced" && !proposalData.budget.evaluationMatrixConfirmed
        ? "Approve the evaluation matrix"
        : "",
      ...timelineIssues,
    ].filter(Boolean);
  };

  const isBudgetStepValid = () => budgetValidationIssues().length === 0;

  const contactValidationIssues = () => {
    const {
      contactFirstName, contactLastName, contactTitle,
      contactOrganization, contactEmail, contactPhone,
      organizationLegalName,
    } = proposalData.contact;
    return [
      !contactFirstName.trim() ? "Contact first name" : "",
      !contactLastName.trim() ? "Contact last name" : "",
      experienceMode === "advanced" && !contactTitle.trim() ? "Contact title" : "",
      !contactOrganization.trim() ? "Organization display name" : "",
      !contactEmail.trim() ? "Contact email" : "",
      contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
        ? "Valid contact email"
        : "",
      experienceMode === "advanced" && !contactPhone.trim() ? "Contact phone" : "",
      experienceMode === "advanced" && !organizationLegalName.trim() ? "Organization legal name" : "",
    ].filter(Boolean);
  };

  const isContactStepValid = () => contactValidationIssues().length === 0;

  /**
   * Steps whose required fields are genuinely filled, for the sidebar's green
   * checks. Steps with no required fields of their own count once the planner
   * has moved past them; the rest must actually validate.
   */
  const completedStepIds = (() => {
    const validators: Record<number, () => boolean> = {
      1: isEventStepValid,
      2: isVenueScheduleStepValid,
      3: isRoomAndProductionStepValid,
      7: isVenueStepValid,
      8: isBudgetStepValid,
      9: isUploadsStepValid,
      10: isContactStepValid,
    };
    const done: number[] = [];
    for (let step = 1; step <= 10; step++) {
      const validator = validators[step];
      if (validator ? validator() : proposalProcessStep > step) done.push(step);
    }
    return done;
  })();

  const currentValidationSummary = (() => {
    if (!showErrors) return null;

    if (proposalProcessStep === 1) {
      return { section: "Event Overview", issues: eventValidationIssues() };
    }
    if (proposalProcessStep === 2) {
      return {
        section: "Venue & Schedule",
        issues: venueScheduleStepIssues(),
      };
    }
    if (proposalProcessStep === 3) {
      const incomplete = firstIncompleteRoom(
        rooms,
        experienceMode,
        toIsoDate(proposalData.event.startDate),
        toIsoDate(proposalData.event.endDate),
        proposalData.venueSchedule.timeZone,
      );
      return {
        section: "Room Specifications",
        issues: incomplete
          ? [`${incomplete.label}: ${incomplete.missing.join(", ")}`]
          : [],
      };
    }
    if (proposalProcessStep === 7) {
      return { section: "Venue & Technical", issues: venueValidationIssues() };
    }
    if (proposalProcessStep === 8) {
      return { section: "Investment & Evaluation", issues: budgetValidationIssues() };
    }
    if (proposalProcessStep === 9) {
      return { section: "Uploads & Co-Vendors", issues: uploadsValidationIssues() };
    }
    if (proposalProcessStep === 10) {
      return { section: "Contact & Publish", issues: contactValidationIssues() };
    }
    return null;
  })();

  const checklistIssues: ProposalChecklistIssue[] = (() => {
    const issues: ProposalChecklistIssue[] = [];
    const add = (stepId: number, section: string, labels: string[]) => {
      labels.forEach((label, index) => {
        issues.push({
          id: `${stepId}-${index}-${label}`,
          stepId,
          section,
          label,
        });
      });
    };

    add(1, "Event Overview", eventValidationIssues());
    add(2, "Venue & Schedule", venueScheduleStepIssues());
    rooms.forEach((room, index) => {
      const missing = firstIncompleteRoom(
        [room],
        experienceMode,
        toIsoDate(proposalData.event.startDate),
        toIsoDate(proposalData.event.endDate),
        proposalData.venueSchedule.timeZone,
      );
      if (missing) {
        add(3, "Room Specifications", missing.missing.map((label) => `${roomLabel(room, index)}: ${label}`));
      }
    });
    add(8, "Investment & Evaluation", budgetValidationIssues());
    add(10, "Contact & Publish", contactValidationIssues());
    if (experienceMode === "advanced") {
      add(7, "Venue & Technical", venueValidationIssues());
      add(9, "Uploads & Co-Vendors", uploadsValidationIssues());
    }
    return issues;
  })();

  const basicAssumptions = experienceMode === "basic"
    ? [
        !proposalData.venue.riggingRequired || !proposalData.venue.powerDropsRequired || !proposalData.venue.wirelessInternetRequired
          ? "Rigging, power-drop, and internet requirements remain unspecified for vendor confirmation."
          : "",
        !proposalData.uploads.ndaRequired
          ? "No NDA preference or supporting-reference package has been confirmed."
          : "",
        !proposalData.contentCreative.contentServicesNeeded
          ? "Creative/content ownership remains outside the essential intake and should be clarified if needed."
          : "",
        STANDALONE_VIDEO_RECORDING_STEP_ENABLED &&
        !proposalData.videoRecordingStep.videoRecordingRequired
          ? "Recording and post-production requirements remain unspecified."
          : "",
        !proposalData.contact.contactTitle || !proposalData.contact.contactPhone || !proposalData.contact.organizationLegalName
          ? "Contact title, phone, and legal organization name remain optional until Advanced production is completed."
          : "",
      ].filter(Boolean)
    : [];

  const visibleStepOrder = proposalStepOrder(
    experienceMode,
    proposalData.event.eventFormat,
  );
  const visibleCompletedSteps = visibleStepOrder.filter((step) =>
    completedStepIds.includes(step),
  ).length;
  const normalizeRoomByRoomForSubmit = (
    roomByRoom: RoomByRoomData,
  ): RoomByRoomData => {
    const normalized = { ...roomByRoom };
    if (normalized.functions.length > 0) {
      const primary = normalized.functions[0];
      normalized.roomFunction = primary.functionName;
      normalized.roomSetup = primary.roomSetup;
      normalized.scheduleDate = primary.scheduleDate;
      normalized.scheduleDay = primary.scheduleDay;
      normalized.showStartDateTime = primary.showStartDateTime;
      normalized.showEndDateTime = primary.showEndDateTime;
      const peakAttendance = Math.max(
        0,
        ...normalized.functions.map((entry) => Number(entry.estimatedAttendees) || 0),
      );
      normalized.estimatedAttendeesInRoom = peakAttendance > 0
        ? String(peakAttendance)
        : "";
    }

    // Clear nested qty fields when parent is not "Yes"
    if (normalized.wirelessMics.wirelessMics !== "Yes") {
      normalized.wirelessMics = {
        ...normalized.wirelessMics,
        wirelessMicsQty: "",
        wirelessMicsType: "",
        wirelessMicsTypeOther: "",
      };
    } else if (normalized.wirelessMics.wirelessMicsType !== "Other") {
      normalized.wirelessMics = {
        ...normalized.wirelessMics,
        wirelessMicsTypeOther: "",
      };
    }
    if (
      normalized.largeMonitorsOrScreenProjector
        .largeMonitorsOrScreenProjector !== "Yes"
    ) {
      normalized.largeMonitorsOrScreenProjector = {
        ...normalized.largeMonitorsOrScreenProjector,
        numberOfMonitors: "",
        numberOfScreens: "",
        monitorSize: "",
        monitorSizeOther: "",
        screenSize: "",
        screenSizeOther: "",
      };
    } else {
      normalized.largeMonitorsOrScreenProjector = {
        ...normalized.largeMonitorsOrScreenProjector,
        monitorSize: Number(normalized.largeMonitorsOrScreenProjector.numberOfMonitors) > 0
          ? normalized.largeMonitorsOrScreenProjector.monitorSize
          : "",
        monitorSizeOther:
          Number(normalized.largeMonitorsOrScreenProjector.numberOfMonitors) > 0 &&
          normalized.largeMonitorsOrScreenProjector.monitorSize === "Other — Specify"
            ? normalized.largeMonitorsOrScreenProjector.monitorSizeOther
            : "",
        screenSize: Number(normalized.largeMonitorsOrScreenProjector.numberOfScreens) > 0
          ? normalized.largeMonitorsOrScreenProjector.screenSize
          : "",
        screenSizeOther:
          Number(normalized.largeMonitorsOrScreenProjector.numberOfScreens) > 0 &&
          normalized.largeMonitorsOrScreenProjector.screenSize === "Other — Specify"
            ? normalized.largeMonitorsOrScreenProjector.screenSizeOther
            : "",
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
        videoPlaybackFormat: "",
      };
    }
    if (normalized.ledWall !== "Yes") {
      normalized.ledWallCount = "";
      normalized.ledWalls = [];
      normalized.ledWallWidth = "";
      normalized.ledWallHeight = "";
      normalized.ledWallShape = "";
      normalized.ledWallPixelPitch = "";
      normalized.ledWallSwitcher = "";
      normalized.ledWallNotes = "";
      normalized.ledWallSpecs = "";
    } else {
      const count = ledWallCount(normalized);
      normalized.ledWallCount = count > 0 ? String(count) : "";
      normalized.ledWalls = ensureLedWallSlots(normalizeLedWalls(normalized), count).slice(0, count);
      const firstWall = normalized.ledWalls[0];
      if (firstWall) {
        normalized.ledWallWidth = firstWall.width;
        normalized.ledWallHeight = firstWall.height;
        normalized.ledWallShape = firstWall.shape;
        normalized.ledWallPixelPitch = firstWall.pixelPitch;
        normalized.ledWallSwitcher = firstWall.switcher;
        normalized.ledWallNotes = firstWall.notes;
        normalized.ledWallSpecs = firstWall.specs;
      }
    }
    if (normalized.cameras.cameras !== "Yes") {
      normalized.cameras = {
        cameras: "", camerasQty: "", cameraPlanMode: "", cameraType: "",
        ptzCameraQty: "", studioCameraQty: "", otherCameraType: "", otherCameraQty: "",
      };
    } else {
      normalized.cameras = {
        ...normalized.cameras,
        camerasQty: cameraPlanTotal(normalized.cameras) > 0
          ? String(cameraPlanTotal(normalized.cameras))
          : normalized.cameras.camerasQty,
      };
    }
    // Audience Q&A has no separate yes/no control — the chosen method is the
    // whole answer — so the usual "clear the child when the parent isn't Yes"
    // rule silently discarded the planner's selection on every save. Derive the
    // flag from the method instead, and only clear the method when the planner
    // actually said there is no Q&A.
    const audienceQaMethod = normalized.audienceQa.audienceQaMethod.trim();
    if (audienceQaMethod) {
      const declinesQa = /^no q&a/i.test(audienceQaMethod);
      normalized.audienceQa = {
        ...normalized.audienceQa,
        audienceQa: declinesQa ? "No" : "Yes",
        audienceQaMethod: declinesQa ? "" : audienceQaMethod,
      };
    } else if (normalized.audienceQa.audienceQa !== "Yes") {
      normalized.audienceQa = { ...normalized.audienceQa, audienceQaMethod: "" };
    }
    if (normalized.videoRecording.videoRecording !== "Yes") {
      normalized.videoRecording = {
        ...normalized.videoRecording,
        videoRecordingType: "",
        recordingCodec: "",
        recordIn4k: "",
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

  /** The full editable proposal as the API expects it. Shared by explicit
   *  saves and the background autosave so the two can never drift. */
  const buildProposalPayload = (): ProposalWriteData & { production: ProductionSupportData } => {
    const normalizedRooms = rooms.map((r) => normalizeRoomByRoomForSubmit(r));
    const firstRoom = normalizedRooms[0] ?? normalizeRoomByRoomForSubmit(defaultRoom());
    const normalizedContentCreative = { ...proposalData.contentCreative };
    if (normalizedContentCreative.openingClosingVideo || normalizedContentCreative.motionGraphicsStingersBumpers) {
      delete normalizedContentCreative.motionGraphicsOpenerVideo;
    } else if (!normalizedContentCreative.motionGraphicsOpenerVideo) {
      delete normalizedContentCreative.motionGraphicsOpenerVideo;
    }
    const activeProposalData: ProposalWriteData =
      STANDALONE_VIDEO_RECORDING_STEP_ENABLED
        ? {
            ...proposalData,
            videoRecordingStep:
              proposalData.videoRecordingStep.videoRecordingRequired === "YES"
                ? proposalData.videoRecordingStep
                : {
                    ...proposalData.videoRecordingStep,
                    recordingCodec: "",
                    recordIn4k: "",
                  },
          }
        : omitStandaloneVideoRecording(proposalData);
    return {
      ...activeProposalData,
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
      contentCreative: normalizedContentCreative,
      production: {
        scenicStageDesign: firstRoom.scenicStageDesign,
        showCrewNeeded: firstRoom.showCrewNeeded,
        otherRolesNeeded: firstRoom.otherRolesNeeded,
      },
    };
  };

  // Autosave, for saved drafts only. A live proposal keeps its explicit
  // "Update RFP" gate so background writes can never alter what vendors see,
  // and the status is carried through untouched rather than reasserted.
  const autosaveEligible =
    isEditMode &&
    Boolean(proposalId) &&
    !loadingExisting &&
    proposalData.proposalStatus === "unsubmitted";

  useEffect(() => {
    if (!autosaveEligible) return;
    const snapshot = JSON.stringify(buildProposalPayload());
    // First pass after load records what the server already has, so opening a
    // proposal and touching nothing writes nothing.
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = snapshot;
      return;
    }
    if (snapshot === savedSnapshotRef.current) return;
    if (isSubmitting || isSavingDraft) return;

    const timer = window.setTimeout(async () => {
      if (autosaveInFlightRef.current) return;
      autosaveInFlightRef.current = true;
      setAutosaveState("saving");
      try {
        const result = await updateProposalAction(proposalId as string, {
          ...JSON.parse(snapshot),
          status: "unsubmitted",
          isDraft: true,
        });
        if (result.success) {
          savedSnapshotRef.current = snapshot;
          setAutosaveState("saved");
        } else {
          // Surfaced quietly: the planner keeps working and the explicit save
          // still reports properly, but they are told the copy is not safe yet.
          setAutosaveState("error");
        }
      } catch {
        setAutosaveState("error");
      } finally {
        autosaveInFlightRef.current = false;
      }
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveEligible, proposalId, proposalData, rooms, proposalSettings, isSubmitting, isSavingDraft]);

  // An autosave may still be pending when the tab closes; warn rather than
  // silently dropping the last edits.
  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (!autosaveEligible || savedSnapshotRef.current === null) return;
      if (JSON.stringify(buildProposalPayload()) === savedSnapshotRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => window.removeEventListener("beforeunload", warnIfUnsaved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveEligible, proposalData, rooms, proposalSettings]);

  const handleSubmit = async (
    statusOverride?: "unsubmitted" | "submitted",
    asDraft = false,
  ) => {
    if (isSubmitting || isSavingDraft) return;

    if (!asDraft) {
      setShowErrors(true);
      if (!isContactStepValid()) {
        toast.error("Please complete all required contact fields.");
        return;
      }
    }

    if (asDraft) setIsSavingDraft(true);
    else setIsSubmitting(true);

    const payload = buildProposalPayload();

    const resolvedStatus = asDraft ? "unsubmitted" : (statusOverride ?? proposalData.proposalStatus);
    const payloadWithStatus = {
      ...payload,
      status: resolvedStatus,
      // Submitting: promote to a live regular proposal — clear draft/copy flags, activate.
      ...(resolvedStatus === "submitted" && {
        isDraft: false,
        isActive: true,
        isCopy: false,
      }),
      // Saving as draft: explicitly mark as draft and inactive.
      ...(asDraft && {
        isDraft: true,
        isActive: false,
      }),
    };

    try {
      const result =
        isEditMode && proposalId
          ? await updateProposalAction(proposalId, payloadWithStatus)
          : await createProposalAction(payloadWithStatus);
      if (result.success) {
        // The server now matches what was just sent, so the pending autosave
        // has nothing left to write and the unsaved-changes warning clears.
        savedSnapshotRef.current = JSON.stringify(payload);
        setAutosaveState("saved");
        if (asDraft) {
          toast.success("Draft saved successfully!");
          router.push("/proposals");
          return;
        }
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
      setIsSavingDraft(false);
    }
  };

  /** Convert a stored date string (MM/DD/YYYY or similar) to YYYY-MM-DD for HTML date inputs */
  function toIsoDate(raw: string): string {
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
  }

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
        const normalized =
          result.success && result.data
            ? normalizeActiveExtraction(result.data)
            : {};
        if (Object.keys(normalized).length > 0) {
          // Normalize enum/dropdown fields so they exactly match option strings
          markExtractedSections(normalized);
          setProposalData((prev) => ({
            ...prev,
            event: { ...prev.event, ...(normalized.event ?? {}) },
            venueSchedule: { ...prev.venueSchedule, ...(normalized.venueSchedule ?? {}) },
            roomByRoom: normalized.roomByRoom ?? prev.roomByRoom,
            hybridVirtual: { ...prev.hybridVirtual, ...(normalized.hybridVirtual ?? {}) },
            contentCreative: { ...prev.contentCreative, ...(normalized.contentCreative ?? {}) },
            ...(STANDALONE_VIDEO_RECORDING_STEP_ENABLED &&
            normalized.videoRecordingStep
              ? {
                  videoRecordingStep: {
                    ...prev.videoRecordingStep,
                    ...normalized.videoRecordingStep,
                  },
                }
              : {}),
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
    if (proposalProcessStep === 2 && !isVenueScheduleStepValid()) {
      const firstIssue = venueScheduleStepIssues()[0];
      if (firstIssue) toast.error(`Venue and schedule need attention: ${firstIssue}`);
      return;
    }
    if (proposalProcessStep === 3 && !isRoomAndProductionStepValid()) {
      reportIncompleteRoom();
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
      if (checklistIssues.length > 0) {
        toast.error(`Complete the ${checklistIssues.length} remaining required item${checklistIssues.length === 1 ? "" : "s"} before publishing.`);
        return;
      }
      if (basicAssumptions.length > 0 && !assumptionsApproved) {
        toast.error("Review and approve the Basic mode assumptions before publishing.");
        return;
      }
      void handleSubmit("submitted");
      return;
    }

    setProposalProcessStep((current) => {
      const index = visibleStepOrder.indexOf(current);
      return visibleStepOrder[index + 1] ?? current;
    });
    setShowErrors(false);
  };
  const handleUploadAndContinue = async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    try {
      const result = await extractProposalFromFile(selectedFile);
      const normalized =
        result.success && result.data
          ? normalizeActiveExtraction(result.data)
          : {};
      if (Object.keys(normalized).length > 0) {
        markExtractedSections(normalized);
        setProposalData((prev) => ({
          ...prev,
          event: { ...prev.event, ...(normalized.event ?? {}) },
          venueSchedule: { ...prev.venueSchedule, ...(normalized.venueSchedule ?? {}) },
          roomByRoom: normalized.roomByRoom ?? prev.roomByRoom,
          hybridVirtual: { ...prev.hybridVirtual, ...(normalized.hybridVirtual ?? {}) },
          contentCreative: { ...prev.contentCreative, ...(normalized.contentCreative ?? {}) },
          ...(STANDALONE_VIDEO_RECORDING_STEP_ENABLED &&
          normalized.videoRecordingStep
            ? {
                videoRecordingStep: {
                  ...prev.videoRecordingStep,
                  ...normalized.videoRecordingStep,
                },
              }
            : {}),
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
    setProposalProcessStep((current) => {
      const index = visibleStepOrder.indexOf(current);
      if (index <= 0) return isEditMode ? current : 0;
      return visibleStepOrder[index - 1];
    });

  const navigateToStep = (step: number) => {
    if (!visibleStepOrder.includes(step)) return;
    setProposalProcessStep(step);
    setShowErrors(false);
  };

  const navigateToReviewTarget = (step: number, targetId?: string) => {
    if (!visibleStepOrder.includes(step)) return;
    navigateToStep(step);
    window.setTimeout(() => {
      const target = targetId ? document.getElementById(targetId) : null;
      const fallback = document.getElementById("manual-proposal-details");
      const destination = target ?? fallback;
      destination?.scrollIntoView({ behavior: "smooth", block: "start" });
      destination?.focus({ preventScroll: true });
    }, 0);
  };

  const handleModeChange = (mode: ProposalExperienceMode) => {
    if (mode === experienceMode) return;
    setExperienceMode(mode);
    setAssumptionsApproved(false);
    const nextOrder = proposalStepOrder(mode, proposalData.event.eventFormat);
    if (!nextOrder.includes(proposalProcessStep)) setProposalProcessStep(nextOrder[0]);
    addAuditEntry(
      mode === "basic" ? "Switched to essential-question mode" : "Opened advanced production controls",
      "user",
    );
  };

  const handleChecklistIssue = (issue: ProposalChecklistIssue) => {
    navigateToStep(issue.stepId);
    setShowErrors(true);
    window.setTimeout(() => {
      document.getElementById("manual-proposal-details")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const handleGenerateStatementOfWork = () => {
    const statementOfWork = buildVendorReadyStatementOfWork({
      eventName: proposalData.event.eventName,
      eventType: proposalData.event.eventType.eventType,
      eventFormat: proposalData.event.eventFormat,
      attendees: proposalData.event.attendees,
      roomCount: proposalData.venueSchedule.numberOfEventRooms,
      venueName: proposalData.venueSchedule.venueName,
      startDate: proposalData.event.startDate,
      endDate: proposalData.event.endDate,
    });
    setProposalData((current) => ({
      ...current,
      event: { ...current.event, statementOfWork },
    }));
    setFieldProvenance((current) => ({
      ...current,
      statementOfWork: {
        source: "ai",
        confidence: 0.82,
        explanation: "Generated from confirmed event, venue, date, attendance, and room inputs.",
      },
    }));
    setAssumptionsApproved(false);
    addAuditEntry("Generated a vendor-ready statement of work", "ai");
    toast.success("Statement of work generated. Review it in Advanced mode before publishing.");
  };

  const refreshProposalAfterQuestion = async () => {
    if (!proposalId) return;
    const result = await getProposalByIdAction(proposalId);
    if (!result.success || !result.data || typeof result.data !== "object") return;
    const mapped = mapApiProposalToFormData(
      result.data as EditableProposalApiResponse,
    );
    setProposalData(mapped);
    setRooms(mapped.roomByRoom.map((room) => ({ ...defaultRoom(), ...room })));
  };

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
      data-testid="proposal-editor-root"
      style={{
        fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)`,
      }}
      className="@container space-y-6 px-0 sm:px-2 lg:px-6"
    >
      {loadingExisting && (
        <div className="flex w-full flex-col gap-4 @min-[1000px]:flex-row">
          {/* Form card skeleton � 80% */}
          <div className="min-w-0 flex-1 space-y-6">
            <div className="flex min-h-screen flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #2fc6f5, #008ad2)" }} />
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
                <div className="h-9 w-28 animate-pulse rounded-xl bg-[#008ad2]/20" />
              </div>
            </div>
          </div>
          {/* Step sidebar skeleton � 20% */}
          <div className="w-full shrink-0 space-y-2 @min-[1000px]:w-[288px]">
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
        <>
        <ProposalExperienceBar
          mode={experienceMode}
          onModeChange={handleModeChange}
          completedSteps={visibleCompletedSteps}
          totalSteps={visibleStepOrder.length}
          issues={checklistIssues}
          onIssueClick={handleChecklistIssue}
        />
        <div data-testid="proposal-editor-layout" className="flex w-full flex-col items-stretch gap-4 bg-[#f4f7f9] p-0 sm:p-3 lg:p-5 @min-[1000px]:flex-row @min-[1000px]:items-start @min-[1000px]:gap-5">
          {/* Form area */}
          <div
            data-testid="proposal-editor-form"
            className="proposal-editor-surface order-2 min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#e2e8ec] bg-white shadow-[0_10px_35px_rgba(15,42,67,0.06)] @min-[1000px]:order-1"
            data-assistant-current-section="true"
            data-assistant-section-id={
              assistantSectionByStep[
                proposalProcessStep as keyof typeof assistantSectionByStep
              ]
            }
            data-assistant-event-format={proposalData.event.eventFormat}
          >
            {isEditMode && proposalId && process.env.NEXT_PUBLIC_PROPOSAL_WORKFLOW_ENABLED === "true" && (
              <ProposalWorkflowShell
                proposalId={proposalId}
                proposalName={proposalData.event.eventName}
                proposalIsPublished={proposalData.proposalStatus === "submitted"}
                onNavigateToFormStep={navigateToStep}
                onQuestionResolved={refreshProposalAfterQuestion}
              />
            )}
            {isEditMode && proposalId && process.env.NEXT_PUBLIC_PROPOSAL_WORKFLOW_ENABLED !== "true" && process.env.NEXT_PUBLIC_PROPOSAL_CONTEXT_ENABLED === "true" && <ProposalContextPanel proposalId={proposalId} />}
            {isEditMode && proposalId && process.env.NEXT_PUBLIC_PROPOSAL_WORKFLOW_ENABLED !== "true" && process.env.NEXT_PUBLIC_PROPOSAL_DRAFT_ENABLED === "true" && <ProposalDraftPanel proposalId={proposalId} />}
            <div id="manual-proposal-details" />
            {currentValidationSummary && (
              <ProposalValidationSummary {...currentValidationSummary} />
            )}
            {proposalProcessStep === 1 && (
              <EventForm
                data={proposalData.event}
                onChange={(updates) => updateProposalSection("event", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                onSaveDraft={() => void handleSubmit(undefined, true)}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
                mode={experienceMode}
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
                eventStartDate={toIsoDate(proposalData.event.startDate)}
                eventEndDate={toIsoDate(proposalData.event.endDate)}
                mode={experienceMode}
              />
            )}
            {proposalProcessStep === 3 && (
              <RoomAndProductionStep
                rooms={rooms}
                onRoomsChange={setRooms}
                numberOfEventRooms={proposalData.venueSchedule.numberOfEventRooms}
                onNumberOfEventRoomsChange={(value) =>
                  updateProposalSection("venueSchedule", { numberOfEventRooms: value })
                }
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
                isInPersonOnly={isInPersonOnly}
                proposalId={proposalId ?? null}
                onRecommendationsApplied={refreshProposalAfterQuestion}
                focusRoom={focusRoom}
                eventTimeZone={proposalData.venueSchedule.timeZone}
                eventStartDate={toIsoDate(proposalData.event.startDate)}
                eventEndDate={toIsoDate(proposalData.event.endDate)}
                eventAttendance={proposalData.event.attendees}
                mode={experienceMode}
                onTemplateApplied={(template, confidence, explanation) => {
                  setFieldProvenance((current) => ({
                    ...current,
                    roomByRoom: { source: "assumed", confidence, explanation },
                  }));
                  setAssumptionsApproved(false);
                  addAuditEntry(`Applied ${template} room template`, "assumed");
                }}
                onOpenScenicInspirations={() => {
                  setReferenceMaterialsTarget("scenic_inspiration");
                  setProposalProcessStep(9);
                }}
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
            {STANDALONE_VIDEO_RECORDING_STEP_ENABLED &&
              proposalProcessStep === 6 && (
                <VideoRecordingStep
                  data={
                    proposalData.videoRecordingStep ?? defaultVideoRecording()
                  }
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
                  const widths = rooms
                    .flatMap((room) => {
                      const count = ledWallCount(room);
                      return ensureLedWallSlots(normalizeLedWalls(room), count)
                        .slice(0, count)
                        .map((wall) => parseFloat(wall.width || "0"));
                    })
                    .filter((w) => !isNaN(w) && w > 0);
                  return widths.length ? Math.max(...widths) : undefined;
                })()}
                onOpenVenueCoiDocuments={() => {
                  setReferenceMaterialsTarget("venue_coi");
                  setProposalProcessStep(9);
                }}
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
                eventStartDate={toIsoDate(proposalData.event.startDate)}
                mode={experienceMode}
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
                focusTarget={referenceMaterialsTarget}
              />
            )}
            {proposalProcessStep === 10 && (
              <ContactInfo
                data={proposalData.contact}
                onChange={(updates) =>
                  updateProposalSection("contact", updates)
                }
                onContinue={continueHandler}
                onSaveAsDraft={() => void handleSubmit(undefined, true)}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
                isEditMode={isEditMode}
                isSubmitting={isSubmitting}
                isSavingDraft={isSavingDraft}
                publishDisabled={
                  checklistIssues.length > 0 ||
                  (basicAssumptions.length > 0 && !assumptionsApproved)
                }
                publishBlockReason={
                  checklistIssues.length > 0
                    ? `${checklistIssues.length} required item${checklistIssues.length === 1 ? " remains" : "s remain"}.`
                    : basicAssumptions.length > 0 && !assumptionsApproved
                      ? "Review and approve the Basic mode assumptions above."
                      : undefined
                }
                mode={experienceMode}
                finalReview={
                  <ProposalFinalReview
                    event={proposalData.event}
                    venue={proposalData.venueSchedule}
                    rooms={rooms}
                    budget={proposalData.budget}
                    contact={proposalData.contact}
                    issues={checklistIssues}
                    provenance={fieldProvenance}
                    auditTrail={auditTrail}
                    assumptions={basicAssumptions}
                    assumptionsApproved={assumptionsApproved}
                    onAssumptionsApprovedChange={(approved) => {
                      setAssumptionsApproved(approved);
                      if (approved) addAuditEntry("Approved Basic mode assumptions for publishing", "user");
                    }}
                    onEditStep={navigateToReviewTarget}
                    onGenerateStatementOfWork={handleGenerateStatementOfWork}
                  />
                }
              />
            )}
          </div>
          {/* Proposal progress sidebar */}
          <div data-testid="proposal-editor-progress" className="order-1 w-full shrink-0 @min-[1000px]:sticky @min-[1000px]:top-0 @min-[1000px]:order-2 @min-[1000px]:w-[288px] @min-[1000px]:self-start">
            {autosaveEligible && (
              <p
                role="status"
                aria-live="polite"
                className={`mb-2 px-1 text-xs ${autosaveState === "error" ? "text-red-600" : "text-slate-500"}`}
              >
                {autosaveState === "saving" && "Saving…"}
                {autosaveState === "saved" && "All changes saved"}
                {autosaveState === "error" && "Couldn't save your latest changes — they are still on screen."}
                {autosaveState === "idle" && "Changes save automatically"}
              </p>
            )}
            <ProcessList
              activeStep={proposalProcessStep}
              hideStepIds={Array.from({ length: 10 }, (_, index) => index + 1).filter(
                (step) => !visibleStepOrder.includes(step),
              )}
              onStepChange={navigateToStep}
              completedStepIds={completedStepIds}
              mode={experienceMode}
            />
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default AddNewProposal;

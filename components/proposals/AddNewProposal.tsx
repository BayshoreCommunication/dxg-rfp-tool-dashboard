"use client";
import {
  createProposalAction,
  extractProposalFromFile,
  getProposalByIdAction,
  updateProposalAction,
} from "@/app/actions/proposals";
import { getSettingsAction } from "@/app/actions/settings";
import { FileText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AddProposalUpload from "./AddProposalUpload";
import ProposalFilters, { type ProposalFilterType } from "./ProposalFilters";
import BudgetProposalPreferences from "./ProposalsProcess.tsx/BudgetProposalPreferences";
import ContactInfo from "./ProposalsProcess.tsx/ContactInfo";
import EventForm from "./ProposalsProcess.tsx/EventForm";
import ProcessList from "./ProposalsProcess.tsx/ProcessList";
import ProductionSupportCrew from "./ProposalsProcess.tsx/ProductionSupportCrew";
import RoombyRoomAvForm from "./ProposalsProcess.tsx/RoombyRoomAvForm";
import TemplateSelection from "./ProposalsProcess.tsx/TemplateSelection";
import UploadsReferenceMaterials from "./ProposalsProcess.tsx/UploadsReferenceMaterials";
import VenueTechnicalRequirements from "./ProposalsProcess.tsx/VenueTechnicalRequirements";
import ProposalSuccessfullyCreate from "./ProposalSuccessfullyCreate";

/* â”€â”€â”€ Proposal data by step â”€â”€â”€ */
export type EventData = {
  eventName: string;
  startDate: string;
  endDate: string;
  venue: string;
  attendees: string;
  eventFormat: "In-Person" | "Hybrid" | "Virtual";
  eventType: string;
  eventTypeOther: string;
};

export type RoomByRoomData = {
  roomFunction: string;
  estimatedAttendeesInRoom: string;
  loadInDateTime: string;
  rehearsalDateTime: string;
  showStartDateTime: string;
  showEndDateTime: string;
  audioSystemForHowManyPpl: string;
  podiumMic: string;
  podiumMicQty: string;
  wirelessMics: string;
  wirelessMicsQty: string;
  wirelessMicsType: string;
  audioRecording: string;
  largeMonitorsOrScreenProjector: string;
  largeMonitorsQty: string;
  ledWall: string;
  clientProvideOwnPresentationLaptop: string;
  clientLaptopQty: string;
  presentationLaptops: string;
  presentationLaptopQty: string;
  videoPlayback: string;
  videoPlaybackCount: string;
  videoFormatAspectRatio: string;
  audienceQa: string;
  audienceQaMethod: string;
  cameras: string;
  camerasQty: string;
  videoRecording: string;
  videoRecordingType: string;
  stageWashLighting: string;
  stageWashLightingStageSize: string;
  backlightingFor: string;
  drapeOrScenicUplighting: string;
  audienceLighting: string;
  programConfidenceMonitor: string;
  programConfidenceMonitorQty: string;
  notesConfidenceMonitor: string;
  notesConfidenceMonitorQty: string;
  speakerTimer: string;
  scenicStageDesign: string;
  numberOfRooms: string;
  ceilingHeight: string;
  roomSetup: string;
  showPrep: string;
  showSize: string;
  hasPipeAndDrape: boolean;
  showRig: boolean;
  rigPowerSize: string;
  preferredRigging: string[];
  decibelLimitation: string;
  avSpec: string;
  avPa: string;
  mainSound: string;
  mainSoundSize: string;
  hearingImpaired: string;
  preferredA1: string;
  recordAudio: string;
  chairs: string;
  stageRisers: string[];
  backdropsWallSize: string;
  scenicElements: boolean;
  videoStage: boolean;
  frontScreen: string;
  contentVideoNeeds: string;
  stageDimensions: string;
  confidenceMonitor: string;
  confidenceMonitorCount: string;
  projectorsProvided: string;
  projectorCount: string;
  cameraPackage: string;
  cameraCount: string;
  livestreamNeeded: string;
  lightingPackage: string;
  lightingConsole: string;
  teleprompterNeeded: string;
  showCallingRequired: string;
};

export type ProductionSupportData = {
  scenicStageDesign: "Yes" | "No" | "";
  unionLabor: "Yes" | "No" | "Not Sure" | "";
  showCrewNeeded: string[];
  otherRolesNeeded: string;
};

export type VenueTechnicalData = {
  needRiggingForFlown: "YES" | "NO" | "";
  riggingPlotOrSpecs: string;
  needDedicatedPowerDrops: "YES" | "NO" | "";
  standardAmpWall: string;
  powerDropsHowMany: string;
};

export type UploadsData = {
  supportDocuments: Array<File | string>;
  reviewExistingAvQuote: "YES" | "NO" | "";
  avQuoteFiles: Array<File | string>;
};

export type BudgetData = {
  estimatedAvBudget: string;
  budgetCustomAmount: string;
  proposalFormatPreferences: string[];
  timelineForProposal: string;
  callWithDxgProducer: "YES" | "NO" | "";
  howDidYouHear: string;
  howDidYouHearOther: string;
};

export type ContactData = {
  contactFirstName: string;
  contactLastName: string;
  contactTitle: string;
  contactOrganization: string;
  contactEmail: string;
  contactPhone: string;
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
    dateFormat: string;
  };
};

export interface ProposalData {
  templateId: "template-one" | "template-two" | "";
  proposalStatus: "draft" | "submitted";
  proposalSettings: {
    linkPrefix: string;
    defaultFont: "Inter" | "Poppins" | "Roboto";
    proposalLanguage: string;
    defaultCurrency: string;
    dateFormat: string;
  };
  event: EventData;
  roomByRoom: RoomByRoomData;
  production: ProductionSupportData;
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
    dateFormat: "MM/DD/YYYY",
  },
  event: {
    eventName: "",
    startDate: "",
    endDate: "",
    venue: "",
    attendees: "",
    eventFormat: "In-Person",
    eventType: "",
    eventTypeOther: "",
  },
  roomByRoom: {
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
    contentVideoNeeds: "",
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
  },
  production: {
    scenicStageDesign: "",
    unionLabor: "",
    showCrewNeeded: [],
    otherRolesNeeded: "",
  },
  venue: {
    needRiggingForFlown: "",
    riggingPlotOrSpecs: "",
    needDedicatedPowerDrops: "",
    standardAmpWall: "",
    powerDropsHowMany: "",
  },
  uploads: {
    supportDocuments: [],
    reviewExistingAvQuote: "",
    avQuoteFiles: [],
  },
  budget: {
    estimatedAvBudget: "",
    budgetCustomAmount: "",
    proposalFormatPreferences: [],
    timelineForProposal: "",
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
    anythingElse: "",
  },
};

const defaultProposalSettings: ProposalSettings = {
  branding: {
    linkPrefix: "abuco",
    defaultFont: "Poppins",
  },
  proposals: {
    proposalLanguage: "English",
    defaultCurrency: "$",
    expiryDate: "None",
    dateFormat: "MM/DD/YYYY",
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
  raw: Partial<ProposalData>,
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
        eventType: matchOption(raw.event.eventType, [
          "Conference",
          "Meeting",
          "Gala",
          "Trade Show",
          "Awards Show",
          "Other",
        ]),
      }
    : undefined,
  roomByRoom: raw.roomByRoom
    ? {
        ...raw.roomByRoom,
        roomSetup: matchOption(raw.roomByRoom.roomSetup, [
          "Theatre",
          "Classroom",
          "Banquet Rounds",
          "U-Shape",
          "Boardroom",
          "Cocktail",
          "Custom",
        ]),
        avSpec: matchOption(raw.roomByRoom.avSpec, [
          "Basic",
          "Standard",
          "Premium",
          "Custom",
        ]),
        avPa: matchOption(raw.roomByRoom.avPa, [
          "Yes",
          "No",
        ]) as RoomByRoomData["avPa"],
        mainSound: matchOption(raw.roomByRoom.mainSound, [
          "L'Acoustics",
          "d&b audiotechnik",
          "Meyer Sound",
          "QSC",
          "JBL",
          "Other",
        ]),
        hearingImpaired: matchOption(raw.roomByRoom.hearingImpaired, [
          "Yes",
          "No",
        ]) as RoomByRoomData["hearingImpaired"],
        recordAudio: matchOption(raw.roomByRoom.recordAudio, [
          "Yes",
          "No",
          "Multi-Track",
        ]) as RoomByRoomData["recordAudio"],
        audioRecording: matchOption(raw.roomByRoom.audioRecording, [
          "Yes",
          "No",
        ]) as RoomByRoomData["audioRecording"],
        videoFormatAspectRatio:
          matchOption(raw.roomByRoom.videoFormatAspectRatio, [
            "16:9 format",
            "Unique Aspect Ratio",
            "Both",
          ]) ||
          matchOption(raw.roomByRoom.frontScreen, [
            "16:9 format",
            "Unique Aspect Ratio",
            "Both",
          ]) ||
          raw.roomByRoom.videoFormatAspectRatio,
        audienceQa: matchOption(raw.roomByRoom.audienceQa, [
          "Yes",
          "No",
        ]) as RoomByRoomData["audienceQa"],
        audienceQaMethod: matchOption(raw.roomByRoom.audienceQaMethod, [
          "Via an App",
          "Passing a Microphone",
          "Both",
        ]),
        videoRecording: matchOption(raw.roomByRoom.videoRecording, [
          "Yes",
          "No",
        ]) as RoomByRoomData["videoRecording"],
        videoRecordingType: matchOption(raw.roomByRoom.videoRecordingType, [
          "Camera Feed Only",
          "Presentation Only",
          "Side by Side (Camera and Presentation)",
          "All The Above",
        ]),
        stageWashLighting: matchOption(raw.roomByRoom.stageWashLighting, [
          "Yes",
          "No",
        ]) as RoomByRoomData["stageWashLighting"],
        frontScreen: matchOption(raw.roomByRoom.frontScreen, [
          "16:9",
          "4:3",
          "Custom Aspect",
          "Curved",
          "LED",
        ]),
        confidenceMonitor: matchOption(raw.roomByRoom.confidenceMonitor, [
          "Yes",
          "No",
        ]),
        projectorsProvided: matchOption(raw.roomByRoom.projectorsProvided, [
          "Yes",
          "No",
        ]),
        livestreamNeeded: matchOption(raw.roomByRoom.livestreamNeeded, [
          "Yes",
          "No",
        ]),
        teleprompterNeeded: matchOption(raw.roomByRoom.teleprompterNeeded, [
          "Yes",
          "No",
        ]),
        showCallingRequired: matchOption(raw.roomByRoom.showCallingRequired, [
          "Yes",
          "No",
        ]),
      }
    : undefined,
  production: raw.production
    ? {
        ...raw.production,
        scenicStageDesign: matchOption(raw.production.scenicStageDesign, [
          "Yes",
          "No",
        ]) as ProductionSupportData["scenicStageDesign"],
        unionLabor: matchOption(raw.production.unionLabor, [
          "Yes",
          "No",
          "Not Sure",
        ]) as ProductionSupportData["unionLabor"],
        showCrewNeeded: matchOptionsArray(raw.production.showCrewNeeded, [
          "A1 (AUDIO)",
          "A2 (AUDIO ASSIST)",
          "V1 (VIDEO)",
          "V2 (VIDEO ASSIST)",
          "TD (TECHNICAL DIRECTOR)",
          "L1 (LIGHTING)",
          "L2 (LIGHTING ASSIST)",
          "GRAPHICS OP",
          "CAMERA OPERATOR",
          "SHOWCALLER",
          "STAGE MANAGER",
          "PRODUCER",
          "TELEPROMPTER OP",
          "RIGGER",
          "STAGEHAND",
          "OTHER",
        ]),
      }
    : undefined,
  venue: raw.venue
    ? {
        ...raw.venue,
        needRiggingForFlown: matchOption(raw.venue.needRiggingForFlown, [
          "YES",
          "NO",
        ]).toUpperCase() as VenueTechnicalData["needRiggingForFlown"],
        needDedicatedPowerDrops: matchOption(
          raw.venue.needDedicatedPowerDrops,
          ["YES", "NO"],
        ).toUpperCase() as VenueTechnicalData["needDedicatedPowerDrops"],
        standardAmpWall:
          matchOption(raw.venue.standardAmpWall, ["100A", "200A", "400A"]) ||
          raw.venue.standardAmpWall,
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
  roomByRoom?: Partial<RoomByRoomData>;
  production?: Partial<ProductionSupportData>;
  venue?: Partial<VenueTechnicalData>;
  uploads?: Partial<UploadsData>;
  budget?: Partial<BudgetData>;
  contact?: Partial<ContactData>;
};

const mapApiProposalToFormData = (
  raw: EditableProposalApiResponse,
): ProposalData => ({
  ...defaultProposalData,
  templateId: raw.templateId || defaultProposalData.templateId,
  proposalStatus:
    raw.status === "draft" || raw.status === "submitted"
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
  roomByRoom: {
    ...defaultProposalData.roomByRoom,
    ...(raw.roomByRoom || {}),
  },
  production: {
    ...defaultProposalData.production,
    ...(raw.production || {}),
  },
  venue: {
    ...defaultProposalData.venue,
    ...(raw.venue || {}),
  },
  uploads: {
    ...defaultProposalData.uploads,
    supportDocuments: Array.isArray(raw.uploads?.supportDocuments)
      ? raw.uploads?.supportDocuments
      : defaultProposalData.uploads.supportDocuments,
    reviewExistingAvQuote:
      raw.uploads?.reviewExistingAvQuote ??
      defaultProposalData.uploads.reviewExistingAvQuote,
    avQuoteFiles: Array.isArray(raw.uploads?.avQuoteFiles)
      ? raw.uploads?.avQuoteFiles
      : defaultProposalData.uploads.avQuoteFiles,
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
  const [uploadSearchValue, setUploadSearchValue] = useState("");
  const [uploadActiveFilter, setUploadActiveFilter] =
    useState<ProposalFilterType>("all");
  const [createdProposal, setCreatedProposal] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [updatedProposalTitle, setUpdatedProposalTitle] = useState<
    string | null
  >(null);

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
            dateFormat?: string;
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
            dateFormat:
              data.proposals?.dateFormat?.trim() ||
              defaultProposalSettings.proposals.dateFormat,
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

  const isRoomByRoomStepValid = () => {
    const {
      roomFunction,
      estimatedAttendeesInRoom,
      loadInDateTime,
      rehearsalDateTime,
      showStartDateTime,
      showEndDateTime,
    } = proposalData.roomByRoom;
    return (
      roomFunction.trim().length > 0 &&
      estimatedAttendeesInRoom.trim().length > 0 &&
      loadInDateTime.trim().length > 0 &&
      rehearsalDateTime.trim().length > 0 &&
      showStartDateTime.trim().length > 0 &&
      showEndDateTime.trim().length > 0
    );
  };

  const isProductionStepValid = () => {
    const { scenicStageDesign, unionLabor, showCrewNeeded } =
      proposalData.production;
    return (
      scenicStageDesign.trim().length > 0 &&
      unionLabor.trim().length > 0 &&
      showCrewNeeded.length > 0
    );
  };

  const isVenueStepValid = () => {
    const { needRiggingForFlown, needDedicatedPowerDrops } = proposalData.venue;
    if (!needRiggingForFlown.trim() || !needDedicatedPowerDrops.trim()) {
      return false;
    }
    if (needDedicatedPowerDrops === "YES") {
      const { standardAmpWall, powerDropsHowMany } = proposalData.venue;
      return (
        standardAmpWall.trim().length > 0 && powerDropsHowMany.trim().length > 0
      );
    }
    return true;
  };

  const isUploadsStepValid = () => {
    const { reviewExistingAvQuote, avQuoteFiles, supportDocuments } =
      proposalData.uploads;
    if (!reviewExistingAvQuote.trim()) {
      return false;
    }
    if (reviewExistingAvQuote === "YES") {
      return avQuoteFiles.length > 0;
    }
    return supportDocuments.length > 0;
  };

  const isBudgetStepValid = () => {
    const {
      estimatedAvBudget,
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

    if (howDidYouHear === "Other") {
      return howDidYouHearOther.trim().length > 0;
    }

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
    type YesNoField =
      | "wirelessMics"
      | "largeMonitorsOrScreenProjector"
      | "clientProvideOwnPresentationLaptop"
      | "presentationLaptops"
      | "videoPlayback"
      | "cameras"
      | "programConfidenceMonitor"
      | "notesConfidenceMonitor";
    type QtyField =
      | "wirelessMicsQty"
      | "largeMonitorsQty"
      | "clientLaptopQty"
      | "presentationLaptopQty"
      | "videoPlaybackCount"
      | "camerasQty"
      | "programConfidenceMonitorQty"
      | "notesConfidenceMonitorQty";

    const yesNoQtyPairs: Array<[YesNoField, QtyField]> = [
      ["wirelessMics", "wirelessMicsQty"],
      ["largeMonitorsOrScreenProjector", "largeMonitorsQty"],
      ["clientProvideOwnPresentationLaptop", "clientLaptopQty"],
      ["presentationLaptops", "presentationLaptopQty"],
      ["videoPlayback", "videoPlaybackCount"],
      ["cameras", "camerasQty"],
      ["programConfidenceMonitor", "programConfidenceMonitorQty"],
      ["notesConfidenceMonitor", "notesConfidenceMonitorQty"],
    ];

    const normalized = yesNoQtyPairs.reduce((acc, [valueField, qtyField]) => {
      if (roomByRoom[valueField] !== "Yes") {
        acc[qtyField] = "";
      }
      return acc;
    }, { ...roomByRoom } as RoomByRoomData);

    if (normalized.wirelessMics !== "Yes") {
      normalized.wirelessMicsType = "";
    }
    if (normalized.audienceQa !== "Yes") {
      normalized.audienceQaMethod = "";
    }
    if (normalized.videoRecording !== "Yes") {
      normalized.videoRecordingType = "";
    }
    if (normalized.stageWashLighting !== "Yes") {
      normalized.stageWashLightingStageSize = "";
    }

    return normalized;
  };

  const handleSubmit = async (
    statusOverride?: "draft" | "submitted",
  ) => {
    setShowErrors(true);
    if (!isContactStepValid()) {
      toast.error("Please complete all required contact fields.");
      return;
    }

    setSaving(true);

    // Mongoose expects arrays of strings (e.g. file URLs), but state holds File objects
    // Temporarily, we just strip them out or map them to their names so validation passes.
    // (If you want true file uploading, you'd send them to S3/Cloudinary first and pass the URLs here.)
    const payload: ProposalData = {
      ...proposalData,
      proposalSettings: {
        linkPrefix: proposalSettings.branding.linkPrefix,
        defaultFont: proposalSettings.branding.defaultFont,
        proposalLanguage: proposalSettings.proposals.proposalLanguage,
        defaultCurrency: proposalSettings.proposals.defaultCurrency,
        dateFormat: proposalSettings.proposals.dateFormat,
      },
      roomByRoom: normalizeRoomByRoomForSubmit(proposalData.roomByRoom),
      uploads: {
        ...proposalData.uploads,
        supportDocuments: proposalData.uploads.supportDocuments
          .map((f) => (typeof f === "string" ? f : f?.name || ""))
          .filter(
            (f) =>
              typeof f === "string" &&
              f.trim() !== "" &&
              f !== "[ {} ]" &&
              f !== "[object Object]",
          ),
        avQuoteFiles: proposalData.uploads.avQuoteFiles
          .map((f) => (typeof f === "string" ? f : f?.name || ""))
          .filter(
            (f) =>
              typeof f === "string" &&
              f.trim() !== "" &&
              f !== "[ {} ]" &&
              f !== "[object Object]",
          ),
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
            (isEditMode ? "Failed to update proposal." : "Failed to create proposal."),
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
            roomByRoom: {
              ...prev.roomByRoom,
              ...(normalized.roomByRoom ?? {}),
            },
            production: {
              ...prev.production,
              ...(normalized.production ?? {}),
            },
            venue: { ...prev.venue, ...(normalized.venue ?? {}) },
            uploads: { ...prev.uploads, ...(normalized.uploads ?? {}) },
            budget: { ...prev.budget, ...(normalized.budget ?? {}) },
            contact: { ...prev.contact, ...(normalized.contact ?? {}) },
          }));
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
    if (proposalProcessStep === 2 && !isRoomByRoomStepValid()) {
      return;
    }
    if (proposalProcessStep === 3 && !isProductionStepValid()) {
      return;
    }
    if (proposalProcessStep === 4 && !isVenueStepValid()) {
      return;
    }
    if (proposalProcessStep === 5 && !isUploadsStepValid()) {
      return;
    }
    if (proposalProcessStep === 6 && !isBudgetStepValid()) {
      return;
    }

    if (proposalProcessStep === 7) {
      if (!isContactStepValid()) {
        return;
      }
      setProposalProcessStep(8);
      setShowErrors(false);
      return;
    }

    if (proposalProcessStep === 8) return;

    setProposalProcessStep((s) => s + 1);
    setShowErrors(false);
  };
  const backHandler = () => setProposalProcessStep((s) => Math.max(0, s - 1));
  const handleRemoveFile = () => setSelectedFile(null);

  if (createdProposal) {
    return (
      <ProposalSuccessfullyCreate
        proposalTitle={createdProposal.title}
        onBackToList={() => router.push("/proposals")}
        onSendEmail={() =>
          router.push(
            `/email/send-email?proposalId=${encodeURIComponent(createdProposal.id)}`,
          )
        }
      />
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
          <div className="mt-8">
            <ProposalFilters
              searchValue={uploadSearchValue}
              onSearchChange={setUploadSearchValue}
              activeFilter={uploadActiveFilter}
              onFilterChange={setUploadActiveFilter}
              counts={{ all: 0, draft: 0, live: 0, favorite: 0 }}
            />
          </div>
          <AddProposalUpload
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
          />

          {selectedFile && (
            <div className="flex flex-col items-center justify-center  w-ful animate-in fade-in duration-300">
              <div className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] mb-8 max-w-md">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 bg-sky-50 text-[#38bdf8] flex items-center justify-center rounded-lg flex-shrink-0">
                    <FileText size={24} strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-gray-800 truncate">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB â€¢{" "}
                      {selectedFile.name.split(".").pop()?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors flex-shrink-0"
                  title="Remove file"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <button
                className="bg-[#35bdf2] hover:bg-[#20A4D5] text-white font-bold text-[14px] py-3.5 px-12 rounded shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95 tracking-wide cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={continueHandler}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Reading document...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          )}
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
            {/* Add Step 2â€“7 components here as you build them */}
            {proposalProcessStep === 2 && (
              <RoombyRoomAvForm
                data={proposalData.roomByRoom}
                onChange={(updates) =>
                  updateProposalSection("roomByRoom", updates)
                }
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 3 && (
              <ProductionSupportCrew
                data={proposalData.production}
                onChange={(updates) =>
                  updateProposalSection("production", updates)
                }
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 4 && (
              <VenueTechnicalRequirements
                data={proposalData.venue}
                onChange={(updates) => updateProposalSection("venue", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 5 && (
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
            {proposalProcessStep === 6 && (
              <BudgetProposalPreferences
                data={proposalData.budget}
                onChange={(updates) => updateProposalSection("budget", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
                proposalSettings={proposalSettings}
              />
            )}
            {proposalProcessStep === 7 && (
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
            {proposalProcessStep === 8 && (
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
            <ProcessList activeStep={proposalProcessStep} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AddNewProposal;

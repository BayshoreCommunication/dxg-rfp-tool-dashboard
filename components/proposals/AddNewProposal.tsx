"use client";
import { FileText, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProposalAction, extractProposalFromFile } from "@/app/actions/proposals";
import { toast } from "react-toastify";
import AddProposalUpload from "./AddProposalUpload";
import ProposalFilters from "./ProposalFilters";
import BudgetProposalPreferences from "./ProposalsProcess.tsx/BudgetProposalPreferences";
import ContactInfo from "./ProposalsProcess.tsx/ContactInfo";
import EventForm from "./ProposalsProcess.tsx/EventForm";
import ProcessList from "./ProposalsProcess.tsx/ProcessList";
import ProductionSupportCrew from "./ProposalsProcess.tsx/ProductionSupportCrew";
import RoombyRoomAvForm from "./ProposalsProcess.tsx/RoombyRoomAvForm";
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

export interface ProposalData {
  event: EventData;
  roomByRoom: RoomByRoomData;
  production: ProductionSupportData;
  venue: VenueTechnicalData;
  uploads: UploadsData;
  budget: BudgetData;
  contact: ContactData;
}

const defaultProposalData: ProposalData = {
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

const matchOptionsArray = (values: string[] | string | undefined, options: string[]): string[] => {
  if (!values) return [];
  const valArray = Array.isArray(values) ? values : values.split(",").map((v) => v.trim());
  
  const matched = valArray
    .map((v) => matchOption(v, options))
    .filter(Boolean);
    
  // Deduplicate
  return Array.from(new Set(matched));
};

const normalizeExtracted = (raw: Partial<ProposalData>): Partial<ProposalData> => ({
  event: raw.event ? {
    ...raw.event,
    attendees: matchOption(raw.event.attendees, ["< 100", "100 - 150", "200 - 500", "500 - 1,000", "1,000+"]),
    eventFormat: (matchOption(raw.event.eventFormat, ["In-Person", "Hybrid", "Virtual"]) || raw.event.eventFormat) as EventData["eventFormat"],
    eventType: matchOption(raw.event.eventType, ["Conference", "Meeting", "Gala", "Trade Show", "Awards Show", "Other"]),
  } : undefined,
  roomByRoom: raw.roomByRoom ? {
    ...raw.roomByRoom,
    roomSetup: matchOption(raw.roomByRoom.roomSetup, ["Theatre", "Classroom", "Banquet Rounds", "U-Shape", "Boardroom", "Cocktail", "Custom"]),
    avSpec: matchOption(raw.roomByRoom.avSpec, ["Basic", "Standard", "Premium", "Custom"]),
    avPa: matchOption(raw.roomByRoom.avPa, ["Yes", "No"]) as RoomByRoomData["avPa"],
    mainSound: matchOption(raw.roomByRoom.mainSound, ["L'Acoustics", "d&b audiotechnik", "Meyer Sound", "QSC", "JBL", "Other"]),
    hearingImpaired: matchOption(raw.roomByRoom.hearingImpaired, ["Yes", "No"]) as RoomByRoomData["hearingImpaired"],
    recordAudio: matchOption(raw.roomByRoom.recordAudio, ["Yes", "No", "Multi-Track"]) as RoomByRoomData["recordAudio"],
    frontScreen: matchOption(raw.roomByRoom.frontScreen, ["16:9", "4:3", "Custom Aspect", "Curved", "LED"]),
  } : undefined,
  production: raw.production ? {
    ...raw.production,
    scenicStageDesign: matchOption(raw.production.scenicStageDesign, ["Yes", "No"]) as ProductionSupportData["scenicStageDesign"],
    unionLabor: matchOption(raw.production.unionLabor, ["Yes", "No", "Not Sure"]) as ProductionSupportData["unionLabor"],
    showCrewNeeded: matchOptionsArray(raw.production.showCrewNeeded, [
      "A1 (AUDIO)", "A2 (AUDIO ASSIST)", "V1 (VIDEO)", "V2 (VIDEO ASSIST)", 
      "TD (TECHNICAL DIRECTOR)", "L1 (LIGHTING)", "L2 (LIGHTING ASSIST)", 
      "GRAPHICS OP", "CAMERA OPERATOR", "SHOWCALLER", "STAGE MANAGER", 
      "PRODUCER", "TELEPROMPTER OP", "RIGGER", "STAGEHAND", "OTHER"
    ]),
  } : undefined,
  venue: raw.venue ? {
    ...raw.venue,
    needRiggingForFlown: matchOption(raw.venue.needRiggingForFlown, ["YES", "NO"]).toUpperCase() as VenueTechnicalData["needRiggingForFlown"],
    needDedicatedPowerDrops: matchOption(raw.venue.needDedicatedPowerDrops, ["YES", "NO"]).toUpperCase() as VenueTechnicalData["needDedicatedPowerDrops"],
    standardAmpWall: matchOption(raw.venue.standardAmpWall, ["100A", "200A", "400A"]) || raw.venue.standardAmpWall,
  } : undefined,
  budget: raw.budget ? {
    ...raw.budget,
    estimatedAvBudget: matchOption(raw.budget.estimatedAvBudget, ["<$10K", "$10-25K", "$25-50K", "$50-100K", "$100K+", "Other"]),
    proposalFormatPreferences: matchOptionsArray(raw.budget.proposalFormatPreferences, [
      "GEAR ITEMIZATION", "LABOR BREAKDOWN", "ALL-IN ESTIMATE", "ADD-ON OPTIONS"
    ]),
    timelineForProposal: matchOption(raw.budget.timelineForProposal, ["Within 3 Business Days", "1 Week", "2 Weeks", "Flexible"]),
    callWithDxgProducer: matchOption(raw.budget.callWithDxgProducer, ["YES", "NO"]).toUpperCase() as BudgetData["callWithDxgProducer"],
    howDidYouHear: matchOption(raw.budget.howDidYouHear, ["Referral", "Venue", "Google", "Social Media", "LinkedIn", "Other"]) || raw.budget.howDidYouHear,
  } : undefined,
  contact: raw.contact ? {
    ...raw.contact,
  } : undefined,
});

const AddNewProposal = () => {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proposalProcessStep, setProposalProcessStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [createdProposal, setCreatedProposal] = useState<{
    id: string;
    title: string;
  } | null>(null);

  /* ─── Single source of truth for all steps ─── */
  const [proposalData, setProposalData] =
    useState<ProposalData>(defaultProposalData);

  const updateProposalSection = <K extends keyof ProposalData>(
    section: K,
    updates: Partial<ProposalData[K]>
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
    const { roomFunction, numberOfRooms, roomSetup, avSpec } =
      proposalData.roomByRoom;
    return (
      roomFunction.trim().length > 0 &&
      numberOfRooms.trim().length > 0 &&
      roomSetup.trim().length > 0 &&
      avSpec.trim().length > 0
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
        standardAmpWall.trim().length > 0 &&
        powerDropsHowMany.trim().length > 0
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
    const {
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
    } = proposalData.contact;
    return (
      contactFirstName.trim().length > 0 &&
      contactLastName.trim().length > 0 &&
      contactEmail.trim().length > 0 &&
      contactPhone.trim().length > 0
    );
  };

  const handleSubmit = async () => {
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
      uploads: {
        ...proposalData.uploads,
        supportDocuments: proposalData.uploads.supportDocuments
          .map((f) => (typeof f === "string" ? f : f?.name || ""))
          .filter((f) => typeof f === 'string' && f.trim() !== "" && f !== "[ {} ]" && f !== "[object Object]"),
        avQuoteFiles: proposalData.uploads.avQuoteFiles
          .map((f) => (typeof f === "string" ? f : f?.name || ""))
          .filter((f) => typeof f === 'string' && f.trim() !== "" && f !== "[ {} ]" && f !== "[object Object]"),
      },
    };

    try {
      const result = await createProposalAction(payload);
      if (result.success) {
        toast.success("Proposal created successfully!");
        const data =
          result.data && typeof result.data === "object"
            ? (result.data as { _id?: string; event?: { eventName?: string } })
            : null;

        const createdId = data?._id || "";
        const createdTitle = data?.event?.eventName || proposalData.event.eventName || "Untitled Proposal";

        if (createdId) {
          setCreatedProposal({ id: createdId, title: createdTitle });
        } else {
          router.push("/proposals");
        }
      } else {
        toast.error(result.message || "Failed to create proposal.");
      }
    } catch {
      toast.error("An error occurred while creating the proposal.");
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
        if (result.success && result.data && Object.keys(result.data).length > 0) {
          // Normalize enum/dropdown fields so they exactly match option strings
          const normalized = normalizeExtracted(result.data);
          setProposalData((prev) => ({
            event:      { ...prev.event,      ...(normalized.event      ?? {}) },
            roomByRoom: { ...prev.roomByRoom, ...(normalized.roomByRoom ?? {}) },
            production: { ...prev.production, ...(normalized.production ?? {}) },
            venue:      { ...prev.venue,      ...(normalized.venue      ?? {}) },
            uploads:    { ...prev.uploads,    ...(normalized.uploads    ?? {}) },
            budget:     { ...prev.budget,     ...(normalized.budget     ?? {}) },
            contact:    { ...prev.contact,    ...(normalized.contact    ?? {}) },
          }));
          toast.success("✅ Fields pre-filled from your document!");
        } else {
          toast.info("No matching fields found — please fill the form manually.");
        }
      } catch {
        toast.info("Couldn't read the document — please fill the form manually.");
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
      if (!saving) {
        handleSubmit();
      }
      return;
    }

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
            `/email/send-email?proposalId=${encodeURIComponent(createdProposal.id)}`
          )
        }
      />
    );
  }

  return (
    <div>
      {/* â”€â”€ Step 0: Upload screen â”€â”€ */}
      {proposalProcessStep === 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-gray-900 leading-none">
                Your Proposals
              </h1>
            </div>
          </div>
          <div className="mt-8">
            <ProposalFilters />
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
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Reading document...
                  </>
                ) : "Continue"}
              </button>
            </div>
          )}
        </>
      )}

      {/* â”€â”€ Steps 1â€“7: Multi-step form â”€â”€ */}
      {proposalProcessStep >= 1 && (
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
              />
            )}
            {proposalProcessStep === 4 && (
              <VenueTechnicalRequirements
                data={proposalData.venue}
                onChange={(updates) => updateProposalSection("venue", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
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
              />
            )}
            {proposalProcessStep === 6 && (
              <BudgetProposalPreferences
                data={proposalData.budget}
                onChange={(updates) => updateProposalSection("budget", updates)}
                onContinue={continueHandler}
                onBack={backHandler}
                showErrors={showErrors}
              />
            )}
            {proposalProcessStep === 7 && (
              <ContactInfo
                data={proposalData.contact}
                onChange={(updates) =>
                  updateProposalSection("contact", updates)
                }
                onContinue={handleSubmit}
                onBack={backHandler}
                showErrors={showErrors}
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

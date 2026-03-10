"use client";
import { FileText, X } from "lucide-react";
import { useState } from "react";
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

/* ─── Master proposal data shape ─── */
export interface ProposalData {
  // Step 1 — Event Overview
  eventName: string;
  startDate: string;
  endDate: string;
  venue: string;
  attendees: string;
  eventFormat: "In-Person" | "Hybrid" | "Virtual";
  eventType: string;
  eventTypeOther: string;

  // Step 2 — Room-by-Room AV Needs
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

  // Step 3 — Production Support & Crew
  scenicStageDesign: "Yes" | "No" | "";
  unionLabor: "Yes" | "No" | "Not Sure" | "";
  showCrewNeeded: string[];
  otherRolesNeeded: string;

  // Step 4 — Venue & Technical Requirements
  needRiggingForFlown: "YES" | "NO" | "";
  riggingPlotOrSpecs: string;
  needDedicatedPowerDrops: "YES" | "NO" | "";
  standardAmpWall: string;
  powerDropsHowMany: string;

  // Step 5 — Uploads & Reference Materials
  supportDocuments: File[];
  reviewExistingAvQuote: "YES" | "NO" | "";
  avQuoteFiles: File[];

  // Step 6 — Budget & Proposal Preferences
  estimatedAvBudget: string;
  budgetCustomAmount: string;
  proposalFormatPreferences: string[];
  timelineForProposal: string;
  callWithDxgProducer: "YES" | "NO" | "";
  howDidYouHear: string;
  howDidYouHearOther: string;

  // Step 7 — Contact Info
  contactFirstName: string;
  contactLastName: string;
  contactTitle: string;
  contactOrganization: string;
  contactEmail: string;
  contactPhone: string;
  anythingElse: string;
}

const defaultProposalData: ProposalData = {
  eventName: "",
  startDate: "",
  endDate: "",
  venue: "",
  attendees: "",
  eventFormat: "In-Person",
  eventType: "",
  eventTypeOther: "",
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
  scenicStageDesign: "",
  unionLabor: "",
  showCrewNeeded: [],
  otherRolesNeeded: "",
  needRiggingForFlown: "",
  riggingPlotOrSpecs: "",
  needDedicatedPowerDrops: "",
  standardAmpWall: "",
  powerDropsHowMany: "",
  supportDocuments: [],
  reviewExistingAvQuote: "",
  avQuoteFiles: [],
  estimatedAvBudget: "",
  budgetCustomAmount: "",
  proposalFormatPreferences: [],
  timelineForProposal: "",
  callWithDxgProducer: "",
  howDidYouHear: "",
  howDidYouHearOther: "",
  contactFirstName: "",
  contactLastName: "",
  contactTitle: "",
  contactOrganization: "",
  contactEmail: "",
  contactPhone: "",
  anythingElse: "",
};

const AddNewProposal = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proposalProcessStep, setProposalProcessStep] = useState(0);

  /* ─── Single source of truth for all steps ─── */
  const [proposalData, setProposalData] =
    useState<ProposalData>(defaultProposalData);

  const updateProposalData = (updates: Partial<ProposalData>) => {
    setProposalData((prev) => ({ ...prev, ...updates }));
  };

  const continueHandler = () => setProposalProcessStep((s) => s + 1);
  const backHandler = () => setProposalProcessStep((s) => Math.max(0, s - 1));
  const handleRemoveFile = () => setSelectedFile(null);

  console.log("dfds", proposalData);

  return (
    <div>
      {/* ── Step 0: Upload screen ── */}
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
            <div className="flex flex-col items-center pt-8 w-full max-w-md animate-in fade-in duration-300">
              <div className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] mb-8">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 bg-sky-50 text-[#38bdf8] flex items-center justify-center rounded-lg flex-shrink-0">
                    <FileText size={24} strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-gray-800 truncate">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB •{" "}
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
                className="bg-[#35bdf2] hover:bg-[#20A4D5] text-white font-bold text-[14px] py-3.5 px-12 rounded shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95 tracking-wide cursor-pointer"
                onClick={continueHandler}
              >
                Continue
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Steps 1–7: Multi-step form ── */}
      {proposalProcessStep >= 1 && (
        <div className="flex w-full">
          {/* Form area — 70% */}
          <div className="w-[70%]">
            {proposalProcessStep === 1 && (
              <EventForm
                data={proposalData}
                onChange={updateProposalData}
                onContinue={continueHandler}
                onBack={backHandler}
              />
            )}
            {/* Add Step 2–7 components here as you build them */}
            {proposalProcessStep === 2 && (
              <RoombyRoomAvForm
                data={proposalData}
                onChange={updateProposalData}
                onContinue={continueHandler}
                onBack={backHandler}
              />
            )}
            {proposalProcessStep === 3 && (
              <ProductionSupportCrew
                data={proposalData}
                onChange={updateProposalData}
                onContinue={continueHandler}
                onBack={backHandler}
              />
            )}
            {proposalProcessStep === 4 && (
              <VenueTechnicalRequirements
                data={proposalData}
                onChange={updateProposalData}
                onContinue={continueHandler}
                onBack={backHandler}
              />
            )}
            {proposalProcessStep === 5 && (
              <UploadsReferenceMaterials
                data={proposalData}
                onChange={updateProposalData}
                onContinue={continueHandler}
                onBack={backHandler}
              />
            )}
            {proposalProcessStep === 6 && (
              <BudgetProposalPreferences
                data={proposalData}
                onChange={updateProposalData}
                onContinue={continueHandler}
                onBack={backHandler}
              />
            )}
            {proposalProcessStep === 7 && (
              <ContactInfo
                data={proposalData}
                onChange={updateProposalData}
                onContinue={continueHandler}
                onBack={backHandler}
              />
            )}
          </div>

          {/* Sidebar — 30% */}
          <div className="w-[30%] sticky top-0 self-start">
            <ProcessList activeStep={proposalProcessStep} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AddNewProposal;

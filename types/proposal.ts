export type EventData = {
  eventName: string;
  startDate: string;
  endDate: string;
  venue: string;
  attendees: string;
  eventFormat: "In-Person" | "Hybrid" | "Virtual";
  eventType: {
    eventType: string;
    eventTypeOther: string;
  };
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
  notesConfidenceMonitor: string;
  speakerTimer: string;
  scenicStageDesign: string;
  showPrep: string;
  showSize: string;
  preferredA1: string;
  backdropsWallSize: string;
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
  needRiggingForFlown: {
    needRiggingForFlown: "YES" | "NO" | "";
    riggingPlotOrSpecs: string;
  };
  needDedicatedPowerDrops: {
    needDedicatedPowerDrops: "YES" | "NO" | "";
    standardAmpWall: string;
  };
  powerDropsHowMany: string;
};

export type UploadsData = {
  supportDocuments: Array<File | string>;
  reviewExistingAvQuote: {
    reviewExistingAvQuote: "YES" | "NO" | "";
    avQuoteFiles: Array<File | string>;
  };
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
  templateId: "template-one" | "template-two" | "";
  event: EventData;
  roomByRoom: RoomByRoomData;
  production: ProductionSupportData;
  venue: VenueTechnicalData;
  uploads: UploadsData;
  budget: BudgetData;
  contact: ContactData;
}

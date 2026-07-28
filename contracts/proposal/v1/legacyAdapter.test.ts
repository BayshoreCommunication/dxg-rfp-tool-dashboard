import { mapLegacyProposalToV1, toPublicProposalV1 } from "./legacyAdapter";

const legacyProposal = {
  _id: "proposal-legacy-001",
  userId: "user-001",
  status: "submitted",
  isFavorite: true,
  event: {
    eventName: "DXG Annual Summit",
    startDate: "2026-10-10",
    endDate: "2026-10-12",
    attendees: "500",
    eventFormat: "Hybrid",
    eventType: { eventType: "Corporate Conference", eventTypeOther: "" },
  },
  venueSchedule: {
    venueName: "Example Convention Center",
    venueCity: "Boston",
    venueState: "MA",
    numberOfEventRooms: "1",
    timeZone: "America/New_York",
  },
  roomByRoom: [
    {
      roomFunction: "General Session",
      functions: [
        {
          functionName: "Opening Keynote",
          scheduleDate: "2026-10-10",
          showStartDateTime: "2026-10-10T09:00:00.000Z",
          showEndDateTime: "2026-10-10T10:00:00.000Z",
          roomSetup: "Theater",
          estimatedAttendees: "500",
        },
        {
          functionName: "Leadership Panel",
          scheduleDate: "2026-10-10",
          showStartDateTime: "2026-10-10T11:00:00.000Z",
          showEndDateTime: "2026-10-10T12:00:00.000Z",
          roomSetup: "Theater",
          estimatedAttendees: "450",
        },
      ],
      estimatedAttendeesInRoom: "500",
      podiumMic: { podiumMic: "Yes", podiumMicQty: "1" },
      wirelessMics: { wirelessMics: "Yes", wirelessMicsQty: "4", wirelessMicsType: "Lavalier" },
      cameras: { cameras: "Yes", camerasQty: "3" },
      scenicStageDesign: "Yes",
      unionLabor: "Not Sure",
      showCrewNeeded: ["A1", "V1"],
    },
  ],
  hybridVirtual: {
    virtualAttendeeEstimate: "250",
    streamingPlatform: "Zoom",
    platformIntegrationWithAv: "YES",
    streamOwnership: "AV Vendor",
    remoteSpeakers: {
      remoteSpeakers: "YES",
      howManyRemoteSpeakers: "5",
      remoteFeedPlatform: "Zoom Webinar",
      techRehearsalOwner: "AV Vendor",
    },
    closedCaptions: {
      closedCaptions: "YES",
      captionLanguages: ["English", "Spanish"],
      captionType: "Human",
    },
    onDemandRecording: "YES",
  },
  contentCreative: {
    contentServicesNeeded: "YES",
    presentationTemplateDesign: "Client / Internal Team",
    speakerSlideCollection: "AV Vendor",
    motionGraphicsOpenerVideo: "AV Vendor",
    lowerThirdsNameSupers: "AV Vendor",
    eventLogoBrandStandards: "Client / Internal Team",
    sizzleRecapVideo: "AV Vendor",
    liveDataFeeds: { needed: "YES", ownership: "Client / Internal Team" },
    sponsorRecognitionContent: "AV Vendor",
    socialMediaContentCapture: "Client / Internal Team",
    virtualBackgroundDesign: "AV Vendor",
    creativeDirectionNotes: "Follow the approved brand guide.",
  },
  videoRecordingStep: {
    videoRecordingRequired: "YES",
    numberOfCameras: "3",
    cameraPositions: ["Stage Wide Shot", "Speaker Close-Up"],
    imagRequired: "YES",
    cameraOperators: "3",
    isoRecordings: "All cameras ISO",
    recordingResolution: "4K",
    recordingMedia: "SSD",
    editedDeliverable: {
      needed: "YES",
      deliverableType: ["Highlight Reel"],
      turnaroundTime: "5 Business Days",
      reelLengthPreference: "2-3 min",
    },
    rawFootageTurnover: "YES",
    deliverableFormat: ["H.264 MP4"],
    deliveryMethod: ["Cloud Link"],
  },
  venue: {
    venueAvContactName: "Venue Manager",
    venueAvContactEmail: "venue@example.com",
    venueAvContactPhone: "+1 555 0199",
    inHouseAvCompanyName: "Venue AV",
    riggingRequired: "YES",
    trussAndMotorsProvidedByVenue: "NO",
    liftsProvidedByVenue: "YES",
    powerDropsRequired: "YES",
    numberOfPowerDrops: "2",
    wirelessInternetRequired: "YES",
    internetUseCases: ["Livestream", "Remote Speakers"],
    coiRequirements: "USD 2M aggregate coverage",
    venueAccessRequirements: "Use loading dock B",
  },
  uploads: {
    coVendors: {
      inHouseVenueAv: {
        companyName: "Venue AV",
        contactName: "Venue Manager",
        contactEmail: "venue@example.com",
        contactPhone: "+1 555 0199",
        status: "Confirmed",
        notes: "Coordinates rigging",
      },
    },
    ndaRequired: "YES",
    ndaType: "Mutual NDA",
  },
  budget: {
    estimatedAvBudget: "Production",
    budgetFlexibility: "Moderate",
    proposalFormatPreferences: ["Labor Breakdown", "All-In Total Estimate"],
    evaluationMatrix: { technicalApproach: 30, pricing: 25 },
    vendorQuestionsDueDate: "2026-08-01",
    proposalSubmissionDueDate: "2026-08-15",
    vendorPresentationOpportunity: "YES",
    vendorPresentationDate: "2026-08-25",
    competitiveBid: "YES",
    numberOfProposals: "4",
    callWithDxgProducer: "YES",
    howDidYouHear: "Referral",
  },
  contact: {
    contactFirstName: "Avery",
    contactLastName: "Planner",
    contactEmail: "avery@example.com",
    contactPhone: "+1 555 0100",
    preferredContactMethod: "Email",
  },
  proposalSettings: {
    linkPrefix: "dxg",
    defaultFont: "Poppins",
    proposalLanguage: "English",
    dateFormat: "MM/DD/YYYY",
    decimalPrecision: "2",
  },
  createdAt: "2026-07-16T00:00:00.000Z",
  updatedAt: "2026-07-16T00:00:00.000Z",
};

describe("legacy proposal adapter", () => {
  it("maps a representative active-wizard proposal into canonical v1", () => {
    const result = mapLegacyProposalToV1(legacyProposal, {
      organizationId: "org-001",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.proposal.schemaVersion).toBe("proposal.v1");
    expect(result.proposal.lifecycle.status).toBe("submitted");
    expect(result.proposal.content.event.format).toBe("hybrid");
    expect(result.proposal.content.event.attendeeCount).toBe(500);
    expect(result.proposal.content.rooms[0].audio?.wirelessMicCount).toBe(4);
    expect(result.proposal.content.rooms[0].scheduleEntries).toHaveLength(2);
    expect(result.proposal.content.rooms[0].scheduleEntries?.[1].function).toBe("Leadership Panel");
    expect(result.proposal.content.rooms[0].production?.unionLabor).toBeNull();
    expect(result.proposal.content.hybridVirtual?.remoteSpeakers?.count).toBe(5);
    expect(result.proposal.content.contentCreative?.liveDataFeeds?.required).toBe(true);
    expect(result.proposal.content.videoRecording?.cameraCount).toBe(3);
    expect(result.proposal.content.venueTechnical?.powerDropCount).toBe(2);
    expect(result.proposal.content.vendorCoordination?.coVendors?.[0].category).toBe(
      "in_house_venue_av",
    );
    expect(result.proposal.content.confidentiality?.ndaRequired).toBe(true);
    expect(result.proposal.content.budgetPreferences?.proposalCount).toBe(4);
  });

  it("fails explicitly when required legacy content is absent", () => {
    const result = mapLegacyProposalToV1(
      { ...legacyProposal, contact: { contactFirstName: "Avery" } },
      { organizationId: "org-001" },
    );

    expect(result.success).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["/contact/contactLastName", "/contact/contactEmail"]),
    );
  });

  it("reports invalid legacy dates instead of guessing", () => {
    const result = mapLegacyProposalToV1(
      {
        ...legacyProposal,
        event: { ...legacyProposal.event, startDate: "October sometime" },
      },
      { organizationId: "org-001" },
    );

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/event/startDate", code: "invalid" }),
      ]),
    );
  });

  it("removes internal source references from the public projection", () => {
    const result = mapLegacyProposalToV1(legacyProposal, {
      organizationId: "org-001",
    });
    if (!result.success) throw new Error("Fixture must map successfully");

    result.proposal.content.sourceReferences = [
      {
        sourceId: "source-001",
        sourceVersionId: "source-version-001",
        category: "brief",
        displayName: "Confidential event brief",
      },
    ];

    const publicProposal = toPublicProposalV1(
      result.proposal,
      "2026-07-16T01:00:00.000Z",
    );

    expect(publicProposal).not.toHaveProperty("organizationId");
    expect(publicProposal.content).not.toHaveProperty("sourceReferences");
  });
});

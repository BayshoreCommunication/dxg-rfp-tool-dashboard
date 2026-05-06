const ProposalData = () => {
  const testData = {
    _id: "69f99123a9a55445cb36d52d",
    userId: "69d63064e3d63526bc3c44c1",
    status: "submitted",
    isActive: true,
    isFavorite: false,
    isAccepted: false,
    isOpen: true,
    viewsCount: 2,
    templateId: "template-two",
    event: {
      eventName: "Global Innovation Summit 2026",
      startDate: "2026-03-10",
      endDate: "2026-03-12",
      venue: "Las Vegas Convention Center",
      attendees: "1,000+",
      eventFormat: "Hybrid",
      eventType: {
        eventType: "Other",
        eventTypeOther: "",
      },
    },
    roomByRoom: {
      roomFunction: "Keynote Pavilion",
      estimatedAttendeesInRoom: "1000",
      loadInDateTime: "2026-03-09T08:00:00",
      rehearsalDateTime: "2026-03-09T16:00:00",
      showStartDateTime: "2026-03-10T09:00:00",
      showEndDateTime: "2026-03-12T18:00:00",
      audioSystemForHowManyPpl: "1000",
      podiumMic: "Yes",
      wirelessMics: {
        "0": "Y",
        "1": "e",
        "2": "s",
        wirelessMicsQty: "",
        wirelessMicsType: "",
      },
      audioRecording: "",
      largeMonitorsOrScreenProjector: {
        "0": "Y",
        "1": "e",
        "2": "s",
        largeMonitorsQty: "",
      },
      ledWall: "Yes",
      clientProvideOwnPresentationLaptop: {
        "0": "N",
        "1": "o",
        clientLaptopQty: "",
      },
      presentationLaptops: {
        "0": "Y",
        "1": "e",
        "2": "s",
        presentationLaptopQty: "",
      },
      videoPlayback: {
        "0": "Y",
        "1": "e",
        "2": "s",
        videoPlaybackCount: "",
      },
      videoFormatAspectRatio: "16:9 format",
      audienceQa: {
        audienceQa: "Yes",
        audienceQaMethod: "",
      },
      cameras: {
        "0": "Y",
        "1": "e",
        "2": "s",
        camerasQty: "",
      },
      videoRecording: {
        videoRecording: "Yes",
        videoRecordingType: "",
      },
      stageWashLighting: {
        stageWashLighting: "Yes",
        stageWashLightingStageSize: "120ft x 40ft stage, full front wash",
      },
      backlightingFor: "Yes",
      drapeOrScenicUplighting: "Yes",
      audienceLighting: "Yes",
      programConfidenceMonitor: {
        programConfidenceMonitor: "Yes",
        programConfidenceMonitorQty: "2",
      },
      notesConfidenceMonitor: {
        notesConfidenceMonitor: "Yes",
        notesConfidenceMonitorQty: "2",
      },
      speakerTimer: "Yes",
      scenicStageDesign: "Yes",
      contentVideoNeeds: "",
      podiumMicQty: "2",
      wirelessMicsQty: "8",
      largeMonitorsQty: "6",
      presentationLaptopQty: "3",
      videoPlaybackCount: "5",
      audienceQaMethod: "Assisted Mics",
      camerasQty: "3",
      videoRecordingType: "ISO Record",
      stageWashLightingStageSize: "120ft x 40ft stage, full front wash",
      programConfidenceMonitorQty: "2",
      notesConfidenceMonitorQty: "2",
      stageDimensions: "120ft x 40ft",
      confidenceMonitor: "Yes",
      confidenceMonitorCount: "2",
    },
    production: {
      scenicStageDesign: "Yes",
      unionLabor: "Not Sure",
      showCrewNeeded: [
        "A1 (AUDIO)",
        "A2 (AUDIO ASSIST)",
        "V1 (VIDEO)",
        "V2 (VIDEO ASSIST)",
        "TD (TECHNICAL DIRECTOR)",
        "L1 (LIGHTING)",
        "GRAPHICS OP",
        "CAMERA OPERATOR",
        "SHOWCALLER",
        "PRODUCER",
      ],
      otherRolesNeeded:
        "We will need bilingual teleprompter operators (English/Spanish) and 4 dedicated breakout room managers.",
    },
    venue: {
      needRiggingForFlown: {
        needRiggingForFlown: "YES",
        riggingPlotOrSpecs:
          "High steel rigging required. Max weight per point is 1500 lbs. Motors provided by venue.",
      },
      needDedicatedPowerDrops: {
        needDedicatedPowerDrops: "YES",
        standardAmpWall: "400A",
      },
      powerDropsHowMany: "12",
    },
    uploads: {
      supportDocuments: [],
      reviewExistingAvQuote: {
        reviewExistingAvQuote: "NO",
        avQuoteFiles: [],
      },
    },
    budget: {
      estimatedAvBudget: "$50-100K",
      budgetCustomAmount: "",
      proposalFormatPreferences: [
        "GEAR ITEMIZATION",
        "LABOR BREAKDOWN",
        "ALL-IN ESTIMATE",
      ],
      timelineForProposal: "2 Weeks",
      callWithDxgProducer: "YES",
      howDidYouHear: "LinkedIn",
      howDidYouHearOther: "",
    },
    contact: {
      contactFirstName: "Sarah",
      contactLastName: "Jennings",
      contactTitle: "VP of Global Conferences",
      contactOrganization: "Apex Dynamics",
      contactEmail: "s.jennings@apexdynamics.com",
      contactPhone: "+1 (415) 555-8821",
      anythingElse:
        "Please ensure the proposal includes line-item pricing for the curved LED wall separately from the main gear package. We are comparing 3 vendors.",
    },
    createdAt: "2026-05-05T06:41:39.634Z",
    updatedAt: "2026-05-05T06:55:01.707Z",
    proposalSetting: {
      branding: {
        brandName: "",
        linkPrefix: "",
        defaultFont: "Poppins",
        signatureColor: "#2DC6F5",
        logoFile: null,
      },
      proposals: {
        proposalLanguage: "English",
        defaultCurrency: "$",
        expiryDate: "None",
        priceSeparator: "NONE",
        dateFormat: "MM/DD/YYYY",
        decimalPrecision: "2",
        contacts: {
          email: {
            enabled: true,
            value: "",
          },
          call: {
            enabled: false,
            value: "",
          },
        },
        downloadPreview: "Yes",
        teammateEmail: "",
      },
      signatures: {
        signatureType: "Upload",
        signatureImageUrl: "",
        signatureText: "",
        signatureStyle: "",
      },
    },
    proposalSlug: "global-innovation-summit-2026-69f99123a9a55445cb36d52d",
    proposalLink:
      "https://dxg-rfp-tool-dashboard.vercel.app/proposal/global-innovation-summit-2026-69f99123a9a55445cb36d52d",
    publicProposalLink:
      "https://abuco.goprospero.com/proposal/global-innovation-summit-2026-69f99123a9a55445cb36d52d?source=public",
  };

  return <div>ProposalData</div>;
};

export default ProposalData;

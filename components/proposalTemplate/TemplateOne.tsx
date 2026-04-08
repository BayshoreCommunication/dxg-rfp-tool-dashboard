import Footer from "./TemplateOne/Footer";
import Step1EventOverview from "./TemplateOne/Step1EventOverview";
import Step2RoombyRoomAVNeeds from "./TemplateOne/Step2RoombyRoomAVNeeds";
import Step3ProductionSupportCrew from "./TemplateOne/Step3ProductionSupportCrew";
import Step4VenueEechnicalRequirements from "./TemplateOne/Step4VenueEechnicalRequirements";
import Step5UploadsReferenceMaterials from "./TemplateOne/Step5UploadsReferenceMaterials";
import Step6BudgetProposalPreferences from "./TemplateOne/Step6BudgetProposalPreferences";
import Step7ContactInfo from "./TemplateOne/Step7ContactInfo";

/**
 * TemplateOne: Global Innovation Summit 2026
 * A comprehensive RFP/Proposal template for high-end corporate events.
 */
export type TemplateOneData = {
  badge?: string;
  brandName?: string;
  titleLineOne?: string;
  titleLineTwo?: string;
  heroText?: string;
  metaChips?: string[];
  ctaPrimary?: string;
  ctaSecondary?: string;
  aboutTitle?: string;
  aboutText?: string;
  summaryBullets?: string[];
  servicesTitle?: string;
  services?: Array<{ title: string; text: string }>;
  pricingTitle?: string;
  pricing?: Array<{ name: string; price: string; bullets: string[] }>;
  closingTitle?: string;
  closingSubtitle?: string;
  brandAddress?: string;
  brandEmail?: string;
  contactName?: string;
  contactPhone?: string;
  additionalNotes?: string;
  budgetDisplay?: string;
  proposalFormats?: string[];
  crewRoles?: string[];
  scenicStageDesignLabel?: string;
  unionLaborLabel?: string;
  riggingMaxPointWeight?: string;
  riggingMethod?: string;
  powerDropsLabel?: string;
  ampWallLabel?: string;
  avGroups?: Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }>;
  ledHeadline?: string;
  ledDescription?: string;
  ledTags?: string[];
  signatureTitle?: string;
  signatureName?: string;
  signatureRole?: string;
  signatureDate?: string;
  signatureImageUrl?: string;
  signatureText?: string;
  signatureStyle?: string;
  signatureColor?: string;
  createdAt?: string;
  proposalSetting?: {
    branding?: {
      brandName?: string;
      linkPrefix?: string;
      defaultFont?: string;
      signatureColor?: string;
      logoFile?: string | null;
    };
    proposals?: {
      proposalLanguage?: string;
      defaultCurrency?: string;
      expiryDate?: string;
      priceSeparator?: string;
      dateFormat?: string;
      decimalPrecision?: string;
      downloadPreview?: string;
      teammateEmail?: string;
      contacts?: {
        email?: { enabled?: boolean; value?: string };
        call?: { enabled?: boolean; value?: string };
      };
    };
    signatures?: {
      signatureType?: string;
      signatureImageUrl?: string;
      signatureText?: string;
      signatureStyle?: string;
    };
  };
  uploads?: {
    supportDocuments?: string[];
    reviewExistingAvQuote?: {
      reviewExistingAvQuote?: string;
      avQuoteFiles?: string[];
    };
  };
  budget?: {
    estimatedAvBudget?: string;
    proposalFormatPreferences?: string[];
    timelineForProposal?: string;
    callWithDxgProducer?: string;
  };
  roomByRoom?: Record<string, unknown>;
  production?: Record<string, unknown>;
  venue?: Record<string, unknown>;
};

export default function TemplateOne({
  proposalData,
  rawProposal,
  fontFamily = "Poppins",
}: {
  proposalData?: Partial<TemplateOneData>;
  rawProposal?: any;
  fontFamily?: "Inter" | "Poppins" | "Roboto";
}) {
  console.log("check data value item", proposalData);

  return (
    <div
      className="proposal-print-root antialiased text-slate-900 text-[17px] md:text-[18px]"
      style={{
        fontFamily: `var(--proposal-font-family, "${fontFamily}", var(--font-sans))`,
      }}
    >
      <style jsx global>{`
        .proposal-print-root,
        .proposal-print-root * {
          font-family: var(
            --proposal-font-family,
            "${fontFamily}",
            var(--font-sans)
          ) !important;
        }

        .proposal-print-root .signature-draw-text {
          font-family: var(
            --proposal-signature-font-family,
            var(--proposal-font-family, "${fontFamily}", var(--font-sans))
          ) !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            background: #fff !important;
          }

          .proposal-print-root * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .proposal-print-root section {
            min-height: auto !important;
            height: auto !important;
            padding-top: 24px !important;
            padding-bottom: 24px !important;
            overflow: visible !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .proposal-print-root .pointer-events-none,
          .proposal-print-root [class*="backdrop-blur"],
          .proposal-print-root [class*="blur-"] {
            display: none !important;
          }

          .proposal-print-root [class*="shadow"] {
            box-shadow: none !important;
          }
        }
      `}</style>
      {/* --- STEP 1: EVENT OVERVIEW (HERO) --- */}

      <Step1EventOverview proposalData={proposalData} />

      {/* --- STEP 2: ROOM-BY-ROOM AV NEEDS --- */}

      <Step2RoombyRoomAVNeeds proposalData={rawProposal?.roomByRoom || proposalData?.roomByRoom} />

      {/* --- STEP 3: PRODUCTION & CREW (NEW PRIMARY BG SECTION) --- */}
      <Step3ProductionSupportCrew proposalData={rawProposal?.production || proposalData?.production} />

      {/* --- STEP 4: RIGGING & POWER --- */}

      <Step4VenueEechnicalRequirements proposalData={rawProposal?.venue || proposalData?.venue} />

      {/* --- STEP 5: UPLOADS & REFERENCE MATERIALS --- */}
      <Step5UploadsReferenceMaterials proposalData={rawProposal?.uploads || proposalData?.uploads} />

      {/* --- STEP 6: BUDGET & TIMELINE --- */}

      <Step6BudgetProposalPreferences proposalData={rawProposal?.budget || proposalData?.budget} />

      {/* --- STEP 7: CONTACT & FOOTER --- */}

      <Step7ContactInfo proposalData={rawProposal?.contact || proposalData} />

      {/* <Footer /> */}
      <Footer proposalData={proposalData} fontFamily={fontFamily} />
    </div>
  );
}

import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import ProposalRfpTemplate from "@/components/proposalTemplate/ProposalRfpTemplate";
import type { ProposalSettings, UploadsData } from "../AddNewProposal";
import UploadsReferenceMaterials from "./UploadsReferenceMaterials";

jest.mock("@/app/actions/proposals", () => ({
  uploadProposalFilesAction: jest.fn(),
}));

const settings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: {},
} as ProposalSettings;

const uploads: UploadsData = {
  brandGuideFiles: [],
  brandGuideUrl: "",
  eventLogoFiles: [],
  referenceFiles: ["legacy-support.pdf"],
  referenceUrls: [],
  venueDocs: [],
  scenicInspirationFiles: ["scenic-mood-board.pdf"],
  venueCoiFiles: ["venue-coi.pdf"],
  coVendors: {
    inHouseVenueAv: { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
    eventDecorator: { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
    registrationTech: { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
    agencyOfRecord: { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
    photographer: { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" },
  },
  ndaRequired: "",
  ndaType: "",
  ndaDocumentFiles: [],
};

describe("categorized reference materials", () => {
  it("renders scenic and venue/COI files in separate labeled groups while retaining legacy files", () => {
    render(
      <UploadsReferenceMaterials
        data={uploads}
        onChange={jest.fn()}
        onContinue={jest.fn()}
        onBack={jest.fn()}
        proposalSettings={settings}
      />,
    );

    expect(screen.getByText("Scenic Inspirations")).toBeInTheDocument();
    expect(screen.getByText("Venue / COI Documents")).toBeInTheDocument();
    expect(screen.getByText("scenic-mood-board.pdf")).toBeInTheDocument();
    expect(screen.getByText("venue-coi.pdf")).toBeInTheDocument();
    expect(screen.getByText("legacy-support.pdf")).toBeInTheDocument();
  });

  it("includes categorized filenames in generated RFP output", () => {
    const html = renderToStaticMarkup(<ProposalRfpTemplate proposal={{
      uploads,
      event: { eventName: "Categorized Files Test" },
      roomByRoom: [],
    }} />);

    expect(html).toContain("Scenic Inspirations");
    expect(html).toContain("scenic-mood-board.pdf");
    expect(html).toContain("Venue / COI Documents");
    expect(html).toContain("venue-coi.pdf");
  });
});

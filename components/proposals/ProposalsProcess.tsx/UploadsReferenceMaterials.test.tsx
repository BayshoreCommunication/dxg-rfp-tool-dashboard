import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import { uploadProposalFilesAction } from "@/app/actions/proposals";
import ProposalRfpTemplate from "@/components/proposalTemplate/ProposalRfpTemplate";
import type { ProposalSettings, UploadsData } from "../AddNewProposal";
import UploadsReferenceMaterials, { UploadBox } from "./UploadsReferenceMaterials";

jest.mock("@/app/actions/proposals", () => ({
  uploadProposalFilesAction: jest.fn(),
}));

const uploadFilesMock = jest.mocked(uploadProposalFilesAction);
const uploadResult = (supportDocumentUrls: string[] = []) => ({
  success: true,
  supportDocumentUrls,
  avQuoteFileUrls: [],
  scenicInspirationFileUrls: [],
  venueCoiFileUrls: [],
});

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
  it("focuses the scenic upload when opened from Section 2B", () => {
    Element.prototype.scrollIntoView = jest.fn();
    const { container } = render(
      <UploadsReferenceMaterials
        data={uploads}
        onChange={jest.fn()}
        onContinue={jest.fn()}
        onBack={jest.fn()}
        proposalSettings={settings}
        focusTarget="scenic_inspiration"
      />,
    );

    const scenicInput = container.querySelector<HTMLInputElement>(
      "#scenic-inspirations input[type=file]",
    );
    expect(scenicInput).not.toBeNull();
    expect(document.activeElement).toBe(scenicInput);
  });

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

  it("does not create a nearly empty reference page for NDA status alone", () => {
    const html = renderToStaticMarkup(<ProposalRfpTemplate proposal={{
      uploads: { ...uploads, referenceFiles: [], scenicInspirationFiles: [], venueCoiFiles: [], ndaRequired: "YES", ndaType: "one_way" },
      event: { eventName: "NDA Only Test" },
      roomByRoom: [],
    }} />);

    expect(html).not.toContain("Reference Materials &amp; Co-Vendor Coordination");
    expect(html).toContain("NDA Requirement");
  });

  it("numbers only the pages that are actually rendered", () => {
    const html = renderToStaticMarkup(<ProposalRfpTemplate proposal={{
      uploads: { ...uploads, referenceFiles: [], scenicInspirationFiles: [], venueCoiFiles: [], ndaRequired: "YES" },
      event: { eventName: "Sequential Pages", eventFormat: "In-Person" },
      roomByRoom: [{ roomFunction: "General Session" }],
    }} />);
    const pageNumbers = [...html.matchAll(/Page (\d+)/g)].map((match) => Number(match[1]));

    expect(pageNumbers).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("UploadBox", () => {
  beforeEach(() => {
    uploadFilesMock.mockReset();
  });

  it("shows a distinct drag target and documents file constraints", () => {
    render(
      <UploadBox
        files={[]}
        onFiles={jest.fn()}
        accept=".pdf,.png"
        hint="PDF or PNG"
        maxFiles={3}
        maxSizeMb={10}
      />,
    );

    const dropzone = screen.getByTestId("file-dropzone");
    expect(screen.getByRole("button", { name: /choose files/i })).toBeInTheDocument();
    expect(screen.getByText("Maximum 10 MB per file · 3 files total")).toBeInTheDocument();

    fireEvent.dragEnter(dropzone);
    expect(screen.getByText("Release files to upload")).toBeInTheDocument();

    fireEvent.dragLeave(dropzone, { relatedTarget: document.body });
    expect(screen.getByText("Drop files here or click to browse")).toBeInTheDocument();
  });

  it("rejects unsupported files inline before calling the upload action", async () => {
    render(
      <UploadBox files={[]} onFiles={jest.fn()} accept=".pdf" hint="PDF only" maxFiles={1} />,
    );

    fireEvent.drop(screen.getByTestId("file-dropzone"), {
      dataTransfer: { files: [new File(["bad"], "malware.exe", { type: "application/x-msdownload" })] },
    });

    expect(await screen.findByText(/file type is not supported/i)).toBeInTheDocument();
    expect(uploadFilesMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /remove malware.exe/i })).toBeInTheDocument();
  });

  it("shows upload success and adds the returned URL", async () => {
    const onFiles = jest.fn();
    uploadFilesMock.mockResolvedValue(uploadResult(["https://cdn.example.com/brief.pdf"]));
    render(<UploadBox files={[]} onFiles={onFiles} accept=".pdf" hint="PDF only" />);

    fireEvent.drop(screen.getByTestId("file-dropzone"), {
      dataTransfer: { files: [new File(["brief"], "brief.pdf", { type: "application/pdf" })] },
    });

    expect(await screen.findByText(/uploaded successfully/i)).toBeInTheDocument();
    expect(onFiles).toHaveBeenCalledWith(["https://cdn.example.com/brief.pdf"]);
  });

  it("lets a user retry a failed upload", async () => {
    const onFiles = jest.fn();
    uploadFilesMock
      .mockResolvedValueOnce({ ...uploadResult(), success: false, message: "Temporary upload error" })
      .mockResolvedValueOnce(uploadResult(["https://cdn.example.com/recovered.pdf"]));
    render(<UploadBox files={[]} onFiles={onFiles} accept=".pdf" hint="PDF only" />);

    fireEvent.drop(screen.getByTestId("file-dropzone"), {
      dataTransfer: { files: [new File(["brief"], "recover.pdf", { type: "application/pdf" })] },
    });

    expect(await screen.findByText("Temporary upload error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry recover.pdf/i }));

    await waitFor(() => expect(onFiles).toHaveBeenCalledWith(["https://cdn.example.com/recovered.pdf"]));
    expect(screen.getByText(/uploaded successfully/i)).toBeInTheDocument();
  });
});

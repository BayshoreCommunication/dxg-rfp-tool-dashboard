import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ProposalSettings, UploadsData } from "../AddNewProposal";
import { buttonsInsideLabels, danglingReferences, duplicateIds } from "./a11yHelpers";
import UploadsReferenceMaterials from "./UploadsReferenceMaterials";

jest.mock("@/lib/proposals/uploadProposalFiles", () => ({ uploadProposalFiles: jest.fn() }));

const settings = { branding: { linkPrefix: "", defaultFont: "Inter" }, proposals: {} } as ProposalSettings;
const blankVendor = { companyName: "", contactName: "", contactEmail: "", contactPhone: "", status: "", notes: "" };
const uploads = (overrides: Partial<UploadsData> = {}): UploadsData => ({
  brandGuideFiles: [], brandGuideUrl: "", eventLogoFiles: [], referenceFiles: [], referenceUrls: [], venueDocs: [],
  scenicInspirationFiles: [], venueCoiFiles: [],
  coVendors: { inHouseVenueAv: blankVendor, eventDecorator: blankVendor, registrationTech: blankVendor, agencyOfRecord: blankVendor, photographer: blankVendor },
  ndaRequired: "", ndaType: "", ndaDocumentFiles: [], ...overrides,
});

const renderStep = (overrides: Partial<UploadsData> = {}, showErrors = true) =>
  render(
    <UploadsReferenceMaterials
      data={uploads(overrides)}
      onChange={jest.fn()}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors={showErrors}
      proposalSettings={settings}
    />,
  );

describe("UploadsReferenceMaterials accessibility wiring", () => {
  test("each upload area is a named group and its button says what it uploads", () => {
    renderStep();
    for (const name of [/Brand Guide \/ Style Guide/, /Event Logo Files/, /Reference \/ Inspiration Materials/, /Scenic Inspirations/, /Venue Documents/, /Venue \/ COI Documents/]) {
      const group = screen.getByRole("group", { name });
      expect(within(group).getByRole("button", { name: /Choose files/ })).toHaveAccessibleDescription(name);
    }
  });

  test("the brand-guide URL is reachable by its label", () => {
    renderStep();
    expect(screen.getByLabelText(/Brand Guide URL/)).toBeInTheDocument();
  });

  test("the NDA question is a named group exposing the answer, and the NDA upload is named", () => {
    renderStep({ ndaRequired: "YES" });
    const nda = screen.getByRole("group", { name: /NDA Required Before Sharing Proposal/ });
    expect(within(nda).getByRole("button", { name: /Yes/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: /NDA Document Upload/ })).toBeInTheDocument();
  });

  test("reference URL rows have distinct accessible names", async () => {
    renderStep({ referenceUrls: [{ url: "https://a.example", label: "" }, { url: "https://b.example", label: "" }] });
    expect(screen.getByRole("textbox", { name: "Reference URL 1" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Reference URL 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove reference URL 2" })).toBeInTheDocument();
  });

  test("co-vendor cards open with labelled, uniquely identified fields", async () => {
    renderStep();
    const toggles = screen.getAllByRole("button").filter((b) => /Venue AV|Decorator|Registration|Agency|Photographer/i.test(b.textContent ?? ""));
    expect(toggles.length).toBeGreaterThan(1);
    await userEvent.click(toggles[0]);
    await userEvent.click(toggles[1]);
    expect(screen.getAllByLabelText("Company Name")).toHaveLength(2);
    expect(duplicateIds()).toEqual([]);
  });

  test("no dangling references, duplicate ids or buttons inside labels", () => {
    renderStep({ ndaRequired: "YES", referenceUrls: [{ url: "https://a.example", label: "" }] });
    expect(danglingReferences()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
    expect(buttonsInsideLabels()).toBe(0);
  });
});

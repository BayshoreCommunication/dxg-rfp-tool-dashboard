import { render, screen, within } from "@testing-library/react";
import type { VendorSubmissionDetail, VendorSubmissionVersion } from "@/app/actions/vendorResponse";
import VendorResponseDocument from "./VendorResponseDocument";

const usd = (amountMinor: number) => ({ amountMinor, currency: "USD" });

const version = (overrides: Partial<VendorSubmissionVersion> = {}) =>
  ({
    versionId: "6afbea9f40de5226888ca3c8",
    versionNumber: 2,
    receivedAt: "2026-11-17T05:48:00.000Z",
    vendorName: "Apex AV",
    submittedBy: "Maya Torres",
    email: "maya@apex.example",
    manifestChecksum: "a".repeat(64),
    documents: [],
    questionnaire: {
      context: { proposalTitle: "Northstar Summit", venueName: "Lakeside Grand", venueLocation: "Chicago", plannerOrganizationName: "Lang and Bradley", currency: "USD", decimalPrecision: 2 },
      rooms: [{ roomId: "r1", name: "Ballroom", specs: [{ specId: "s1", label: "LED wall", requirementText: "16:9 LED wall" }] }],
      crew: { roles: [{ id: "td", label: "Technical Director" }] },
      pricing: { equipmentCategories: [{ id: "audio", label: "Audio" }], feeLines: [{ feeId: "svc", label: "Service charge", kind: "fee" }, { feeId: "tax", label: "Sales tax", kind: "tax" }] },
      documents: { categories: [] },
      companyProfile: { clientMix: { categories: [] } },
      acknowledgements: [],
    },
    structuredResponse: {
      companyProfile: { legalName: "Apex Audio Visual LLC", headquarters: "Chicago", largestComparableEvent: "", clientMix: [] },
      platformIntegrationPlan: "",
      rooms: [{ roomId: "r1", specResponses: [{ specId: "s1", status: "substitute", note: "Using 4K projection" }], equipmentLines: [], categoryTotals: [], laborLines: [], laborSubtotal: usd(0) }],
      crew: [],
      travel: { lodgingRequests: [] },
      pricing: { travelSubtotal: usd(0), fees: [{ feeId: "svc", amount: usd(40000) }, { feeId: "tax", amount: usd(12345) }], discount: usd(0), assumptionsExclusions: [] },
      alternates: [],
      references: [],
      acknowledgements: [],
      valueAdds: "",
    },
    calculationSnapshot: {
      currency: "USD",
      roomTotals: [{ roomId: "r1", equipmentSubtotalMinor: 0, laborSubtotalMinor: 0, roomTotalMinor: 0 }],
      equipmentSubtotalMinor: 0, laborSubtotalMinor: 0, travelSubtotalMinor: 0, feeSubtotalMinor: 40000, taxSubtotalMinor: 12345, discountMinor: 0,
      grandTotalMinor: 52345, requestedRoomNights: 0,
      specCounts: { total: 1, answered: 1, comply: 0, substitute: 1, exception: 0 },
      completion: { percent: 100 },
    },
    ...overrides,
  }) as unknown as VendorSubmissionVersion;

const detail = { response: { vendorName: "Apex AV", proposalTitle: "Northstar Summit" } } as unknown as VendorSubmissionDetail;

describe("VendorResponseDocument", () => {
  it("heads the document with the same vendor name and totals the detail view shows", () => {
    render(<VendorResponseDocument detail={detail} version={version()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Apex AV");
    expect(screen.getByText("Response to Northstar Summit | Lang and Bradley | Lakeside Grand, Chicago")).toBeInTheDocument();
    expect(screen.getAllByText("$523.45").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Version 2 · Record 888ca3c8/)).toBeInTheDocument();
  });

  it("lists fee and tax lines by their questionnaire labels and the spec answer with its note", () => {
    render(<VendorResponseDocument detail={detail} version={version()} />);
    const pricing = screen.getByRole("heading", { name: /Pricing summary/ }).closest("section")!;
    expect(within(pricing).getByText("Service charge")).toBeInTheDocument();
    expect(within(pricing).getByText("$123.45")).toBeInTheDocument();
    expect(screen.getByText("Using 4K projection")).toBeInTheDocument();
    expect(screen.getByText("substitute")).toBeInTheDocument();
  });

  it("says when optional sections are empty instead of leaving gaps", () => {
    render(<VendorResponseDocument detail={detail} version={version()} />);
    expect(screen.getByText("No crew listed.")).toBeInTheDocument();
    expect(screen.getByText("No alternates were proposed.")).toBeInTheDocument();
    expect(screen.getByText("No documents attached.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Value-adds/ })).toBeNull();
  });

  it("renders nothing for a legacy response without structured data", () => {
    const { container } = render(<VendorResponseDocument detail={detail} version={version({ structuredResponse: null })} />);
    expect(container).toBeEmptyDOMElement();
  });
});

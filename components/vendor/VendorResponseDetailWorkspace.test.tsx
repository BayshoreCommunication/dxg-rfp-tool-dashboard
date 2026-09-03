import { fireEvent, render, screen, within } from "@testing-library/react";
import type { VendorSubmissionDetail } from "@/app/actions/vendorResponse";
import VendorResponseDetailWorkspace from "./VendorResponseDetailWorkspace";

jest.mock("./VendorFactsSection", () => ({
  __esModule: true,
  default: ({ versionId }: { versionId: string }) => (
    <div data-testid="facts">Facts {versionId}</div>
  ),
}));

const detail: VendorSubmissionDetail = {
  historyTruncated: false,
  response: {
    _id: "response-1",
    proposalId: "proposal-1",
    proposalOwnerId: "owner-1",
    proposalTitle: "Annual Summit",
    vendorName: "Apex Events",
    submittedBy: "Alex",
    email: "alex@example.com",
    message: "Latest",
    documents: [],
    isRead: true,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  submission: {
    submissionId: "submission-1",
    status: "active",
    currentVersionId: "version-2",
    currentVersionNumber: 2,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  versions: [
    {
      versionId: "version-2",
      versionNumber: 2,
      parentVersionId: "version-1",
      reason: "clarification_response",
      sourceSystem: "public_portal",
      receivedAt: "2026-08-02T10:00:00.000Z",
      manifestChecksum: "b".repeat(64),
      vendorName: "Apex Events",
      submittedBy: "Alex",
      email: "alex@example.com",
      message: "Clarification supplied.",
      documents: [
        {
          name: "clarification.pdf",
          url: "https://files.example/clarification.pdf",
          documentId: "doc-2",
          sourceId: "source-2",
          sha256: "c".repeat(64),
          sizeBytes: 2048,
          scanStatus: "clean",
          mimeType: "application/pdf",
          inheritedFromVersionId: null,
        },
      ],
    },
    {
      versionId: "version-1",
      versionNumber: 1,
      parentVersionId: null,
      reason: "initial",
      sourceSystem: "public_portal",
      receivedAt: "2026-08-01T10:00:00.000Z",
      manifestChecksum: "a".repeat(64),
      vendorName: "Apex Events",
      submittedBy: "Alex",
      email: "alex@example.com",
      message: "Initial response.",
      documents: [
        {
          name: "legacy.pdf",
          url: "https://files.example/legacy.pdf",
          documentId: "doc-1",
          sourceId: "source-1",
          sha256: null,
          sizeBytes: null,
          scanStatus: "legacy_unknown",
          mimeType: "application/pdf",
          inheritedFromVersionId: null,
        },
      ],
    },
  ],
};

it("renders a keyboard-operable version timeline", () => {
  render(<VendorResponseDetailWorkspace detail={detail} />);
  const timeline = screen.getByRole("navigation", {
    name: "Immutable response versions",
  });
  expect(
    within(timeline).getByRole("button", { name: /Version 2/ }),
  ).toHaveAttribute("aria-current", "true");
  expect(screen.getAllByText("Clarification response")).toHaveLength(1);
  expect(screen.getByText(/Security scan passed/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Open requirements checklist" })).not.toBeInTheDocument();
  // "Files read" is no longer shown on the response page.
  expect(screen.queryByTestId("extraction")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to proposal responses" })).toHaveAttribute(
    "href",
    "/vendor-responses/proposals/proposal-1",
  );
});

it("drops the version sidebar when only one version exists", () => {
  const current = detail.versions.find((version) => version.versionId === detail.submission?.currentVersionId)!;
  render(
    <VendorResponseDetailWorkspace
      detail={{ ...detail, versions: [current] }}
    />,
  );
  expect(
    screen.queryByRole("navigation", { name: "Immutable response versions" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/The only version received so far/)).toBeInTheDocument();
  // Scoring no longer lives on the response page; it happens in Proposal Intelligence.
  expect(screen.queryByTestId("evaluation")).not.toBeInTheDocument();
  // Numbering only earns its place once there is something to number.
  expect(screen.getByRole("heading", { name: "Response as received" })).toBeInTheDocument();
  expect(screen.getByText("Files included with this response.")).toBeInTheDocument();
  expect(screen.getByText(/RFPilot read this response's files once/)).toBeInTheDocument();
  expect(screen.queryByText(/Version 1/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Version 2/)).not.toBeInTheDocument();
});

it("keeps numbered labels once a second version exists", () => {
  render(<VendorResponseDetailWorkspace detail={detail} />);
  expect(screen.getByRole("heading", { name: "Version 2" })).toBeInTheDocument();
  expect(screen.getByText("Files included with Version 2.")).toBeInTheDocument();
  expect(screen.getByText(/RFPilot read Version 2's files once/)).toBeInTheDocument();
});

it("switches to historical content without representing an unverified file as analyzed", () => {
  render(<VendorResponseDetailWorkspace detail={detail} />);
  fireEvent.click(screen.getByRole("button", { name: /Version 1/ }));
  expect(screen.getByText("Historical, superseded")).toBeInTheDocument();
  expect(screen.getByText("Initial response.")).toBeInTheDocument();
  expect(
    screen.getByText(/Security scan pending/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/isn’t included in the analysis/),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Score this response/)).not.toBeInTheDocument();
});

it("does not invent version history for an unversioned legacy response", () => {
  render(
    <VendorResponseDetailWorkspace
      detail={{ ...detail, submission: null, versions: [] }}
    />,
  );
  expect(screen.getByText("Version history unavailable")).toBeInTheDocument();
  expect(screen.getByText(/predates version tracking/)).toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "Immutable response versions" }),
  ).not.toBeInTheDocument();
});

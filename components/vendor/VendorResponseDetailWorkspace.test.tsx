import { fireEvent, render, screen, within } from "@testing-library/react";
import type { VendorSubmissionDetail } from "@/app/actions/vendorResponse";
import VendorResponseDetailWorkspace from "./VendorResponseDetailWorkspace";

jest.mock("./VendorExtractionSection", () => ({
  __esModule: true,
  default: ({ versionId }: { versionId: string }) => (
    <div data-testid="extraction">Extraction {versionId}</div>
  ),
}));
jest.mock("./VendorFactsSection", () => ({
  __esModule: true,
  default: ({ versionId }: { versionId: string }) => (
    <div data-testid="facts">Facts {versionId}</div>
  ),
}));
jest.mock("./VendorEvaluationSection", () => ({
  __esModule: true,
  default: ({ versionId }: { versionId: string }) => (
    <div data-testid="evaluation">Evaluation {versionId}</div>
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

it("renders a keyboard-operable immutable timeline and current receipt lineage", () => {
  render(<VendorResponseDetailWorkspace detail={detail} />);
  const timeline = screen.getByRole("navigation", {
    name: "Immutable response versions",
  });
  expect(
    within(timeline).getByRole("button", { name: /Version 2/ }),
  ).toHaveAttribute("aria-current", "true");
  expect(screen.getAllByText("Clarification response")).toHaveLength(2);
  expect(
    screen.getByText(/records a clarification response linked/),
  ).toBeInTheDocument();
  expect(screen.getByText("Security scan passed")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Review proposal requirements" }),
  ).toHaveAttribute("href", "/proposals/proposal-1/intelligence/requirements?returnTo=%2Fvendor-responses%2Fresponse-1");
  expect(screen.getByTestId("extraction")).toHaveTextContent("version-2");
});

it("switches to historical content without representing an unverified file as analyzed", () => {
  render(<VendorResponseDetailWorkspace detail={detail} />);
  fireEvent.click(screen.getByRole("button", { name: /Version 1/ }));
  expect(screen.getByText("Historical, superseded")).toBeInTheDocument();
  expect(screen.getByText("Initial response.")).toBeInTheDocument();
  expect(
    screen.getByText("Analysis readiness not confirmed"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/must not be treated as extracted or analyzed evidence/),
  ).toBeInTheDocument();
  expect(screen.getByTestId("evaluation")).toHaveTextContent("version-1");
});

it("does not invent version history for an unversioned legacy response", () => {
  render(
    <VendorResponseDetailWorkspace
      detail={{ ...detail, submission: null, versions: [] }}
    />,
  );
  expect(screen.getByText("Immutable history unavailable")).toBeInTheDocument();
  expect(screen.getByText(/has not been reconstructed/)).toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "Immutable response versions" }),
  ).not.toBeInTheDocument();
});

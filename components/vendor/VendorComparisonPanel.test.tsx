import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import VendorComparisonPanel from "./VendorComparisonPanel";
import { cancelComparisonAction, getComparisonStatusAction, listComparisonsAction, retryComparisonAction, startComparisonAction, type ComparisonView } from "@/app/actions/comparisonOrchestration";
import type { VendorResponseItem } from "@/app/actions/vendorResponse";

jest.mock("@/app/actions/comparisonOrchestration", () => ({
  cancelComparisonAction: jest.fn(), getComparisonStatusAction: jest.fn(), listComparisonsAction: jest.fn(), retryComparisonAction: jest.fn(), startComparisonAction: jest.fn(),
}));
const list = listComparisonsAction as jest.MockedFunction<typeof listComparisonsAction>;
const start = startComparisonAction as jest.MockedFunction<typeof startComparisonAction>;
const status = getComparisonStatusAction as jest.MockedFunction<typeof getComparisonStatusAction>;

const response = (id: string, vendorName: string): VendorResponseItem => ({ _id: id, proposalId: "proposal-1", proposalOwnerId: "owner", proposalTitle: "Annual Conference", vendorName, submittedBy: vendorName, email: `${id}@example.com`, message: "Proposal", documents: [], isRead: true, createdAt: "2026-08-12", updatedAt: "2026-08-12", submissionId: `submission-${id}`, currentVersionId: `version-${id}`, currentVersionNumber: 1 });
const view: ComparisonView = {
  schemaVersion: "proposal-intelligence-comparison.v1",
  run: { runId: "run-1", status: "running", progress: 45, progressStage: "participant_snapshots", participantCount: 2, completedParticipantCount: 1, warnings: [], createdAt: "2026-08-12", completedAt: null },
  freshness: { state: "current", reasons: [] },
  participants: [
    { participantId: "p1", vendorLabel: "Vendor One", submissionId: "submission-1", versionId: "version-1", status: "succeeded", stage: "completed", warningCount: 0, safeErrorCode: null },
    { participantId: "p2", vendorLabel: "Vendor Two", submissionId: "submission-2", versionId: "version-2", status: "running", stage: "snapshot", warningCount: 0, safeErrorCode: null },
  ],
  jobs: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  list.mockResolvedValue({ success: true, data: [] });
  start.mockResolvedValue({ success: true, data: view });
  status.mockResolvedValue({ success: true, data: view });
  (cancelComparisonAction as jest.Mock).mockResolvedValue({ success: true, data: { runId: "run-1" } });
  (retryComparisonAction as jest.Mock).mockResolvedValue({ success: true, data: { runId: "run-1" } });
});

test("starts one frozen comparison with current vendor versions", async () => {
  render(<VendorComparisonPanel proposalId="proposal-1" responses={[response("1", "Vendor One"), response("2", "Vendor Two")]} requirementsApproved />);
  const button = await screen.findByRole("button", { name: "Start comparison (2)" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await waitFor(() => expect(start).toHaveBeenCalledWith("proposal-1", [
    { submissionId: "submission-1", versionId: "version-1" },
    { submissionId: "submission-2", versionId: "version-2" },
  ]));
});

test("restores persisted progress without showing an AI readiness score", async () => {
  list.mockResolvedValue({ success: true, data: [view] });
  render(<VendorComparisonPanel proposalId="proposal-1" responses={[response("1", "Vendor One"), response("2", "Vendor Two")]} requirementsApproved />);
  expect(await screen.findByText("1 of 2 vendor snapshots complete")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "45");
  expect(screen.queryByText(/readiness/i)).not.toBeInTheDocument();
  expect(screen.getByText(/eligibility gates produce an advisory ranking; the final vendor decision remains yours/i)).toBeInTheDocument();
});

test("labels stale runs as readable historical comparisons", async () => {
  list.mockResolvedValue({ success: true, data: [{ ...view, run: { ...view.run, status: "succeeded", progress: 100, completedParticipantCount: 2 }, freshness: { state: "stale", reasons: ["submission_version_available"] } }] });
  render(<VendorComparisonPanel proposalId="proposal-1" responses={[response("1", "Vendor One"), response("2", "Vendor Two")]} requirementsApproved />);
  expect(await screen.findByText(/Historical comparison/)).toBeInTheDocument();
  expect(screen.getByText(/Persisted result restored without rerunning analysis/)).toBeInTheDocument();
});

test("blocks comparison until the requirement registry is approved", async () => {
  render(<VendorComparisonPanel proposalId="proposal-1" responses={[response("1", "Vendor One"), response("2", "Vendor Two")]} requirementsApproved={false} />);

  const button = await screen.findByRole("button", { name: "Start comparison (2)" });
  await waitFor(() => expect(button).toBeDisabled());
  expect(screen.getByText("Approve the proposal requirement registry before starting a comparison.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open requirement registry" })).toHaveAttribute(
    "href",
    "/proposals/proposal-1/intelligence/requirements?returnTo=%2Fvendor-responses",
  );
  fireEvent.click(button);
  expect(start).not.toHaveBeenCalled();
});

test("blocks comparison while a selected vendor mapping is incomplete and unlocks on persisted readiness", async () => {
  render(<VendorComparisonPanel
    proposalId="proposal-1"
    responses={[response("1", "Vendor One"), response("2", "Vendor Two")]}
    requirementsApproved
    preparedResponseIds={["1"]}
  />);

  const button = await screen.findByRole("button", { name: "Start comparison (2)" });
  await waitFor(() => expect(button).toBeDisabled());
  expect(screen.getByText("1 selected vendor response needs requirement mapping before comparison.")).toBeInTheDocument();
  fireEvent(window, new CustomEvent("proposal-intelligence:readiness", { detail: { responseId: "2", ready: true } }));
  await waitFor(() => expect(button).toBeEnabled());
});

test("excludes an empty response instead of blocking prepared vendors", async () => {
  const empty = { ...response("3", "Empty Vendor"), message: "", documents: [] };
  render(<VendorComparisonPanel
    proposalId="proposal-1"
    responses={[response("1", "Vendor One"), response("2", "Vendor Two"), empty]}
    requirementsApproved
    preparedResponseIds={["1", "2"]}
  />);

  const button = await screen.findByRole("button", { name: "Start comparison (2)" });
  await waitFor(() => expect(button).toBeEnabled());
  expect(screen.getByText(/1 empty vendor response was excluded/i)).toBeInTheDocument();
  fireEvent.click(button);
  await waitFor(() => expect(start).toHaveBeenCalledWith("proposal-1", [
    { submissionId: "submission-1", versionId: "version-1" },
    { submissionId: "submission-2", versionId: "version-2" },
  ]));
});

test("prepares missing vendor evaluations automatically when comparison starts", async () => {
  render(<VendorComparisonPanel
    proposalId="proposal-1"
    responses={[response("1", "Vendor One"), response("2", "Vendor Two")]}
    requirementsApproved
    preparedResponseIds={["1", "2"]}
    comparisonReadyResponseIds={["1"]}
  />);

  const button = await screen.findByRole("button", { name: "Start comparison (2)" });
  await waitFor(() => expect(button).toBeEnabled());
  expect(screen.getByText("Evidence review and scorecards for 1 vendor will be prepared automatically when you start the comparison.")).toBeInTheDocument();
  fireEvent.click(button);
  await waitFor(() => expect(start).toHaveBeenCalled());
});

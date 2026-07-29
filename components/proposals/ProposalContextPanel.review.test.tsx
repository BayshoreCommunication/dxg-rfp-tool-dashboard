import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ProposalContextPanel from "./ProposalContextPanel";
import {
  applyCandidatesAction,
  getCandidateReviewAction,
  saveCandidateReviewAction,
} from "@/app/actions/candidateApplication";
import { getLatestProposalContextAction } from "@/app/actions/proposalContext";
import { listPrivateDocumentSources } from "@/app/actions/durableJobs";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));
jest.mock("@/app/actions/proposalContext", () => ({
  createProposalContextAction: jest.fn(),
  createSourceProposalContextAction: jest.fn(),
  getLatestProposalContextAction: jest.fn(),
  getProposalContextAction: jest.fn(),
}));
jest.mock("@/app/actions/durableJobs", () => ({
  getDurableJob: jest.fn(),
  listPrivateDocumentSources: jest.fn(),
}));
jest.mock("@/app/actions/candidateApplication", () => ({
  applyCandidatesAction: jest.fn(),
  getCandidateReviewAction: jest.fn(),
  saveCandidateReviewAction: jest.fn(),
}));

const proposalId = "64b000000000000000000001";
const runId = "019f7e39-7f34-7091-b415-6a57c06e7de1";
const operationId = "019f7e39-7f34-7091-b415-6a57c06e7de2";
const currentPath = "/content/event/name";

const mockedLatest = getLatestProposalContextAction as jest.MockedFunction<
  typeof getLatestProposalContextAction
>;
const mockedReview = getCandidateReviewAction as jest.MockedFunction<
  typeof getCandidateReviewAction
>;
const mockedSave = saveCandidateReviewAction as jest.MockedFunction<
  typeof saveCandidateReviewAction
>;
const mockedApply = applyCandidatesAction as jest.MockedFunction<
  typeof applyCandidatesAction
>;
const mockedSources = listPrivateDocumentSources as jest.MockedFunction<
  typeof listPrivateDocumentSources
>;
const reviewData = {
  reviewId: null,
  revision: 0,
  proposalVersion: 7,
  canonicalPaths: { [operationId]: currentPath },
  currentValues: { [currentPath]: "Current event" },
  appliedOperationIds: [],
  invalidOperations: [],
  operations: [{
    id: operationId,
    ordinal: 1,
    path: "/content/event/eventName",
    value: "Proposed event",
    confidence: 0.94,
    evidence_ids: ["evidence-1"],
    decision: "pending" as const,
    modified_value: null,
    reason: null,
  }],
};

describe("ProposalContextPanel explicit field review", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSources.mockResolvedValue({
      success: true,
      data: [],
      correlationId: "test-correlation",
    });
    mockedLatest.mockResolvedValue({
      success: true,
      data: {
        run: { id: runId, provider: "openai", model: "approved-model" },
        operations: [],
        evidence: [],
        issues: [],
        proposalMutation: false,
      },
    });
    mockedReview.mockResolvedValue({
      success: true,
      data: reviewData,
    });
    mockedSave.mockResolvedValue({
      success: true,
      data: { reviewId: "review-1", revision: 1, savedCount: 1 },
    });
    mockedApply.mockResolvedValue({
      success: true,
      data: { applicationId: "application-1", jobId: "job-1", status: "queued", created: true },
    });
  });

  test("shows reason and provenance, then requires a second explicit confirmation", async () => {
    render(<ProposalContextPanel proposalId={proposalId} />);
    expect(await screen.findByText("Proposed event")).toBeInTheDocument();
    expect(screen.getByText(/selected, reviewed source evidence/)).toBeInTheDocument();
    expect(screen.getByText(/citation evidence-1/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Decision/), {
      target: { value: "accepted" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirm overwrite" }));
    fireEvent.click(screen.getByRole("button", { name: "Review selected changes" }));

    const confirmation = screen.getByRole("region", {
      name: "Confirm field changes",
    });
    expect(within(confirmation).getByText("Current event")).toBeInTheDocument();
    expect(within(confirmation).getByText("Proposed event")).toBeInTheDocument();
    expect(mockedSave).not.toHaveBeenCalled();
    expect(mockedApply).not.toHaveBeenCalled();

    fireEvent.click(
      within(confirmation).getByRole("button", { name: "Confirm and apply" }),
    );
    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedApply).toHaveBeenCalledTimes(1));
    expect(mockedApply.mock.calls[0]?.slice(0, 5)).toEqual([
      proposalId,
      runId,
      7,
      [operationId],
      [operationId],
    ]);
    expect(mockedApply.mock.calls[0]?.[5]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/i,
    );
  });

  test("an invalid suggestion cannot be selected for application", async () => {
    mockedReview.mockResolvedValue({
      success: true,
      data: {
        ...reviewData,
        invalidOperations: [{
          operationId,
          path: "/content/event/eventName",
          reason: "The suggested value is invalid.",
        }],
      },
    } as never);
    render(<ProposalContextPanel proposalId={proposalId} />);
    expect(await screen.findByText("1 suggestion could not be used"))
      .toBeInTheDocument();
    expect(screen.getByText("The suggested value is invalid."))
      .toBeInTheDocument();
    expect(screen.queryByLabelText(/Decision/)).not.toBeInTheDocument();
    expect(mockedApply).not.toHaveBeenCalled();
  });
});

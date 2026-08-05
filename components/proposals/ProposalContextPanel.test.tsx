import { render, screen, waitFor } from "@testing-library/react";
import ProposalContextPanel from "./ProposalContextPanel";
import { getCandidateReviewAction } from "@/app/actions/candidateApplication";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/app/actions/proposalContext", () => ({
  createProposalContextAction: jest.fn(),
  createSourceProposalContextAction: jest.fn(),
  getProposalContextAction: jest.fn(),
  getLatestProposalContextAction: jest.fn().mockResolvedValue({
    success: true,
    data: {
      run: { id: "ctx-run-1", provider: "openai", model: "test-model" },
      issues: [],
    },
  }),
}));

jest.mock("@/app/actions/durableJobs", () => ({
  getDurableJob: jest.fn(),
  listPrivateDocumentSources: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
}));

jest.mock("@/app/actions/candidateApplication", () => ({
  applyCandidatesAction: jest.fn(),
  saveCandidateReviewAction: jest.fn(),
  getCandidateReviewAction: jest.fn(),
}));

const reviewMock = getCandidateReviewAction as jest.Mock;

const review = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  data: {
    reviewId: "rev-1",
    revision: 1,
    proposalVersion: 3,
    // "op-bad" deliberately has no canonicalPaths entry — that is exactly the
    // shape the backend returns for a candidate it could not normalize.
    canonicalPaths: { "op-good": "/content/event/eventName" },
    currentValues: {},
    appliedOperationIds: [],
    operations: [
      {
        id: "op-good",
        ordinal: 0,
        path: "/content/event/eventName",
        value: "Northstar Summit",
        confidence: 0.91,
        evidence_ids: ["frag-1"],
        decision: "pending",
        modified_value: null,
        reason: null,
      },
      {
        id: "op-bad",
        ordinal: 1,
        path: "/content/venueSchedule/loadInDateTime",
        value: "sometime the day before",
        confidence: 0.44,
        evidence_ids: ["frag-2"],
        decision: "pending",
        modified_value: null,
        reason: null,
      },
    ],
    ...overrides,
  },
});

beforeEach(() => jest.clearAllMocks());

test("unsupported candidates are shown with their reason instead of vanishing", async () => {
  reviewMock.mockResolvedValue(
    review({
      invalidOperations: [
        {
          operationId: "op-bad",
          path: "/content/venueSchedule/loadInDateTime",
          reason: "Candidate date must be an ISO calendar date.",
        },
      ],
    }),
  );

  render(<ProposalContextPanel proposalId="proposal-1" />);

  expect(
    await screen.findByText("1 detail needs manual review"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Candidate date must be an ISO calendar date."),
  ).toBeInTheDocument();

  // The invalid candidate must not also appear as a reviewable row. The one
  // valid suggestion is shown with a plain-language field label and action.
  expect(screen.queryByText("sometime the day before")).not.toBeInTheDocument();
  expect(screen.getAllByRole("combobox")).toHaveLength(1);
  expect(
    screen.getByRole("heading", { name: "Event Name" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Use suggestion" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("/content/event/eventName"),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Northstar Summit")).toBeInTheDocument();
});

test("no unsupported section is rendered when every candidate mapped cleanly", async () => {
  reviewMock.mockResolvedValue(review());

  render(<ProposalContextPanel proposalId="proposal-1" />);

  await waitFor(() =>
    expect(screen.getByText("Northstar Summit")).toBeInTheDocument(),
  );
  expect(screen.queryByText(/manual review/)).not.toBeInTheDocument();
});

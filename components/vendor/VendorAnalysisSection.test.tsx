import { render, screen } from "@testing-library/react";
import VendorAnalysisSection from "./VendorAnalysisSection";
import {
  createVendorAnalysisJobAction,
  getLatestVendorAnalysisAction,
  type VendorAnalysisResult,
} from "@/app/actions/vendorAnalysis";
import { getDurableJob } from "@/app/actions/durableJobs";

jest.mock("@/app/actions/vendorAnalysis", () => ({
  createVendorAnalysisJobAction: jest.fn(),
  getLatestVendorAnalysisAction: jest.fn(),
}));
jest.mock("@/app/actions/durableJobs", () => ({
  getDurableJob: jest.fn(),
}));

const responseId = "64b0f1f77bcf86cd79943901";
const proposalId = "507f1f77bcf86cd799439011";
const mockedLatest = getLatestVendorAnalysisAction as jest.MockedFunction<
  typeof getLatestVendorAnalysisAction
>;
const mockedCreate = createVendorAnalysisJobAction as jest.MockedFunction<
  typeof createVendorAnalysisJobAction
>;
const mockedJob = getDurableJob as jest.MockedFunction<typeof getDurableJob>;

const completedRun: VendorAnalysisResult = {
  run: {
    runId: "run-1",
    status: "succeeded",
    provider: "anthropic",
    model: "claude",
    requirementCount: 3,
    findingCount: 4,
    escalationCount: 1,
    safeErrorCode: null,
    createdAt: "2026-07-21T10:00:00.000Z",
    completedAt: "2026-07-21T10:01:00.000Z",
  },
  findings: [
    {
      ordinal: 1,
      kind: "compliance",
      requirementPath: "/content/event/startDate",
      requirementLabel: "Start date",
      verdict: "addressed",
      message: "The vendor confirms availability for the event dates.",
      confidence: 0.9,
      needsHumanReview: false,
      citations: ["vendor-fragment-0"],
    },
    {
      ordinal: 2,
      kind: "compliance",
      requirementPath: "/content/venue/riggingRequired",
      requirementLabel: "Rigging required",
      verdict: "partial",
      message: "Rigging is mentioned but no rig plot is included.",
      confidence: 0.6,
      needsHumanReview: true,
      citations: ["vendor-fragment-1", "vendor-fragment-missing"],
    },
    {
      ordinal: 3,
      kind: "compliance",
      requirementPath: "/content/venueSchedule/loadInDate",
      requirementLabel: "Load in date",
      verdict: "missing",
      message: "The response does not address load-in scheduling.",
      confidence: 0.8,
      needsHumanReview: false,
      citations: [],
    },
    {
      ordinal: 4,
      kind: "vendor_question",
      requirementPath: null,
      requirementLabel: null,
      verdict: null,
      message: "Can you provide a rig plot for the ballroom?",
      confidence: 0.7,
      needsHumanReview: false,
      citations: [],
    },
  ],
  evidence: [
    { fragmentId: "vendor-fragment-0", origin: "message", excerpt: "We are available on those dates." },
    { fragmentId: "vendor-fragment-1", origin: "DXG/vendor-responses-private/x/rig-notes.pdf", excerpt: "Rigging handled by house crew." },
  ],
};

beforeAll(() => {
  process.env.NEXT_PUBLIC_VENDOR_ANALYSIS_ENABLED = "true";
  process.env.NEXT_PUBLIC_VENDOR_ANALYSIS_VISIBLE = "true";
});

beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  mockedCreate.mockResolvedValue({
    success: true,
    data: { jobId: "job-1", runId: "run-1", statusUrl: "", resultUrl: "" },
  });
  mockedJob.mockResolvedValue({
    success: false,
    code: "JOB_NOT_FOUND",
    message: "This operation is no longer available.",
    correlationId: "test",
  });
});

describe("VendorAnalysisSection", () => {
  test("renders compliance verdict chips from a completed run on mount", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: completedRun });
    render(
      <VendorAnalysisSection responseId={responseId} proposalId={proposalId} />,
    );
    // Verdict chips are color-coded per requirement.
    expect(await screen.findByText("Addressed")).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
    // Summary counts reflect the compliance findings.
    expect(screen.getByText("1 addressed")).toBeInTheDocument();
    expect(screen.getByText("1 partial")).toBeInTheDocument();
    expect(screen.getByText("1 missing")).toBeInTheDocument();
    // Escalated findings carry a review badge; questions render as a list.
    expect(screen.getByText("Review recommended")).toBeInTheDocument();
    expect(
      screen.getByText("Can you provide a rig plot for the ballroom?"),
    ).toBeInTheDocument();
    expect(mockedLatest).toHaveBeenCalledWith(responseId, proposalId);
  });

  test("a finding can be traced to the words the vendor actually wrote", async () => {
    // The citations were ids into an array that lived only for the run, so a
    // reader saw the claim and never its basis. The run now persists the cited
    // fragments and each finding resolves its own.
    mockedLatest.mockResolvedValue({ success: true, data: completedRun });
    render(<VendorAnalysisSection responseId={responseId} proposalId={proposalId} />);

    const passages = await screen.findAllByText(/quoted passage/);
    // Two findings cite; the third cites nothing and must not offer to show it.
    expect(passages).toHaveLength(2);
    expect(screen.getByText("We are available on those dates.")).toBeInTheDocument();
    expect(screen.getByText("Rigging handled by house crew.")).toBeInTheDocument();

    // Where it came from matters as much as what it said.
    expect(screen.getByText("From the vendor’s message")).toBeInTheDocument();
    expect(screen.getByText("From rig-notes.pdf")).toBeInTheDocument();

    // One of the two ids resolves to nothing (an older run, or a fragment that
    // was not persisted); the summary counts only what it can actually show.
    // The second finding cites two ids but only one resolves (an older run, or
    // a fragment that was not persisted), so the summary stays singular: it
    // counts what it can actually show, not what was claimed.
    expect(screen.getAllByText("Show the quoted passage")).toHaveLength(2);
  });

  test("the review can be downloaded, scoped to its proposal", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: completedRun });
    render(<VendorAnalysisSection responseId={responseId} proposalId={proposalId} />);

    const link = await screen.findByRole("link", { name: "Download review" });
    // The backend scopes the analysis by proposal as well as response, so the
    // proposal id has to travel with the request.
    expect(link).toHaveAttribute(
      "href",
      `/api/vendor-responses/${responseId}/analysis-export?proposalId=${proposalId}`,
    );
  });

  test("a failed run offers no download", async () => {
    mockedLatest.mockResolvedValue({
      success: true,
      data: { run: { ...completedRun.run, status: "failed", safeErrorCode: "VENDOR_EVIDENCE_EMPTY" }, findings: [], evidence: [] },
    });
    render(<VendorAnalysisSection responseId={responseId} proposalId={proposalId} />);
    await screen.findByText(/no analyzable text/);
    expect(screen.queryByRole("link", { name: "Download review" })).not.toBeInTheDocument();
  });

  test("surfaces the safe message when the run failed with no evidence", async () => {
    mockedLatest.mockResolvedValue({
      success: true,
      data: {
        run: { ...completedRun.run, status: "failed", safeErrorCode: "VENDOR_EVIDENCE_EMPTY" },
        findings: [],
        evidence: [],
      },
    });
    render(
      <VendorAnalysisSection responseId={responseId} proposalId={proposalId} />,
    );
    expect(
      await screen.findByText(
        "This response has no analyzable text or scanned documents.",
      ),
    ).toBeInTheDocument();
  });
});

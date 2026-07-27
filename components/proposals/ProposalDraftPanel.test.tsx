import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProposalDraftPanel from "./ProposalDraftPanel";
import {
  decideDraftSectionAction,
  getLatestProposalDraftAction,
  regenerateDraftSectionAction,
  type ProposalDraft,
} from "@/app/actions/proposalDraft";

jest.mock("@/app/actions/proposalDraft", () => ({
  createProposalDraftAction: jest.fn(),
  getProposalDraftAction: jest.fn(),
  getLatestProposalDraftAction: jest.fn(),
  decideDraftSectionAction: jest.fn(),
  regenerateDraftSectionAction: jest.fn(),
}));

jest.mock("@/app/actions/proposalContext", () => ({
  getLatestProposalContextAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: { run: { id: "ctx-run-1" } } }),
}));

jest.mock("@/app/actions/candidateApplication", () => ({
  getCandidateReviewAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: { proposalVersion: 7 } }),
}));

jest.mock("@/app/actions/durableJobs", () => ({
  getDurableJob: jest.fn().mockResolvedValue({
    success: true,
    data: { status: "running" },
    correlationId: "test-correlation",
  }),
}));

const proposalId = "507f1f77bcf86cd799439011";
const mockedLatestDraft = getLatestProposalDraftAction as jest.MockedFunction<
  typeof getLatestProposalDraftAction
>;
const mockedDecide = decideDraftSectionAction as jest.MockedFunction<
  typeof decideDraftSectionAction
>;
const mockedRegenerate = regenerateDraftSectionAction as jest.MockedFunction<
  typeof regenerateDraftSectionAction
>;

const section = (
  key: string,
  heading: string,
  ordinal: number,
  decision: "accepted" | "rejected" | null = null,
  decisionReason: string | null = null,
) => ({
  id: `sec-${key}`,
  key,
  heading,
  ordinal,
  paragraphs: [{ text: `${heading} paragraph.`, citations: ["/eventName"] }],
  decision,
  decisionReason,
});

const draftFixture: { success: true; data: ProposalDraft } = {
  success: true,
  data: {
    run: { id: "run-1", status: "succeeded", provider: "openai", model: "gpt-4o-mini" },
    sections: [
      section("summary", "Summary", 1, "accepted"),
      section("approach", "Approach", 2, "rejected", "Too vague"),
      section("timeline", "Timeline", 3),
    ],
    gaps: [],
    regenerations: [],
    proposalMutation: false,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedLatestDraft.mockResolvedValue(draftFixture);
  if (typeof globalThis.crypto?.randomUUID !== "function")
    Object.assign(globalThis.crypto ?? (globalThis as { crypto: object }).crypto, {
      randomUUID: () => "00000000-0000-4000-8000-000000000000",
    });
});

describe("ProposalDraftPanel section review", () => {
  test("renders decision badges from the stored draft", async () => {
    render(<ProposalDraftPanel proposalId={proposalId} />);
    expect(await screen.findByText("Accepted ✓")).toBeInTheDocument();
    expect(screen.getByText("Rejected ✗")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    // The undecided section carries controls but no badge.
    expect(screen.getAllByText("Accepted ✓")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Accept Timeline" }),
    ).toBeInTheDocument();
  });

  test("accepting a section calls the decision action and shows the badge", async () => {
    mockedDecide.mockResolvedValue({
      success: true,
      data: {
        section_key: "timeline",
        decision: "accepted",
        reason: null,
        updated_at: "2026-07-21T10:00:00.000Z",
      },
    });
    render(<ProposalDraftPanel proposalId={proposalId} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Accept Timeline" }),
    );
    await waitFor(() =>
      expect(mockedDecide).toHaveBeenCalledWith(proposalId, "run-1", "timeline", {
        decision: "accepted",
      }),
    );
    await waitFor(() =>
      expect(screen.getAllByText("Accepted ✓")).toHaveLength(2),
    );
  });

  test("regenerating a section sends the panel's proposal version and shows a pending state", async () => {
    mockedRegenerate.mockResolvedValue({
      success: true,
      data: {
        runId: "child-run-1",
        jobId: "job-1",
        status: "queued",
        sectionScope: "timeline",
        parentRunId: "run-1",
        created: true,
      },
    });
    render(<ProposalDraftPanel proposalId={proposalId} />);
    const button = await screen.findByRole("button", {
      name: "Regenerate Timeline",
    });
    // The button unlocks once the proposal version has loaded.
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() =>
      expect(mockedRegenerate).toHaveBeenCalledWith(
        proposalId,
        "run-1",
        "timeline",
        7,
        expect.any(String),
      ),
    );
    expect(
      await screen.findByText(/Regenerating this section/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Regenerate Timeline" }),
    ).toBeDisabled();
  });

  test("renders a DXG knowledge chip for /knowledge/ citations alongside field-path evidence", async () => {
    const knowledgeId = "/knowledge/frag-42";
    mockedLatestDraft.mockResolvedValue({
      success: true,
      data: {
        ...draftFixture.data,
        sections: [
          {
            ...section("summary", "Summary", 1),
            paragraphs: [
              {
                text: "Summary paragraph.",
                citations: ["/eventName", knowledgeId],
              },
            ],
          },
        ],
      },
    });
    render(<ProposalDraftPanel proposalId={proposalId} />);
    const chip = await screen.findByText("DXG knowledge");
    expect(chip).toHaveAttribute("title", knowledgeId);
    // Field-path citations keep the plain evidence treatment.
    expect(screen.getByText("Evidence: /eventName")).toBeInTheDocument();
  });

  test("the download offers only what was accepted, and says so", async () => {
    mockedLatestDraft.mockResolvedValue(draftFixture);
    render(<ProposalDraftPanel proposalId={proposalId} />);

    const link = await screen.findByText("Download RFP");
    // The fixture has one accepted, one rejected and one undecided section, so
    // the planner is told what will actually be in the file before downloading.
    expect(link).toHaveAttribute(
      "href",
      `/api/proposals/${proposalId}/draft-export`,
    );
    expect(link.getAttribute("aria-disabled")).toBe("false");
    expect(screen.getByText(/1 accepted section will be included/)).toBeInTheDocument();
    expect(screen.getByText(/Rejected and undecided sections are left out/)).toBeInTheDocument();
  });

  test("with nothing accepted the download is inert rather than an error to discover", async () => {
    mockedLatestDraft.mockResolvedValue({
      ...draftFixture,
      data: {
        ...draftFixture.data,
        sections: [section("summary", "Summary", 1), section("approach", "Approach", 2, "rejected")],
      },
    });
    render(<ProposalDraftPanel proposalId={proposalId} />);

    const link = await screen.findByText("Download RFP");
    // No href: the backend would answer 409, and making the planner click to
    // find that out is worse than saying it up front.
    expect(link).not.toHaveAttribute("href");
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Accept at least one section to download the RFP.")).toBeInTheDocument();
  });
});

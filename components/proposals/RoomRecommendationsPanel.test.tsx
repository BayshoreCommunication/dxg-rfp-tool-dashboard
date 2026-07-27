import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RoomRecommendationsPanel from "./RoomRecommendationsPanel";
import type { RoomRecRun } from "@/app/actions/roomRecommendations";

jest.mock("@/app/actions/roomRecommendations", () => ({
  generateRoomRecommendationsAction: jest.fn(),
  getLatestRoomRecommendationsAction: jest.fn(),
  autoApplyRoomRecommendationsAction: jest.fn(),
}));

import {
  autoApplyRoomRecommendationsAction,
  generateRoomRecommendationsAction,
  getLatestRoomRecommendationsAction,
} from "@/app/actions/roomRecommendations";

const mockLatest = getLatestRoomRecommendationsAction as jest.MockedFunction<typeof getLatestRoomRecommendationsAction>;
const mockGenerate = generateRoomRecommendationsAction as jest.MockedFunction<typeof generateRoomRecommendationsAction>;
const mockAutoApply = autoApplyRoomRecommendationsAction as jest.MockedFunction<typeof autoApplyRoomRecommendationsAction>;

const run = (): RoomRecRun => ({
  id: "0198c0de-0000-7000-8000-000000000001",
  proposalVersion: 1,
  schemaVersion: "room-recommendation.v1",
  engineVersion: "room-rules.v2",
  payload: {
    schemaVersion: "room-recommendation.v1",
    proposalId: "0123456789abcdef01234567",
    proposalVersion: 1,
    rooms: [
      {
        roomKey: "room-0-abc",
        roomIndex: 0,
        roomLabel: "General Session",
        recommendations: [
          {
            recommendationKey: "ROOM_AUDIO_QA_001:0:wirelessMics/wirelessMicsQty",
            path: "/content/roomByRoom/0/wirelessMics/wirelessMicsQty",
            value: "3",
            classification: "recommended_assumption",
            confidence: 0.75,
            explanation: "For roughly 400 attendees with passed-microphone Q&A, 3 handheld channels is the approved baseline.",
            evidence: [{ path: "/content/roomByRoom/0/estimatedAttendeesInRoom", value: "400" }],
            ruleIds: ["ROOM_AUDIO_QA_001"],
            knowledgeIds: ["RRK-AUDIO-QA-001"],
            assumptions: ["Staff runners can reach seated attendees."],
            requiresHumanReview: true,
            applyEligible: true,
          },
          {
            recommendationKey: "ROOM_CREW_AUDIO_A1_001:0:showCrewNeeded/A1_Audio_Engineer",
            path: "/content/roomByRoom/0/showCrewNeeded",
            value: "A1 (Audio Engineer)",
            classification: "deterministic_derivation",
            confidence: 0.95,
            explanation: "A dedicated audio system was selected for this room.",
            evidence: [{ path: "/content/roomByRoom/0/audioSystemRequired", value: "Yes" }],
            ruleIds: ["ROOM_CREW_AUDIO_A1_001"],
            knowledgeIds: [],
            assumptions: [],
            requiresHumanReview: true,
            applyEligible: true,
          },
        ],
        clarificationQuestions: [],
        warnings: [{ code: "ROOM_LOADIN_AFTER_SHOW", ruleId: "ROOM_SCHEDULE_LOADIN_001", severity: "blocking", message: "Load-in is after the show starts.", paths: [] }],
      },
      {
        roomKey: "room-1-def",
        roomIndex: 1,
        roomLabel: "",
        recommendations: [],
        clarificationQuestions: [
          { questionKey: "ROOM_PURPOSE_MISSING_001:1:purpose", ruleId: "ROOM_PURPOSE_MISSING_001", prompt: "What is this room's purpose or function?", paths: [] },
        ],
        warnings: [],
      },
    ],
    globalClarificationQuestions: [],
    globalWarnings: [],
    knowledgeIds: ["RRK-AUDIO-QA-001"],
  },
  roomCount: 2,
  recommendationCount: 2,
  questionCount: 1,
  warningCount: 1,
  blockingCount: 1,
  createdAt: "2026-07-27T00:00:00.000Z",
});

const application = (overrides: Partial<{ appliedPaths: string[]; skippedPaths: string[] }> = {}) => ({
  success: true as const,
  data: {
    id: "app-1",
    status: "applied" as const,
    automatic: true,
    expectedProposalVersion: 1,
    resultingProposalVersion: 2,
    selectedCount: (overrides.appliedPaths ?? ["/content/roomByRoom/0/wirelessMics/wirelessMicsQty", "/content/roomByRoom/0/showCrewNeeded"]).length,
    appliedPaths: overrides.appliedPaths ?? ["/content/roomByRoom/0/wirelessMics/wirelessMicsQty", "/content/roomByRoom/0/showCrewNeeded"],
    skippedPaths: overrides.skippedPaths ?? [],
    safeErrorCode: null,
    createdAt: "2026-07-27T00:00:00.000Z",
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockLatest.mockResolvedValue({ success: false, code: "RECOMMENDATIONS_NOT_FOUND", message: "none" });
});

test("starts quiet with a single fill action and no metadata clutter", async () => {
  render(<RoomRecommendationsPanel proposalId="0123456789abcdef01234567" />);
  expect(await screen.findByRole("button", { name: "Fill rooms for me" })).toBeInTheDocument();
  expect(screen.getByText("Smart fill")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("one click fills empty fields and shows compact value chips only", async () => {
  const user = userEvent.setup();
  mockGenerate.mockResolvedValue({ success: true, data: run() });
  mockAutoApply.mockResolvedValue(application());
  const onApplied = jest.fn();
  render(<RoomRecommendationsPanel proposalId="0123456789abcdef01234567" onApplied={onApplied} />);
  await user.click(await screen.findByRole("button", { name: "Fill rooms for me" }));
  expect(await screen.findByText(/2 fields filled in/)).toBeInTheDocument();
  expect(mockAutoApply).toHaveBeenCalledWith("0123456789abcdef01234567", run().id);
  // Compact chips: role name and short field label.
  expect(screen.getByText("A1 (Audio Engineer)")).toBeInTheDocument();
  expect(screen.getByText("Mic qty: 3")).toBeInTheDocument();
  expect(onApplied).toHaveBeenCalled();
  // Internal metadata is not rendered.
  expect(screen.queryByText(/Confidence/)).not.toBeInTheDocument();
  expect(screen.queryByText("Derived")).not.toBeInTheDocument();
  expect(screen.queryByText("Recommendation")).not.toBeInTheDocument();
  expect(screen.queryByText("Filled in")).not.toBeInTheDocument();
  expect(screen.queryByText(/show crew needed/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Assumes:/)).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});

test("the why stays available as a tooltip and untouched fields are muted", async () => {
  const user = userEvent.setup();
  mockGenerate.mockResolvedValue({ success: true, data: run() });
  mockAutoApply.mockResolvedValue(application({
    appliedPaths: ["/content/roomByRoom/0/showCrewNeeded"],
    skippedPaths: ["/content/roomByRoom/0/wirelessMics/wirelessMicsQty"],
  }));
  render(<RoomRecommendationsPanel proposalId="0123456789abcdef01234567" />);
  await user.click(await screen.findByRole("button", { name: "Fill rooms for me" }));
  const skippedChip = await screen.findByText("Mic qty: 3");
  expect(skippedChip).toHaveAttribute("title", expect.stringContaining("Left untouched"));
  expect(skippedChip.className).toContain("text-slate-400");
  const appliedChip = screen.getByText("A1 (Audio Engineer)");
  expect(appliedChip).toHaveAttribute("title", expect.stringContaining("audio system was selected"));
  expect(appliedChip.className).toContain("text-emerald-800");
  expect(screen.getByText(/1 field filled in/)).toBeInTheDocument();
});

test("when everything is already set the panel says so without re-applying", async () => {
  const user = userEvent.setup();
  mockGenerate.mockResolvedValue({ success: true, data: run() });
  mockAutoApply.mockResolvedValue(application({ appliedPaths: [], skippedPaths: ["/content/roomByRoom/0/wirelessMics/wirelessMicsQty"] }));
  const onApplied = jest.fn();
  render(<RoomRecommendationsPanel proposalId="0123456789abcdef01234567" onApplied={onApplied} />);
  await user.click(await screen.findByRole("button", { name: "Fill rooms for me" }));
  expect(await screen.findByText(/already set/)).toBeInTheDocument();
  expect(onApplied).not.toHaveBeenCalled();
});

test("warnings and open questions still surface compactly", async () => {
  mockLatest.mockResolvedValue({ success: true, data: run() });
  render(<RoomRecommendationsPanel proposalId="0123456789abcdef01234567" />);
  expect(await screen.findByText("General Session")).toBeInTheDocument();
  expect(screen.getByText(/Load-in is after the show starts/)).toBeInTheDocument();
  expect(screen.getByText(/What is this room's purpose/)).toBeInTheDocument();
});

test("version conflicts surface a retry that regenerates", async () => {
  const user = userEvent.setup();
  mockGenerate.mockResolvedValue({ success: true, data: run() });
  mockAutoApply
    .mockResolvedValueOnce({ success: false, code: "PROPOSAL_VERSION_CONFLICT", message: "The proposal changed since these recommendations were generated. Regenerate and review again." })
    .mockResolvedValueOnce(application());
  render(<RoomRecommendationsPanel proposalId="0123456789abcdef01234567" />);
  await user.click(await screen.findByRole("button", { name: "Fill rooms for me" }));
  expect(await screen.findByText(/Regenerate and review again/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(mockAutoApply).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(/fields filled in/)).toBeInTheDocument();
});

test("duplicate clicks are ignored while a request is in flight", async () => {
  const user = userEvent.setup();
  let resolveGenerate: (value: Awaited<ReturnType<typeof generateRoomRecommendationsAction>>) => void = () => undefined;
  mockGenerate.mockImplementation(() => new Promise((resolve) => { resolveGenerate = resolve; }));
  mockAutoApply.mockResolvedValue(application());
  render(<RoomRecommendationsPanel proposalId="0123456789abcdef01234567" />);
  const button = await screen.findByRole("button", { name: "Fill rooms for me" });
  await user.click(button);
  expect(screen.getByRole("button", { name: "Filling in…" })).toBeDisabled();
  resolveGenerate({ success: true, data: run() });
  await screen.findByText("General Session");
  expect(mockGenerate).toHaveBeenCalledTimes(1);
});

test("failed generation shows an error and allows retry", async () => {
  const user = userEvent.setup();
  mockGenerate
    .mockResolvedValueOnce({ success: false, code: "NETWORK_ERROR", message: "The room recommendation service could not be reached." })
    .mockResolvedValueOnce({ success: true, data: run() });
  mockAutoApply.mockResolvedValue(application());
  render(<RoomRecommendationsPanel proposalId="0123456789abcdef01234567" />);
  const button = await screen.findByRole("button", { name: "Fill rooms for me" });
  await user.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not be reached/);
  await user.click(screen.getByRole("button", { name: "Fill rooms for me" }));
  await screen.findByText("General Session");
});

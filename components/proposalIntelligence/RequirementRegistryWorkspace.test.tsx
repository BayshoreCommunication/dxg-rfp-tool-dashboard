import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequirementRegistryWorkspace from "./RequirementRegistryWorkspace";
import type { RequirementRegistryView } from "@/app/actions/requirementRegistry";

const generate = jest.fn();
const update = jest.fn();
jest.mock("@/app/actions/requirementRegistry", () => ({
  generateRequirementSetAction: (...args: unknown[]) => generate(...args),
  updateRegistryRequirementAction: (...args: unknown[]) => update(...args),
  getRequirementSetAction: jest.fn(),
  approveRequirementSetAction: jest.fn(),
  supersedeRequirementSetAction: jest.fn(),
}));

const registry: RequirementRegistryView = {
  set: {
    id: "018f47b0-1111-7111-8111-111111111111",
    version: 1,
    status: "in_review",
    lock_version: 3,
    proposal_version: "7",
    content_checksum: "a".repeat(64),
    validation: { blocking: [{ code: "MANDATORY_REVIEW_REQUIRED", count: 1, message: "1 requirement needs mandatory-status review." }], warnings: [] },
    approved_at: null,
    superseded_by_id: null,
  },
  matrix: {
    id: "018f47b0-2222-7222-8222-222222222222",
    status: "draft",
    weightsConfirmed: true,
    totalWeight: 100,
    criteria: [{ id: "018f47b0-3333-7333-8333-333333333333", criterion_key: "technicalApproach", name: "Technical Approach", description: "Technical compliance", weight: 100, ordinal: 0 }],
  },
  requirements: [{
    id: "018f47b0-4444-7444-8444-444444444444",
    requirement_key: "req_123",
    kind: "technical",
    title: "Audio system required",
    normalized_text: "Yes",
    mandatory_status: "pending",
    mandatory_reviewed: false,
    eligibility: false,
    source_kind: "canonical_proposal",
    source_locator: { kind: "canonical_proposal", path: "/content/roomByRoom/0/audioSystemRequired" },
    criterion_id: "018f47b0-3333-7333-8333-333333333333",
    criterion_key: "technicalApproach",
    criterion_name: "Technical Approach",
    criterion_reviewed: false,
    importance: "medium",
    verification_method: "pending",
    group_key: "roomByRoom",
    ordinal: 0,
  }],
  freshness: { stale: false, reasons: [], currentProposalVersion: "7", currentProposalChecksum: "b".repeat(64) },
};

test("shows the generation boundary before a registry exists", async () => {
  generate.mockResolvedValue({ success: false, code: "DISABLED", message: "Not enabled" });
  render(<RequirementRegistryWorkspace proposalId="abc123abc123abc123abc123" initialRegistry={null} initialSets={[]} />);
  expect(screen.getByText("Build the first requirement registry")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /generate requirement registry/i }));
  expect(generate).toHaveBeenCalledWith("abc123abc123abc123abc123");
  expect(await screen.findByRole("alert")).toHaveTextContent("Not enabled");
});

test("renders traceable requirements, confirmed weights, and blocks premature approval", () => {
  render(<RequirementRegistryWorkspace proposalId="abc123abc123abc123abc123" initialRegistry={registry} initialSets={[]} />);
  expect(screen.getByText("Technical Approach")).toBeInTheDocument();
  expect(screen.getByText("Weights confirmed")).toBeInTheDocument();
  expect(screen.getByText("Audio system required")).toBeInTheDocument();
  expect(screen.getByText(/Proposal · roomByRoom › 0 › audioSystemRequired/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /approve and freeze/i })).toBeDisabled();
});

test("a saved row explicitly confirms mandatory and criterion review", async () => {
  update.mockResolvedValue({ success: true, data: registry });
  render(<RequirementRegistryWorkspace proposalId="abc123abc123abc123abc123" initialRegistry={registry} initialSets={[]} />);
  await userEvent.click(screen.getByText("Audio system required"));
  await userEvent.selectOptions(screen.getByLabelText("Mandatory status"), "mandatory");
  await userEvent.selectOptions(screen.getByLabelText("Verification method"), "document");
  await userEvent.click(screen.getByRole("button", { name: /save review/i }));
  expect(update).toHaveBeenCalledWith(
    "abc123abc123abc123abc123",
    registry.set.id,
    registry.requirements[0].id,
    3,
    expect.objectContaining({ mandatoryStatus: "mandatory", mandatoryReviewed: true, criterionReviewed: true, verificationMethod: "document" }),
  );
});

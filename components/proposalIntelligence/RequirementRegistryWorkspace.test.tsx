import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequirementRegistryWorkspace from "./RequirementRegistryWorkspace";
import type { RequirementRegistryView } from "@/app/actions/requirementRegistry";

const generate = jest.fn();
const prepare = jest.fn();
const approve = jest.fn();
const update = jest.fn();
const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));
jest.mock("@/app/actions/requirementRegistry", () => ({
  generateRequirementSetAction: (...args: unknown[]) => generate(...args),
  prepareRequirementSetAction: (...args: unknown[]) => prepare(...args),
  updateRegistryRequirementAction: (...args: unknown[]) => update(...args),
  getRequirementSetAction: jest.fn(),
  approveRequirementSetAction: (...args: unknown[]) => approve(...args),
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
    included: true,
    inclusion_reviewed: false,
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

test("explains when a historical registry is stale because the generation policy changed", () => {
  const historical = { ...registry, freshness: { ...registry.freshness, stale: true, reasons: ["requirement_policy_changed"] } };
  render(<RequirementRegistryWorkspace proposalId="abc123abc123abc123abc123" initialRegistry={historical} initialSets={[]} />);
  expect(screen.getByText("Generation policy changed")).toBeInTheDocument();
  expect(screen.getByText(/may include descriptive metadata or lack current scoring anchors/i)).toBeInTheDocument();
});

test("renders traceable requirements, balanced weights, and blocks premature approval", async () => {
  render(<RequirementRegistryWorkspace proposalId="abc123abc123abc123abc123" initialRegistry={registry} initialSets={[]} />);
  // The "Scoring categories" and "Review summary" cards are no longer shown.
  expect(screen.queryByText("Scoring categories")).not.toBeInTheDocument();
  expect(screen.queryByText("Review summary")).not.toBeInTheDocument();
  expect(screen.getByText("Audio system required")).toBeInTheDocument();
  expect(screen.getByText(/Proposal · roomByRoom › 0 › audioSystemRequired/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /approve and freeze/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /prepare automatically/i })).toBeEnabled();
});

test("does not display old persisted standalone recording requirements", async () => {
  const withRetiredRecording: RequirementRegistryView = {
    ...registry,
    requirements: [
      ...registry.requirements,
      {
        ...registry.requirements[0],
        id: "018f47b0-5555-7555-8555-555555555555",
        requirement_key: "req_retired_recording",
        title: "RETIRED_RECORDING_REQUIREMENT",
        normalized_text: "RETIRED_RECORDING_VALUE",
        source_locator: {
          kind: "canonical_proposal",
          path: "/content/videoRecording/required",
        },
        group_key: "production",
        ordinal: 1,
      },
    ],
  };

  render(
    <RequirementRegistryWorkspace
      proposalId="abc123abc123abc123abc123"
      initialRegistry={withRetiredRecording}
      initialSets={[]}
    />,
  );

  expect(screen.getByText("1 requirements found")).toBeInTheDocument();
  expect(screen.queryByText("RETIRED_RECORDING_REQUIREMENT")).not.toBeInTheDocument();
  expect(screen.queryByText("RETIRED_RECORDING_VALUE")).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Recording" })).not.toBeInTheDocument();
});

test("prepares the registry with one explicit action", async () => {
  const prepared: RequirementRegistryView = {
    ...registry,
    set: { ...registry.set, lock_version: 4, validation: { blocking: [], warnings: [] } },
    requirements: registry.requirements.map((item) => ({ ...item, inclusion_reviewed: true, mandatory_status: "not_mandatory", mandatory_reviewed: true, criterion_reviewed: true, verification_method: "document" })),
  };
  prepare.mockResolvedValue({ success: true, data: prepared });
  render(<RequirementRegistryWorkspace proposalId="abc123abc123abc123abc123" initialRegistry={registry} initialSets={[]} />);
  await userEvent.click(screen.getByRole("button", { name: /prepare automatically/i }));
  expect(prepare).toHaveBeenCalledWith("abc123abc123abc123abc123", registry.set.id, 3);
  expect(await screen.findByText(/ready for approval/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /approve and freeze/i })).toBeEnabled();
});

test("keeps the registry version selector in sync after approval", async () => {
  const ready: RequirementRegistryView = {
    ...registry,
    set: { ...registry.set, validation: { blocking: [], warnings: [] } },
    requirements: registry.requirements.map((item) => ({ ...item, inclusion_reviewed: true, mandatory_status: "not_mandatory", mandatory_reviewed: true, criterion_reviewed: true, verification_method: "document" })),
  };
  const approved: RequirementRegistryView = {
    ...ready,
    set: { ...ready.set, status: "approved", lock_version: 4, approved_at: "2026-08-20T12:00:00.000Z" },
  };
  approve.mockResolvedValue({ success: true, data: approved });
  render(<RequirementRegistryWorkspace
    proposalId="abc123abc123abc123abc123"
    initialRegistry={ready}
    initialSets={[{ ...ready.set, requirement_count: ready.requirements.length, freshness: ready.freshness }]}
    returnTo="/vendor-responses/response-1"
  />);

  await userEvent.click(screen.getByRole("button", { name: /approve and freeze/i }));

  expect(approve).toHaveBeenCalledWith("abc123abc123abc123abc123", ready.set.id, 3);
  expect(await screen.findByRole("option", { name: "Version 1 · Approved" })).toBeInTheDocument();
  expect(replace).toHaveBeenCalledWith("/vendor-responses/response-1");
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
    expect.objectContaining({ mandatoryStatus: "mandatory", mandatoryReviewed: true, criterionReviewed: true, verificationMethod: "document", included: true, inclusionReviewed: true }),
  );
});

test("a planner can exclude metadata or duplicate narrative from evaluation", async () => {
  update.mockResolvedValue({ success: true, data: registry });
  render(<RequirementRegistryWorkspace proposalId="abc123abc123abc123abc123" initialRegistry={registry} initialSets={[]} />);
  await userEvent.click(screen.getByText("Audio system required"));
  await userEvent.click(screen.getByRole("checkbox", { name: /include in vendor evaluation/i }));
  await userEvent.click(screen.getByRole("button", { name: /save review/i }));
  expect(update).toHaveBeenCalledWith(
    "abc123abc123abc123abc123",
    registry.set.id,
    registry.requirements[0].id,
    3,
    expect.objectContaining({ included: false, inclusionReviewed: true }),
  );
});

test("an approved, current registry offers to start a new version after confirmation", async () => {
  const { supersedeRequirementSetAction } = jest.requireMock("@/app/actions/requirementRegistry") as { supersedeRequirementSetAction: jest.Mock };
  const approved: RequirementRegistryView = {
    ...registry,
    set: { ...registry.set, status: "approved", lock_version: 4, approved_at: "2026-08-20T12:00:00.000Z", validation: { blocking: [], warnings: [] } },
  };
  const draft: RequirementRegistryView = { ...registry, set: { ...registry.set, id: "018f47b0-2222-7222-8222-222222222222", version: 2, status: "draft" } };
  supersedeRequirementSetAction.mockResolvedValue({ success: true, data: draft });
  const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
  render(<RequirementRegistryWorkspace
    proposalId="abc123abc123abc123abc123"
    initialRegistry={approved}
    initialSets={[{ ...approved.set, requirement_count: approved.requirements.length, freshness: approved.freshness }]}
  />);
  await userEvent.click(screen.getByRole("button", { name: /Start a new version/ }));
  expect(confirmSpy).toHaveBeenCalled();
  expect(supersedeRequirementSetAction).toHaveBeenCalledWith("abc123abc123abc123abc123", approved.set.id);
  expect(await screen.findByRole("option", { name: "Version 2 · Draft" })).toBeInTheDocument();
  confirmSpy.mockRestore();
});

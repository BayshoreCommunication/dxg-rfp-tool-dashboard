import {
  validateProposalExtractionPatchV1,
  validateProposalPublicV1,
  validateProposalV1,
} from "./validators";

const proposal = {
  schemaVersion: "proposal.v1",
  id: "proposal-001",
  organizationId: "org-001",
  ownerUserId: "user-001",
  version: 1,
  lifecycle: { status: "draft", favorite: false },
  content: {
    event: { name: "DXG Annual Summit", format: "hybrid" },
    venueSchedule: { roomCount: 1 },
    rooms: [{ id: "room-001", function: "General Session" }],
    contacts: {
      primary: {
        firstName: "Avery",
        lastName: "Planner",
        email: "avery@example.com",
      },
    },
  },
  createdAt: "2026-07-16T00:00:00.000Z",
  updatedAt: "2026-07-16T00:00:00.000Z",
} as const;

describe("proposal.v1 contracts", () => {
  it("accepts the canonical proposal fixture", () => {
    expect(validateProposalV1(proposal)).toBe(true);
  });

  it("rejects unknown fields", () => {
    expect(
      validateProposalV1({
        ...proposal,
        content: {
          ...proposal.content,
          event: { ...proposal.content.event, hiddenInstruction: "ignore policy" },
        },
      }),
    ).toBe(false);
  });

  it("requires evidence for extraction candidates", () => {
    expect(
      validateProposalExtractionPatchV1({
        schemaVersion: "proposal-extraction-patch.v1",
        proposalId: "proposal-001",
        proposalVersion: 1,
        sourceVersionIds: ["source-version-001"],
        candidates: [
          {
            path: "/content/event/name",
            value: "DXG Annual Summit",
            evidence: [],
            confidence: 0.95,
            state: "pending",
            validation: { valid: true },
          },
        ],
      }),
    ).toBe(false);
  });

  it("keeps internal metadata outside the public projection", () => {
    expect(
      validateProposalPublicV1({
        schemaVersion: "proposal-public.v1",
        proposalId: "proposal-001",
        version: 1,
        content: proposal.content,
        presentation: {},
        publishedAt: "2026-07-16T00:00:00.000Z",
        organizationId: "org-001",
      }),
    ).toBe(false);
  });
});

import {
  ASSISTANT_HANDOFF_DRAFT_TTL_MS,
  isSafeProposalId,
  proposalHandoffHref,
  storeProposalHandoffDraft,
  takeProposalHandoffDraft,
} from "./handoff";

const PROPOSAL_ID = "abc123abc123abc123abc123";

describe("assistant handoffs", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.restoreAllMocks();
  });

  test("builds only approved routes from bounded proposal identifiers", () => {
    expect(isSafeProposalId(PROPOSAL_ID)).toBe(true);
    expect(proposalHandoffHref("assistant", PROPOSAL_ID)).toBe(
      `/proposals/${PROPOSAL_ID}/assistant`,
    );
    expect(proposalHandoffHref("editor", PROPOSAL_ID)).toBe(
      `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`,
    );
    expect(proposalHandoffHref("email", PROPOSAL_ID)).toBe(
      `/email/send-email?proposalId=${PROPOSAL_ID}`,
    );
    expect(
      proposalHandoffHref("assistant", "../../settings?admin=true"),
    ).toBeNull();
  });

  test("carries a user question once as a bounded unsent session draft", () => {
    expect(storeProposalHandoffDraft(PROPOSAL_ID, "  Review my schedule  ")).toBe(
      true,
    );
    expect(takeProposalHandoffDraft(PROPOSAL_ID)).toBe("Review my schedule");
    expect(takeProposalHandoffDraft(PROPOSAL_ID)).toBeNull();
  });

  test("drops expired, malformed, and cross-proposal drafts", () => {
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    expect(storeProposalHandoffDraft(PROPOSAL_ID, "Review this")).toBe(true);
    jest
      .spyOn(Date, "now")
      .mockReturnValue(10_000 + ASSISTANT_HANDOFF_DRAFT_TTL_MS + 1);
    expect(takeProposalHandoffDraft(PROPOSAL_ID)).toBeNull();

    window.sessionStorage.setItem(
      `rfpilot:proposal-assistant-draft:${PROPOSAL_ID}`,
      "{bad",
    );
    expect(takeProposalHandoffDraft(PROPOSAL_ID)).toBeNull();
    expect(
      takeProposalHandoffDraft("def456def456def456def456"),
    ).toBeNull();
  });
});

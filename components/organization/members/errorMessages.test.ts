import { bulkInviteOutcome, singleInviteOutcome } from "../invitations/inviteResults";
import { formatWait, isVersionConflict, orgErrorMessage, ownedRfpCount } from "./errorMessages";

describe("orgErrorMessage", () => {
  it("maps known codes to human messages", () => {
    expect(orgErrorMessage({ code: "TEAM_MANAGER_ROLE_REQUIRED", message: "x" })).toMatch(/Team Manager role/);
    expect(orgErrorMessage({ code: "TEAM_NAME_TAKEN" })).toBe("An active team already has this name.");
  });

  it("includes the proposal count for OWNER_HAS_RFPS", () => {
    expect(orgErrorMessage({ code: "OWNER_HAS_RFPS", details: { ownedRfpCount: 3 } })).toBe("This member still owns 3 proposals. Reassign them first.");
    expect(orgErrorMessage({ code: "OWNER_HAS_RFPS", details: { ownedRfpCount: 1 } })).toMatch(/1 proposal\./);
  });

  it("shows the wait for the resend cooldown and the daily limit", () => {
    expect(orgErrorMessage({ code: "INVITATION_RESEND_COOLDOWN", details: { retryAfterSeconds: 200 } })).toMatch(/in 4 minutes/);
    expect(orgErrorMessage({ code: "INVITATION_DAILY_LIMIT", details: { remaining: 0, retryAfterSeconds: 7200 } })).toMatch(/today's invitation limit\. Try again in 2 hours/);
    expect(orgErrorMessage({ code: "INVITATION_DAILY_LIMIT", details: { remaining: 4, retryAfterSeconds: 60 } })).toMatch(/4 invitations left today/);
  });

  it("never shows a raw code", () => {
    expect(orgErrorMessage({ code: "SOMETHING_NEW", message: "SOMETHING_NEW" }, "Fallback")).toBe("Fallback");
    expect(orgErrorMessage({ code: "SOMETHING_NEW", message: "A readable reason." })).toBe("A readable reason.");
  });

  it("explains rate limits and permission refusals without a code", () => {
    expect(orgErrorMessage({ status: 429, details: { retryAfterSeconds: 30 } })).toMatch(/30 seconds/);
    expect(orgErrorMessage({ status: 403 })).toMatch(/permission/);
  });

  it("detects version conflicts and proposal ownership refusals", () => {
    expect(isVersionConflict({ code: "STALE_VERSION" })).toBe(true);
    expect(ownedRfpCount({ code: "OWNER_HAS_RFPS", details: { ownedRfpCount: 2 } })).toBe(2);
    expect(ownedRfpCount({ code: "STALE_VERSION" })).toBeNull();
  });

  it("formats waits", () => {
    expect(formatWait(1)).toBe("1 second");
    expect(formatWait(61)).toBe("2 minutes");
    expect(formatWait(0)).toBe("a moment");
  });
});

describe("invite outcomes", () => {
  it("turns a bulk response into one row per address with human reasons", () => {
    const outcome = bulkInviteOutcome({
      success: true,
      message: "OK",
      data: {
        summary: { total: 2, invited: 1, refused: 1 },
        rows: [
          { row: 1, email: "a@x.com", outcome: "invited", invitation: {} as never },
          { row: 2, email: "b@x.com", outcome: "refused", code: "ALREADY_MEMBER", message: "ALREADY_MEMBER" },
        ],
      },
    });
    expect(outcome).toEqual({
      kind: "rows",
      invited: 1,
      refused: 1,
      rows: [
        { row: 1, email: "a@x.com", invited: true },
        { row: 2, email: "b@x.com", invited: false, reason: "This person is already a member of the organization." },
      ],
    });
  });

  it("shows a single-address refusal as a row, and a request-level refusal as an error", () => {
    expect(singleInviteOutcome("a@x.com", { success: false, message: "", code: "ALREADY_INVITED", status: 409 })).toMatchObject({
      kind: "rows",
      rows: [{ email: "a@x.com", invited: false, reason: expect.stringMatching(/open invitation/) }],
    });
    expect(singleInviteOutcome("a@x.com", { success: false, message: "", code: "INVITATION_DAILY_LIMIT", status: 429, details: { remaining: 0, retryAfterSeconds: 3600 } }))
      .toEqual({ kind: "error", message: expect.stringMatching(/1 hour/) });
  });
});

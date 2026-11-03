import type { OrgActionResult } from "@/app/actions/organizationApi";
import { orgErrorMessage } from "../members/errorMessages";
import type { BulkInviteResult, Invitation } from "../members/types";

// One line per address in the invite dialog's result view.
export type InviteRowView = { row: number; email: string; invited: boolean; reason?: string };

// Refusals that belong to one address (the single endpoint answers them as 400/409). Anything
// else — daily limit, permissions, a missing team — refuses the whole request.
const ROW_REFUSALS = new Set([
  "INVALID_EMAIL",
  "DUPLICATE_IN_LIST",
  "ALREADY_INVITED",
  "ALREADY_MEMBER",
  "MEMBER_DEACTIVATED",
  "EMAIL_IN_ANOTHER_ORGANIZATION",
  "LEGACY_ACCOUNT_PENDING_PLACEMENT",
]);

export type InviteOutcome =
  | { kind: "rows"; rows: InviteRowView[]; invited: number; refused: number }
  | { kind: "error"; message: string };

const summarize = (rows: InviteRowView[]): InviteOutcome => {
  const invited = rows.filter((row) => row.invited).length;
  return { kind: "rows", rows, invited, refused: rows.length - invited };
};

export const singleInviteOutcome = (email: string, result: OrgActionResult<Invitation>): InviteOutcome => {
  if (result.success) return summarize([{ row: 1, email: result.data?.email ?? email, invited: true }]);
  if (result.code && ROW_REFUSALS.has(result.code)) {
    return summarize([{ row: 1, email, invited: false, reason: orgErrorMessage(result) }]);
  }
  return { kind: "error", message: orgErrorMessage(result, "The invitation couldn't be sent. Try again.") };
};

export const bulkInviteOutcome = (result: OrgActionResult<BulkInviteResult>): InviteOutcome => {
  if (!result.success || !result.data) {
    return { kind: "error", message: orgErrorMessage(result, "The invitations couldn't be sent. Try again.") };
  }
  return summarize(
    result.data.rows.map((row) =>
      row.outcome === "invited"
        ? { row: row.row, email: row.email, invited: true }
        : { row: row.row, email: row.email, invited: false, reason: orgErrorMessage({ code: row.code, message: row.message }) },
    ),
  );
};

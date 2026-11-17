// What the signed-in member may do to one listed proposal. The backend sends this on every item
// of GET /api/v1/rfps (dashboard) and GET /api/proposals (Proposals page) as
// `permissions: { canEdit, canDuplicate, canArchive }`; each flag is the answer the mutation
// endpoint itself would give (backend docs/API.md, "Row permissions"). The flags describe
// permission, not state: canArchive on an archived proposal means the member may restore it.
export type RowPermissions = { canEdit: boolean; canDuplicate: boolean; canArchive: boolean };

const FLAGS = ["canEdit", "canDuplicate", "canArchive"] as const;

// The flags of an item, or undefined when the item has no `permissions` key at all. A value
// that is present is read flag by flag and fails closed: only a literal `true` grants an action,
// so `null`, a partial object or non-boolean flags never give back what the backend didn't grant.
export const toRowPermissions = (value: unknown): RowPermissions | undefined => {
  if (value === undefined) return undefined;
  const record = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const [canEdit, canDuplicate, canArchive] = FLAGS.map((flag) => record[flag] === true);
  return { canEdit, canDuplicate, canArchive };
};

// The one place both lists decide between the row's own flags and the rule they used before.
// The dashboard deploys on merge and the API on its own release, so an item from an older API
// has no `permissions` key: only then does `legacy` answer, exactly as the list did before the
// flags existed.
// TODO: remove the `legacy` fallback once the backend release that sends `permissions`
// (dxg-rfp-tool-backend#136) is confirmed live in production, together with the rules passed to
// it: `legacyRowActions` in components/dashboard/rfpDashboardModel.ts, and the `readOnly` prop of
// components/proposals/ProposalTableList.tsx that components/proposals/ProposalsDetials.tsx passes.
export const rowPermissionsOr = (value: unknown, legacy: () => RowPermissions): RowPermissions =>
  toRowPermissions(value) ?? legacy();

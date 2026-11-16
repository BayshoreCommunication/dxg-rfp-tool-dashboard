// What the signed-in member may do to one listed proposal. The backend sends this on every item
// of GET /api/v1/rfps (dashboard) and GET /api/proposals (Proposals page) as
// `permissions: { canEdit, canDuplicate, canArchive }`; each flag is the answer the mutation
// endpoint itself would give (backend docs/API.md, "Row permissions"). The flags describe
// permission, not state: canArchive on an archived proposal means the member may restore it.
export type RowPermissions = { canEdit: boolean; canDuplicate: boolean; canArchive: boolean };

const FLAGS = ["canEdit", "canDuplicate", "canArchive"] as const;

// The flags as the backend sent them, or null when the item carries none (or something that
// isn't three booleans, which is read the same way as none).
export const toRowPermissions = (value: unknown): RowPermissions | null => {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!FLAGS.every((flag) => typeof record[flag] === "boolean")) return null;
  return { canEdit: record.canEdit === true, canDuplicate: record.canDuplicate === true, canArchive: record.canArchive === true };
};

// The one place both lists decide between the row's own flags and the rule they used before.
// The dashboard deploys on merge and the API on its own release, so an item from an older API
// has no `permissions`: `legacy` then answers exactly as the list did before the flags existed.
// TODO: remove the `legacy` fallback (and the rules passed to it) once the backend release that
// sends `permissions` (dxg-rfp-tool-backend#136) is confirmed live in production.
export const rowPermissionsOr = (value: unknown, legacy: () => RowPermissions): RowPermissions =>
  toRowPermissions(value) ?? legacy();

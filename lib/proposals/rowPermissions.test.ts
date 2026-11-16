import { rowPermissionsOr, toRowPermissions } from "./rowPermissions";

const legacy = { canEdit: true, canDuplicate: true, canArchive: true };

describe("row permissions", () => {
  it("reads the flags the backend sent", () => {
    expect(toRowPermissions({ canEdit: true, canDuplicate: true, canArchive: false })).toEqual({ canEdit: true, canDuplicate: true, canArchive: false });
    expect(toRowPermissions({ canEdit: false, canDuplicate: false, canArchive: false, extra: 1 })).toEqual({ canEdit: false, canDuplicate: false, canArchive: false });
  });

  it("reads anything that isn't three booleans as no flags", () => {
    for (const value of [undefined, null, "yes", 1, [], {}, { canEdit: true }, { canEdit: "true", canDuplicate: true, canArchive: true }]) {
      expect(toRowPermissions(value)).toBeNull();
    }
  });

  it("uses the row's flags when it has them, without consulting the old rule", () => {
    const old = jest.fn(() => legacy);
    expect(rowPermissionsOr({ canEdit: false, canDuplicate: true, canArchive: false }, old)).toEqual({ canEdit: false, canDuplicate: true, canArchive: false });
    expect(old).not.toHaveBeenCalled();
  });

  it("falls back to the old rule for an item from an API that sends no flags", () => {
    expect(rowPermissionsOr(undefined, () => legacy)).toEqual(legacy);
    expect(rowPermissionsOr(null, () => ({ canEdit: false, canDuplicate: true, canArchive: true }))).toEqual({ canEdit: false, canDuplicate: true, canArchive: true });
  });
});

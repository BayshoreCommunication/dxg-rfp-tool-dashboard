import { rowPermissionsOr, toRowPermissions } from "./rowPermissions";

const legacy = { canEdit: true, canDuplicate: true, canArchive: true };

describe("row permissions", () => {
  it("reads the flags the backend sent", () => {
    expect(toRowPermissions({ canEdit: true, canDuplicate: true, canArchive: false })).toEqual({ canEdit: true, canDuplicate: true, canArchive: false });
    expect(toRowPermissions({ canEdit: false, canDuplicate: false, canArchive: false, extra: 1 })).toEqual({ canEdit: false, canDuplicate: false, canArchive: false });
  });

  it("fails closed on a value that is present but malformed: only a literal true grants an action", () => {
    const none = { canEdit: false, canDuplicate: false, canArchive: false };
    for (const value of [null, "yes", 1, true, [], {}, { canEdit: "true", canDuplicate: 1, canArchive: "yes" }]) {
      expect(toRowPermissions(value)).toEqual(none);
    }
    expect(toRowPermissions({ canEdit: true })).toEqual({ ...none, canEdit: true });
    expect(toRowPermissions({ canEdit: false })).toEqual(none);
    expect(toRowPermissions({ canEdit: "true", canDuplicate: true, canArchive: null })).toEqual({ ...none, canDuplicate: true });
  });

  it("reads only an absent key as no flags sent", () => {
    expect(toRowPermissions(undefined)).toBeUndefined();
    expect(toRowPermissions(({} as { permissions?: unknown }).permissions)).toBeUndefined();
  });

  it("uses the row's flags when it has them, without consulting the old rule", () => {
    const old = jest.fn(() => legacy);
    expect(rowPermissionsOr({ canEdit: false, canDuplicate: true, canArchive: false }, old)).toEqual({ canEdit: false, canDuplicate: true, canArchive: false });
    expect(old).not.toHaveBeenCalled();
  });

  it("falls back to the old rule only for an item from an API that sends no flags", () => {
    expect(rowPermissionsOr(undefined, () => legacy)).toEqual(legacy);
    expect(rowPermissionsOr(undefined, () => ({ canEdit: false, canDuplicate: true, canArchive: true }))).toEqual({ canEdit: false, canDuplicate: true, canArchive: true });
  });

  it("never consults the old rule for a present value, however malformed", () => {
    const old = jest.fn(() => legacy);
    for (const value of [null, {}, { canEdit: false }, { canEdit: "true", canDuplicate: "true", canArchive: "true" }, "all"]) {
      expect(rowPermissionsOr(value, old)).toEqual({ canEdit: false, canDuplicate: false, canArchive: false });
    }
    expect(old).not.toHaveBeenCalled();
  });
});

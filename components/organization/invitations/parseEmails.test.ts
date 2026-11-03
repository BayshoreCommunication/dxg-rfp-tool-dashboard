import { parseEmailList, summarizeEmailList, MAX_BULK_INVITATIONS } from "./parseEmails";

describe("parseEmailList", () => {
  it("splits on new lines, commas and semicolons and drops blanks", () => {
    expect(parseEmailList("a@x.com\nb@x.com, c@x.com;d@x.com\r\n\n ,  ")).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com"]);
  });

  it("takes the address out of display-name entries", () => {
    expect(parseEmailList('"Jane Doe" <jane@x.com>, Sam <sam@x.com>')).toEqual(["jane@x.com", "sam@x.com"]);
  });

  it("keeps invalid entries in order so the backend reports them per row", () => {
    expect(parseEmailList("ok@x.com\nnot-an-email\nalso@x.com")).toEqual(["ok@x.com", "not-an-email", "also@x.com"]);
  });

  it("returns nothing for empty input", () => {
    expect(parseEmailList("   \n\n")).toEqual([]);
  });
});

describe("summarizeEmailList", () => {
  it("flags invalid and repeated addresses, ignoring case", () => {
    const summary = summarizeEmailList("a@x.com\nbad\nA@X.com");
    expect(summary.emails).toHaveLength(3);
    expect(summary.invalid).toEqual(["bad"]);
    expect(summary.duplicates).toEqual(["A@X.com"]);
    expect(summary.tooMany).toBe(false);
  });

  it("flags lists over the bulk limit", () => {
    const list = Array.from({ length: MAX_BULK_INVITATIONS + 1 }, (_, i) => `p${i}@x.com`).join("\n");
    expect(summarizeEmailList(list).tooMany).toBe(true);
  });
});

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { RFP_NOUN, withoutComments } from "@/test/wording";

// The user-facing noun is "proposal" (owner decision, 2026-11-11): no on-screen text may call
// the document a planner writes an "RFP". The product name RFPilot is allowed, and so are the
// documented exceptions below. Comments and identifiers (rfpId, RfpUsage, INVALID_RFP_SELECTION)
// are not on screen and are not checked.
const ROOTS = ["app", "components", "config", "lib"];

// Deliberate exceptions: [file, text on the line]. Each one says why it stays.
const ALLOWED: Array<[file: string, text: string]> = [
  // The one sentence that tells a newcomer what a "proposal" is in RFPilot, in the industry's term.
  ["components/proposals/TopHeader.tsx", "The requests for proposal (RFPs) you write and send to vendors."],
  // The RFPilot wordmark, drawn as "RFP" + an accented "ilot".
  ["components/proposalTemplate/ProposalRfpTemplate.tsx", 'RFP<span className="dxg-brand-wordmark-accent">ilot</span>'],
  ["components/vendor/workspace/VendorResponseWorkspace.tsx", 'RFP<span className="text-[#2fc6f5]">ilot</span>'],
];

// Files two open pull requests are rewording themselves (feat/dashboard-list-refactor and
// fix/proposal-title-link-and-role-info). Delete each entry when its pull request merges.
const PENDING = [
  /^components\/dashboard\//,
  /^app\/\(page\)\/dashboard\//,
  /^app\/actions\/rfpDashboard/,
  /^components\/proposals\/ProposalTableList\.tsx$/,
  /^components\/organization\/members\//,
  /^app\/\(page\)\/settings\/users\//,
];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|html)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

describe("user-facing wording", () => {
  it('says "proposal", not "RFP", in on-screen text', () => {
    const leftovers = ROOTS.flatMap((root) => sourceFiles(join(process.cwd(), root))).flatMap((path) => {
      const file = path.replace(process.cwd() + "/", "");
      if (PENDING.some((pattern) => pattern.test(file))) return [];
      const allowed = ALLOWED.filter(([allowedFile]) => allowedFile === file).map(([, text]) => text);
      return withoutComments(readFileSync(path, "utf8"))
        .split("\n")
        .map((text, index) => ({ line: index + 1, text }))
        .filter(({ text }) => RFP_NOUN.test(allowed.reduce((rest, phrase) => rest.replace(phrase, ""), text)))
        .map(({ line, text }) => `${file}:${line} ${text.trim()}`);
    });
    expect(leftovers).toEqual([]);
  });

  it("keeps every documented exception in use", () => {
    const stale = ALLOWED.filter(([file, text]) => !readFileSync(join(process.cwd(), file), "utf8").includes(text));
    expect(stale).toEqual([]);
  });

  it("tells the noun from the product name and from identifiers", () => {
    expect(RFP_NOUN.test("New RFP")).toBe(true);
    expect(RFP_NOUN.test("your RFPs")).toBe(true);
    expect(RFP_NOUN.test("this RFP's owner")).toBe(true);
    expect(RFP_NOUN.test("RFPilot Support")).toBe(false);
    expect(RFP_NOUN.test("INVALID_RFP_SELECTION rfpId RfpUsage")).toBe(false);
    expect(withoutComments('a // RFP\n"https://x" /* RFP\nRFP */ b')).not.toMatch(RFP_NOUN);
  });
});

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// The product is RFPilot: no visible "DXG" text may come back. Identifiers
// (callWithDxgProducer, isDxgSide) and the stored "DXG Runs Rehearsal"
// answer value are allowed.
const ROOTS = ["app", "components", "config", "lib"];
const ALLOWED = /callWithDxgProducer|isDxgSide|"DXG Runs Rehearsal"/;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|html)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

describe("RFPilot branding", () => {
  it("has no visible DXG text left in the app", () => {
    const leftovers = ROOTS.flatMap((root) => sourceFiles(join(process.cwd(), root)))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .map((line, index) => ({ file, line: index + 1, text: line }))
          .filter(({ text }) => /\b(DXG|Dxg|DxG)\b/.test(text) && !ALLOWED.test(text)),
      )
      .map(({ file, line, text }) => `${file.replace(process.cwd() + "/", "")}:${line} ${text.trim()}`);
    expect(leftovers).toEqual([]);
  });
});

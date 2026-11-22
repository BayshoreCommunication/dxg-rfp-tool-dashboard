/** @jest-environment node */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// U+FFFD is what a failed decode leaves behind. It once reached user-facing toast text
// ("No matching fields found, then garbage, please fill the form manually"), so fail on any new one.
const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components", "lib", "contracts", "config"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".json", ".mjs"]);
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return EXTENSIONS.has(path.extname(name)) ? [full] : [];
  });

test("no source file contains the Unicode replacement character", () => {
  const offenders = SCAN_DIRS.map((dir) => path.join(ROOT, dir))
    .filter((dir) => { try { return statSync(dir).isDirectory(); } catch { return false; } })
    .flatMap(sourceFiles)
    .filter((file) => readFileSync(file, "utf8").includes(REPLACEMENT_CHARACTER))
    .map((file) => path.relative(ROOT, file));
  expect(offenders).toEqual([]);
});

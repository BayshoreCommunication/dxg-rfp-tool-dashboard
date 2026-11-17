import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Owner decision, 2026-11-17: the customer-facing Support access feature is gone. Nothing in the
// app may import its modules, call its server actions or link to its screen again.
const ROOTS = ["app", "components", "config", "lib"];
const REMOVED_PATHS = [
  "app/(page)/settings/support-access",
  "app/actions/supportGrants.ts",
  "components/organization/supportAccess",
  "e2e/support-access.spec.ts",
  "e2e/support/supportGrantsFixture.mjs",
];
const REMOVED_REFERENCES = /supportAccess\/|actions\/supportGrants|SupportAccessLink|SupportAccessSettings|supportGrantModel|GrantSupportDialog|GrantActivityDialog|settings\/support-access|organization\/support-grants/;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|mjs|js)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

describe("Support access is removed", () => {
  it("has no screen, server action, component or stub left", () => {
    expect(REMOVED_PATHS.filter((path) => existsSync(join(process.cwd(), path)))).toEqual([]);
  });

  it("is not imported, called or linked to from anywhere in the app", () => {
    const references = ROOTS.flatMap((root) => sourceFiles(join(process.cwd(), root))).flatMap((path) =>
      readFileSync(path, "utf8").split("\n")
        .map((text, index) => ({ text, where: `${path.replace(process.cwd() + "/", "")}:${index + 1}` }))
        .filter(({ text }) => REMOVED_REFERENCES.test(text))
        .map(({ where }) => where));
    expect(references).toEqual([]);
  });
});

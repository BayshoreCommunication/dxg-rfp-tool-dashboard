/** @jest-environment node */
import { readFileSync } from "node:fs";
import path from "node:path";

// Reads app/styles/tokens.css and enforces the design system's accessibility contract in
// both themes, so a colour change that breaks WCAG AA fails here rather than in review.
const ROOT = path.resolve(__dirname, "..");
const css = readFileSync(path.join(ROOT, "app/styles/tokens.css"), "utf8");
const globals = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");

const block = (selector: RegExp): string => {
  const match = css.match(new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Block ${selector} not found in tokens.css`);
  return match[1];
};

const declarations = (body: string): Record<string, string> =>
  Object.fromEntries(
    [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  );

const themes = {
  light: declarations(block(/:root/)),
  dark: declarations(block(/\.dark/)),
} as const;

type Theme = keyof typeof themes;

const hex = (theme: Theme, token: string): string => {
  const value = themes[theme][`--${token}`];
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`--${token} (${theme}) is not a 6-digit hex: ${value}`);
  return value;
};

const luminance = (color: string): number => {
  const channels = [1, 3, 5]
    .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Readable text: WCAG 1.4.3 AA, 4.5:1.
const TEXT_PAIRS: Array<[fg: string, bg: string[]]> = [
  ["heading", ["page", "surface", "surface-muted"]],
  ["body", ["page", "surface", "surface-muted"]],
  ["muted", ["page", "surface", "surface-muted"]],
  ["action", ["page", "surface", "surface-muted", "brand-soft"]],
  ["action-hover", ["surface"]],
  ["on-action", ["action", "action-hover"]],
  ["success-strong", ["page", "surface", "success-soft"]],
  ["warning-strong", ["page", "surface", "warning-soft"]],
  ["danger-strong", ["page", "surface", "danger-soft"]],
];

// Non-text UI that must be perceivable on its own: WCAG 1.4.11, 3:1.
const UI_PAIRS: Array<[fg: string, bg: string[]]> = [
  ["control", ["surface"]],
  ["brand", ["surface"]],
];

describe.each(["light", "dark"] as Theme[])("design tokens (%s theme)", (theme) => {
  test.each(TEXT_PAIRS.flatMap(([fg, bgs]) => bgs.map((bg) => [fg, bg] as const)))(
    "text --%s on --%s meets AA (4.5:1)",
    (fg, bg) => {
      expect(contrast(hex(theme, fg), hex(theme, bg))).toBeGreaterThanOrEqual(4.5);
    },
  );

  test.each(UI_PAIRS.flatMap(([fg, bgs]) => bgs.map((bg) => [fg, bg] as const)))(
    "UI --%s on --%s meets 3:1",
    (fg, bg) => {
      expect(contrast(hex(theme, fg), hex(theme, bg))).toBeGreaterThanOrEqual(3);
    },
  );
});

describe("token structure", () => {
  // Shape (--r-*) does not change with the theme, so it is defined once in :root.
  const themed = (tokens: Record<string, string>) => Object.keys(tokens).filter((name) => !name.startsWith("--r-")).sort();

  test("light and dark define exactly the same themed tokens", () => {
    expect(themed(themes.dark)).toEqual(themed(themes.light));
  });

  test("every Tailwind colour utility maps to a token defined in both themes", () => {
    const mappings = [...css.matchAll(/(--color-[a-z-]+)\s*:\s*var\((--[a-z-]+)\)/g)];
    expect(mappings.length).toBeGreaterThan(20);
    for (const [, , source] of mappings) {
      expect(themes.light).toHaveProperty([source]);
      expect(themes.dark).toHaveProperty([source]);
    }
  });

  test("--subtle is documented as decorative and is not used as a text pair", () => {
    expect(css).toMatch(/--subtle:[^;]+;/);
    expect(TEXT_PAIRS.map(([fg]) => fg)).not.toContain("subtle");
  });

  test("the legacy brand token carries the approved brand colour", () => {
    expect(globals).toMatch(/--color-brand:\s*#218ccb;/i);
    expect(themes.light["--brand"]).toBe("#218ccb");
  });

  test("tokens.css is imported by globals.css", () => {
    expect(globals).toMatch(/@import\s+"\.\/styles\/tokens\.css";/);
  });
});

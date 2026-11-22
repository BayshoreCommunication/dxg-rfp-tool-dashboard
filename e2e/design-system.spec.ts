import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const signIn = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("assistant-e2e@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
};

const setTheme = async (page: Page, theme: "light" | "dark") => {
  const isDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
  if ((theme === "dark") !== isDark) await page.getByTestId("dev-theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
};

test.describe("design-system gallery", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`renders every primitive state with no serious accessibility violations (${theme})`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await signIn(page);
      await page.goto("/dev/design-system");
      await expect(page.getByRole("heading", { name: "Design system", level: 1 })).toBeVisible();
      await setTheme(page, theme);

      // Every section is present.
      for (const name of ["Colour tokens", "Typography", "Buttons", "Fields", "Cards", "Inline alerts", "Badges", "Skeleton"]) {
        await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
      }
      // Field wiring in the rendered page: every labelled control resolves by its label.
      await expect(page.getByLabel(/Required with hint/)).toHaveAttribute("aria-required", "true");
      await expect(page.getByLabel("Error", { exact: false }).first()).toHaveAttribute("aria-invalid", "true");

      // No horizontal overflow at this viewport.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      const results = await new AxeBuilder({ page })
        .include('[data-testid="design-system-gallery"]')
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const blocking = results.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""));
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);

      const shot = `gallery-${theme}-${testInfo.project.name}.png`;
      await page.screenshot({ path: testInfo.outputPath(shot), fullPage: true });
      if (process.env.DS_SHOTS_DIR) await page.screenshot({ path: path.join(process.env.DS_SHOTS_DIR, shot), fullPage: true });
    });
  }
});

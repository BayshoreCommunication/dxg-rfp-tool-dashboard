import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Runs under playwright.onboarding.config.ts (conversations flag on), like proposal-onboarding.

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("assistant-e2e@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
});

for (const theme of ["light", "dark"] as const) {
  test(`the new-proposal entry screen has no serious accessibility violations (${theme})`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/proposals/add-new-proposal");
    await expect(page.getByText("Let’s build your event proposal", { exact: true })).toBeVisible();
    const isDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
    if ((theme === "dark") !== isDark) await page.getByTestId("dev-theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);

    // The starters and their hints are named.
    const starters = page.getByRole("group", { name: "Ways to start" });
    await expect(starters.getByRole("button")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Upload my brief or old proposal" })).toHaveAccessibleDescription(/PDF, DOCX/);

    const results = await new AxeBuilder({ page })
      .include('[aria-label="Proposal assistant workspace"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""));
    expect(
      blocking.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).slice(0, 3).join(" | ")}`),
    ).toEqual([]);
  });
}

import { expect, test } from "@playwright/test";

const signInAs = async (page: import("@playwright/test").Page, role: string) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`${role}-e2e@example.com`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("role-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
  await expect(page.getByTestId("role-dashboard")).toBeVisible({ timeout: 45_000 });
};

test("changing a dashboard filter keeps the reader where they were", async ({ page }) => {
  test.setTimeout(180_000);
  // A short window puts the status tabs below the fold, which is the situation
  // the reader is in when they reach down the page to change a filter.
  await page.setViewportSize({ width: 1280, height: 460 });
  await signInAs(page, "planner");

  const tabs = page.getByRole("link", { name: /^Draft/ }).first();
  await tabs.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => Math.round(window.scrollY));
  await tabs.click();
  await expect(page).toHaveURL(/stage=/, { timeout: 45_000 });
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => Math.round(window.scrollY));
  console.log(`SCROLL before=${before} after=${after}`);
  expect(before, "the tabs were not below the fold; the test proves nothing").toBeGreaterThan(100);
  expect(Math.abs(after - before), "the page jumped on a filter change").toBeLessThanOrEqual(80);
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const fixtureUrl = "http://127.0.0.1:8011/__e2e/proposal-deletion";

test.beforeEach(async ({ page }) => {
  await page.request.post("http://127.0.0.1:8011/__e2e/reset");
  await page.request.post(fixtureUrl, { data: { seed: true } });
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("assistant-e2e@example.com");
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await page.goto("/proposals");
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
});

test("safe focus, keyboard containment, Escape and Cancel make no delete request", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const trigger = page.getByRole("button", { name: "Delete", exact: true });
  await trigger.click();
  const dialog = page.getByRole("alertdialog", { name: "Archive this proposal?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await expect(dialog.getByText("QA ONLY — Annual Leadership Summit")).toBeVisible();
  await expect(dialog.getByText("30 days to change your mind")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Move to archive" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close proposal deletion dialog" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Move to archive" })).toBeFocused();
  expect((await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("archive-modal.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await trigger.click();
  await dialog.getByRole("button", { name: "Close proposal deletion dialog" }).click();
  await expect(dialog).toBeHidden();
  await trigger.click();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeHidden();
  expect((await (await page.request.get(fixtureUrl)).json()).requests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("archive request is guarded while pending and can be retried after failure", async ({ page }) => {
  await page.request.post(fixtureUrl, { data: { failNext: true, hold: true } });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Move to archive" }).click();
  await expect(dialog.getByRole("button", { name: "Archiving…" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect.poll(async () => (await (await page.request.get(fixtureUrl)).json()).requests.length).toBe(1);
  await page.request.post(fixtureUrl, { data: { release: true } });
  await expect(dialog.getByRole("alert")).toHaveText("Temporary test failure. Please try again.");
  await dialog.getByRole("button", { name: "Move to archive" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/No proposals found for this filter/)).toBeVisible();
  expect((await (await page.request.get(fixtureUrl)).json()).requests).toEqual([
    { id: "dddddddddddddddddddddddd", permanent: false },
    { id: "dddddddddddddddddddddddd", permanent: false },
  ]);
  await page.getByRole("button", { name: /^ARCHIVE/ }).click();
  await expect(page.getByRole("heading", { name: "QA ONLY — Annual Leadership Summit", exact: true })).toBeVisible();
});

test("permanent delete has a distinct confirmation and uses only the permanent endpoint", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: /^ARCHIVE/ }).click();
  await page.getByRole("button", { name: "Delete forever", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete proposal forever?" });
  await expect(dialog.getByText("This cannot be undone")).toBeVisible();
  await expect(dialog.getByText("Archived QA proposal")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("permanent-delete-modal.png") });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect((await (await page.request.get(fixtureUrl)).json()).requests).toEqual([]);
  await page.getByRole("button", { name: "Delete forever", exact: true }).click();
  await dialog.getByRole("button", { name: "Delete forever", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/No proposals found for this filter/)).toBeVisible();
  expect((await (await page.request.get(fixtureUrl)).json()).requests).toEqual([
    { id: "eeeeeeeeeeeeeeeeeeeeeeee", permanent: true },
  ]);
});

test("long proposal names fit a narrow screen without hiding the actions", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const name = "QA ONLY — International Healthcare Innovation and Leadership Summit — " + "LongProposalName".repeat(15);
  await page.request.post(fixtureUrl, { data: { seed: true, name } });
  await page.reload();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText(name, { exact: true })).toBeVisible();
  for (const label of ["Cancel", "Move to archive"]) {
    const button = dialog.getByRole("button", { name: label, exact: true });
    await expect(button).toBeInViewport();
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("narrow-long-name-modal.png") });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect((await (await page.request.get(fixtureUrl)).json()).requests).toEqual([]);
});

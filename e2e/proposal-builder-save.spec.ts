import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Runs under playwright.onboarding.config.ts (conversations flag on, onboarding fixture backend).
//
// Draft saves from the builder: what is written, and how the builder recovers when a save fails
// or overlaps another. The key-path file pins the *shape* of the request bodies (every key path and
// value type, never values). It was recorded from `main` before the redesign, so these tests also
// prove the redesign did not change what the builder sends. To re-record after an intentional
// contract change: WRITE_PAYLOAD_KEYS=1 npx playwright test -c playwright.onboarding.config.ts e2e/proposal-builder-save.spec.ts

const fixture = "http://127.0.0.1:8011/__e2e/onboarding";
const KEYS_FILE = path.join(__dirname, "fixtures", "builderPayloadKeys.json");
const builderUrl = "/proposals/proposal-edit?proposalId=cccccccccccccccccccccccc&step=1";

type Put = { failed: boolean; payload: Record<string, unknown> };
const recordedPuts = async (page: Page): Promise<Put[]> => (await (await page.request.get(fixture)).json()).puts;

const keyPaths = (value: unknown, prefix = "", out = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    out.add(`${prefix}:array`);
    value.forEach((item) => keyPaths(item, `${prefix}[]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) keyPaths(child, prefix ? `${prefix}.${key}` : key, out);
  } else {
    out.add(`${prefix}:${value === null ? "null" : typeof value}`);
  }
  return out;
};

const checkShape = (name: string, payload: Record<string, unknown>) => {
  const actual = [...keyPaths(payload)].sort();
  if (process.env.WRITE_PAYLOAD_KEYS) {
    const existing = existsSync(KEYS_FILE) ? JSON.parse(readFileSync(KEYS_FILE, "utf8")) : {};
    writeFileSync(KEYS_FILE, `${JSON.stringify({ ...existing, [name]: actual }, null, 2)}\n`);
    return;
  }
  const expected = JSON.parse(readFileSync(KEYS_FILE, "utf8"))[name] as string[];
  expect(expected, `no recorded shape for ${name}`).toBeTruthy();
  expect(actual.filter((entry) => !expected.includes(entry)), "key paths added since the recording").toEqual([]);
  expect(expected.filter((entry) => !actual.includes(entry)), "key paths removed since the recording").toEqual([]);
};

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Saving behaviour does not depend on the viewport.");
  await page.request.post(fixture, { data: { reset: true } });
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("assistant-e2e@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
});

const openBuilder = async (page: Page) => {
  await page.goto(builderUrl);
  // By placeholder, not label, so the same test also runs against the pre-redesign build.
  const name = page.getByPlaceholder(/Apex Dynamics Global Summit/);
  await expect(name).toBeVisible({ timeout: 20_000 });
  return name;
};

test.describe("what the builder saves", () => {
  test("autosave sends the full draft with the same shape as before the redesign", async ({ page }) => {
    const name = await openBuilder(page);
    await name.fill("Parity Summit");
    await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 15_000 });

    const puts = await recordedPuts(page);
    const last = puts.at(-1)!;
    expect(last.failed).toBe(false);
    expect(last.payload).toMatchObject({ status: "unsubmitted", isDraft: true, event: { eventName: "Parity Summit" } });
    expect(last.payload).not.toHaveProperty("videoRecordingStep");
    checkShape("autosave", last.payload);
  });

  test("Save draft sends the same shape as before the redesign and returns to the list", async ({ page }) => {
    const name = await openBuilder(page);
    await name.fill("Draft From Button");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/proposals$/, { timeout: 20_000 });

    const puts = await recordedPuts(page);
    const last = puts.at(-1)!;
    expect(last.payload).toMatchObject({ status: "unsubmitted", isDraft: true, isActive: false, event: { eventName: "Draft From Button" } });
    checkShape("saveDraft", last.payload);
  });
});

test.describe("recovering a draft", () => {
  test("a failed save says so, keeps the change pending, and Retry saves it", async ({ page }) => {
    const name = await openBuilder(page);
    await page.request.post(fixture, { data: { failPuts: 1 } });
    await name.fill("Retry Summit");

    await expect(page.getByText(/Save failed/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("status").filter({ hasText: "Save failed" })).toHaveAttribute("data-state", "error");
    await page.getByRole("button", { name: "Retry save" }).click();
    await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 15_000 });

    const puts = await recordedPuts(page);
    expect(puts.map((put) => put.failed)).toEqual([true, false]);
    expect((puts[1].payload.event as { eventName: string }).eventName).toBe("Retry Summit");
  });

  test("a failed save is retried automatically without any click", async ({ page }) => {
    test.setTimeout(60_000);
    const name = await openBuilder(page);
    await page.request.post(fixture, { data: { failPuts: 1 } });
    await name.fill("Auto Retry Summit");

    await expect(page.getByText(/Save failed/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 20_000 });
    const puts = await recordedPuts(page);
    expect(puts.map((put) => put.failed)).toEqual([true, false]);
  });

  test("an edit made while a save is in flight is saved right after it, not dropped", async ({ page }) => {
    test.setTimeout(60_000);
    const name = await openBuilder(page);
    await page.request.post(fixture, { data: { putDelay: 2500 } });
    await name.fill("Overlap A");
    await expect(page.getByRole("status").filter({ hasText: "Saving" })).toBeVisible({ timeout: 10_000 });
    await name.fill("Overlap AB");

    await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 30_000 });
    const puts = (await recordedPuts(page)).filter((put) => !put.failed);
    expect((puts.at(-1)!.payload.event as { eventName: string }).eventName).toBe("Overlap AB");
    expect(puts.length).toBe(2);
  });

  test("closing the tab with unsaved changes asks for confirmation", async ({ page }) => {
    const name = await openBuilder(page);
    await page.request.post(fixture, { data: { putDelay: 5000 } });
    await name.fill("Unsaved Summit");
    await expect(page.getByRole("status").filter({ hasText: "Saving" })).toBeVisible({ timeout: 10_000 });

    // The builder's beforeunload handler cancels the event while a change is unsaved.
    const prevented = await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(true);
  });
});

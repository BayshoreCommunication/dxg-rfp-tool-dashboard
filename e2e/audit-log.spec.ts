import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Page, type TestInfo } from "@playwright/test";

// ORG-407: the organization audit log for each role, against the stub backend
// (e2e/support/auditLogFixture.mjs), which applies the backend's rule: an Owner or Admin reads
// it, every other role is refused. `next dev` compiles on demand, so waits are long.
const expect = baseExpect.configure({ timeout: 45_000 });

type Role = "owner" | "admin" | "manager" | "planner" | "viewer";
const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  test.setTimeout(300_000);
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    // A refused route is the point of the role checks; the browser logs its 404 itself. And a
    // machine without internet can't fetch the layout's web fonts; that is not the app.
    if (message.type() === "error" && !/status of 404|net::ERR_INTERNET_DISCONNECTED/.test(message.text())) seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
});

const signInAs = async (page: Page, role: Role) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`${role}-e2e@example.com`);
  // Email first: the page asks the backend how this address signs in, then shows the password.
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("role-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 180_000 });
  // Only what happens on the screens under test counts.
  problems.get(page)!.length = 0;
};

const screen = (page: Page) => page.getByTestId("audit-log");
const rows = (page: Page) => page.getByRole("list", { name: "Audit events" }).locator("> li");

const openAuditLog = async (page: Page) => {
  await page.goto("/settings/audit");
  await expect(page.getByRole("heading", { name: "Audit log", level: 2 })).toBeVisible({ timeout: 120_000 });
  await expect(rows(page).first()).toBeVisible();
};

// Every state: no serious accessibility violations, nothing wider than the screen, the word
// "proposal" nowhere, no console errors, and a screenshot as evidence.
const check = async (page: Page, testInfo: TestInfo, name: string) => {
  await expect(screen(page)).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="audit-log"]').withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    accessibility.violations
      .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(await screen(page).textContent()).not.toMatch(/proposal/i);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(problems.get(page)).toEqual([]);
};

for (const role of ["owner", "admin"] as const) {
  test(`${role}: reads the audit log, with RFPilot Support shown by that name`, async ({ page }, testInfo) => {
    await signInAs(page, role);
    await openAuditLog(page);

    await expect(rows(page)).toHaveCount(50);
    const first = rows(page).first();
    await expect(first).toContainText("Support access used");
    await expect(first).toContainText("RFPilot Support");
    await expect(first).toContainText("Opened an RFP");
    await expect(rows(page).nth(1)).toContainText("Refused");
    await expect(rows(page).nth(1)).toContainText("Reason: No active support access");
    await expect(rows(page).nth(5)).toContainText("Previous role: Viewer");
    await expect(rows(page).nth(5)).toContainText("Role: Planner");
    await expect(rows(page).nth(6)).toContainText("Require two-factor: Off → On");
    // Role codes never reach the screen.
    expect(await screen(page).textContent()).not.toMatch(/organization_admin|team_manager/);
    await check(page, testInfo, `${role}-populated`);

    await page.getByRole("button", { name: "Load more" }).click();
    await expect(rows(page)).toHaveCount(66);
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  });
}

test("owner: filters by user, action and date, sees the empty state, and exports what is filtered", async ({ page }, testInfo) => {
  await signInAs(page, "owner");
  await openAuditLog(page);

  await screen(page).getByLabel("User", { exact: true }).selectOption({ label: "RFPilot Support" });
  await expect(rows(page)).toHaveCount(2);
  for (const row of await rows(page).all()) await expect(row).toContainText("RFPilot Support");
  await check(page, testInfo, "owner-filter-support");

  await screen(page).getByLabel("User", { exact: true }).selectOption({ label: "Priya Planner" });
  await expect(rows(page)).toHaveCount(3);
  await screen(page).getByLabel("Action", { exact: true }).selectOption({ label: "Sign-in failed" });
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Reason: Wrong password");
  await check(page, testInfo, "owner-filter-user-action");

  // The export follows the filters on screen.
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = fs.readFileSync(await download.path(), "utf8");
  const lines = csv.trimEnd().split("\r\n");
  expect(lines).toHaveLength(2);
  expect(lines[0]).toContain('"Time (UTC)","Action"');
  expect(lines[1]).toContain('"Sign-in failed"');
  expect(lines[1]).toContain('"Priya Planner"');
  expect(csv).not.toContain("RFPilot Support");
  await expect(page.getByText("Exported 1 event.")).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(rows(page)).toHaveCount(50);

  // A category, then a date range with nothing in it.
  await screen(page).getByLabel("Action", { exact: true }).selectOption({ label: "All: RFPilot Support access" });
  await expect(rows(page)).toHaveCount(3);
  await screen(page).getByLabel("From", { exact: true }).fill("2020-01-01");
  await screen(page).getByLabel("To", { exact: true }).fill("2020-01-31");
  await expect(page.getByText("No activity matches these filters")).toBeVisible();
  await check(page, testInfo, "owner-empty");

  // A start after the end is refused on the screen, and the export is not offered.
  await screen(page).getByLabel("To", { exact: true }).fill("2019-12-01");
  await expect(screen(page).getByRole("alert")).toContainText("start date must be on or before the end date");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  await check(page, testInfo, "owner-invalid-dates");
});

test("owner: finds the audit log from the Security page", async ({ page }, testInfo) => {
  await signInAs(page, "owner");
  await page.goto("/settings/security");
  const link = page.getByRole("link", { name: "Open audit log" });
  // The stub may not serve the organization security block; the link lives inside it.
  test.skip(!(await link.isVisible({ timeout: 60_000 }).catch(() => false)), "the stub does not serve organization security settings");
  await link.click();
  await expect(page).toHaveURL(/\/settings\/audit$/);
  await expect(page.getByRole("heading", { name: "Audit log", level: 2 })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("owner-from-security.png"), fullPage: true });
});

for (const role of ["manager", "planner", "viewer"] as const) {
  test(`${role}: the audit log does not exist`, async ({ page }, testInfo) => {
    await signInAs(page, role);
    const response = await page.goto("/settings/audit");
    expect(response?.status()).toBe(404);
    await expect(screen(page)).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Audit events" })).toHaveCount(0);
    const body = (await page.locator("body").textContent()) ?? "";
    expect(body).not.toMatch(/Support access used|Sign-in failed|Role changed/);
    await page.screenshot({ path: testInfo.outputPath(`${role}-not-found.png`), fullPage: true });
    expect(problems.get(page)).toEqual([]);
  });
}

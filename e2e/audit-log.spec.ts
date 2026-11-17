import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Page, type TestInfo } from "@playwright/test";
import { expectProposalWording } from "./support/wording";

// ORG-407: the organization audit log for each role, against the stub backend
// (e2e/support/auditLogFixture.mjs), which applies the backend's rule: an Owner or Admin reads
// it, every other role is refused. `next dev` compiles on demand, so waits are long.
// Owner decisions, 2026-11-17: RFPilot Support access events and every other RFPilot staff
// event are not part of the customer's audit log. The stub still serves them, as the backend
// does today, and none may reach the screen.
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

// The stub's port can be moved (ASSISTANT_E2E_BACKEND_PORT) when 8011 is taken by another run.
const STUB = `http://127.0.0.1:${process.env.ASSISTANT_E2E_BACKEND_PORT || 8011}`;
// Shaped like the role accounts' access token (roleDashboardFixture.mjs), to ask the stub directly.
const stubToken = (roles: string[]) => `e2e.${Buffer.from(JSON.stringify({ userId: "1".repeat(24), roles })).toString("base64url")}.stub`;
const STAFF = /support access|support_access|RFPilot Support|RFPilot staff|Plan changed|placed by|placement undone|legacy_customer|plan_changed/i;

const screen = (page: Page) => page.getByTestId("audit-log");
const rows = (page: Page) => page.getByRole("list", { name: "Audit events" }).locator("> li");

const openAuditLog = async (page: Page) => {
  await page.goto("/settings/audit");
  await expect(page.getByRole("heading", { name: "Audit log", level: 2 })).toBeVisible({ timeout: 120_000 });
  await expect(rows(page).first()).toBeVisible();
};

// Every state: no serious accessibility violations, nothing wider than the screen, "proposal"
// not "RFP", no console errors, and a screenshot as evidence.
// Category and action names come from the backend's audit catalog (stubbed in
// e2e/support/auditLogFixture.mjs as the backend sends them); they say "Proposal" too, so
// nothing on this screen is excused from the wording check.
const check = async (page: Page, testInfo: TestInfo, name: string) => {
  await expect(screen(page)).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="audit-log"]').withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    accessibility.violations
      .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectProposalWording(screen(page));
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(problems.get(page)).toEqual([]);
};

for (const role of ["owner", "admin"] as const) {
  test(`${role}: reads the audit log, with no RFPilot staff activity in it`, async ({ page }, testInfo) => {
    await signInAs(page, role);
    await openAuditLog(page);

    // The backend's first page holds 50 events; seven are RFPilot staff or Support access
    // events and are not shown.
    await expect(rows(page)).toHaveCount(43);
    await expect(page.getByText("Showing 43 events, newest first.")).toBeVisible();
    await expect(rows(page).first()).toContainText("Sign-in failed");
    await expect(rows(page).first()).toContainText("Refused");
    await expect(rows(page).first()).toContainText("Reason: Wrong password");
    await expect(rows(page).nth(2)).toContainText("Previous role: Viewer");
    await expect(rows(page).nth(2)).toContainText("Role: Planner");
    await expect(rows(page).nth(3)).toContainText("Require two-factor: Off → On");
    expect(await screen(page).textContent()).not.toMatch(STAFF);
    // Role codes never reach the screen.
    expect(await screen(page).textContent()).not.toMatch(/organization_admin|team_manager/);
    await check(page, testInfo, `${role}-populated`);

    await page.getByRole("button", { name: "Load more" }).click();
    await expect(rows(page)).toHaveCount(63);
    await expect(page.getByText("Showing 63 events.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
    expect(await screen(page).textContent()).not.toMatch(STAFF);
  });
}

test("owner: RFPilot staff and Support access events the backend still serves are not shown, filtered or exported", async ({ page, request }, testInfo) => {
  // The stub serves them, as the backend does until its own change ships.
  const headers = { Authorization: `Bearer ${stubToken(["owner"])}` };
  const served = await (await request.get(`${STUB}/api/v1/organization/audit-events?limit=100`, { headers })).json();
  const servedActions: string[] = served.data.events.map((event: { action: string }) => event.action);
  expect(servedActions.filter((action) => action.startsWith("support_access.")).sort())
    .toEqual(["support_access.denied", "support_access.granted", "support_access.revoked", "support_access.used"]);
  for (const action of ["organization.legacy_customer.placed", "organization.legacy_customer.placement_rolled_back", "organization.plan_changed"]) expect(servedActions).toContain(action);
  expect(served.data.events.filter((event: { actor: { kind: string } }) => event.actor.kind === "support")).toHaveLength(5);
  const filters = await (await request.get(`${STUB}/api/v1/organization/audit-events/filters`, { headers })).json();
  expect(filters.data.categories.map((category: { key: string }) => category.key)).toContain("support_access");

  await signInAs(page, "owner");
  await openAuditLog(page);
  await expect(page.getByText("Sign-ins, security changes, invitations, role and team changes and proposal sharing in your organization. Entries can't be edited or deleted.", { exact: true })).toBeVisible();

  // Only members can be chosen as the user.
  const userOptions = await screen(page).getByLabel("User", { exact: true }).locator("option").allTextContents();
  expect(userOptions[0]).toBe("Everyone");
  expect(userOptions.filter((label) => STAFF.test(label))).toEqual([]);

  // No Support access filter and no staff action: neither the category nor any such action.
  const actionOptions = await screen(page).getByLabel("Action", { exact: true }).locator("option, optgroup").evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).label || node.textContent || ""));
  expect(actionOptions).toContain("All: Organization settings");
  expect(actionOptions.filter((label) => STAFF.test(label))).toEqual([]);

  // None of the seven events is in the list, on either page.
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(rows(page)).toHaveCount(63);
  for (const label of ["Support access used", "Support access refused", "Support access granted", "Support access revoked", "Support access ID", "No active support access", "Member placed by RFPilot Support", "Member placement undone by RFPilot Support", "Plan changed by RFPilot Support", "RFPilot Support", "RFPilot staff"]) {
    await expect(screen(page).getByText(label)).toHaveCount(0);
  }
  expect(await screen(page).textContent()).not.toMatch(STAFF);
  await check(page, testInfo, "owner-no-support-access");

  // The export leaves them out too, and counts what it holds.
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  const csv = fs.readFileSync(await download.path(), "utf8");
  expect(csv.trimEnd().split("\r\n")).toHaveLength(64);
  expect(csv).not.toMatch(STAFF);
  expect(csv).not.toContain("grantId");
  expect(csv).not.toContain('"support"');
  expect(csv).toContain('"Role changed"');
  await expect(page.getByText("Exported 63 events.")).toBeVisible();
});

test("owner: filters by user, action and date, sees the empty state, and exports what is filtered", async ({ page }, testInfo) => {
  await signInAs(page, "owner");
  await openAuditLog(page);

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
  await expect(rows(page)).toHaveCount(43);

  // A category, then a date range with nothing in it.
  await screen(page).getByLabel("Action", { exact: true }).selectOption({ label: "All: Organization settings" });
  // The backend returns two; the plan change made by RFPilot staff is not shown.
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Organization settings changed");
  await expect(page.getByText("Showing 1 event.")).toBeVisible();
  await screen(page).getByLabel("From", { exact: true }).fill("2020-01-01");
  await screen(page).getByLabel("To", { exact: true }).fill("2020-01-31");
  await expect(page.getByText("No activity matches these filters")).toBeVisible();
  await check(page, testInfo, "owner-empty");
  // Nothing in the range: the screen says so, and no file is handed over.
  await page.getByRole("button", { name: "Export CSV" }).click();
  await expect(page.getByText("There's nothing to export for this range.")).toBeVisible();

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
  await expect(link).toBeVisible({ timeout: 60_000 });
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
    expect(body).not.toMatch(/Plan changed|Sign-in failed|Role changed/);
    await page.screenshot({ path: testInfo.outputPath(`${role}-not-found.png`), fullPage: true });
    expect(problems.get(page)).toEqual([]);
  });
}

import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { expectProposalWording } from "./support/wording";

// ORG-405: the support access screen for each role, against the stub backend
// (e2e/support/supportGrantsFixture.mjs), which applies the backend's rules: Owner and Admin
// manage grants, every other role is refused, and nothing crosses organizations.

// `next dev` compiles each route on first visit; a busy machine needs more than the default.
const expect = baseExpect.configure({ timeout: 45_000 });
// The stub's port can be moved (ASSISTANT_E2E_BACKEND_PORT) when 8011 is taken by another run.
const STUB = `http://127.0.0.1:${process.env.ASSISTANT_E2E_BACKEND_PORT || 8011}/__e2e/support-grants`;

type Role = "owner" | "admin" | "manager" | "planner" | "viewer" | "other-owner";

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, request }) => {
  test.setTimeout(300_000);
  await request.post(STUB, { data: { reset: true } });
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    // A refused route is the point of the role checks; the browser logs its 404 itself.
    // And a machine without internet can't fetch the layout's web fonts; that is not the app.
    if (message.type() === "error" && !/status of 404|net::ERR_INTERNET_DISCONNECTED/.test(message.text())) seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
});

const signInAs = async (page: Page, role: Role) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`support-grants-${role}@example.com`);
  // Email first: the password field appears once the address is known not to use company SSO.
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("support-grants-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  // The first sign-in also compiles the sign-in action and the dashboard route.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 180_000 });
};

const screen = (page: Page) => page.getByTestId("support-access");
const activeList = (page: Page) => page.getByRole("list", { name: "Active access" });
const pastList = (page: Page) => page.getByRole("list", { name: "Past access" });

const openSupportAccess = async (page: Page) => {
  await page.goto("/settings/support-access");
  await expect(page.getByRole("heading", { name: "Support access", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Past access" })).toBeVisible();
};

// Every state: no serious accessibility violations, nothing wider than the screen, the word
// "proposal" not "RFP", no console errors, and a screenshot as evidence.
const check = async (page: Page, testInfo: TestInfo, name: string, scope: Locator = screen(page), selector = '[data-testid="support-access"]') => {
  await expect(scope).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include(selector).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    accessibility.violations
      .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectProposalWording(scope);
  // A grant's name keeps a readable width (it once wrapped a letter per line beside the buttons).
  const titleWidths = await page.locator("[data-grant-title]").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
  expect(titleWidths.filter((width) => width < 120)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(problems.get(page)).toEqual([]);
};

const checkDialog = (page: Page, testInfo: TestInfo, name: string) => check(page, testInfo, name, page.getByRole("dialog"), "dialog[open]");

test("Owner: sees active and past access, with Support's activity under each grant", async ({ page }, testInfo) => {
  await signInAs(page, "owner");
  await openSupportAccess(page);

  const active = activeList(page).getByRole("listitem");
  await expect(active).toHaveCount(1);
  await expect(active.first()).toContainText("Spring Sales Kickoff 2027");
  await expect(active.first()).toContainText("Active");
  await expect(active.first()).toContainText("One proposal");
  await expect(active.first()).toContainText("Granted by Olivia Owner");
  await expect(active.first()).toContainText("Expires in 6 days");
  await expect(active.first()).toContainText("Used 3 times");
  await expect(active.first()).toContainText("Reason: Support ticket 4821");

  const past = pastList(page).getByRole("listitem");
  await expect(past).toHaveCount(2);
  await expect(past.filter({ hasText: "Autumn Partner Gala" })).toContainText("Revoked by Olivia Owner");
  await expect(past.filter({ hasText: "Autumn Partner Gala" })).toContainText("Granted by Adam Admin");
  await expect(past.filter({ hasText: "Whole organization" })).toContainText("Expired on");
  await expect(past.filter({ hasText: "Whole organization" })).toContainText("Not used");
  await expect(pastList(page).getByRole("button", { name: /Revoke/ })).toHaveCount(0);
  await check(page, testInfo, "owner-populated-dark");

  // Past grants keep their activity: who is shown is "RFPilot Support", never a person.
  await page.getByRole("button", { name: "View activity for Autumn Partner Gala" }).click();
  const events = page.getByRole("list", { name: "Support activity" }).getByRole("listitem");
  await expect(events).toHaveCount(2);
  await expect(events.nth(0)).toContainText("Opened a proposal");
  await expect(events.nth(0)).toContainText("Autumn Partner Gala");
  await expect(events.nth(0)).toContainText("RFPilot Support (agent 00AB12)");
  await expect(events.nth(1)).toContainText("Listed the proposals covered by this access");
  await expect(events.nth(1)).toContainText("RFPilot Support (agent 00CD34)");
  await checkDialog(page, testInfo, "owner-activity-dialog");
  await page.getByRole("dialog").getByText("Close", { exact: true }).click();

  await page.getByRole("button", { name: "View activity for Whole organization" }).click();
  await expect(page.getByRole("dialog")).toContainText("RFPilot Support hasn't used this access.");
  await page.getByRole("dialog").getByText("Close", { exact: true }).click();
});

// Production renders the light theme; the dark one is a local preview. Same checks, light.
test("Owner: every state in the light theme", async ({ page }, testInfo) => {
  await signInAs(page, "owner");
  await openSupportAccess(page);
  await page.getByTestId("dev-theme-toggle").click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(activeList(page).getByRole("listitem")).toHaveCount(1);
  await check(page, testInfo, "light-populated");

  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Grant access" }).click();
  await dialog.getByRole("radio", { name: /Spring Sales Kickoff 2027/ }).check();
  await dialog.getByLabel("Reason (optional)").fill("Support ticket 5120");
  await checkDialog(page, testInfo, "light-grant-dialog-rfp");
  await dialog.getByRole("radio", { name: /Whole organization/ }).check();
  await dialog.getByLabel("Access ends after").selectOption("custom");
  await dialog.getByRole("button", { name: "Grant access" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await checkDialog(page, testInfo, "light-grant-dialog-organization-error");
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "View activity for Spring Sales Kickoff 2027" }).click();
  await expect(page.getByRole("list", { name: "Support activity" }).getByRole("listitem")).toHaveCount(3);
  await checkDialog(page, testInfo, "light-activity-dialog");
  await dialog.getByText("Close", { exact: true }).click();

  await page.getByRole("button", { name: "Revoke access to Spring Sales Kickoff 2027" }).click();
  await checkDialog(page, testInfo, "light-revoke-dialog");
  await dialog.getByRole("button", { name: "Revoke access" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("RFPilot Support has no access")).toBeVisible();
  await check(page, testInfo, "light-empty-active");
});

test("Owner: grants one picked proposal with an expiry, grants the whole organization, and revokes", async ({ page }, testInfo) => {
  await signInAs(page, "owner");
  await openSupportAccess(page);

  // One RFP, found by search, for 14 days, with a reason.
  await page.getByRole("button", { name: "Grant access" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio", { name: /Autumn Partner Gala/ })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /Contoso/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Grant access" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Choose the proposal that Support may open.");
  await dialog.getByLabel("Proposal", { exact: true }).fill("leadership");
  // Enter in the search box only searches.
  await dialog.getByLabel("Proposal", { exact: true }).press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /Autumn Partner Gala/ })).toHaveCount(0);
  await dialog.getByRole("radio", { name: /Regional Leadership Summit/ }).check();
  await dialog.getByLabel("Access ends after").selectOption("14");
  await dialog.getByLabel("Reason (optional)").fill("Support ticket 5120");
  await checkDialog(page, testInfo, "owner-grant-dialog-rfp");
  await dialog.getByRole("button", { name: "Grant access" }).click();
  await expect(dialog).toHaveCount(0);
  const granted = activeList(page).getByRole("listitem").filter({ hasText: "Regional Leadership Summit" });
  await expect(granted).toContainText("One proposal");
  await expect(granted).toContainText("Expires in 14 days");
  await expect(granted).toContainText("Reason: Support ticket 5120");
  await expect(granted).toContainText("Not used");

  // The whole organization, for a custom number of days; more than 30 is refused first.
  await page.getByRole("button", { name: "Grant access" }).click();
  await dialog.getByRole("radio", { name: /Whole organization/ }).check();
  await expect(dialog.getByLabel("Proposal", { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel("Access ends after")).toHaveValue("7");
  await dialog.getByLabel("Access ends after").selectOption("custom");
  await dialog.getByLabel("Days (1 to 30)").fill("45");
  await dialog.getByRole("button", { name: "Grant access" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Enter a whole number of days from 1 to 30.");
  await dialog.getByLabel("Days (1 to 30)").fill("2");
  await checkDialog(page, testInfo, "owner-grant-dialog-organization");
  await dialog.getByRole("button", { name: "Grant access" }).click();
  await expect(dialog).toHaveCount(0);
  const wide = activeList(page).getByRole("listitem").filter({ hasText: "Whole organization" });
  await expect(wide).toContainText("Every proposal");
  await expect(wide).toContainText("Expires in 2 days");
  await expect(activeList(page).getByRole("listitem")).toHaveCount(3);
  await check(page, testInfo, "owner-after-granting");

  // Revoke asks first, then moves the grant to past access.
  await page.getByRole("button", { name: "Revoke access to Whole organization" }).click();
  await expect(dialog.getByRole("heading", { name: "Revoke RFPilot Support access?" })).toBeVisible();
  await checkDialog(page, testInfo, "owner-revoke-dialog");
  await dialog.getByRole("button", { name: "Keep access" }).click();
  await expect(activeList(page).getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Revoke access to Whole organization" }).click();
  await dialog.getByRole("button", { name: "Revoke access" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(activeList(page).getByRole("listitem")).toHaveCount(2);
  await expect(pastList(page).getByRole("listitem").filter({ hasText: "Revoked by Olivia Owner" }).filter({ hasText: "Whole organization" })).toHaveCount(1);
  await check(page, testInfo, "owner-after-revoking");

  // It is still revoked after a reload: the change was the server's, not only the screen's.
  await page.reload();
  await expect(activeList(page).getByRole("listitem")).toHaveCount(2);
  await expect(pastList(page).getByRole("listitem")).toHaveCount(3);
});

test("Admin: can grant and revoke as well", async ({ page }, testInfo) => {
  await signInAs(page, "admin");
  await openSupportAccess(page);
  await page.getByRole("button", { name: "Grant access" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: /Autumn Partner Gala/ }).check();
  await dialog.getByRole("button", { name: "Grant access" }).click();
  await expect(dialog).toHaveCount(0);
  const granted = activeList(page).getByRole("listitem").filter({ hasText: "Autumn Partner Gala" });
  await expect(granted).toContainText("Granted by Adam Admin");
  await expect(granted).toContainText("Expires in 7 days");

  await page.getByRole("button", { name: "Revoke access to Spring Sales Kickoff 2027" }).click();
  await dialog.getByRole("button", { name: "Revoke access" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(pastList(page).getByRole("listitem").filter({ hasText: "Spring Sales Kickoff 2027" })).toContainText("Revoked by Adam Admin");
  await check(page, testInfo, "admin-granted-and-revoked");
});

test("Owner and Admin reach support access from the Security page", async ({ page }, testInfo) => {
  await signInAs(page, "owner");
  await page.goto("/settings/security");
  const link = page.getByRole("link", { name: /Manage support access/ });
  await expect(link).toBeVisible();
  await link.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("owner-security-entry.png"), fullPage: true });
  await link.click();
  await expect(page).toHaveURL(/\/settings\/support-access$/);
  await expect(page.getByRole("heading", { name: "Support access", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Security" }).first().click();
  await expect(page).toHaveURL(/\/settings\/security$/);
});

for (const [role, label] of [["manager", "Team Manager"], ["planner", "Planner"], ["viewer", "Viewer"]] as const) {
  test(`${label}: cannot see or use support access`, async ({ page }, testInfo) => {
    await signInAs(page, role);

    // No way in from the Security page.
    await page.goto("/settings/security");
    await expect(page.getByText("managed by your organization's Owner and Admins")).toBeVisible();
    await expect(page.getByRole("link", { name: /support access/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Support access" })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${role}-security-no-entry.png`), fullPage: true });

    // And the address itself does not exist for them.
    const response = await page.goto("/settings/support-access");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("support-access")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Grant access" })).toHaveCount(0);
    await expect(page.getByText("Spring Sales Kickoff 2027")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${role}-support-access-404.png`), fullPage: true });
    expect(problems.get(page)).toEqual([]);
  });
}

test("another organization's Owner sees none of these grants or proposals", async ({ page }, testInfo) => {
  await signInAs(page, "other-owner");
  await openSupportAccess(page);
  await expect(page.getByText("RFPilot Support has no access")).toBeVisible();
  await expect(page.getByText("No past access yet.")).toBeVisible();
  await expect(page.getByText(/Spring Sales Kickoff|Autumn Partner Gala/)).toHaveCount(0);
  await check(page, testInfo, "other-organization-empty");

  await page.getByRole("button", { name: "Grant access" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio", { name: /Contoso Product Launch/ })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /Spring Sales Kickoff|Autumn Partner Gala|Regional Leadership/ })).toHaveCount(0);
});

test("a grant that is no longer in the organization reads as not found and the list refreshes", async ({ page, request }, testInfo) => {
  await signInAs(page, "owner");
  await openSupportAccess(page);
  await expect(activeList(page).getByRole("listitem")).toHaveCount(1);
  await request.post(STUB, { data: { vanish: "Spring Sales Kickoff 2027" } });

  await page.getByRole("button", { name: "Revoke access to Spring Sales Kickoff 2027" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Revoke access" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("That support access wasn't found. Reload the page.");
  await checkDialog(page, testInfo, "owner-revoke-not-found");
  await dialog.getByText("Close", { exact: true }).click();
  await expect(page.getByText("RFPilot Support has no access")).toBeVisible();
  await expect(page.getByText("Spring Sales Kickoff 2027")).toHaveCount(0);
});

test("load failure, then every page that could hold live access", async ({ page, request }, testInfo) => {
  await signInAs(page, "owner");

  await request.post(STUB, { data: { failList: true } });
  await page.goto("/settings/support-access");
  await expect(screen(page).getByRole("alert")).toHaveText("The request couldn't be completed. Try again.");
  await expect(page.getByRole("button", { name: "Grant access" })).toHaveCount(0);
  await check(page, testInfo, "owner-load-error");
  await request.post(STUB, { data: { failList: false, perPage: 2 } });
  await page.getByRole("button", { name: "Try again" }).click();

  // Two grants a page, all recent enough that an older page could hold live access: the
  // screen fetches the second page by itself.
  await expect(activeList(page).getByRole("listitem")).toHaveCount(1);
  await expect(pastList(page).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Show older access" })).toHaveCount(0);
  await check(page, testInfo, "owner-all-pages");
});

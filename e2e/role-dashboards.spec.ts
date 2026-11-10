import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Page, type TestInfo } from "@playwright/test";

// `next dev` compiles and renders on demand, and each filter is a full server render, so give
// navigations more room than the suite's default 8 seconds (a busy machine can take half a minute).
const expect = baseExpect.configure({ timeout: 45_000 });

// ORG-402: the dashboard each role sees, against the stub backend (e2e/support/roleDashboardFixture.mjs),
// which scopes its answers to the signed-in role the way the real backend does.

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  test.setTimeout(300_000);
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    if (message.type() === "error") seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
});

const signInAs = async (page: Page, role: "owner" | "admin" | "manager" | "planner" | "viewer") => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`${role}-e2e@example.com`);
  // Email first: the page asks the backend how this address signs in, then shows the password.
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("role-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  await expect(page.getByTestId("role-dashboard")).toBeVisible({ timeout: 30_000 });
};

// Every state: no console errors, no serious accessibility violations, nothing wider than the
// screen, and a screenshot as evidence.
const check = async (page: Page, testInfo: TestInfo, name: string) => {
  await expect(page.getByTestId("role-dashboard")).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="role-dashboard"]').withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    accessibility.violations
      .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(await page.getByTestId("role-dashboard").textContent()).not.toMatch(/proposal/i);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(problems.get(page)).toEqual([]);
};

const statusTab = (page: Page, name: RegExp) => page.getByRole("navigation", { name: "RFP status" }).getByRole("link", { name });
const rows = (page: Page) => page.getByRole("table").locator("tbody tr");

test("Planner: My RFPs by status, deadlines, new submissions and the Admin-visibility note", async ({ page }, testInfo) => {
  await signInAs(page, "planner");
  const dashboard = page.getByTestId("role-dashboard");
  await expect(dashboard).toHaveAttribute("data-dashboard-role", "planner");
  await expect(page.getByText("Your role: Planner")).toBeVisible();
  await expect(page.getByRole("heading", { name: "My RFPs" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Dashboard views" })).toHaveCount(0);
  await expect(page.getByTestId("admin-visibility-note")).toHaveText("Your organization's Admins can see your RFPs, including drafts.");
  await expect(page.getByRole("link", { name: "New RFP" })).toBeVisible();

  // Own RFPs only: five open ones, none of Peter's or Fiona's.
  await expect(statusTab(page, /^All open/)).toHaveText("All open5");
  await expect(statusTab(page, /^Archived/)).toHaveText("Archived1");
  await expect(rows(page)).toHaveCount(5);
  await expect(page.getByRole("table")).not.toContainText("Engineering Offsite");
  await expect(dashboard.getByLabel("Planner", { exact: true })).toHaveCount(0);

  // Summary row describes the same list: 3 active, 3 + 0 + 6 + 3 responses, 1 awarded.
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary.getByTestId("summary-active")).toHaveText("3");
  await expect(summary.getByTestId("summary-responses")).toHaveText("12");
  await expect(summary.getByTestId("summary-awarded")).toHaveText("1");

  const deadlines = page.getByRole("region", { name: "Upcoming deadlines" });
  await expect(deadlines.getByRole("listitem")).toHaveCount(3);
  await expect(deadlines.getByRole("listitem").first()).toContainText("Leadership Summit");
  await expect(deadlines.getByRole("listitem").first()).toContainText("In 20 days");
  const submissions = page.getByRole("region", { name: "New submissions" });
  await expect(submissions.getByRole("listitem")).toHaveCount(1);
  await expect(submissions).toContainText("3 of 5 responded");
  await check(page, testInfo, "planner-my-rfps");

  // By status: the tab narrows the list and the summary with it.
  await statusTab(page, /^Draft/).click();
  await expect(page).toHaveURL(/stage=draft/);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Product Launch Evening");
  await expect(summary.getByTestId("summary-active")).toHaveText("0");

  // A status with nothing in it.
  await statusTab(page, /^Under review/).click();
  await expect(rows(page)).toHaveCount(1);
  await page.getByLabel("Event name").fill("no such event");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("No RFPs match these filters")).toBeVisible();
  await check(page, testInfo, "planner-no-matches");

  // A Planner can't widen the view through the URL.
  await page.goto(`/dashboard?view=organization&owner=${"7".repeat(24)}`);
  await expect(page.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "mine");
  await expect(rows(page)).toHaveCount(5);
  await expect(page.getByRole("table")).not.toContainText("Trade Show Booth AV");
});

test("Team Manager: My RFPs plus a Team tab with a planner filter", async ({ page }, testInfo) => {
  await signInAs(page, "manager");
  await expect(page.getByText("Your role: Team Manager")).toBeVisible();
  const views = page.getByRole("navigation", { name: "Dashboard views" });
  await expect(views.getByRole("link")).toHaveText(["My RFPs", "Team"]);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Regional Roadshow");
  await expect(page.getByTestId("admin-visibility-note")).toBeVisible();

  await views.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/view=team/);
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
  // The managed team's RFPs (Priya's five open, Peter's two, her own); nothing from Field Marketing.
  await expect(rows(page)).toHaveCount(8);
  await expect(page.getByRole("table")).not.toContainText("Trade Show Booth AV");
  await expect(page.getByTestId("role-dashboard").getByLabel("Planner", { exact: true }).locator("option")).toHaveText(["All planners", "Maya Manager", "Peter Planner", "Priya Planner"]);
  await check(page, testInfo, "team-manager-team");

  await page.getByTestId("role-dashboard").getByLabel("Planner", { exact: true }).selectOption({ label: "Peter Planner" });
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/owner=6{24}/);
  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByRole("table")).toContainText("Engineering Offsite");
  await expect(page.getByRole("table")).toContainText("Investor Day");
  await expect(statusTab(page, /^All open/)).toHaveText("All open2");
  await expect(page.getByRole("region", { name: "Summary" }).getByTestId("summary-responses")).toHaveText("1");
  await check(page, testInfo, "team-manager-planner-filter");

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(rows(page)).toHaveCount(8);
});

for (const [account, label] of [["admin", "Admin"], ["owner", "Owner"]] as const) {
  test(`${label}: organization-wide view with every filter and the summary row`, async ({ page }, testInfo) => {
    await signInAs(page, account);
    await expect(page.getByText(`Your role: ${label}`)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Dashboard views" }).getByRole("link")).toHaveText(["Organization", "My RFPs"]);
    await expect(page.getByRole("heading", { name: "Organization" })).toBeVisible();
    await expect(page.getByTestId("admin-visibility-note")).toHaveCount(0);

    // Everything in the organization, drafts included: 32 open RFPs over two pages.
    await expect(statusTab(page, /^All open/)).toHaveText("All open32");
    await expect(rows(page)).toHaveCount(25);
    await expect(page.getByText("Showing 1–25 of 32 RFPs")).toBeVisible();
    const summary = page.getByRole("region", { name: "Summary" });
    await expect(summary.getByTestId("summary-active")).toHaveText("17");
    await expect(summary.getByTestId("summary-responses")).toHaveText("17");
    await expect(summary.getByTestId("summary-awarded")).toHaveText("2");
    for (const name of ["Event name", "Planner", "Team", "Venue city", "Event starts on or after", "Event starts on or before", "Sort by"]) {
      await expect(page.getByTestId("role-dashboard").getByLabel(name, { exact: true })).toBeVisible();
    }
    await check(page, testInfo, `${account}-organization`);

    await page.getByRole("link", { name: /Next/ }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page)).toHaveCount(7);
    await expect(page.getByText("Showing 26–32 of 32 RFPs")).toBeVisible();

    // Team + venue city + status together; the summary follows the list.
    await page.goto("/dashboard");
    await page.getByTestId("role-dashboard").getByLabel("Team", { exact: true }).selectOption({ label: "Corporate Events" });
    await page.getByLabel("Venue city").fill("chicago");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(rows(page)).toHaveCount(3);
    await expect(summary.getByTestId("summary-responses")).toHaveText("6");
    await statusTab(page, /^Awarded/).click();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Holiday Town Hall");
    await expect(summary.getByTestId("summary-awarded")).toHaveText("1");
    await check(page, testInfo, `${account}-filtered`);

    // Planner filter and event date range.
    await page.goto("/dashboard");
    await page.getByTestId("role-dashboard").getByLabel("Planner", { exact: true }).selectOption({ label: "Peter Planner" });
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(rows(page)).toHaveCount(2);
    const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    await page.goto(`/dashboard?eventFrom=${inDays(5)}&eventTo=${inDays(16)}`);
    await expect(rows(page)).toHaveCount(3);
    await expect(page.getByLabel("Event starts on or after")).toHaveValue(inDays(5));

    // Another organization's team: the backend answers 404 and the page says so plainly.
    await page.goto(`/dashboard?team=${"f".repeat(24)}`);
    await expect(page.getByTestId("role-dashboard").getByRole("alert")).toContainText("We couldn't find those RFPs. They may have been moved or belong to another organization.");
    await expect(page.getByRole("table")).toHaveCount(0);
    await check(page, testInfo, `${account}-other-organization-404`);
    await page.getByRole("link", { name: "reset the dashboard" }).click();
    await expect(rows(page)).toHaveCount(25);

    // My RFPs is the member's own.
    await page.getByRole("navigation", { name: "Dashboard views" }).getByRole("link", { name: "My RFPs" }).click();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText(account === "admin" ? "All-Hands Broadcast" : "Board Meeting AV");
  });
}

test("Viewer: a read-only Shared with me view only", async ({ page }, testInfo) => {
  await signInAs(page, "viewer");
  const dashboard = page.getByTestId("role-dashboard");
  await expect(dashboard).toHaveAttribute("data-dashboard-view", "shared");
  await expect(page.getByText("Your role: Viewer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shared with me" })).toBeVisible();
  await expect(dashboard.getByText("You can read them; you can't edit or send them.", { exact: false })).toBeVisible();

  // Only the two RFPs shared with the Viewer.
  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByRole("table")).toContainText("Annual Sales Kickoff");
  await expect(page.getByRole("table")).toContainText("Trade Show Booth AV");

  // Read-only: no other views, no summary or panels, nothing to create, edit, send or comment on.
  await expect(page.getByRole("navigation", { name: "Dashboard views" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Summary" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Upcoming deadlines" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "New submissions" })).toHaveCount(0);
  await expect(page.getByTestId("admin-visibility-note")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: /New RFP/i })).toHaveCount(0);
  await expect(dashboard.getByRole("button")).toHaveText(["Apply"]);
  await expect(dashboard.getByRole("textbox")).toHaveCount(0);
  await expect(dashboard.getByRole("searchbox")).toHaveCount(1);
  await expect(dashboard).not.toContainText(/comment/i);
  for (const href of await dashboard.getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href") || ""))) {
    expect(href).toMatch(/^\/(dashboard|proposal\/)/);
  }
  await check(page, testInfo, "viewer-shared-with-me");

  // The other roles' views and filters aren't reachable through the URL.
  await page.goto(`/dashboard?view=organization&owner=${"4".repeat(24)}&team=${"a".repeat(24)}`);
  await expect(page.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "shared");
  await expect(page.getByRole("heading", { name: "Shared with me" })).toBeVisible();
  await expect(rows(page)).toHaveCount(2);
});

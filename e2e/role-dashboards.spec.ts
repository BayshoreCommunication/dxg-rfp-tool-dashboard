import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Page, type TestInfo } from "@playwright/test";
import { expectProposalWording } from "./support/wording";

// `next dev` compiles and renders on demand, and each filter is a full server render, so give
// navigations more room than the suite's default 8 seconds (a busy machine can take half a minute).
const expect = baseExpect.configure({ timeout: 45_000 });

// ORG-402: the dashboard each role sees, against the stub backend (e2e/support/roleDashboardFixture.mjs),
// which scopes its answers to the signed-in role the way the real backend does. The list is
// driven by the URL: filters, sort and page are query parameters the server component reads.

const STUB = `http://127.0.0.1:${process.env.ASSISTANT_E2E_BACKEND_PORT || 8011}`;

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, request }) => {
  test.setTimeout(300_000);
  // Undo what an earlier test archived or copied, and any plan it set.
  await request.post(`${STUB}/__e2e/dashboard`);
  await request.post(`${STUB}/__e2e/plan`, { data: { plan: "full_access", created: 0 } });
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    if (message.type() === "error") seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
});

test.afterEach(async ({ request }) => {
  await request.post(`${STUB}/__e2e/dashboard`);
  await request.post(`${STUB}/__e2e/plan`, { data: { plan: "full_access", created: 0 } });
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
  await expectProposalWording(page.getByTestId("role-dashboard"));
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(problems.get(page)).toEqual([]);
};

// The same state in the light theme too (the dev build starts in the dark preview).
const checkBothThemes = async (page: Page, testInfo: TestInfo, name: string) => {
  await check(page, testInfo, `${name}-dark`);
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  // Colours cross-fade when the theme flips; measure contrast once they have settled.
  await page.waitForTimeout(500);
  await check(page, testInfo, `${name}-light`);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(500);
};

const statusTab = (page: Page, name: RegExp) => page.getByRole("navigation", { name: "Proposal status" }).getByRole("link", { name });
const rows = (page: Page) => page.getByRole("table").locator("tbody tr");
const row = (page: Page, name: string) => rows(page).filter({ hasText: name });
const chips = (page: Page) => page.getByTestId("filter-chip");
const search = (page: Page) => page.getByRole("searchbox", { name: "Search proposals by event name" });
const filtersButton = (page: Page) => page.getByRole("button", { name: /^Filters/ });
const filtersPanel = (page: Page) => page.getByRole("dialog", { name: "Filters" });
// The row menu's button once the menu is live in the browser (the server draws a plain button first).
const menuButton = (page: Page, name: string) => page.locator(`button[data-rac][aria-label="Actions for ${name}"]`);
const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith("mobile");

const openFilters = async (page: Page) => {
  if (!(await filtersPanel(page).isVisible())) await filtersButton(page).click();
  await expect(filtersPanel(page)).toBeVisible();
};

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const shown = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);

// Picks a day in the range calendar, paging forward when the month isn't on screen.
const pickDay = async (page: Page, date: Date) => {
  const label = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
  const calendar = page.getByRole("dialog", { name: "Event dates" });
  const day = calendar.getByRole("button", { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
  for (let turn = 0; turn < 3 && (await day.count()) === 0; turn += 1) await calendar.getByRole("button", { name: "Next month" }).click();
  await day.first().click();
};

test("Planner: My Proposals by status, deadlines, new submissions and the Admin-visibility note", async ({ page }, testInfo) => {
  await signInAs(page, "planner");
  const dashboard = page.getByTestId("role-dashboard");
  await expect(dashboard).toHaveAttribute("data-dashboard-role", "planner");
  await expect(page.getByText("Your role: Planner")).toBeVisible();
  await expect(page.getByRole("heading", { name: "My Proposals" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Dashboard views" })).toHaveCount(0);
  await expect(page.getByTestId("admin-visibility-note")).toHaveText("Your organization's Admins can see your proposals, including drafts.");
  await expect(page.getByRole("link", { name: "New Proposal" })).toBeVisible();

  // Own proposals only: five open ones, none of Peter's or Fiona's.
  await expect(statusTab(page, /^All open/)).toHaveText("All open: 5 proposals");
  await expect(statusTab(page, /^Archived/)).toHaveText("Archived: 1 proposal");
  await expect(rows(page)).toHaveCount(5);
  await expect(page.getByText("Showing 1–5 of 5 proposals")).toBeVisible();
  await expect(page.getByRole("table")).not.toContainText("Engineering Offsite");
  // A Planner's view offers the search only: no Filters popover, no Apply button.
  await expect(search(page)).toBeVisible();
  await expect(filtersButton(page)).toHaveCount(0);
  await expect(dashboard.getByRole("button", { name: "Apply" })).toHaveCount(0);

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

  // A status badge per stage, each in its own colour.
  for (const [name, label, tone] of [
    ["Product Launch Evening", "Draft", "gray"],
    ["Leadership Summit", "Sent", "blue"],
    ["Annual Sales Kickoff", "Receiving responses", "amber"],
    ["Customer Advisory Board", "Under review", "purple"],
    ["Holiday Town Hall", "Awarded", "green"],
  ] as const) {
    await expect(row(page, name).locator("[data-tone]")).toHaveText(label);
    await expect(row(page, name).locator("[data-tone]")).toHaveAttribute("data-tone", tone);
  }

  // Under the name: the event dates, or the short ID when there are none.
  await expect(row(page, "Leadership Summit").getByTestId("row-identifier")).toHaveText(`${shown(inDays(20))} – ${shown(inDays(22))} · Austin`);
  await expect(row(page, "Product Launch Evening").getByTestId("row-identifier")).toHaveText("ID 000003");

  // The name opens the edit page, the same place as Edit in the row menu.
  await expect(row(page, "Leadership Summit").getByRole("link", { name: "Leadership Summit" }))
    .toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${"2".padStart(24, "0")}`);
  await menuButton(page, "Leadership Summit").click();
  await expect(page.getByRole("menuitem")).toHaveText(["Edit", "Preview", "Duplicate", "Archive"]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(menuButton(page, "Leadership Summit")).toBeFocused();
  await checkBothThemes(page, testInfo, "planner-my-proposals");

  // By status: the tab narrows the list and the summary with it.
  await statusTab(page, /^Draft/).click();
  await expect(page).toHaveURL(/stage=draft/);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Product Launch Evening");
  // Nothing active, no responses, nothing awarded: one card instead of three zeros.
  await expect(summary.getByTestId("summary-empty")).toContainText("No activity for these filters yet");
  await expect(summary.getByTestId("summary-active")).toHaveCount(0);

  // Archived proposals are restored from the proposal list: no row menu here, and a muted badge.
  await statusTab(page, /^Archived/).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(row(page, "Partner Summit 2025").locator("[data-tone]")).toHaveAttribute("data-tone", "muted");
  await expect(page.getByRole("button", { name: /^Actions for/ })).toHaveCount(0);
  await expect(row(page, "Partner Summit 2025").getByRole("link", { name: "Partner Summit 2025" })).toHaveAttribute("href", /^\/proposal\//);

  // A status with nothing in it for this search. The search applies by itself after a pause.
  await statusTab(page, /^Under review/).click();
  await expect(rows(page)).toHaveCount(1);
  await search(page).fill("no such event");
  await expect(page).toHaveURL(/search=no\+such\+event/);
  await expect(page.getByText("No proposals match these filters")).toBeVisible();
  await expect(chips(page)).toHaveText(["Search: no such event"]);
  await check(page, testInfo, "planner-no-matches");

  // A Planner can't widen the view through the URL; unknown and malformed values are dropped.
  await page.goto(`/dashboard?view=organization&owner=${"7".repeat(24)}&team=nope&sortBy=secret&sortOrder=sideways&page=-3&eventFrom=yesterday`);
  await expect(page.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "mine");
  await expect(rows(page)).toHaveCount(5);
  await expect(chips(page)).toHaveCount(0);
  await expect(page.getByRole("table")).not.toContainText("Trade Show Booth AV");
});

test("Team Manager: My Proposals plus a Team tab with a planner filter", async ({ page }, testInfo) => {
  await signInAs(page, "manager");
  await expect(page.getByText("Your role: Team Manager")).toBeVisible();
  const views = page.getByRole("navigation", { name: "Dashboard views" });
  await expect(views.getByRole("link")).toHaveText(["My Proposals", "Team"]);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Regional Roadshow");
  await expect(page.getByTestId("admin-visibility-note")).toBeVisible();

  // One draft and nothing sent yet: every stat is zero, so one card says so and offers to start.
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary.getByTestId("summary-empty")).toContainText("No proposal activity yet");
  await expect(summary.getByTestId("summary-active")).toHaveCount(0);
  await expect(summary.getByTestId("summary-empty-create")).toHaveAttribute("href", "/proposals/add-new-proposal");
  await check(page, testInfo, "team-manager-zero-stats");

  await views.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/view=team/);
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
  // The managed team's proposals (Priya's five open, Peter's two, her own); nothing from Field Marketing.
  await expect(rows(page)).toHaveCount(8);
  await expect(page.getByRole("table")).not.toContainText("Trade Show Booth AV");
  // Her own row can be changed from here; the dashboard keeps other planners' rows read-only.
  await expect(menuButton(page, "Regional Roadshow")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Actions for/ })).toHaveCount(1);
  await expect(row(page, "Engineering Offsite").getByRole("link", { name: "Engineering Offsite" })).toHaveAttribute("href", /^\/proposal\//);

  // The team view's Filters popover: planner and team, nothing an Admin alone gets.
  await openFilters(page);
  await expect(filtersPanel(page).getByLabel("Planner").locator("option")).toHaveText(["All planners", "Maya Manager", "Peter Planner", "Priya Planner"]);
  await expect(filtersPanel(page).getByLabel("Team")).toBeVisible();
  await expect(filtersPanel(page).getByLabel("Venue city")).toHaveCount(0);
  await expect(filtersPanel(page).getByRole("button", { name: /Event dates/ })).toHaveCount(0);
  await check(page, testInfo, "team-manager-team-filters-open");

  await filtersPanel(page).getByLabel("Planner").selectOption({ label: "Peter Planner" });
  await expect(page).toHaveURL(/owner=6{24}/);
  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByRole("table")).toContainText("Engineering Offsite");
  await expect(page.getByRole("table")).toContainText("Investor Day");
  await expect(statusTab(page, /^All open/)).toHaveText("All open: 2 proposals");
  await expect(summary.getByTestId("summary-responses")).toHaveText("1");
  await expect(chips(page)).toHaveText(["Planner: Peter Planner"]);
  // Escape closes the popover and hands focus back to its button.
  await page.keyboard.press("Escape");
  await expect(filtersPanel(page)).toHaveCount(0);
  await expect(filtersButton(page)).toBeFocused();
  await expect(filtersButton(page)).toContainText("1 applied");
  await check(page, testInfo, "team-manager-planner-filter");

  await page.getByRole("link", { name: "Clear all" }).click();
  await expect(rows(page)).toHaveCount(8);
  await expect(chips(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard\?view=team$/);
});

for (const [account, label] of [["admin", "Admin"], ["owner", "Owner"]] as const) {
  test(`${label}: organization-wide view with every filter, sorting, paging and the summary row`, async ({ page }, testInfo) => {
    await signInAs(page, account);
    await expect(page.getByText(`Your role: ${label}`)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Dashboard views" }).getByRole("link")).toHaveText(["Organization", "My Proposals"]);
    await expect(page.getByRole("heading", { name: "Organization" })).toBeVisible();
    await expect(page.getByTestId("admin-visibility-note")).toHaveCount(0);

    // Everything in the organization, drafts included: 35 open proposals, ten to a page.
    await expect(statusTab(page, /^All open/)).toHaveText("All open: 35 proposals");
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByText("Showing 1–10 of 35 proposals")).toBeVisible();
    const summary = page.getByRole("region", { name: "Summary" });
    await expect(summary.getByTestId("summary-active")).toHaveText("18");
    await expect(summary.getByTestId("summary-responses")).toHaveText("17");
    await expect(summary.getByTestId("summary-awarded")).toHaveText("2");
    // No Apply button and no "Sort by" list: filters apply as they change, columns sort.
    await expect(page.getByTestId("role-dashboard").getByRole("button", { name: "Apply" })).toHaveCount(0);
    await expect(page.getByLabel("Sort by")).toHaveCount(0);
    await openFilters(page);
    for (const name of ["Planner", "Team", "Venue city"]) await expect(filtersPanel(page).getByLabel(name, { exact: true })).toBeVisible();
    await expect(filtersPanel(page).getByRole("button", { name: /Event dates/ })).toBeVisible();
    await checkBothThemes(page, testInfo, `${account}-organization-filters-open`);
    await page.keyboard.press("Escape");

    // Paging: plain links, the position in the URL.
    const pages = page.getByRole("navigation", { name: "Pages" });
    await pages.getByRole("link", { name: /Next/ }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByText("Showing 11–20 of 35 proposals")).toBeVisible();
    if (!isMobile(testInfo)) {
      await pages.getByRole("link", { name: "Page 4" }).click();
      await expect(page).toHaveURL(/page=4/);
      await expect(rows(page)).toHaveCount(5);
      await expect(page.getByText("Showing 31–35 of 35 proposals")).toBeVisible();
      await expect(pages.getByRole("link", { name: /Next/ })).toHaveCount(0);
    }
    // A page past the end goes to the last page.
    await page.goto("/dashboard?page=99");
    await expect(page).toHaveURL(/page=4/);
    await expect(rows(page)).toHaveCount(5);

    // Sorting: a column header is a link; the backend sorts the whole list, not this page.
    await page.goto("/dashboard?page=2");
    const header = (name: string) => page.getByRole("columnheader").getByRole("link", { name: new RegExp(`^${name}`) });
    await header("Proposal").click();
    await expect(page).toHaveURL(/\/dashboard\?sortBy=eventName$/);
    await expect(rows(page).first()).toContainText("All-Hands Broadcast");
    await expect(page.getByRole("columnheader", { name: /Proposal/ })).toHaveAttribute("aria-sort", "ascending");
    await header("Proposal").click();
    await expect(page).toHaveURL(/sortBy=eventName&sortOrder=desc/);
    await expect(rows(page).first()).toContainText("Trade Show Booth AV");
    await expect(page.getByRole("columnheader", { name: /Proposal/ })).toHaveAttribute("aria-sort", "descending");
    await header("Event date").click();
    await expect(page).toHaveURL(/\/dashboard\?sortBy=eventStartDate$/);
    // Soonest first; proposals with no event date yet come before the dated ones.
    await expect(rows(page).first()).toContainText("Product Launch Evening");
    await expect(rows(page).nth(2)).toContainText("All-Hands Broadcast");
    if (!isMobile(testInfo)) {
      // "Updated" is hidden on a phone, with the other secondary columns.
      // Back to the usual order (most recently updated first), then flipped.
      await header("Updated").click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(rows(page).first()).toContainText("Annual Sales Kickoff");
      await header("Updated").click();
      await expect(page).toHaveURL(/\/dashboard\?sortOrder=asc$/);
      await expect(rows(page).first()).toContainText("Regional Meetup 20");
      await expect(page.getByRole("columnheader", { name: /Updated/ })).toHaveAttribute("aria-sort", "ascending");
    }
    // The sort survives a reload.
    await page.goto("/dashboard?sortBy=eventName&sortOrder=desc");
    await page.reload();
    await expect(rows(page).first()).toContainText("Trade Show Booth AV");

    // Team + venue city + status together; the summary follows the list. Each change is in the URL.
    await page.goto("/dashboard?page=2");
    await openFilters(page);
    await filtersPanel(page).getByLabel("Team", { exact: true }).selectOption({ label: "Corporate Events" });
    // Changing a filter goes back to the first page.
    await expect(page).toHaveURL(/\/dashboard\?team=a{24}$/);
    await expect(rows(page)).toHaveCount(8);
    await filtersPanel(page).getByLabel("Venue city").fill("chicago");
    await expect(page).toHaveURL(/team=a{24}&venueCity=chicago$/);
    await expect(rows(page)).toHaveCount(3);
    await expect(summary.getByTestId("summary-responses")).toHaveText("6");
    await expect(chips(page)).toHaveText(["Team: Corporate Events", "Venue city: chicago"]);
    await page.keyboard.press("Escape");
    await statusTab(page, /^Awarded/).click();
    await expect(page).toHaveURL(/stage=awarded/);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Holiday Town Hall");
    await expect(summary.getByTestId("summary-awarded")).toHaveText("1");
    await check(page, testInfo, `${account}-filtered`);

    // The filters are the URL: they survive a reload...
    await page.reload();
    await expect(rows(page)).toHaveCount(1);
    await expect(chips(page)).toHaveText(["Team: Corporate Events", "Venue city: chicago"]);
    await expect(filtersButton(page)).toContainText("2 applied");
    // ...and Back steps through the choices: the status tab, then the team (typing the city
    // replaced the team's entry instead of adding one per keystroke).
    await page.goBack();
    await expect(page).not.toHaveURL(/stage=/);
    await expect(rows(page)).toHaveCount(3);
    await expect(chips(page)).toHaveText(["Team: Corporate Events", "Venue city: chicago"]);
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard\?page=2$/);
    await expect(chips(page)).toHaveCount(0);
    await page.goForward();
    await expect(chips(page)).toHaveText(["Team: Corporate Events", "Venue city: chicago"]);

    // A chip removes its own filter; Clear all removes the rest and keeps the status tab.
    await statusTab(page, /^Draft/).click();
    await page.getByRole("link", { name: "Remove filter Venue city: chicago" }).click();
    await expect(page).not.toHaveURL(/venueCity/);
    await expect(chips(page)).toHaveText(["Team: Corporate Events"]);
    await expect(rows(page)).toHaveCount(2);
    await page.getByRole("link", { name: "Clear all" }).click();
    await expect(page).toHaveURL(/\/dashboard\?stage=draft$/);
    await expect(chips(page)).toHaveCount(0);
    await expect(filtersButton(page)).not.toContainText("applied");

    // Search waits for a pause in typing: one request for the finished word, the box keeps
    // focus and its text, and the history gains no entry per keystroke.
    await page.goto("/dashboard");
    const searches: string[] = [];
    page.on("request", (request) => {
      const value = new URL(request.url()).searchParams.get("search");
      if (new URL(request.url()).pathname === "/dashboard" && value !== null) searches.push(value);
    });
    const before = await page.evaluate(() => window.history.length);
    await search(page).pressSequentially("Regional", { delay: 60 });
    await expect(page).toHaveURL(/\/dashboard\?search=Regional$/);
    // Twenty meetups and the roadshow, across three pages.
    await expect(page.getByText("Showing 1–10 of 21 proposals")).toBeVisible();
    expect(new Set(searches)).toEqual(new Set(["Regional"]));
    await expect(search(page)).toBeFocused();
    await expect(search(page)).toHaveValue("Regional");
    expect(await page.evaluate(() => window.history.length)).toBe(before);
    await expect(chips(page)).toHaveText(["Search: Regional"]);
    // Removing the chip empties the box too.
    await page.getByRole("link", { name: "Remove filter Search: Regional" }).click();
    await expect(search(page)).toHaveValue("");
    await expect(page.getByText("Showing 1–10 of 35 proposals")).toBeVisible();

    // One date-range field. Three events start between five and sixteen days out.
    await openFilters(page);
    await filtersPanel(page).getByRole("button", { name: /Event dates/ }).click();
    await expect(page.getByRole("dialog", { name: "Event dates" })).toBeVisible();
    await pickDay(page, inDays(5));
    await pickDay(page, inDays(16));
    await expect(page).toHaveURL(new RegExp(`eventFrom=${iso(inDays(5))}&eventTo=${iso(inDays(16))}`));
    await expect(rows(page)).toHaveCount(3);
    const range = `${shown(inDays(5))} – ${shown(inDays(16))}`;
    await expect(chips(page)).toHaveText([`Event dates: ${range}`]);
    await expect(filtersPanel(page).getByRole("button", { name: /Event dates/ })).toContainText(range);
    await check(page, testInfo, `${account}-date-range`);
    await page.reload();
    await expect(rows(page)).toHaveCount(3);
    await expect(chips(page)).toHaveText([`Event dates: ${range}`]);
    // Clearing from the calendar.
    await openFilters(page);
    await filtersPanel(page).getByRole("button", { name: /Event dates/ }).click();
    await page.getByRole("dialog", { name: "Event dates" }).getByRole("button", { name: "Clear dates" }).click();
    await expect(page).not.toHaveURL(/eventFrom/);
    await expect(chips(page)).toHaveCount(0);

    // Planner filter.
    await page.goto(`/dashboard?owner=${"6".repeat(24)}`);
    await expect(rows(page)).toHaveCount(2);
    await expect(chips(page)).toHaveText(["Planner: Peter Planner"]);

    // Three proposals share a name: the line under it tells them apart (dates and ID, or ID).
    await page.goto("/dashboard?search=Northstar&sortBy=createdAt");
    await expect(rows(page)).toHaveCount(3);
    const identifiers = await page.getByTestId("row-identifier").allTextContents();
    const dates = `${shown(inDays(150))} – ${shown(inDays(152))}`;
    expect(identifiers).toEqual([`${dates} · ID 00000E · Orlando`, `${dates} · ID 00000F · Orlando`, "ID 000010"]);
    expect(new Set(identifiers).size).toBe(3);
    await check(page, testInfo, `${account}-same-name`);

    // Another organization's team: the backend answers 404 and the page says so plainly.
    await page.goto(`/dashboard?team=${"f".repeat(24)}`);
    await expect(page.getByTestId("role-dashboard").getByRole("alert")).toContainText("We couldn't find those proposals. They may have been moved or belong to another organization.");
    await expect(page.getByRole("table")).toHaveCount(0);
    await check(page, testInfo, `${account}-other-organization-404`);
    await page.getByRole("link", { name: "reset the dashboard" }).click();
    await expect(rows(page)).toHaveCount(10);

    // My Proposals is the member's own.
    await page.getByRole("navigation", { name: "Dashboard views" }).getByRole("link", { name: "My Proposals" }).click();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText(account === "admin" ? "All-Hands Broadcast" : "Board Meeting AV");
  });
}

test("Owner: the row menu edits, duplicates and archives, and respects the plan limit", async ({ page, request }, testInfo) => {
  await signInAs(page, "owner");
  // An Owner may change any proposal in the organization, so every row has the menu.
  await expect(page.getByRole("button", { name: /^Actions for/ })).toHaveCount(10);
  await expect(row(page, "Leadership Summit").getByRole("link", { name: "Leadership Summit" }))
    .toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${"2".padStart(24, "0")}`);

  await menuButton(page, "Leadership Summit").click();
  await expect(page.getByRole("menuitem")).toHaveText(["Edit", "Preview", "Duplicate", "Archive"]);
  await page.screenshot({ path: testInfo.outputPath("owner-row-menu-dark.png") });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.screenshot({ path: testInfo.outputPath("owner-row-menu-light.png") });
  await page.evaluate(() => document.documentElement.classList.add("dark"));

  // Archive asks first. Cancel leaves the proposal alone.
  await page.getByRole("menuitem", { name: "Archive" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Archive this proposal?");
  await expect(confirm).toContainText("Leadership Summit");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(row(page, "Leadership Summit")).toHaveCount(1);
  expect((await (await request.get(`${STUB}/__e2e/dashboard`)).json()).archived).toEqual([]);

  await menuButton(page, "Leadership Summit").click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await confirm.getByRole("button", { name: "Move to archive" }).click();
  await expect(page.getByText("Proposal moved to archive.")).toBeVisible();
  await expect(row(page, "Leadership Summit")).toHaveCount(0);
  await expect(statusTab(page, /^All open/)).toHaveText("All open: 34 proposals");
  await expect(statusTab(page, /^Archived/)).toHaveText("Archived: 2 proposals");
  expect((await (await request.get(`${STUB}/__e2e/dashboard`)).json()).archived).toEqual(["2".padStart(24, "0")]);

  // Duplicate opens the same copy dialog as the proposal list and saves through the same action.
  await menuButton(page, "Annual Sales Kickoff").click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  const copy = page.getByRole("dialog", { name: "Save a Copy" });
  await expect(copy).toBeVisible();
  await copy.getByPlaceholder("Enter event name for the copy").fill("Annual Sales Kickoff (West)");
  await copy.getByRole("button", { name: "Save Copy" }).click();
  await expect(page.getByText("Copy saved. Find it under the Saved tab in Proposals.")).toBeVisible();
  await expect(copy).toHaveCount(0);
  expect((await (await request.get(`${STUB}/__e2e/dashboard`)).json()).copies).toEqual([
    { sourceId: "1".padStart(24, "0"), eventName: "Annual Sales Kickoff (West)" },
  ]);

  // Edit goes to the edit page.
  await menuButton(page, "Annual Sales Kickoff").click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(new RegExp(`/proposals/proposal-edit\\?proposalId=${"1".padStart(24, "0")}$`));

  // At the plan's limit a copy would be refused, so Duplicate says why instead of opening.
  await request.post(`${STUB}/__e2e/plan`, { data: { plan: "free_trial", created: 2 } });
  await page.goto("/dashboard");
  await expect(page.getByTestId("rfp-limit")).toBeVisible();
  await menuButton(page, "Annual Sales Kickoff").click();
  await expect(page.getByRole("menuitem", { name: /Duplicate/ })).toContainText("Your plan's proposal limit is reached");
  await page.getByRole("menuitem", { name: /Duplicate/ }).click();
  await expect(page.getByRole("dialog", { name: "Save a Copy" })).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "2 of 2" })).toBeVisible();
  expect((await (await request.get(`${STUB}/__e2e/dashboard`)).json()).copies).toHaveLength(1);

  // The all-zero stat card offers no create button at the limit either.
  await page.goto("/dashboard?view=mine&stage=draft");
  await expect(page.getByTestId("summary-empty")).toBeVisible();
  await expect(page.getByTestId("summary-empty-create")).toHaveCount(0);
});

test("Viewer: a read-only Shared with me view only", async ({ page }, testInfo) => {
  await signInAs(page, "viewer");
  const dashboard = page.getByTestId("role-dashboard");
  await expect(dashboard).toHaveAttribute("data-dashboard-view", "shared");
  await expect(page.getByText("Your role: Viewer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shared with me" })).toBeVisible();
  await expect(dashboard.getByText("You can read them; you can't edit or send them.", { exact: false })).toBeVisible();

  // Only the two proposals shared with the Viewer.
  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByRole("table")).toContainText("Annual Sales Kickoff");
  await expect(page.getByRole("table")).toContainText("Trade Show Booth AV");

  // Read-only: no other views, no summary or panels, nothing to create, edit, send or comment on.
  await expect(page.getByRole("navigation", { name: "Dashboard views" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Summary" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Upcoming deadlines" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "New submissions" })).toHaveCount(0);
  await expect(page.getByTestId("admin-visibility-note")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: /New Proposal/i })).toHaveCount(0);
  // No row menu, no actions column, no Filters popover: the search box is the only control.
  await expect(dashboard.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Actions" })).toHaveCount(0);
  await expect(dashboard.getByRole("textbox")).toHaveCount(0);
  await expect(dashboard.getByRole("searchbox")).toHaveCount(1);
  await expect(dashboard).not.toContainText(/comment/i);
  // Every link stays on the dashboard or opens the read-only page; the name never opens the editor.
  for (const href of await dashboard.getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href") || ""))) {
    expect(href).toMatch(/^\/(dashboard|proposal\/)/);
  }
  await checkBothThemes(page, testInfo, "viewer-shared-with-me");

  // The other roles' views and filters aren't reachable through the URL.
  await page.goto(`/dashboard?view=organization&owner=${"4".repeat(24)}&team=${"a".repeat(24)}`);
  await expect(page.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "shared");
  await expect(page.getByRole("heading", { name: "Shared with me" })).toBeVisible();
  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByRole("table")).not.toContainText("Engineering Offsite");
  await expect(chips(page)).toHaveCount(0);
});

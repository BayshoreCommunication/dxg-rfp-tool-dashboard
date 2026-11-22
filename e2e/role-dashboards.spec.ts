import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type APIRequestContext, type Frame, type Page, type Request, type TestInfo } from "@playwright/test";
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
  page.on("pageerror", (error) => seen.push(`${String(error)} at ${page.url()}`));
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

// Opens /dashboard and waits until the app shell's mount actions are over, so a click that follows
// starts its navigation with no server action in flight.
//
// Why: on mount the shell calls five server actions (components/layout/Sidebar.tsx: notification
// unread count, vendor unread count, support unread count, notification socket config;
// components/support/SupportFab.tsx: support unread count again). Next runs server actions one at a
// time through its router action queue, and a navigation that starts while one is in flight can be
// overwritten when a later queued action settles against the state from before the navigation.
//
// A server action is a POST carrying a Next-Action header. The wait ends when at least
// SHELL_MOUNT_ACTIONS of them, started by the freshly loaded document, have ended and none is in
// flight. The floor matters because the queue is serial: between two actions nothing is in flight.
const SHELL_MOUNT_ACTIONS = 5;
const dashboardWithShellSettled = async (page: Page) => {
  const inFlight = new Set<Request>();
  let ended = 0;
  const isServerAction = (request: Request) => request.method() === "POST" && Boolean(request.headers()["next-action"]);
  const onRequest = (request: Request) => {
    if (isServerAction(request)) inFlight.add(request);
  };
  // Finished or failed (the browser reports some as cancelled once Next has read the result).
  const onEnd = (request: Request) => {
    if (inFlight.delete(request)) ended += 1;
  };
  // Count only the new document's actions, not ones the page being left still had open.
  const onNavigated = (frame: Frame) => {
    if (frame !== page.mainFrame()) return;
    inFlight.clear();
    ended = 0;
  };
  page.on("request", onRequest);
  page.on("requestfinished", onEnd);
  page.on("requestfailed", onEnd);
  page.on("framenavigated", onNavigated);
  try {
    await page.goto("/dashboard");
    await expect
      .poll(() => (ended >= SHELL_MOUNT_ACTIONS && inFlight.size === 0 ? "settled" : `${ended} of ${SHELL_MOUNT_ACTIONS} ended, ${inFlight.size} in flight`), {
        message: "the app shell's mount server actions should all have ended",
      })
      .toBe("settled");
  } finally {
    page.off("request", onRequest);
    page.off("requestfinished", onEnd);
    page.off("requestfailed", onEnd);
    page.off("framenavigated", onNavigated);
  }
};

// The stat cards: the signed-in member's own totals, in the order they are shown (proposals,
// emails sent, emails clicked, proposal views, vendor responses).
const statCards = (page: Page) => page.getByRole("region", { name: "Your totals" });
const STAT_IDS = ["proposals", "sent", "clicked", "views", "vendor-responses"] as const;
const expectStatValues = async (page: Page, values: readonly [string, string, string, string, string]) => {
  for (const [index, id] of STAT_IDS.entries()) await expect(statCards(page).getByTestId(`stat-card-${id}-value`)).toHaveText(values[index]);
};
const unreadPill = (page: Page) => statCards(page).getByTestId("stat-card-vendor-responses-badge");
// The three role summary cards the stat cards replaced, and the card that stood in for them.
const expectNoSummaryRow = async (page: Page) => {
  await expect(page.getByRole("region", { name: "Summary" })).toHaveCount(0);
  await expect(page.locator('[data-testid^="summary-"]')).toHaveCount(0);
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

  // The stat cards are Priya's own totals: six proposals (the archived one included), 22 emails
  // sent, 9 clicked, 1,234 views and 14 vendor responses, three of them unread.
  await expectStatValues(page, ["6", "22", "9", "1,234", "14"]);
  await expect(unreadPill(page)).toHaveText("3 unread");
  await expectNoSummaryRow(page);

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

  // By status: the tab narrows the list. The stat cards are the planner's totals and stay put.
  await statusTab(page, /^Draft/).click();
  await expect(page).toHaveURL(/stage=draft/);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Product Launch Evening");
  await expectStatValues(page, ["6", "22", "9", "1,234", "14"]);
  await expectNoSummaryRow(page);

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

test("Team Manager: My Proposals plus a Team tab with a planner filter, and the row menu on a managed team's proposals", async ({ page, request }, testInfo) => {
  await signInAs(page, "manager");
  await expect(page.getByText("Your role: Team Manager")).toBeVisible();
  const views = page.getByRole("navigation", { name: "Dashboard views" });
  await expect(views.getByRole("link")).toHaveText(["My Proposals", "Team"]);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Regional Roadshow");
  await expect(page.getByTestId("admin-visibility-note")).toBeVisible();

  // One draft of her own and nothing sent yet: real zeros, and the header's button is the way to start.
  await expectStatValues(page, ["1", "0", "0", "0", "0"]);
  await expect(unreadPill(page)).toHaveText("0 unread");
  await expectNoSummaryRow(page);
  await expect(page.getByRole("link", { name: "New Proposal" })).toHaveAttribute("href", "/proposals/add-new-proposal");
  await check(page, testInfo, "team-manager-own-totals");

  await views.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/view=team/);
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
  // The managed team's proposals (Priya's five open, Peter's two, her own), plus the one Field
  // Marketing proposal shared with her to view; nothing else from Field Marketing.
  await expect(rows(page)).toHaveCount(9);
  await expect(page.getByRole("table")).not.toContainText("Trade Show Booth AV");

  // Row permissions: a managed team's proposal can be changed from here, like her own.
  await expect(menuButton(page, "Regional Roadshow")).toBeVisible();
  await expect(row(page, "Engineering Offsite").getByRole("link", { name: "Engineering Offsite" }))
    .toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${"7".padStart(24, "0")}`);
  await menuButton(page, "Engineering Offsite").click();
  await expect(page.getByRole("menuitem")).toHaveText(["Edit", "Preview", "Duplicate", "Archive"]);
  await page.screenshot({ path: testInfo.outputPath("team-manager-managed-team-row-menu.png") });
  await page.keyboard.press("Escape");
  // Another team's proposal, shared to view: it can be copied, not edited or archived, and its
  // name opens the read-only page.
  await expect(row(page, "Field Kickoff").getByRole("link", { name: "Field Kickoff" })).toHaveAttribute("href", /^\/proposal\//);
  await menuButton(page, "Field Kickoff").click();
  await expect(page.getByRole("menuitem")).toHaveText(["Preview", "Duplicate"]);
  await page.screenshot({ path: testInfo.outputPath("team-manager-other-team-row-menu.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  // A row the API sent without permissions (an older API) behaves as before them: a team
  // proposal that isn't her own stays read-only, with no menu.
  await expect(row(page, "Investor Day").getByRole("link", { name: "Investor Day" })).toHaveAttribute("href", /^\/proposal\//);
  await expect(page.getByRole("button", { name: "Actions for Investor Day" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Actions for/ })).toHaveCount(8);

  // The team view's Filters popover: planner and team, nothing an Admin alone gets.
  await openFilters(page);
  await expect(filtersPanel(page).getByLabel("Planner").locator("option")).toHaveText(["All planners", "Fiona Field", "Maya Manager", "Peter Planner", "Priya Planner"]);
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
  // The Team tab and its planner filter list other people's proposals; the cards are still Maya's own.
  await expectStatValues(page, ["1", "0", "0", "0", "0"]);
  await expect(chips(page)).toHaveText(["Planner: Peter Planner"]);
  // Escape closes the popover and hands focus back to its button.
  await page.keyboard.press("Escape");
  await expect(filtersPanel(page)).toHaveCount(0);
  await expect(filtersButton(page)).toBeFocused();
  await expect(filtersButton(page)).toContainText("1 applied");
  await check(page, testInfo, "team-manager-planner-filter");

  await page.getByRole("link", { name: "Clear all" }).click();
  await expect(rows(page)).toHaveCount(9);
  await expect(chips(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard\?view=team$/);

  // The menu's Archive works on a managed team's proposal: the backend (here the stub) agrees.
  await menuButton(page, "Engineering Offsite").click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Move to archive" }).click();
  await expect(page.getByText("Proposal moved to archive.")).toBeVisible();
  await expect(row(page, "Engineering Offsite")).toHaveCount(0);
  expect((await (await request.get(`${STUB}/__e2e/dashboard`)).json()).archived).toEqual(["7".padStart(24, "0")]);
});

for (const [account, label] of [["admin", "Admin"], ["owner", "Owner"]] as const) {
  test(`${label}: organization-wide view with every filter, sorting, paging and their own stat cards`, async ({ page }, testInfo) => {
    await signInAs(page, account);
    await expect(page.getByText(`Your role: ${label}`)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Dashboard views" }).getByRole("link")).toHaveText(["Organization", "My Proposals"]);
    await expect(page.getByRole("heading", { name: "Organization" })).toBeVisible();
    await expect(page.getByTestId("admin-visibility-note")).toHaveCount(0);

    // Everything in the organization, drafts included: 35 open proposals, ten to a page.
    await expect(statusTab(page, /^All open/)).toHaveText("All open: 35 proposals");
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByText("Showing 1–10 of 35 proposals")).toBeVisible();
    // The list is the whole organization's; the cards are this member's own single proposal.
    const ownTotals = account === "admin" ? (["1", "3", "2", "18", "0"] as const) : (["1", "2", "1", "7", "2"] as const);
    await expectStatValues(page, ownTotals);
    await expect(unreadPill(page)).toHaveText(account === "admin" ? "0 unread" : "1 unread");
    await expect(statCards(page).getByTestId("dashboard-stat-cards-caption")).toContainText("Counts for the proposals you own.");
    await expectNoSummaryRow(page);
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
    // A page past the end shows the last page.
    await page.goto("/dashboard?page=99");
    await expect(rows(page)).toHaveCount(5);
    await expect(page.getByText("Showing 31–35 of 35 proposals")).toBeVisible();

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

    // Team + venue city + status together. Each change is in the URL; none of them moves the stat cards.
    await page.goto("/dashboard?page=2");
    await openFilters(page);
    await filtersPanel(page).getByLabel("Team", { exact: true }).selectOption({ label: "Corporate Events" });
    // Changing a filter goes back to the first page.
    await expect(page).toHaveURL(/\/dashboard\?team=a{24}$/);
    await expect(rows(page)).toHaveCount(8);
    await filtersPanel(page).getByLabel("Venue city").fill("chicago");
    await expect(page).toHaveURL(/team=a{24}&venueCity=chicago$/);
    await expect(rows(page)).toHaveCount(3);
    await expectStatValues(page, ownTotals);
    await expect(chips(page)).toHaveText(["Team: Corporate Events", "Venue city: chicago"]);
    await page.keyboard.press("Escape");
    await statusTab(page, /^Awarded/).click();
    await expect(page).toHaveURL(/stage=awarded/);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Holiday Town Hall");
    await expectStatValues(page, ownTotals);
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
    await expect(page).toHaveURL(/stage=draft/);
    await expect(rows(page)).toHaveCount(1);
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

  // The free trial doesn't include vendor responses: that card says so instead of a number, and
  // the old all-zero summary card (with its create button) is gone.
  await page.goto("/dashboard?view=mine&stage=draft");
  await expect(statCards(page).getByTestId("stat-card-vendor-responses-value")).toHaveText("—");
  await expect(unreadPill(page)).toHaveText("Not in your plan");
  await expect(statCards(page).getByTestId("dashboard-stat-cards-unavailable")).toHaveCount(0);
  await expectStatValues(page, ["1", "2", "1", "7", "—"]);
  await expectNoSummaryRow(page);
});

// The five stat cards: the signed-in member's own totals from GET /api/dashboard/overview and the
// vendor-responses total, above a list that may be a team's or the whole organization's.
test.describe("Stat cards", () => {
  const CARDS = [
    { id: "proposals", title: "Total Proposals", action: "Open proposals", href: "/proposals" },
    { id: "sent", title: "Total Email Sent", action: "Open email activity", href: "/email" },
    { id: "clicked", title: "Total Email Clicked", action: "Open email activity", href: "/email" },
    { id: "views", title: "Total Proposal Views", action: "Review proposals", href: "/proposals" },
    { id: "vendor-responses", title: "Vendor Responses", action: "Open responses", href: "/vendor-responses" },
  ] as const;
  const noOverflow = async (page: Page) =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  // How many cards sit on the first row.
  const acrossFirstRow = async (page: Page) => {
    const tops = await statCards(page).locator("[data-dashboard-stat-card]").evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    return tops.filter((top) => top === tops[0]).length;
  };
  const setTheme = async (page: Page, theme: "dark" | "light") => {
    await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
    await page.waitForTimeout(500);
  };

  for (const [account, values, unread, names] of [
    ["planner", ["6", "22", "9", "1,234", "14"], "3 unread", ["Your Total Proposals: 6. Open proposals", "Your Total Email Sent: 22. Open email activity", "Your Total Email Clicked: 9. Open email activity", "Your Total Proposal Views: 1,234. Review proposals", "Your Vendor Responses: 14, 3 unread. Open responses"]],
    ["admin", ["1", "3", "2", "18", "0"], "0 unread", ["Your Total Proposals: 1. Open proposals", "Your Total Email Sent: 3. Open email activity", "Your Total Email Clicked: 2. Open email activity", "Your Total Proposal Views: 18. Review proposals", "Your Vendor Responses: 0, 0 unread. Open responses"]],
  ] as const) {
    test(`${account}: five cards with their own totals, the unread pill, the caption and a link each`, async ({ page }, testInfo) => {
      await signInAs(page, account);
      const cards = statCards(page);
      await expect(cards.getByRole("heading", { name: "Your totals" })).toBeVisible();
      await expect(cards.getByTestId("dashboard-stat-cards-caption")).toContainText("Counts for the proposals you own. The view and filters below don't change them.");
      await expect(cards.locator("[data-dashboard-stat-card]")).toHaveCount(5);
      await expect(cards.getByRole("heading", { level: 3 })).toHaveText(CARDS.map((card) => card.title));
      await expectStatValues(page, values);
      await expect(unreadPill(page)).toHaveText(unread);
      await expect(cards.getByTestId("dashboard-stat-cards-unavailable")).toHaveCount(0);
      for (const [index, card] of CARDS.entries()) {
        const link = cards.getByTestId(`stat-card-${card.id}`);
        await expect(link).toHaveAttribute("href", card.href);
        await expect(link).toHaveAccessibleName(names[index]);
        await expect(link).toContainText(card.action);
      }
      await expectNoSummaryRow(page);
      await expectProposalWording(cards);

      // Five across on a wide screen; on a phone one column, also at 375 px, never wider than the screen.
      if (isMobile(testInfo)) {
        expect(await acrossFirstRow(page)).toBe(1);
        await noOverflow(page);
        await page.setViewportSize({ width: 375, height: 812 });
        expect(await acrossFirstRow(page)).toBe(1);
        await noOverflow(page);
      } else {
        expect(await acrossFirstRow(page)).toBe(5);
        await noOverflow(page);
      }
      const size = isMobile(testInfo) ? "phone-375" : "desktop";
      await check(page, testInfo, `stat-cards-${account}-${size}-dark`);
      await setTheme(page, "light");
      await check(page, testInfo, `stat-cards-${account}-${size}-light`);
      await setTheme(page, "dark");

      // Each card opens the screen it names, on the first click. The click waits for the app shell's
      // mount actions (see dashboardWithShellSettled): clicked while one is in flight, the route change
      // can be undone a moment later (to /email and straight back to /dashboard). The wait keeps this
      // spec deterministic; it is not the fix. The fix belongs in the app (Sidebar.tsx, SupportFab.tsx)
      // and is a separate issue. No retry here: a bounce has to fail this test.
      for (const card of [CARDS[0], CARDS[1], CARDS[4]]) {
        await dashboardWithShellSettled(page);
        const opened = new RegExp(`${card.href}$`);
        const visited: string[] = [];
        const record = (frame: Frame) => {
          if (frame === page.mainFrame()) visited.push(frame.url());
        };
        page.on("framenavigated", record);
        await statCards(page).getByTestId(`stat-card-${card.id}`).click();
        await expect(page).toHaveURL(opened);
        // The dashboard is gone, the address is still the card's, and nothing else was visited on the way.
        await expect(page.getByTestId("role-dashboard")).toHaveCount(0);
        await expect(page).toHaveURL(opened);
        page.off("framenavigated", record);
        expect(visited.filter((url) => !opened.test(url))).toEqual([]);
      }
    });
  }

  test("a list of other people's proposals leaves the cards as the member's own", async ({ page }) => {
    await signInAs(page, "admin");
    // 35 open proposals in the organization; one of them is Adam's.
    await expect(statusTab(page, /^All open/)).toHaveText("All open: 35 proposals");
    await expectStatValues(page, ["1", "3", "2", "18", "0"]);
    await page.getByRole("navigation", { name: "Dashboard views" }).getByRole("link", { name: "My Proposals" }).click();
    await expect(page.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "mine");
    await expect(rows(page)).toHaveCount(1);
    await expectStatValues(page, ["1", "3", "2", "18", "0"]);
  });

  test("when the overview can't be loaded the cards say so and the dashboard still works", async ({ page, request }, testInfo) => {
    await signInAs(page, "planner");
    await request.post(`${STUB}/__e2e/dashboard?overview=down`);
    await page.reload();
    await expect(page.getByTestId("role-dashboard")).toBeVisible();
    // No made-up zeros: the four overview totals are missing, the vendor responses still count.
    await expectStatValues(page, ["—", "—", "—", "—", "14"]);
    await expect(unreadPill(page)).toHaveText("3 unread");
    await expect(statCards(page).getByTestId("dashboard-stat-cards-unavailable")).toHaveText("We couldn't load some of your totals. Reload the page to try again.");
    await expect(statCards(page).getByTestId("stat-card-proposals")).toHaveAccessibleName("Your Total Proposals: unavailable. Open proposals");
    await expect(rows(page)).toHaveCount(5);
    await expect(page.getByRole("region", { name: "Upcoming deadlines" })).toBeVisible();
    // No error banner (Next's own route announcer is an alert, so look inside the dashboard).
    await expect(page.getByTestId("role-dashboard").getByRole("alert")).toHaveCount(0);
    await check(page, testInfo, "stat-cards-overview-unavailable");
  });
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
  // A Viewer owns nothing: no stat cards (and no summary row).
  await expect(statCards(page)).toHaveCount(0);
  await expect(page.locator("[data-dashboard-stat-card]")).toHaveCount(0);
  await expectNoSummaryRow(page);
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

// Row permissions on the Proposals page: each card offers Edit, "Save a copy", Archive and
// Restore by the row's own `permissions` from GET /api/proposals. The stub serves the role
// accounts the same proposals as the dashboard here (roleDashboardFixture.mjs).
test.describe("Proposals page: row permissions", () => {
  const cards = (page: Page) => page.getByTestId("proposal-card");
  const card = (page: Page, name: string) => cards(page).filter({ hasText: name });
  const editLink = (page: Page, name: string) => card(page, name).getByRole("link", { name: "Edit", exact: true });
  const button = (page: Page, name: string, label: string) => card(page, name).getByRole("button", { name: label, exact: true });
  const editHref = (n: number) => `/proposals/proposal-edit?proposalId=${n.toString(16).padStart(24, "0")}`;

  const openProposals = async (page: Page, request: APIRequestContext, count: number) => {
    await request.post(`${STUB}/__e2e/dashboard?proposalsPage=on`);
    await page.goto("/proposals");
    await expect(cards(page)).toHaveCount(count);
  };

  // A card whose member may edit: the title and Edit open the edit page.
  const expectEditable = async (page: Page, name: string, n: number) => {
    await expect(editLink(page, name)).toHaveAttribute("href", editHref(n));
    await expect(card(page, name).getByTestId("proposal-title-link")).toHaveAttribute("href", editHref(n));
    await expect(card(page, name).getByTestId("proposal-title-link")).not.toHaveAttribute("target", "_blank");
  };

  // A card whose member may not: no Edit, and the title opens the preview in a new tab.
  const expectPreviewOnly = async (page: Page, name: string) => {
    await expect(editLink(page, name)).toHaveCount(0);
    const title = card(page, name).getByRole("link", { name: `${name} (opens in a new tab)`, exact: true });
    const previewHref = await card(page, name).getByRole("link", { name: "Preview", exact: true }).getAttribute("href");
    expect(previewHref).toMatch(/^\/proposal\//);
    await expect(title).toHaveAttribute("href", previewHref as string);
    await expect(title).toHaveAttribute("target", "_blank");
  };

  const checkPage = async (page: Page, testInfo: TestInfo, name: string) => {
    const accessibility = await new AxeBuilder({ page }).include('[data-testid="proposal-card"]').withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(
      accessibility.violations
        .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
        .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`),
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    // The page defines the term once: "requests for proposal (RFPs)".
    await expectProposalWording(page.getByRole("main"), ["requests for proposal (RFPs)"]);
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    expect(problems.get(page)).toEqual([]);
  };

  test("Planner: own proposals offer everything; a view-only share offers Save a copy and the preview, no Edit", async ({ page, request }, testInfo) => {
    await signInAs(page, "planner");
    // Her five open proposals and two of Fiona's: one shared with her to view, one to edit.
    await openProposals(page, request, 7);

    await expectEditable(page, "Leadership Summit", 2);
    await expect(button(page, "Leadership Summit", "Save a copy")).toBeVisible();
    await expect(button(page, "Leadership Summit", "Archive")).toBeVisible();

    await expectPreviewOnly(page, "Field Kickoff");
    await expect(button(page, "Field Kickoff", "Archive")).toHaveCount(0);
    await expect(button(page, "Field Kickoff", "Save a copy")).toBeVisible();
    // An edit share: Edit and Save a copy, but archiving is never shared.
    await expectEditable(page, "Regional Meetup 01", 20);
    await expect(button(page, "Regional Meetup 01", "Save a copy")).toBeVisible();
    await expect(button(page, "Regional Meetup 01", "Archive")).toHaveCount(0);
    await expect(cards(page).locator('a[href*="proposal-edit"]')).toHaveCount(12);
    await checkPage(page, testInfo, "proposals-planner-view-only-share");

    // The copy goes through: a view-only share may copy (the stub answers as the backend does).
    await button(page, "Field Kickoff", "Save a copy").click();
    const copy = page.getByRole("dialog", { name: "Save a Copy" });
    await copy.getByPlaceholder("Enter event name for the copy").fill("Field Kickoff (mine)");
    await copy.getByRole("button", { name: "Save Copy" }).click();
    await expect(page.getByText("Copy saved successfully!")).toBeVisible();
    expect((await (await request.get(`${STUB}/__e2e/dashboard`)).json()).copies).toEqual([
      { sourceId: "b".padStart(24, "0"), eventName: "Field Kickoff (mine)" },
    ]);

    // Archived tab: her own archived proposal can be restored.
    await page.getByRole("button", { name: /^ARCHIVE/ }).click();
    await expect(cards(page)).toHaveCount(1);
    await expect(button(page, "Partner Summit 2025", "Restore")).toBeVisible();
    await expect(button(page, "Partner Summit 2025", "Delete forever")).toBeVisible();
    await checkPage(page, testInfo, "proposals-planner-archived");
  });

  test("Team Manager: a managed team's proposals are editable, another team's view share is not, and a row without permissions behaves as before", async ({ page, request }, testInfo) => {
    await signInAs(page, "manager");
    await openProposals(page, request, 9);

    // Peter's proposal, in the team she manages.
    await expectEditable(page, "Engineering Offsite", 7);
    await expect(button(page, "Engineering Offsite", "Save a copy")).toBeVisible();
    await expect(button(page, "Engineering Offsite", "Archive")).toBeVisible();

    // Field Marketing's, shared with her to view.
    await expectPreviewOnly(page, "Field Kickoff");
    await expect(button(page, "Field Kickoff", "Save a copy")).toBeVisible();
    await expect(button(page, "Field Kickoff", "Archive")).toHaveCount(0);

    // Served without `permissions` (an older API): everything is offered to a member who isn't
    // a Viewer, exactly as this page did before the flags.
    await expectEditable(page, "Investor Day", 8);
    await expect(button(page, "Investor Day", "Save a copy")).toBeVisible();
    await expect(button(page, "Investor Day", "Archive")).toBeVisible();
    await checkPage(page, testInfo, "proposals-team-manager");
  });

  test("Viewer: no Edit, Save a copy or Archive on any proposal", async ({ page, request }, testInfo) => {
    await signInAs(page, "viewer");
    await openProposals(page, request, 2);
    for (const name of ["Annual Sales Kickoff", "Trade Show Booth AV"]) {
      await expectPreviewOnly(page, name);
      await expect(card(page, name).getByRole("link", { name: "Preview", exact: true })).toBeVisible();
    }
    for (const label of ["Save a copy", "Archive", "Restore"]) {
      await expect(page.getByRole("main").getByRole("button", { name: label, exact: true })).toHaveCount(0);
    }
    await expect(cards(page).locator('a[href*="proposal-edit"]')).toHaveCount(0);
    await checkPage(page, testInfo, "proposals-viewer");
  });
});

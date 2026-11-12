import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

// `next dev` compiles on demand, so give navigations more room than the suite's default.
const expect = baseExpect.configure({ timeout: 45_000 });

// Settings > Users for each role, against the stub backend (roleDashboardFixture.mjs for the
// accounts, members and teams; usersPageFixture.mjs for the rest): the role guide is there for
// everyone, says the right role, reads as a table on a wide screen and as a list at 375 px, and
// holds up in light and dark. Plus the proposal list's title link for an editor and a Viewer.

const backendOrigin = process.env.E2E_BACKEND_ORIGIN ?? "http://127.0.0.1:8011";
type Role = "owner" | "admin" | "planner" | "viewer";
const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", planner: "Planner", viewer: "Viewer" };

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    if (message.type() === "error") seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
  // The phone check is at 375 px, the narrowest width the app supports.
  if (testInfo.project.name.startsWith("mobile")) await page.setViewportSize({ width: 375, height: 812 });
});

const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith("mobile");

const signInAs = async (page: Page, role: Role) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`${role}-e2e@example.com`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("role-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
};

const setTheme = async (page: Page, theme: "light" | "dark") => {
  const toggle = page.getByTestId("dev-theme-toggle");
  // The development-only toggle can sit under page content on a phone, so it is activated
  // directly rather than by pointer.
  if ((await toggle.getAttribute("aria-pressed")) !== String(theme === "dark")) await toggle.dispatchEvent("click");
  if (theme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);
  else await expect(page.locator("html")).not.toHaveClass(/dark/);
};

// `skip` leaves out rules that fail on markup this change did not touch (the dialogs' grey field
// labels fail colour contrast on main today).
const seriousViolations = async (page: Page, selector: string, skip: string[] = []) => {
  const result = await new AxeBuilder({ page }).include(selector).withTags(["wcag2a", "wcag2aa"]).disableRules(skip).analyze();
  return result.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
};

const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

// The guide in both themes: no serious accessibility violations, nothing wider than the screen.
const checkGuide = async (page: Page, testInfo: TestInfo, guide: Locator, name: string) => {
  for (const theme of ["dark", "light"] as const) {
    await setTheme(page, theme);
    await guide.scrollIntoViewIfNeeded();
    expect(await seriousViolations(page, '[data-testid="role-access-guide"]')).toEqual([]);
    await noSidewaysScroll(page);
    await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}.png`), fullPage: true });
  }
};

const openGuide = async (page: Page, role: Role) => {
  await signInAs(page, role);
  await page.goto("/settings/users");
  const guide = page.getByTestId("role-access-guide");
  await expect(guide).toBeVisible();
  await expect(guide.getByRole("heading", { name: "What each role can do" })).toBeVisible();
  const yours = guide.getByTestId("your-role");
  await expect(yours).toContainText("Your role:");
  await expect(yours).toContainText(ROLE_LABEL[role]);
  // One line per role stays visible while the comparison is collapsed.
  const summaries = guide.getByTestId("role-summaries");
  for (const label of ["Owner", "Admin", "Team Manager", "Planner", "Viewer"]) await expect(summaries.getByText(label, { exact: true })).toBeVisible();
  await expect(summaries.getByText("(you)")).toHaveCount(1);
  await expect(guide.getByTestId("role-table")).toBeHidden();
  await expect(guide.getByTestId("role-stack")).toBeHidden();
  expect((await guide.textContent())?.replace(/RFPilot/g, "")).not.toMatch(/\bRFPs?\b/i);
  return guide;
};

const openComparison = async (guide: Locator, testInfo: TestInfo) => {
  // Activated directly: at 375 px with the wide members table on the page, Playwright's pointer
  // hit-testing lands on the table instead of the toggle.
  await guide.getByText("Compare roles in detail").dispatchEvent("click");
  if (isMobile(testInfo)) {
    await expect(guide.getByTestId("role-stack")).toBeVisible();
    await expect(guide.getByTestId("role-table")).toBeHidden();
  } else {
    await expect(guide.getByTestId("role-table")).toBeVisible();
    await expect(guide.getByTestId("role-stack")).toBeHidden();
  }
};

for (const role of ["owner", "admin"] as const) {
  test(`${ROLE_LABEL[role]}: members table, the role guide, and summaries beside the role pickers`, async ({ page }, testInfo) => {
    const guide = await openGuide(page, role);
    await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite people" })).toBeVisible();
    await checkGuide(page, testInfo, guide, `${role}-collapsed`);

    await openComparison(guide, testInfo);
    if (isMobile(testInfo)) {
      const stack = guide.getByTestId("role-stack");
      await expect(stack.getByLabel("Show access for")).toHaveValue(role === "owner" ? "owner" : "organization_admin");
      await expect(stack.getByRole("list", { name: `People: ${ROLE_LABEL[role]}` }).getByRole("listitem").filter({ hasText: "Transfer ownership of the organization" }))
        .toContainText(role === "owner" ? "Yes" : "No");
      await stack.getByLabel("Show access for").selectOption("viewer");
      await expect(stack.getByRole("list", { name: "Proposals: Viewer" }).getByRole("listitem").first()).toContainText("Limited: Only ones shared with them");
    } else {
      const table = guide.getByRole("table");
      await expect(table.getByRole("columnheader")).toHaveText(
        ["Capability", "Owner", "Admin", "Team Manager", "Planner", "Viewer"].map((label) => new RegExp(`^${label}( ?\\(you\\))?$`)),
      );
      const transfer = table.getByRole("row", { name: /Transfer ownership of the organization/ });
      await expect(transfer.getByRole("cell")).toHaveText(["Yes", "No", "No", "No", "No"]);
      const invite = table.getByRole("row", { name: /^Invite people/ });
      await expect(invite.getByRole("cell").nth(2)).toContainText("Limited: Planners and Viewers, into teams they manage");
    }
    await checkGuide(page, testInfo, guide, `${role}-comparison`);

    // The dialogs are checked on the wide screen; the phone run stops at the guide.
    if (isMobile(testInfo)) {
      expect(problems.get(page)).toEqual([]);
      return;
    }

    // The same one-line summaries sit next to the role picker when inviting…
    await setTheme(page, "light");
    await page.getByRole("button", { name: "Invite people" }).click();
    const invite = page.getByRole("dialog", { name: "Invite people" });
    await expect(invite.getByText("Manages people, teams, security and every proposal.")).toBeVisible();
    await expect(invite.getByText("Read-only: sees only the proposals shared with them.")).toBeVisible();
    expect(await seriousViolations(page, "dialog[open]", ["color-contrast"])).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${role}-invite-dialog.png`) });
    await invite.getByRole("button", { name: "Cancel" }).click();

    // …and when changing a member's role.
    await page.getByRole("button", { name: "Actions for Priya Planner" }).click();
    await page.getByRole("menuitem", { name: "Change role" }).click();
    const change = page.getByRole("dialog", { name: "Change role" });
    await expect(change.getByText("Works on their own proposals and those of teams they manage.")).toBeVisible();
    await expect(change.getByText("What each role can do")).toBeVisible();
    expect(await seriousViolations(page, "dialog[open]", ["color-contrast"])).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${role}-change-role-dialog.png`) });
    await change.getByRole("button", { name: "Cancel" }).click();

    expect(problems.get(page)).toEqual([]);
  });
}

for (const role of ["planner", "viewer"] as const) {
  test(`${ROLE_LABEL[role]}: no members table, but the role guide and their own role`, async ({ page }, testInfo) => {
    const guide = await openGuide(page, role);
    await expect(page.getByRole("heading", { name: "Members are managed by Owners and Admins" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Users", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Invite people" })).toHaveCount(0);
    // Descriptions only: no member's name or email reaches a role that can't list members.
    await expect(page.getByText("Olivia Owner")).toHaveCount(0);
    await expect(page.getByText("owner-e2e@example.com")).toHaveCount(0);
    await checkGuide(page, testInfo, guide, `${role}-collapsed`);

    await openComparison(guide, testInfo);
    if (isMobile(testInfo)) {
      const stack = guide.getByTestId("role-stack");
      await expect(stack.getByLabel("Show access for")).toHaveValue(role);
      const create = stack.getByRole("list", { name: `Proposals: ${ROLE_LABEL[role]}` }).getByRole("listitem").filter({ hasText: "Create a proposal" });
      await expect(create).toContainText(role === "planner" ? "Yes" : "No");
    } else {
      const create = guide.getByRole("table").getByRole("row", { name: /^Create a proposal/ });
      await expect(create.getByRole("cell")).toHaveText(["Yes", "Yes", "Yes", "Yes", "No"]);
    }
    await checkGuide(page, testInfo, guide, `${role}-comparison`);
    expect(problems.get(page)).toEqual([]);
  });
}

test.describe("proposal list title", () => {
  const TITLE = "QA ONLY — Annual Leadership Summit";

  test.beforeEach(async ({ page }) => {
    await page.request.post(`${backendOrigin}/__e2e/reset`);
    await page.request.post(`${backendOrigin}/__e2e/proposal-deletion`, { data: { seed: true } });
  });

  test("an editor's title opens the edit page, by click and by keyboard", async ({ page }, testInfo) => {
    await signInAs(page, "planner");
    await page.goto("/proposals");
    const card = page.getByTestId("proposal-card").first();
    const title = card.getByRole("link", { name: TITLE, exact: true });
    const editHref = await card.getByRole("link", { name: "Edit", exact: true }).getAttribute("href");
    expect(editHref).toMatch(/^\/proposals\/proposal-edit\?proposalId=/);
    await expect(title).toHaveAttribute("href", editHref as string);

    // A real link: focusable, with a visible focus ring, and not covering the row's buttons.
    await title.focus();
    await expect(title).toBeFocused();
    expect(await title.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe("none");
    const titleBox = await title.boundingBox();
    const archiveBox = await card.getByRole("button", { name: "Archive", exact: true }).boundingBox();
    expect(titleBox && archiveBox).toBeTruthy();
    const overlaps = titleBox!.x < archiveBox!.x + archiveBox!.width && archiveBox!.x < titleBox!.x + titleBox!.width
      && titleBox!.y < archiveBox!.y + archiveBox!.height && archiveBox!.y < titleBox!.y + titleBox!.height;
    expect(overlaps).toBe(false);
    await noSidewaysScroll(page);
    await page.screenshot({ path: testInfo.outputPath("proposal-title-focus.png") });
    await card.getByRole("button", { name: "Archive", exact: true }).click();
    await page.getByRole("alertdialog", { name: "Archive this proposal?" }).getByRole("button", { name: "Cancel" }).click();

    await title.focus();
    await page.keyboard.press("Enter");
    // The edit page is the heaviest route to compile in `next dev`.
    await expect(page).toHaveURL(/\/proposals\/proposal-edit\?proposalId=/, { timeout: 150_000 });
  });

  test("a Viewer gets no Edit action and the title opens the preview", async ({ page }) => {
    await signInAs(page, "viewer");
    await page.goto("/proposals");
    const card = page.getByTestId("proposal-card").first();
    const title = card.getByRole("link", { name: `${TITLE} (opens in a new tab)`, exact: true });
    await expect(title).toBeVisible();
    await expect(card.getByRole("link", { name: "Edit", exact: true })).toHaveCount(0);
    const previewHref = await card.getByRole("link", { name: "Preview", exact: true }).getAttribute("href");
    await expect(title).toHaveAttribute("href", previewHref as string);
    await expect(title).toHaveAttribute("target", "_blank");
    expect(previewHref).not.toContain("proposal-edit");
  });
});

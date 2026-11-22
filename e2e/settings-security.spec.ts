import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Page } from "@playwright/test";
import { expectProposalWording } from "./support/wording";

// Settings > Security for each role, against the stub backend (e2e/support/securityPageFixture.mjs
// with the role accounts of roleDashboardFixture.mjs). Owner decision, 2026-11-17: customers no
// longer grant, see or control RFPilot Support access, so no role finds it here and its old
// address does not exist. The support button's contrast check lives here too: the button is on
// every signed-in page, and this is the page it is measured on.

// `next dev` compiles each route on first visit; a busy machine needs more than the default.
const expect = baseExpect.configure({ timeout: 45_000 });
// The stub's port can be moved (ASSISTANT_E2E_BACKEND_PORT) when 8011 is taken by another run.
const STUB = `http://127.0.0.1:${process.env.ASSISTANT_E2E_BACKEND_PORT || 8011}/__e2e/support-desk`;

type Role = "owner" | "admin" | "manager" | "planner" | "viewer";

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  test.setTimeout(300_000);
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    // The removed address answers 404, which the browser logs itself. And a machine without
    // internet can't fetch the layout's web fonts; that is not the app.
    if (message.type() === "error" && !/status of 404|net::ERR_INTERNET_DISCONNECTED/.test(message.text())) seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
});

// The unread support reply one test seeds must not reach whatever runs next, pass or fail.
test.afterEach(async ({ request }) => {
  await request.post(STUB, { data: { unreadTickets: 0 } });
});

const signInAs = async (page: Page, role: Role) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`${role}-e2e@example.com`);
  // Email first: the password field appears once the address is known not to use company SSO.
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("role-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  // The first sign-in also compiles the sign-in action and the dashboard route.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 180_000 });
  // Only what happens on the screens under test counts.
  problems.get(page)!.length = 0;
};

const main = (page: Page) => page.locator("main").first();

const noSupportAccess = async (page: Page) => {
  await expect(page.getByRole("link", { name: /support access/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /support access/i })).toHaveCount(0);
  await expect(page.locator('a[href*="support-access"]')).toHaveCount(0);
  await expect(page.getByText(/support access/i)).toHaveCount(0);
};

// The old address is gone for everyone: Next's own not-found page, nothing of the old screen.
const supportAccessIsNotFound = async (page: Page) => {
  const response = await page.goto("/settings/support-access");
  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("support-access")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Grant access" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /support access/i })).toHaveCount(0);
};

for (const [role, label] of [["owner", "Owner"], ["admin", "Admin"]] as const) {
  test(`${label}: Security has the audit log and the organization's settings, and no Support access`, async ({ page }, testInfo) => {
    await signInAs(page, role);
    await page.goto("/settings/security");
    await expect(page.getByRole("heading", { name: "Security", level: 1 })).toBeVisible();
    await expect(page.getByText("Two-factor sign-in for your account, your organization's security rules, verified domains and single sign-on.")).toBeVisible();
    const auditLink = page.getByRole("link", { name: "Open audit log" });
    await expect(auditLink).toBeVisible();
    await expect(page.getByText("See who signed in and what changed in your organization. Filter it and export it as CSV.", { exact: true })).toBeVisible();
    await noSupportAccess(page);

    const accessibility = await new AxeBuilder({ page }).include("#audit-log-link-title").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || "")).map((violation) => violation.id)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await expectProposalWording(main(page));
    await page.screenshot({ path: testInfo.outputPath(`${role}-security.png`), fullPage: true });

    await auditLink.click();
    await expect(page).toHaveURL(/\/settings\/audit$/);
    await expect(page.getByRole("heading", { name: "Audit log", level: 2 })).toBeVisible({ timeout: 120_000 });
    expect(problems.get(page)).toEqual([]);

    await supportAccessIsNotFound(page);
    await page.screenshot({ path: testInfo.outputPath(`${role}-support-access-404.png`), fullPage: true });
    expect(problems.get(page)).toEqual([]);
  });
}

// Moved from e2e/support-access.spec.ts (deleted with the Support access screen).
for (const [role, label] of [["manager", "Team Manager"], ["planner", "Planner"], ["viewer", "Viewer"]] as const) {
  test(`${label}: cannot see or use support access`, async ({ page }, testInfo) => {
    await signInAs(page, role);

    // No way in from the Security page.
    await page.goto("/settings/security");
    await expect(page.getByText("Two-factor sign-in for your account.", { exact: true })).toBeVisible();
    // Exactly two cards say so, each once: organization security, and single sign-on.
    await expect(page.getByText("Organization security and verified domains are managed by your organization's Owner and Admins.", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Single sign-on is managed by your organization's Owner and Admins. Ask them if you need to change how your organization signs in.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("managed by your organization's Owner and Admins")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Open audit log" })).toHaveCount(0);
    await noSupportAccess(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await expectProposalWording(main(page));
    await page.screenshot({ path: testInfo.outputPath(`${role}-security-no-entry.png`), fullPage: true });

    // And the address itself does not exist for them.
    await supportAccessIsNotFound(page);
    await page.screenshot({ path: testInfo.outputPath(`${role}-support-access-404.png`), fullPage: true });
    expect(problems.get(page)).toEqual([]);
  });
}

// Colours cross-fade when the theme flips (`transition-colors`). Axe has to measure the settled
// colours, not a frame part-way between the dark palette and the light one.
const coloursSettled = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((animation) => !(animation instanceof CSSTransition) || animation.playState !== "running"));

const setTheme = async (page: Page, theme: "light" | "dark") => {
  const toggle = page.getByTestId("dev-theme-toggle");
  // The development-only toggle can sit under page content on a phone, so it is activated directly.
  if ((await toggle.getAttribute("aria-pressed")) !== String(theme === "dark")) await toggle.dispatchEvent("click");
  if (theme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);
  else await expect(page.locator("html")).not.toHaveClass(/dark/);
  await coloursSettled(page);
};

type ContrastRow = { target: string; ratio: number; foreground: string; background: string };

// Axe's colour-contrast verdict for the text under `selector`, with the ratio it measured.
const contrastOf = async (page: Page, selector: string) => {
  const result = await new AxeBuilder({ page }).include(selector).withRules(["color-contrast"]).analyze();
  const rows = (found: typeof result.violations): ContrastRow[] =>
    found.flatMap((entry) =>
      entry.nodes.map((node) => {
        const data = (node.any[0]?.data ?? {}) as { contrastRatio?: number; fgColor?: string; bgColor?: string };
        return { target: node.target.join(" "), ratio: data.contrastRatio ?? 0, foreground: data.fgColor ?? "", background: data.bgColor ?? "" };
      }),
    );
  return { failed: rows(result.violations), passed: rows(result.passes), unsure: rows(result.incomplete) };
};

// Moved from e2e/support-access.spec.ts, where it also measured that screen's "View activity"
// buttons (gone with the screen). WCAG AA wants 4.5:1 for text this size. The support button
// every signed-in page carries is measured in both themes. From 640 px up the button shows its
// words and, with an unread reply, a red count badge; both are measured there. On a phone the
// launcher is the avatar alone: it has no words to measure, so the mobile project only checks
// that axe finds nothing wrong with it (the badge is measured on the wide screen, same colours).
test("The support button meets AA contrast in the light and dark themes", async ({ page, request }, testInfo) => {
  const wide = (page.viewportSize()?.width ?? 0) >= 640;
  // One unread reply from RFPilot, so the launcher carries its badge.
  if (wide) await request.post(STUB, { data: { unreadTickets: 1 } });
  await signInAs(page, "owner");
  await page.goto("/settings/security");
  await expect(page.getByRole("link", { name: "Open audit log" })).toBeVisible();
  const measured: Record<string, unknown> = {};
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);

    const fab = page.getByTestId("support-fab");
    await expect(fab).toBeVisible();
    const fabContrast = await contrastOf(page, '[data-testid="support-fab"]');
    expect(fabContrast.failed, `${theme}: support button`).toEqual([]);
    expect(fabContrast.unsure, `${theme}: support button`).toEqual([]);
    if (wide) {
      await expect(fab).toHaveAccessibleName("Support: 1 new reply from RFPilot");
      await expect(fab).toContainText("RFPilot replied");
      expect(fabContrast.passed.filter((row) => row.ratio < 4.5)).toEqual([]);
      // Two texts: the words on the button's blue, and the count on the badge's red.
      expect(fabContrast.passed).toHaveLength(2);
      expect(fabContrast.passed.filter((row) => row.background === "#0076b4")).toHaveLength(1);
    }
    measured[theme] = { supportButton: fabContrast.passed };
    // The button pulses, so it never holds still for an element screenshot: clip the page instead.
    const box = await fab.boundingBox();
    if (box) await page.screenshot({ path: testInfo.outputPath(`support-button-${theme}.png`), clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } });
    await page.screenshot({ path: testInfo.outputPath(`security-${theme}.png`), fullPage: true });
  }
  await testInfo.attach("contrast-ratios", { body: JSON.stringify(measured, null, 2), contentType: "application/json" });
  console.log(`contrast ${testInfo.project.name} ${JSON.stringify(measured)}`);
  expect(problems.get(page)).toEqual([]);
});

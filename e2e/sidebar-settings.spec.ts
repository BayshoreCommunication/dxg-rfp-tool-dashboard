import { expect as baseExpect, test, type Page } from "@playwright/test";

// `next dev` compiles on demand, so give navigations more room than the suite's default.
const expect = baseExpect.configure({ timeout: 45_000 });

// The sidebar's footer (Support, Settings, account card) and Settings as a dialog over the page
// the member was on, against the stub backend (accounts from roleDashboardFixture.mjs).

const signInAs = async (page: Page, role: "owner" | "viewer") => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`${role}-e2e@example.com`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("role-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
};

// `next dev` compiles an intercepting route the first time it is asked for, and a soft navigation
// that lands mid-compile falls back to the full page. Ask for the dialog route once up front
// (the same request a client navigation makes) so the click below meets a compiled route.
const warmDialogRoute = async (page: Page) => {
  await page.request.get("/settings", { headers: { RSC: "1", "Next-Url": "/dashboard" }, timeout: 120_000 });
};

test.beforeEach(async ({}, testInfo) => {
  test.setTimeout(180_000);
  test.skip(testInfo.project.name.startsWith("mobile"), "desktop sidebar");
});

test("Settings opens as a dialog with a section list and closes back to the page", async ({ page }) => {
  await signInAs(page, "owner");
  await warmDialogRoute(page);
  const sidebar = page.getByRole("complementary", { name: "Sidebar" });
  await expect(sidebar.getByRole("link", { name: "Support" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);
  await page.screenshot({ path: process.env.SHOTS_DIR ? `${process.env.SHOTS_DIR}/settings-modal.png` : undefined });

  // Sections switch inside the dialog with no navigation: the address stays on /settings.
  const sectionList = dialog.getByRole("navigation", { name: "Settings sections" });
  const teamsTab = sectionList.getByRole("link", { name: "Teams" });
  await teamsTab.click();
  await expect(teamsTab).toHaveAttribute("aria-current", "page");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(dialog.locator('[data-settings-section="/settings/teams"]')).toBeVisible();

  // Going back to a section shows what it already loaded: the Users list is there at once.
  await sectionList.getByRole("link", { name: "Users" }).click();
  const usersSection = dialog.locator('[data-settings-section="/settings/users"]');
  await expect(usersSection.getByRole("table")).toBeVisible();
  await teamsTab.click();
  await sectionList.getByRole("link", { name: "Users" }).click();
  await expect(usersSection.getByRole("table")).toBeVisible({ timeout: 500 });
  await page.screenshot({ path: process.env.SHOTS_DIR ? `${process.env.SHOTS_DIR}/settings-modal-users.png` : undefined });
  if (process.env.SHOTS_DIR) {
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await page.screenshot({ path: `${process.env.SHOTS_DIR}/settings-modal-users-light.png` });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Reopening shows what the dialog already loaded: no skeleton, the Users list is there at once.
  await sidebar.getByRole("link", { name: "Settings" }).click();
  await expect(dialog).toBeVisible();
  await sectionList.getByRole("link", { name: "Users" }).click();
  await expect(usersSection.getByRole("table")).toBeVisible({ timeout: 500 });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // A direct visit still renders the full page, with no dialog.
  await page.goto("/settings/teams");
  await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);
});

test("the account card has notifications, the theme switch and sign out, and the sidebar collapses to icons", async ({ page }) => {
  await signInAs(page, "viewer");
  const sidebar = page.getByRole("complementary", { name: "Sidebar" });
  await sidebar.getByRole("button", { name: /account menu for/ }).click();
  const menu = page.getByRole("menu", { name: "Account options" });
  await expect(menu.getByRole("menuitem", { name: "Notifications" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  // Organization pages live in the Settings dialog only.
  await expect(menu.getByRole("menuitem", { name: "Users" })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: "Account details" })).toHaveCount(0);

  // The theme switch changes the page at once and the choice survives a reload.
  const darkMode = menu.getByRole("menuitemcheckbox", { name: "Dark mode" });
  const html = page.locator("html");
  const startedDark = (await darkMode.getAttribute("aria-checked")) === "true";

  // The knob has to read as on/off in both themes. It used to sit 18px right of where
  // it belonged (a button's UA `text-align: center` moved the static position), so "on"
  // pushed it clean off the track, and `.dark .bg-white` repainted it #0d1d28, which hid
  // it against the blue track.
  const knobLook = () =>
    darkMode.evaluate((el) => {
      const track = el.lastElementChild as HTMLElement;
      const knob = track.firstElementChild as HTMLElement;
      const t = track.getBoundingClientRect();
      const k = knob.getBoundingClientRect();
      return {
        offset: Math.round(k.left - t.left),
        trackWidth: Math.round(t.width),
        knobWidth: Math.round(k.width),
        knobColor: getComputedStyle(knob).backgroundColor,
      };
    });
  const expectReadableKnob = async (on: boolean, where: string) => {
    // transition-transform keeps moving the knob after the click: poll until it settles.
    await expect
      .poll(async () => {
        const look = await knobLook();
        return look.offset > look.trackWidth / 2 - look.knobWidth / 2;
      }, { message: `${where}: knob never reached the ${on ? "on" : "off"} end` })
      .toBe(on);
    const look = await knobLook();
    expect(look.knobColor, `${where}: knob is not white`).toBe("rgb(255, 255, 255)");
    expect(look.offset, `${where}: knob starts outside the track`).toBeGreaterThanOrEqual(0);
    expect(look.offset + look.knobWidth, `${where}: knob runs past the track`).toBeLessThanOrEqual(look.trackWidth);
  };
  await expectReadableKnob(startedDark, startedDark ? "dark/on" : "light/off");

  await darkMode.click();
  await expect(darkMode).toHaveAttribute("aria-checked", String(!startedDark));
  await expect(html).toHaveClass(startedDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
  await expectReadableKnob(!startedDark, startedDark ? "light/off" : "dark/on");
  await page.reload();
  await expect(html).toHaveClass(startedDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
  await sidebar.getByRole("button", { name: /account menu for/ }).click();
  await page.screenshot({ path: process.env.SHOTS_DIR ? `${process.env.SHOTS_DIR}/org-menu.png` : undefined });
  await page.keyboard.press("Escape");

  await sidebar.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await page.reload();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
});

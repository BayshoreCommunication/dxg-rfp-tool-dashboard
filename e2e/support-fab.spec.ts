import { expect, test } from "@playwright/test";

const signIn = async (page: import("@playwright/test").Page) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("assistant-e2e@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByTestId("role-dashboard")).toBeVisible({ timeout: 20_000 });
};

// Parked at the right edge and then given a narrower window, the label used to
// wrap onto a second line. That made the pill a two-line box and squeezed the
// avatar from 36px to 28px, and it stuck: the wrapped button measures narrower,
// so keepInView happily parked it flush against the edge and it never recovered.
test("the support launcher stays a one-line pill when the window narrows", async ({ page }, testInfo) => {
  await signIn(page);

  const fab = page.getByTestId("support-fab");
  await expect(fab).toBeVisible();

  const measure = () =>
    fab.evaluate((el) => {
      const label = el.lastElementChild as HTMLElement;
      const range = document.createRange();
      range.selectNodeContents(label);
      const avatar = el.querySelector(".support-fab-avatar") as HTMLElement;
      const box = el.getBoundingClientRect();
      return {
        labelLines: range.getClientRects().length,
        height: Math.round(box.height),
        right: Math.round(box.right),
        avatarWidth: Math.round(avatar.getBoundingClientRect().width),
        viewport: window.innerWidth,
      };
    });

  // Park it against the right edge, the way a user drags it out of the way.
  const box = (await fab.boundingBox())!;
  const viewport = page.viewportSize()!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(viewport.width + 400, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();

  const parked = await measure();
  await fab.screenshot({ path: testInfo.outputPath("fab-parked.png"), animations: "disabled" });
  // The label only exists from the sm breakpoint up; below it the fab is avatar-only.
  const labelled = parked.labelLines > 0;
  if (labelled) expect(parked.labelLines).toBe(1);

  // Now narrow the window around it — the case that used to break the pill.
  for (const width of [1100, 900, 800, 720, 660]) {
    if (width > viewport.width) continue;
    await page.setViewportSize({ width, height: viewport.height });
    await page.waitForTimeout(120);
    const now = await measure();
    const at = `width ${width}`;

    if (labelled && now.labelLines > 0) {
      expect(now.labelLines, `${at}: label wrapped`).toBe(1);
      // A wrapped label added a whole line and shaved ~8px off the avatar; the
      // float animation only ever shifts these by a sub-pixel.
      expect(Math.abs(now.height - parked.height), `${at}: pill grew taller`).toBeLessThanOrEqual(2);
      expect(Math.abs(now.avatarWidth - parked.avatarWidth), `${at}: avatar squeezed`).toBeLessThanOrEqual(2);
    }
    // It also keeps its 8px of breathing room instead of sitting flush on the edge.
    expect(now.right, `${at}: hangs off the edge`).toBeLessThan(now.viewport);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${at}: page scrolls sideways`,
    ).toBe(true);
  }

  await fab.screenshot({ path: testInfo.outputPath("fab-narrow.png"), animations: "disabled" });
  await page.screenshot({ path: testInfo.outputPath("page-narrow.png"), animations: "disabled" });
});

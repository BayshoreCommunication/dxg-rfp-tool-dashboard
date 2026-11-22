import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Runs under playwright.onboarding.config.ts (conversations flag on, onboarding fixture backend).
// Cross-screen quality checks for the proposal-creation flow: layout at three widths, and an
// accessibility sweep over every builder section in both themes.

const fixture = "http://127.0.0.1:8011/__e2e/onboarding";
const proposalId = "cccccccccccccccccccccccc";
const builder = (step: number) => `/proposals/proposal-edit?proposalId=${proposalId}&step=${step}`;
const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Viewport sizes are set per test.");
  await page.request.post(fixture, { data: { reset: true } });
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("assistant-e2e@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
});

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** The element's box must sit inside the viewport horizontally (no clipping off either side). */
const expectInsideViewport = async (page: Page, selector: ReturnType<Page["locator"]>, label: string) => {
  const box = await selector.boundingBox();
  const width = page.viewportSize()!.width;
  expect(box, `${label} has a box`).not.toBeNull();
  expect(box!.x, `${label} starts inside the viewport`).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, `${label} ends inside the viewport`).toBeLessThanOrEqual(width + 1);
};

const seedMidIntake = async (page: Page) => {
  const prompts = [
    ["eventName", "What is this event called?", "Northstar Summit"],
    ["eventType", "What type of event are you planning?", null],
    ["venueName", "Which venue will host the event?", null],
  ] as const;
  const questions = prompts.map(([key, prompt, answer], index) => ({
    id: `q-${key}`, code: `field:${key}`, severity: "question", paths: [`/content/event/${key}`], prompt,
    status: answer ? "answered" : "open", impact: "scope", answerType: key === "eventType" ? "choice" : "text",
    options: key === "eventType" ? ["Corporate Conference", "Sales Kickoff (SKO)", "Product Launch", "Other"] : [],
    reviewAnswer: answer, suggestedAnswer: answer, answeredMessageId: null, contextRunId: null, createdAt: new Date(2027, 0, 1, 0, index).toISOString(),
  }));
  const intakeProgress = {
    total: 3, completed: 1, extraQuestionIds: [],
    items: prompts.map(([key, prompt, answer]) => ({ key, paths: [`/content/event/${key}`], prompt, status: answer ? "answered" : "open", questionId: `q-${key}` })),
  };
  await page.request.post(fixture, {
    data: { questions, intakeProgress, scan: "ready", proposal: { event: { eventName: "Northstar Summit", attendees: "450" }, venueSchedule: { venueName: "Lakeside Convention Center" } } },
  });
};

test.describe("layout at phone, tablet and desktop widths", () => {
  for (const { name, width, height } of WIDTHS) {
    test(`new-proposal entry fits the ${name} width (${width}px)`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height });
      await page.goto("/proposals/add-new-proposal");
      const composer = page.getByLabel("Message the proposal assistant");
      await expect(composer).toBeVisible({ timeout: 20_000 });
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await expectInsideViewport(page, composer, "composer");
      await expectInsideViewport(page, page.getByRole("button", { name: "Send message" }), "send button");
      for (const starter of ["Try an example brief", "Upload my brief or old proposal", "Describe it from scratch"]) {
        await expect(page.getByRole("button", { name: starter })).toBeVisible();
        await expectInsideViewport(page, page.getByRole("button", { name: starter }), starter);
      }
      await page.screenshot({ path: testInfo.outputPath(`entry-${name}.png`) });
    });

    test(`AI workspace fits the ${name} width (${width}px) and keeps details and questions reachable`, async ({ page }, testInfo) => {
      await seedMidIntake(page);
      await page.setViewportSize({ width, height });
      await page.goto(`/proposals/${proposalId}/assistant`);
      await expect(page.getByText(/Guided question 2 of 3/)).toBeVisible({ timeout: 30_000 });
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await expectInsideViewport(page, page.getByLabel("Message the proposal assistant"), "composer");

      if (width < 1280) {
        // Narrow screens keep the rail behind a disclosure so the conversation gets the width.
        const toggle = page.getByRole("button", { name: "Toggle AI workspace tools" });
        await expect(toggle).toBeVisible();
        await toggle.click();
      }
      const rail = page.getByRole("complementary", { name: "Proposal assistant tools" });
      await expect(rail.getByRole("heading", { name: "Proposal details" })).toBeVisible();
      await expect(rail.getByRole("heading", { name: "Key questions" })).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`workspace-${name}.png`) });
    });

    for (const step of [1, 4, 8]) {
      test(`builder section ${step} fits the ${name} width (${width}px)`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height });
        await page.goto(builder(step));
        const navigator = page.getByTestId("proposal-process-list");
        await expect(navigator).toBeVisible({ timeout: 20_000 });
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
        await expect(navigator.getByRole("button", { name: /^Go to / }).first()).toBeVisible();
        // The save status and readiness are in the header at every width.
        await expect(page.getByText(/sections complete/)).toBeVisible();
        await expect(page.getByText("Autosave on")).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`builder-${step}-${name}.png`) });
      });
    }
  }
});

test.describe("accessibility across every builder section", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`all nine sections have no serious accessibility violations (${theme})`, async ({ page }) => {
      test.setTimeout(240_000);
      const failures: string[] = [];
      for (const step of [1, 2, 3, 4, 5, 7, 8, 9, 10]) {
        await page.goto(builder(step));
        await expect(page.getByTestId("proposal-process-list")).toBeVisible({ timeout: 20_000 });
        const isDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
        if ((theme === "dark") !== isDark) await page.getByTestId("dev-theme-toggle").click();
        await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
        // Colours animate after a theme switch; measure the settled colours, not a mid-transition frame.
        await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
        const results = await new AxeBuilder({ page }).include('[data-testid="proposal-editor-layout"]').withTags(["wcag2a", "wcag2aa"]).analyze();
        for (const violation of results.violations.filter((item) => ["critical", "serious"].includes(item.impact ?? ""))) {
          failures.push(`section ${step}: ${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).slice(0, 3).join(" | ")}`);
        }
      }
      expect(failures).toEqual([]);
    });
  }

  test("the navigator can be used from the keyboard alone", async ({ page }) => {
    await page.goto(builder(1));
    const navigator = page.getByTestId("proposal-process-list");
    await expect(navigator).toBeVisible({ timeout: 20_000 });
    const target = navigator.getByRole("button", { name: "Go to Investment & Evaluation" });
    await target.focus();
    await expect(target).toBeFocused();
    // The focus ring is drawn (a visible outline or box-shadow, not removed).
    const ring = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return `${style.boxShadow}|${style.outlineStyle}`;
    });
    expect(ring).not.toBe("none|none");
    await page.keyboard.press("Enter");
    await expect(target).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("heading", { level: 2, name: /Investment|Timeline/ }).first()).toBeVisible();
  });
});

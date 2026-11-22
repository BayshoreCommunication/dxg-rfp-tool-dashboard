import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Runs under playwright.onboarding.config.ts (conversations flag on), like proposal-onboarding.

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("assistant-e2e@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
});

for (const theme of ["light", "dark"] as const) {
  test(`the new-proposal entry screen has no serious accessibility violations (${theme})`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/proposals/add-new-proposal");
    await expect(page.getByText("Let’s build your event proposal", { exact: true })).toBeVisible();
    const isDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
    if ((theme === "dark") !== isDark) await page.getByTestId("dev-theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);

    // The starters and their hints are named.
    const starters = page.getByRole("group", { name: "Ways to start" });
    await expect(starters.getByRole("button")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Upload my brief or old proposal" })).toHaveAccessibleDescription(/PDF, DOCX/);

    const results = await new AxeBuilder({ page })
      .include('[aria-label="Proposal assistant workspace"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""));
    expect(
      blocking.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).slice(0, 3).join(" | ")}`),
    ).toEqual([]);
  });
}

const fixture = "http://127.0.0.1:8011/__e2e/onboarding";

for (const theme of ["light", "dark"] as const) {
  test(`the AI workspace thread and rail have no serious accessibility violations (${theme})`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "The attachment flow is slow on the mobile profile; desktop covers the markup.");
    test.setTimeout(120_000);
    await page.request.post(fixture, { data: { reset: true, delays: { create: 100, upload: 300, chat: 300 } } });
    await page.goto("/proposals/add-new-proposal");
    await expect(page.getByLabel("Message the proposal assistant")).toBeVisible({ timeout: 20_000 });
    await page.locator('input[type="file"]').first().setInputFiles({ name: "first-brief.txt", mimeType: "text/plain", buffer: Buffer.from("Northstar Leadership Summit, September 14-16, 2027.") });
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page).toHaveURL(/\/proposals\/cccccccccccccccccccccccc\/assistant$/, { timeout: 30_000 });
    await page.request.post(fixture, { data: { scan: "ready" } });
    await expect(page.getByText("Reading your brief").first()).toBeVisible({ timeout: 60_000 });

    const isDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
    if ((theme === "dark") !== isDark) await page.getByTestId("dev-theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);

    // The rail shows the summary, the key questions, the details and the uploaded document.
    const rail = page.getByRole("complementary", { name: "Proposal assistant tools" });
    await expect(rail.getByRole("heading", { name: "Proposal details" })).toBeVisible();
    await expect(rail.getByRole("heading", { name: "Source documents" })).toBeVisible();
    await expect(rail.getByText("first-brief.txt")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[aria-label="Proposal assistant workspace"]')
      .include('[aria-label="Proposal assistant tools"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""));
    expect(
      blocking.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).slice(0, 3).join(" | ")}`),
    ).toEqual([]);
  });
}

// A mid-intake proposal: nine answered questions, the "event type" choice open, details captured.
const intakePrompts = [
  ["eventName", "What is this event called?", "Northstar Leadership Summit 2027"], ["startDate", "When does the event start?", "2027-09-14"],
  ["endDate", "When does the event end?", "2027-09-16"], ["eventFormat", "Is the event in-person, hybrid, or virtual?", "In-Person"],
  ["eventType", "What type of event are you planning?", null], ["venueName", "Which venue will host the event?", "Lakeside Convention Center"],
  ["venueCity", "Which city will host the event?", "Chicago"], ["attendees", "How many in-person attendees are expected?", "450"],
  ["venueState", "Which state or region will host the event?", "Illinois"], ["rooms", "How many event rooms are required?", "4"],
  ["loadIn", "When is load-in?", null], ["strike", "When is strike?", null], ["audio", "Is an audio system required?", null],
] as const;

for (const theme of ["light", "dark"] as const) {
  test(`a mid-intake workspace (details, questions, review card) has no serious accessibility violations (${theme})`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop covers the markup.");
    test.setTimeout(90_000);
    const questions = intakePrompts.map(([key, prompt, answer], index) => ({
      id: `q-${key}`, code: `field:${key}`, severity: "question", paths: [`/content/event/${key}`], prompt,
      status: answer ? "answered" : "open", impact: "scope", answerType: key === "eventType" ? "choice" : "text",
      options: key === "eventType" ? ["Corporate Conference", "Sales Kickoff (SKO)", "Product Launch", "Other"] : [],
      reviewAnswer: answer, suggestedAnswer: answer, answeredMessageId: null, contextRunId: null, createdAt: new Date(2027, 0, 1, 0, index).toISOString(),
    }));
    const intakeProgress = {
      total: intakePrompts.length, completed: intakePrompts.filter((entry) => entry[2]).length, extraQuestionIds: [],
      items: intakePrompts.map(([key, prompt, answer]) => ({ key, paths: [`/content/event/${key}`], prompt, status: answer ? "answered" : "open", questionId: `q-${key}` })),
    };
    await page.request.post(fixture, {
      data: {
        reset: true, questions, intakeProgress, scan: "ready",
        proposal: {
          event: { eventName: "Northstar Leadership Summit 2027", startDate: "2027-09-14", endDate: "2027-09-16", eventFormat: "In-Person", attendees: "450" },
          venueSchedule: { venueName: "Lakeside Convention Center", venueCity: "Chicago", numberOfEventRooms: "4" },
        },
      },
    });
    await page.goto("/proposals/cccccccccccccccccccccccc/assistant");
    await expect(page.getByText(/Guided question 5 of 13/)).toBeVisible({ timeout: 30_000 });
    const isDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
    if ((theme === "dark") !== isDark) await page.getByTestId("dev-theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);

    // The rail lists details, then key questions, in that order, and the details are read-only.
    const rail = page.getByRole("complementary", { name: "Proposal assistant tools" });
    const headings = await rail.getByRole("heading", { level: 2 }).allTextContents();
    expect(headings.indexOf("Proposal details")).toBeGreaterThanOrEqual(0);
    expect(headings.indexOf("Proposal details")).toBeLessThan(headings.indexOf("Key questions"));
    await expect(rail.getByText("Lakeside Convention Center")).toBeVisible();
    await expect(rail.getByRole("link", { name: /Edit all details/ })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[aria-label="Proposal assistant workspace"]')
      .include('[aria-label="Proposal assistant tools"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""));
    expect(
      blocking.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).slice(0, 3).join(" | ")}`),
    ).toEqual([]);
  });
}

const builderUrl = (step: number) => `/proposals/proposal-edit?proposalId=cccccccccccccccccccccccc&step=${step}`;

test.describe("proposal builder sections", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop covers the markup.");
  });

  test("an in-person event lists nine sections, with Hybrid & Virtual not applicable and skipped by Back and Continue", async ({ page }) => {
    test.setTimeout(90_000);
    await page.request.post(fixture, { data: { reset: true } });
    await page.goto(builderUrl(4));

    const navigator = page.getByTestId("proposal-process-list");
    await expect(navigator.getByRole("button", { name: /^Go to / })).toHaveCount(9);
    await expect(navigator.getByRole("button", { name: "Go to Video Recording" })).toHaveCount(0);
    const hybrid = navigator.getByRole("button", { name: "Go to Hybrid & Virtual, not applicable" });
    await expect(hybrid).toHaveAttribute("aria-current", "step");
    await expect(hybrid).toContainText("Not applicable");

    // The not-applicable page explains itself, and the readiness count does not include it.
    await expect(page.getByRole("heading", { level: 2, name: "Hybrid & Virtual Production" })).toBeVisible();
    await expect(page.getByText("Not applicable to this event")).toBeVisible();
    await expect(page.getByText(/of 8 sections complete · 1 not applicable/)).toBeVisible();

    // Continue skips ahead to Content & Creative; Back from there skips over it to Room Specifications.
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(navigator.getByRole("button", { name: "Go to Content & Creative" })).toHaveAttribute("aria-current", "step");
    await page.getByRole("button", { name: /Room Specifications|Back/ }).first().click();
    await expect(navigator.getByRole("button", { name: "Go to Room Specifications" })).toHaveAttribute("aria-current", "step");

    // The format link takes the planner to Event Overview.
    await navigator.getByRole("button", { name: "Go to Hybrid & Virtual, not applicable" }).click();
    await page.getByRole("button", { name: "Change event format" }).click();
    await expect(navigator.getByRole("button", { name: "Go to Event Overview" })).toHaveAttribute("aria-current", "step");
  });

  for (const theme of ["light", "dark"] as const) {
    for (const step of [1, 4]) {
      test(`the builder header, navigator and section ${step} have no serious accessibility violations (${theme})`, async ({ page }) => {
        test.setTimeout(90_000);
        await page.request.post(fixture, { data: { reset: true } });
        await page.goto(builderUrl(step));
        await expect(page.getByTestId("proposal-process-list")).toBeVisible();
        const isDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
        if ((theme === "dark") !== isDark) await page.getByTestId("dev-theme-toggle").click();
        await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);

        const results = await new AxeBuilder({ page }).include('[data-testid="proposal-editor-layout"]').withTags(["wcag2a", "wcag2aa"]).analyze();
        const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""));
        expect(
          blocking.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).slice(0, 3).join(" | ")}`),
        ).toEqual([]);
      });
    }
  }
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const backendOrigin = "http://127.0.0.1:8011";

const signIn = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(
    "assistant-e2e@example.com",
  );
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page
    .getByRole("button", { name: "Sign In to Dashboard" })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/ai-assistant");
  await expect(
    page.getByRole("region", { name: "AI Assistant workspace" }),
  ).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  const reset = await page.request.post(`${backendOrigin}/__e2e/reset`);
  expect(reset.ok()).toBe(true);
  await signIn(page);
});

test("streams a response, persists history, starts a new chat, and remains responsive", async ({
  page,
}, testInfo) => {
  await expect(
    page.getByRole("link", { name: "AI Assistant" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "How can I help?" }),
  ).toBeVisible();

  const composer = page.getByLabel("Message the AI Assistant");
  await composer.fill("How do I create and review a proposal?");
  await composer.press("Shift+Enter");
  await composer.type("Please explain the safe workflow.");
  await expect(composer).toHaveValue(
    "How do I create and review a proposal?\nPlease explain the safe workflow.",
  );
  await composer.press("Enter");

  await expect(
    page.getByRole("status", { name: "Assistant is responding" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "How do I create and review a proposal?\nPlease explain the safe workflow.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page
      .getByLabel("AI Assistant conversation")
      .locator("ol")
      .getByText(/Publication and sending remain explicit actions/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Proposals" }).last(),
  ).toHaveAttribute("href", "/proposals");

  await page.reload();
  await expect(
    page
      .getByLabel("AI Assistant conversation")
      .locator("ol")
      .getByText(/Publication and sending remain explicit actions/),
  ).toBeVisible();

  if (testInfo.project.name.includes("mobile")) {
    await page
      .getByRole("button", { name: "Open conversation history" })
      .click();
    await expect(
      page.getByRole("complementary", {
        name: "Recent AI Assistant conversations",
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Close conversation history" })
      .last()
      .click();
  }

  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fitsViewport).toBe(true);

  await page.getByRole("button", { name: /^New(?: chat)?$/ }).click();
  await expect(
    page.getByRole("heading", { name: "How can I help?" }),
  ).toBeVisible();
  await expect(composer).toBeFocused();
});

test("has no serious or critical automated accessibility violations", async ({
  page,
}) => {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    blocking,
    blocking
      .map(
        (violation) =>
          `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`,
      )
      .join("\n"),
  ).toEqual([]);
});

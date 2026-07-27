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
  await page.getByRole("button", { name: "Open AI Assistant" }).click();
  await expect(
    page.getByRole("dialog", { name: "AI Assistant" }),
  ).toBeVisible();
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
    page.getByRole("button", { name: "Hide AI Assistant popup" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("link", { name: "AI Assistant" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "How can I help?" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Assistant options" }).click();
  const newConversationAction = page.getByRole("menuitem", {
    name: "Start new conversation",
  });
  await expect(newConversationAction).toHaveCSS("white-space", "nowrap");
  expect(
    await newConversationAction.evaluate(
      (element) => element.scrollHeight <= element.clientHeight,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");

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

  await page.getByRole("button", { name: "Close AI Assistant" }).click();
  await expect(
    page.getByRole("dialog", { name: "AI Assistant" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Open AI Assistant" }).click();
  await expect(
    page
      .getByLabel("AI Assistant conversation")
      .locator("ol")
      .getByText(/Publication and sending remain explicit actions/),
  ).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Open AI Assistant" }).click();
  await expect(
    page
      .getByLabel("AI Assistant conversation")
      .locator("ol")
      .getByText(/Publication and sending remain explicit actions/),
  ).toBeVisible();

  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Assistant options" }).click();
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

  await page.getByRole("button", { name: "Assistant options" }).click();
  await page
    .getByRole("button", { name: "Start new conversation" })
    .click();
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

test("drags within the viewport, remembers its position, and can reset", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog", { name: "AI Assistant" });
  const dragHandle = page.getByRole("button", {
    name: "Move AI Assistant",
  });
  const initialBox = await dialog.boundingBox();
  const handleBox = await dragHandle.boundingBox();
  const viewport = page.viewportSize();
  expect(initialBox).not.toBeNull();
  expect(handleBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!initialBox || !handleBox || !viewport) return;

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(viewport.width + 500, viewport.height + 500, {
    steps: 8,
  });
  await page.mouse.up();

  const movedBox = await dialog.boundingBox();
  expect(movedBox).not.toBeNull();
  if (!movedBox) return;
  expect(movedBox.x).toBeGreaterThanOrEqual(11);
  expect(movedBox.y).toBeGreaterThanOrEqual(11);
  expect(movedBox.x + movedBox.width).toBeLessThanOrEqual(
    viewport.width - 11,
  );
  expect(movedBox.y + movedBox.height).toBeLessThanOrEqual(
    viewport.height - 11,
  );
  expect(
    Math.abs(movedBox.x - initialBox.x) +
      Math.abs(movedBox.y - initialBox.y),
  ).toBeGreaterThan(20);

  const movedHandleBox = await dragHandle.boundingBox();
  expect(movedHandleBox).not.toBeNull();
  if (!movedHandleBox) return;
  await page.mouse.move(
    movedHandleBox.x + movedHandleBox.width / 2,
    movedHandleBox.y + movedHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(-500, -500, { steps: 8 });
  await page.mouse.up();

  const leftEdgeBox = await dialog.boundingBox();
  const leftEdgeHandleBox = await dragHandle.boundingBox();
  expect(leftEdgeBox).not.toBeNull();
  expect(leftEdgeHandleBox).not.toBeNull();
  if (!leftEdgeBox || !leftEdgeHandleBox) return;
  expect(leftEdgeBox.x).toBeGreaterThanOrEqual(11);
  expect(leftEdgeBox.y).toBeGreaterThanOrEqual(11);
  expect(await dragHandle.isVisible()).toBe(true);
  const handleIsTopmost = await page.evaluate(
    ({ x, y }) => {
      const topmost = document.elementFromPoint(x, y);
      return Boolean(topmost?.closest('[aria-label="Move AI Assistant"]'));
    },
    {
      x: leftEdgeHandleBox.x + leftEdgeHandleBox.width / 2,
      y: leftEdgeHandleBox.y + leftEdgeHandleBox.height / 2,
    },
  );
  expect(handleIsTopmost).toBe(true);

  await page.getByRole("button", { name: "Close AI Assistant" }).click();
  await page.getByRole("button", { name: "Open AI Assistant" }).click();
  const reopenedBox = await dialog.boundingBox();
  expect(reopenedBox?.x).toBeCloseTo(leftEdgeBox.x, 0);
  expect(reopenedBox?.y).toBeCloseTo(leftEdgeBox.y, 0);

  await page.reload();
  await page.getByRole("button", { name: "Open AI Assistant" }).click();
  const restoredBox = await dialog.boundingBox();
  expect(restoredBox?.x).toBeCloseTo(leftEdgeBox.x, 0);
  expect(restoredBox?.y).toBeCloseTo(leftEdgeBox.y, 0);

  await page.getByRole("button", { name: "Assistant options" }).click();
  await page
    .getByRole("menuitem", { name: "Reset popup position" })
    .click();
  const resetBox = await dialog.boundingBox();
  expect(resetBox).not.toBeNull();
  if (!resetBox) return;
  expect(
    Math.abs(resetBox.x - leftEdgeBox.x) +
      Math.abs(resetBox.y - leftEdgeBox.y),
  ).toBeGreaterThan(20);
});

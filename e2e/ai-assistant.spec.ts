import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const backendOrigin = "http://127.0.0.1:8011";

const waitForPopupMotion = async (page: Page) => {
  await page
    .getByRole("dialog", { name: "AI Assistant" })
    .evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
};

const signIn = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(
    "assistant-e2e@example.com",
  );
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page
    .getByRole("button", { name: "Sign In to Dashboard" })
    .click();
  // The first desktop run may compile the authenticated dashboard on demand.
  // Wait for both navigation and an interactive dashboard control before
  // clicking the client-owned launcher, otherwise a pre-hydration click can be
  // discarded even though the server-rendered button is already visible.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(
    page.getByRole("textbox", { name: "Search proposals..." }),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Open AI Assistant" }).click();
  await expect(
    page.getByRole("dialog", { name: "AI Assistant" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "AI Assistant workspace" }),
  ).toBeVisible();
  await waitForPopupMotion(page);
};

test.beforeEach(async ({ page }) => {
  const reset = await page.request.post(`${backendOrigin}/__e2e/reset`);
  expect(reset.ok()).toBe(true);
  await signIn(page);
});

test("opens contextual AI help from a proposal field and streams the answer", async ({
  page,
}, testInfo) => {
  await page.getByRole("button", { name: "Close AI Assistant" }).click();
  await expect(
    page.getByRole("button", { name: "Open AI Assistant" }),
  ).toBeFocused();
  await page.goto("/proposals/add-new-proposal");
  await expect(page).toHaveURL(/\/proposals\/add-new-proposal$/);
  await page
    .getByRole("button", { name: "Continue without upload" })
    .click();

  const eventNameField = page.locator(
    '[data-assistant-field-key="/content/event/name"]',
  );
  await expect(eventNameField).toBeVisible();
  const askAi = eventNameField.getByRole("button", {
    name: "Ask AI about this field",
  });
  await expect(askAi).toHaveCount(1);
  if (testInfo.project.name.includes("mobile")) {
    await askAi.tap();
  } else {
    await askAi.click();
  }

  const dialog = page.getByRole("dialog", { name: "AI Assistant" });
  await expect(dialog).toBeVisible();
  const composer = dialog.getByLabel("Message the AI Assistant");
  await expect(composer).toHaveValue(
    'What should I enter for the "Event Name" field? Explain it simply and give me one short example.',
  );
  await expect(composer).toBeFocused();

  await composer.press("Enter");
  await expect(composer).toHaveValue("");
  await expect(composer).toBeFocused();
  await expect(
    dialog.getByText(
      'What should I enter for the "Event Name" field? Explain it simply and give me one short example.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    dialog.getByRole("status", {
      name: "Assistant is responding",
    }),
  ).toBeVisible();
  await expect(
    dialog
      .getByLabel("AI Assistant conversation")
      .locator("ol")
      .getByText(/Enter the clear, public-facing name/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", {
      name: "Event Overview: Event Name",
    }),
  ).toHaveAttribute("href", "/proposals/add-new-proposal");
  await expect(
    dialog.getByText("Assistant is unavailable"),
  ).toHaveCount(0);
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

  const newConversationAction = page.getByRole("button", {
    name: "Start new conversation",
  });
  await expect(newConversationAction).toBeVisible();
  await page.getByRole("button", { name: "Assistant options" }).click();
  await expect(
    page.getByRole("menuitem", {
      name: "Start new conversation",
    }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  const composer = page.getByLabel("Message the AI Assistant");
  await expect(composer).toHaveAttribute(
    "placeholder",
    "Ask about RFPilot…",
  );
  expect(
    await composer.evaluate(
      (element) => element.scrollHeight <= element.clientHeight,
    ),
  ).toBe(true);
  await composer.fill(
    Array.from(
      { length: 12 },
      (_, index) => `Scrollable assistant composer line ${index + 1}`,
    ).join("\n"),
  );
  const composerGeometry = await composer.evaluate((element) => {
    const send = element.parentElement?.querySelector<HTMLButtonElement>(
      'button[aria-label="Send message"]',
    );
    const composerRect = element.getBoundingClientRect();
    const sendRect = send?.getBoundingClientRect();
    return {
      overflowing: element.scrollHeight > element.clientHeight,
      composerRight: composerRect.right,
      sendRight: sendRect?.right ?? composerRect.right,
    };
  });
  expect(composerGeometry.overflowing).toBe(true);
  expect(composerGeometry.composerRight).toBeGreaterThan(
    composerGeometry.sendRight,
  );
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
      .getByRole("menuitem", { name: "Open conversation history" })
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

  await newConversationAction.click();
  await expect(
    page.getByRole("heading", { name: "How can I help?" }),
  ).toBeVisible();
  await expect(composer).toBeFocused();
});

test("has no serious or critical automated accessibility violations", async ({
  page,
}) => {
  const result = await new AxeBuilder({ page })
    .include('[role="dialog"][aria-label="AI Assistant"]')
    .analyze();
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
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  expect(initialBox).not.toBeNull();
  expect(handleBox).not.toBeNull();
  if (!initialBox || !handleBox) return;

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
  await waitForPopupMotion(page);
  const reopenedBox = await dialog.boundingBox();
  expect(reopenedBox?.x).toBeCloseTo(leftEdgeBox.x, 0);
  expect(reopenedBox?.y).toBeCloseTo(leftEdgeBox.y, 0);

  await page.reload();
  await page.getByRole("button", { name: "Open AI Assistant" }).click();
  await waitForPopupMotion(page);
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

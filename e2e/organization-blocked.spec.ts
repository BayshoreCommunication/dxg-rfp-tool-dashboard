import { expect, test, type Page } from "@playwright/test";
import { expectProposalWording } from "./support/wording";

// RFPilot staff paused the member's organization. Every path ends on the sign-in page with one
// message; nothing says who paused the access or why. The stub answers as the backend does
// (e2e/support/organizationBlockedFixture.mjs).

const STUB = "http://127.0.0.1:8011";
const MESSAGE =
  "Your organization's access to RFPilot is paused. Contact RFPilot support for help.";

type BlockState = {
  signIn: boolean;
  requests: boolean;
  refusedRequests: number;
  refreshCalls: number;
};

const setBlock = async (page: Page, block: { signIn?: boolean; requests?: boolean }) => {
  const response = await page.request.post(`${STUB}/__e2e/organization-blocked`, { data: block });
  expect(response.ok()).toBe(true);
};

const readBlock = async (page: Page): Promise<BlockState> =>
  (await page.request.get(`${STUB}/__e2e/organization-blocked`)).json();

const submitPassword = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("assistant-e2e@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
};

const signIn = async (page: Page) => {
  await submitPassword(page);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByTestId("role-dashboard")).toBeVisible({ timeout: 20_000 });
};

const sessionCookies = async (page: Page) =>
  (await page.context().cookies()).filter((cookie) => cookie.name.includes("authjs.session-token"));

// The member is on the sign-in page, reads the message, and is signed out.
const expectSignedOutWithMessage = async (page: Page) => {
  await expect(page).toHaveURL(/\/sign-in\?error=ORGANIZATION_BLOCKED$/, { timeout: 20_000 });
  const alert = page.getByRole("alert").filter({ hasText: "paused" });
  await expect(alert).toHaveText(MESSAGE);
  await expect(page.getByPlaceholder("name@company.com")).toBeVisible();
  // The raw code is in the address only, never on the page.
  await expect(page.locator("body")).not.toContainText("ORGANIZATION_BLOCKED");
  await expect(page.getByText(/session expired/i)).toHaveCount(0);
  await expectProposalWording(page.locator("body"));
  expect(await sessionCookies(page)).toEqual([]);
};

test.afterEach(async ({ page }) => {
  await setBlock(page, {});
});

test("a password sign-in refused for a paused organization shows the message", async ({
  page,
}, testInfo) => {
  await setBlock(page, { signIn: true });
  await submitPassword(page);

  const alert = page.getByRole("alert").filter({ hasText: "paused" });
  await expect(alert).toHaveText(MESSAGE);
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.locator("body")).not.toContainText("ORGANIZATION_BLOCKED");
  await expect(page.getByText("Login failed")).toHaveCount(0);
  await expectProposalWording(page.locator("body"));
  expect(await sessionCookies(page)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("password-sign-in.png"), fullPage: true });
});

test("the sign-in page shows the message for ?error=ORGANIZATION_BLOCKED", async ({
  page,
}, testInfo) => {
  // Where the backend's Microsoft and company callback, and the Google sign-in, send a member.
  await page.goto("/sign-in?error=ORGANIZATION_BLOCKED");

  await expect(page.getByRole("alert").filter({ hasText: "paused" })).toHaveText(MESSAGE);
  await expect(page.locator("body")).not.toContainText("ORGANIZATION_BLOCKED");
  await expectProposalWording(page.locator("body"));
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("error-redirect.png"), fullPage: true });
});

test("a signed-in member lands on sign-in with the message when the block lands", async ({
  page,
}, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await signIn(page);
  await setBlock(page, { requests: true });

  // Their next page load: its requests are answered 401 ORGANIZATION_BLOCKED.
  await page.goto("/proposals");
  await expectSignedOutWithMessage(page);
  await page.screenshot({ path: testInfo.outputPath("signed-in-member.png"), fullPage: true });

  // No refresh was tried for the refused requests, and no retry loop followed.
  const afterRedirect = await readBlock(page);
  expect(afterRedirect.refusedRequests).toBeGreaterThan(0);
  expect(afterRedirect.refreshCalls).toBe(0);
  await page.waitForTimeout(1_500);
  expect((await readBlock(page)).refusedRequests).toBe(afterRedirect.refusedRequests);

  // Signed out for good: a protected page asks them to sign in, with no stale message.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard$/);
  await expect(page.getByRole("alert").filter({ hasText: "paused" })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("a signed-in member who stays in the app is signed out by their next click", async ({
  page,
}) => {
  await signIn(page);
  await setBlock(page, { requests: true });

  // No full page load: a link inside the app, as the member would click it.
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('a[href="/proposals"]')?.click();
  });
  await expectSignedOutWithMessage(page);
  expect((await readBlock(page)).refreshCalls).toBe(0);
});

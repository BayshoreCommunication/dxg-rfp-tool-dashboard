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
  // Not the error boundary (components/ErrorPage.tsx).
  await expect(page.getByText("We hit some turbulence.")).toHaveCount(0);
  await expectProposalWording(page.locator("body"));
  expect(await sessionCookies(page)).toEqual([]);
};

// A server action the old page had already queued can be answered while the browser is leaving
// for the sign-in page. Next rejects it with this text; nothing is shown. No other error may occur.
const KNOWN_REJECTION_WHILE_LEAVING = "An unexpected response was received from the server.";

const collectPageErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

const expectNoUnknownPageErrors = (errors: string[]) => {
  expect(errors.filter((message) => message !== KNOWN_REJECTION_WHILE_LEAVING)).toEqual([]);
};

// The Auth.js session as the server sees it (this path is outside the proxy).
const readSession = async (page: Page): Promise<Record<string, unknown> | null> =>
  (await page.request.get("/api/auth/session")).json();

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
  const pageErrors = collectPageErrors(page);
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
  expectNoUnknownPageErrors(pageErrors);
});

test("a signed-in member who stays in the app is signed out by their next click", async ({
  page,
}) => {
  const pageErrors = collectPageErrors(page);
  await signIn(page);
  await setBlock(page, { requests: true });

  // No full page load: a link inside the app, as the member would click it.
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('a[href="/proposals"]')?.click();
  });
  await expectSignedOutWithMessage(page);
  expect((await readBlock(page)).refreshCalls).toBe(0);
  expectNoUnknownPageErrors(pageErrors);
});

test("background requests neither sign the member out nor lose the message", async ({
  page,
}, testInfo) => {
  const pageErrors = collectPageErrors(page);
  await signIn(page);
  // Let the page finish its own requests, so the only ones from here on are the ones below.
  await page.waitForLoadState("networkidle");
  await setBlock(page, { requests: true });

  const backgroundFetch = (path: string, method: "GET" | "POST") =>
    page.evaluate(
      async ([url, verb]) => {
        const response = await fetch(url, {
          method: verb,
          ...(verb === "POST"
            ? { headers: { "Content-Type": "application/json" }, body: "{}" }
            : {}),
        });
        return {
          status: response.status,
          redirected: response.redirected,
          body: (await response.json().catch(() => null)) as Record<string, unknown> | null,
        };
      },
      [path, method] as const,
    );

  // The first refused request is a background fetch, not a click. It ends the session
  // (the mark on the cookie), and nothing the member can see happens.
  const first = await backgroundFetch("/api/ai-assistant/proposals", "GET");
  expect(first.status).toBe(401);
  expect(await readSession(page)).toMatchObject({
    authError: "SessionExpired",
    authEndReason: "ORGANIZATION_BLOCKED",
  });

  // More background requests of the ended session: each is refused with the code. None is
  // redirected, none reads as a success, none removes the cookie.
  for (const [path, method] of [
    ["/api/ai-assistant/proposals", "GET"],
    ["/api/ai-assistant/events", "POST"],
    ["/api/proposal-pdf", "POST"],
  ] as const) {
    const refused = await backgroundFetch(path, method);
    expect(refused, `${method} ${path}`).toEqual({
      status: 401,
      redirected: false,
      body: { success: false, code: "ORGANIZATION_BLOCKED", message: MESSAGE },
    });
  }
  // A router prefetch of a page, as a production build sends for a visible link.
  const prefetch = await page.evaluate(async () => {
    const response = await fetch("/proposals?_rsc=prefetch", {
      headers: { rsc: "1", "next-router-prefetch": "1" },
    });
    return { status: response.status, redirected: response.redirected };
  });
  expect(prefetch).toEqual({ status: 401, redirected: false });

  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await sessionCookies(page)).not.toEqual([]);
  expect(await readSession(page)).toMatchObject({ authEndReason: "ORGANIZATION_BLOCKED" });

  // The member's next click, on a link inside the app (a router request of the ended session).
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('a[href="/proposals"]')?.click();
  });
  await expectSignedOutWithMessage(page);
  await page.screenshot({ path: testInfo.outputPath("after-background-requests.png"), fullPage: true });
  expect((await readBlock(page)).refreshCalls).toBe(0);
  expectNoUnknownPageErrors(pageErrors);
});

test("the exit route does not sign out a member whose organization is not blocked", async ({
  page,
}) => {
  await signIn(page);

  // A link to the exit, followed by a signed-in member of an organization that is not blocked.
  await page.goto("/api/auth/organization-blocked");
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByTestId("role-dashboard")).toBeVisible({ timeout: 20_000 });
  expect(await sessionCookies(page)).not.toEqual([]);
  expect(await readSession(page)).toMatchObject({ user: { email: "assistant-e2e@example.com" } });
});

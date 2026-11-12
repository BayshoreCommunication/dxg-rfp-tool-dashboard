import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type APIRequestContext, type Locator, type Page, type TestInfo } from "@playwright/test";
import { expectProposalWording } from "./support/wording";

// `next dev` compiles each route on first visit; give navigations room on a busy machine.
const expect = baseExpect.configure({ timeout: 45_000 });

// ORG-602: a free-trial organization's RFP counter, the create button at the limit, the locked
// vendor-response and RFP-intelligence screens, and all of it unlocking after a plan change.
// The stub (e2e/support/planEntitlementsFixture.mjs) refuses the gated routes on the free trial
// the way the backend does (ORG-601) and records every request it refused.

const STUB = `http://127.0.0.1:${process.env.ASSISTANT_E2E_BACKEND_PORT || 8011}`;
const RFP_ID = "000000000000000000000001";
const RESPONSE_ID = "aaaaaaaaaaaaaaaaaaaaaa01";
const RUN_ID = "11111111-2222-4333-8444-555555555555";
const VENDOR_NAMES = ["Brightline AV Synthetic", "Northlight Staging Synthetic", "Cobalt Production Synthetic"];

type PlanState = { plan: string; lockedRequests: string[] };
const setPlan = async (request: APIRequestContext, body: { plan?: "free_trial" | "full_access"; created?: number; clearRequests?: boolean }) =>
  (await (await request.post(`${STUB}/__e2e/plan`, { data: body })).json()) as PlanState;

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  test.setTimeout(600_000);
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    if (message.type() === "error") seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
});

// Back to the plan every other spec expects.
test.afterEach(async ({ request }) => {
  await setPlan(request, { plan: "full_access", created: 0, clearRequests: true });
});

const signInAs = async (page: Page, role: "owner" | "planner" | "viewer") => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`${role}-e2e@example.com`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("role-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  // The first sign-in also compiles the dashboard; a busy machine can take over a minute.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 150_000 });
  await expect(page.getByTestId("role-dashboard")).toBeVisible({ timeout: 60_000 });
};

// Every state: no serious accessibility violations in the region, nothing wider than the screen,
// "proposal" not "RFP", no console errors, and a screenshot as evidence.
const check = async (page: Page, testInfo: TestInfo, region: Locator, selector: string, name: string, wording: Locator = region) => {
  await expect(region).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include(selector).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    accessibility.violations
      .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectProposalWording(wording);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(problems.get(page)).toEqual([]);
};

// A locked screen is a designed state: the lock card, the count, "Contact us" - and nothing
// about any vendor, no error banner, no raw refusal.
const expectLocked = async (
  page: Page,
  testInfo: TestInfo,
  expected: { feature: "vendorResponses" | "proposalIntelligence"; count: string | null; name: string; rfpTitle?: string },
) => {
  const locked = page.getByTestId("plan-locked");
  await expect(locked).toBeVisible();
  await expect(locked).toHaveAttribute("data-feature", expected.feature);
  await expect(locked.getByRole("heading", { level: 1 })).toHaveText(
    expected.feature === "vendorResponses" ? "Vendor responses aren't included in your plan" : "Proposal intelligence isn't included in your plan",
  );
  if (expected.count === null) await expect(locked.getByTestId("plan-locked-count")).toHaveCount(0);
  else await expect(locked.getByTestId("plan-locked-count")).toHaveText(expected.count);
  if (expected.rfpTitle) await expect(locked).toContainText(expected.rfpTitle);
  await expect(locked.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/support");
  await expect(locked).toContainText("Free trial");

  const main = (await page.getByRole("main").first().textContent()) ?? "";
  for (const vendor of VENDOR_NAMES) expect(main).not.toContain(vendor);
  expect(main).not.toMatch(/PLAN_FEATURE_LOCKED|\b403\b|unavailable|could not be loaded/i);
  await expect(page.getByRole("main").first().getByRole("alert")).toHaveCount(0);
  await check(page, testInfo, locked, '[data-testid="plan-locked"]', expected.name);
};

test("Free trial: the proposal counter, and the create button at the limit", async ({ page, request }, testInfo) => {
  await setPlan(request, { plan: "free_trial", created: 1 });
  await signInAs(page, "planner");

  // One of two used: the counter sits with a working "New Proposal" button.
  const dashboard = page.getByTestId("role-dashboard");
  await expect(page.getByTestId("rfp-usage")).toHaveText("1 of 2 proposals used on the free trial");
  await expect(page.getByRole("main").getByRole("link", { name: "New Proposal" })).toHaveAttribute("href", "/proposals/add-new-proposal");
  await expect(page.getByTestId("rfp-limit")).toHaveCount(0);
  await check(page, testInfo, dashboard, '[data-testid="role-dashboard"]', "dashboard-1-of-2");

  // The organization creates its second RFP: the button is off and says why.
  await setPlan(request, { created: 2 });
  await page.reload();
  const limit = page.getByTestId("rfp-limit");
  await expect(limit).toBeVisible();
  await expect(limit.getByTestId("rfp-usage")).toHaveText("2 of 2 proposals used.");
  await expect(limit).toContainText("Your plan includes 2 proposals and your organization has used both. Deleting a proposal doesn't free one up. Contact us to upgrade.");
  const button = limit.getByRole("button", { name: "New Proposal" });
  await expect(button).toBeDisabled();
  await expect(button).toHaveAccessibleDescription(/2 of 2 proposals used/);
  await expect(page.getByRole("main").getByRole("link", { name: "New Proposal" })).toHaveCount(0);
  await expect(limit.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/support");
  await check(page, testInfo, limit, '[data-testid="rfp-limit"]', "dashboard-at-limit");

  // The RFP list page carries the same button and message.
  await page.goto("/proposals");
  await expect(page.getByTestId("rfp-limit").getByRole("button", { name: "New Proposal" })).toBeDisabled();
  await check(page, testInfo, page.getByTestId("rfp-limit"), '[data-testid="rfp-limit"]', "rfp-list-at-limit");

  // Any other way into "create a proposal" explains the limit instead of opening the form.
  await page.goto("/proposals/add-new-proposal");
  const reached = page.getByTestId("rfp-limit-reached");
  await expect(reached.getByRole("heading", { level: 1 })).toHaveText("You’ve reached your plan’s proposal limit");
  await expect(reached.getByTestId("rfp-usage")).toHaveText("2 of 2 proposals used");
  await expect(reached.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/support");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await check(page, testInfo, reached, '[data-testid="rfp-limit-reached"]', "create-at-limit");
});

test("Free trial: vendor responses and proposal intelligence show a locked state with the response count", async ({ page, request }, testInfo) => {
  await setPlan(request, { plan: "free_trial", created: 1 });
  await signInAs(page, "planner");
  await setPlan(request, { clearRequests: true });

  // The vendor responses tab: the count across the planner's own RFPs (3 + 0 + 0 + 6 + 3).
  await page.goto("/vendor-responses");
  await expectLocked(page, testInfo, { feature: "vendorResponses", count: "12 vendor responses received on your proposals", name: "vendor-responses-locked" });

  // One RFP's responses: that RFP's own count.
  await page.goto(`/vendor-responses/proposals/${RFP_ID}`);
  await expectLocked(page, testInfo, { feature: "vendorResponses", count: "3 vendor responses received on this proposal", rfpTitle: "Annual Sales Kickoff", name: "rfp-responses-locked" });

  // A single response (where a notification or an old link lands).
  await page.goto(`/vendor-responses/${RESPONSE_ID}`);
  await expectLocked(page, testInfo, { feature: "vendorResponses", count: "12 vendor responses received on your proposals", name: "response-detail-locked" });

  // RFP intelligence: home, requirement checklist, submission versions and a comparison tab.
  const intelligence = { feature: "proposalIntelligence" as const, count: "3 vendor responses received on this proposal", rfpTitle: "Annual Sales Kickoff" };
  await page.goto(`/proposals/${RFP_ID}/intelligence`);
  await expectLocked(page, testInfo, { ...intelligence, name: "intelligence-locked" });
  await page.goto(`/proposals/${RFP_ID}/intelligence/requirements`);
  await expectLocked(page, testInfo, { ...intelligence, name: "intelligence-requirements-locked" });
  await page.goto(`/proposals/${RFP_ID}/intelligence/submissions`);
  await expectLocked(page, testInfo, { ...intelligence, name: "intelligence-submissions-locked" });
  await page.goto(`/proposals/${RFP_ID}/intelligence/comparisons/${RUN_ID}/overview`);
  await expectLocked(page, testInfo, { ...intelligence, name: "intelligence-comparison-locked" });

  // The locked screens never asked the backend for locked data. The only refused request is the
  // sidebar's unread badge (it reads a count and shows none).
  const { lockedRequests } = await setPlan(request, {});
  expect([...new Set(lockedRequests)]).toEqual(["GET /api/vendor-responses"]);
});

test("Free trial: a Viewer sees the same locked state, counted over the proposals shared with them", async ({ page, request }, testInfo) => {
  await setPlan(request, { plan: "free_trial", created: 2 });
  await signInAs(page, "viewer");

  // Viewers have no create button, so no counter and no limit message.
  await expect(page.getByTestId("rfp-usage")).toHaveCount(0);
  await expect(page.getByTestId("rfp-limit")).toHaveCount(0);

  // The RFP list page too.
  await page.goto("/proposals");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("rfp-usage")).toHaveCount(0);
  await expect(page.getByTestId("rfp-limit")).toHaveCount(0);

  await page.goto("/vendor-responses");
  await expectLocked(page, testInfo, { feature: "vendorResponses", count: "5 vendor responses received on your proposals", name: "viewer-vendor-responses-locked" });
});

test("After a plan change the limit is gone and the locked screens open", async ({ page, request }, testInfo) => {
  await setPlan(request, { plan: "free_trial", created: 2 });
  await signInAs(page, "owner");
  await expect(page.getByTestId("rfp-limit").getByRole("button", { name: "New Proposal" })).toBeDisabled();
  await page.goto("/vendor-responses");
  await expect(page.getByTestId("plan-locked")).toBeVisible();
  await page.goto(`/proposals/${RFP_ID}/intelligence`);
  await expect(page.getByTestId("plan-locked")).toBeVisible();

  // Staff move the organization to full access (ORG-603). Nothing to do in the dashboard
  // but load the page again.
  await setPlan(request, { plan: "full_access" });

  await page.reload();
  await expect(page.getByTestId("plan-locked")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Annual Sales Kickoff" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("intelligence-unlocked.png"), fullPage: true });

  // The responses received while locked are there to read.
  await page.goto("/vendor-responses");
  await expect(page.getByTestId("plan-locked")).toHaveCount(0);
  await expect(page.locator("body")).toContainText("Annual Sales Kickoff");
  await expect(page.locator("body")).toContainText("Brightline AV Synthetic");
  await page.screenshot({ path: testInfo.outputPath("vendor-responses-unlocked.png"), fullPage: true });

  await page.goto(`/vendor-responses/proposals/${RFP_ID}`);
  await expect(page.getByTestId("plan-locked")).toHaveCount(0);
  for (const vendor of VENDOR_NAMES) await expect(page.locator("body")).toContainText(vendor);
  await page.screenshot({ path: testInfo.outputPath("rfp-responses-unlocked.png"), fullPage: true });

  // No limit on full access: the plain create button, no counter, and the create screen opens.
  await page.goto("/dashboard");
  await expect(page.getByTestId("role-dashboard")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "New Proposal" })).toHaveAttribute("href", "/proposals/add-new-proposal");
  await expect(page.getByTestId("rfp-usage")).toHaveCount(0);
  await expect(page.getByTestId("rfp-limit")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("dashboard-unlocked.png"), fullPage: true });
  await page.goto("/proposals/add-new-proposal");
  await expect(page.getByTestId("rfp-limit-reached")).toHaveCount(0);
});

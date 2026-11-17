import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Page } from "@playwright/test";
import { expectProposalWording } from "./support/wording";

// `next dev` compiles on demand, so give navigations more room than the suite's default.
const expect = baseExpect.configure({ timeout: 45_000 });

// Settings > General > Branding against the stub backend (settingsFixture.mjs). The "Proposal Link
// Prefix" field ended in another product's domain and changed no real link (its one effect, a
// fallback brand name on the proposal document, is removed too), so it is gone. This spec seeds
// saved settings that still hold a prefix: it must not be shown, and saving must not lose it.

const backendOrigin = process.env.E2E_BACKEND_ORIGIN ?? "http://127.0.0.1:8011";
const STORED_PREFIX = "northwind-legacy";
const OTHER_PRODUCT = /goprospero/i;

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, request }) => {
  test.setTimeout(180_000);
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    if (message.type() === "error") seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
  await request.post(`${backendOrigin}/__e2e/settings`, { data: { seed: "northwind" } });
});

// Leave the stub as the other specs expect it: no saved settings.
test.afterEach(async ({ request }) => {
  await request.post(`${backendOrigin}/__e2e/settings`, { data: {} });
});

const signIn = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("assistant-e2e@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
};

// Text on the page plus what its fields hold: a domain inside an input is not in textContent.
const visibleTextAndValues = (page: Page) =>
  page.evaluate(() =>
    [
      document.body.innerText,
      ...Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")).map(
        (field) => `${field.value} ${field.placeholder}`,
      ),
    ].join("\n"),
  );

test("Branding has no link prefix field and names no other product", async ({ page, request }, testInfo) => {
  await signIn(page);
  await page.goto("/settings");

  const branding = page.locator("section").filter({ has: page.getByRole("heading", { name: "Branding", exact: true }) });
  await expect(branding).toBeVisible();
  await expect(branding.getByLabel(/Brand Name/)).toHaveValue("Northwind Events");
  await expect(branding.getByLabel("Default Proposal Font")).toHaveValue("Inter");
  await expect(branding.getByLabel("Signature Color")).toHaveValue("#2FC6F5");

  // The field is gone, and the prefix saved before it was removed is not shown anywhere.
  await expect(page.getByLabel(/link prefix/i)).toHaveCount(0);
  await expect(page.getByText(/link prefix/i)).toHaveCount(0);
  await expect(page.locator("#linkPrefix")).toHaveCount(0);
  const shown = await visibleTextAndValues(page);
  expect(shown).not.toMatch(OTHER_PRODUCT);
  expect(shown).not.toContain(STORED_PREFIX);
  expect(await page.content()).not.toMatch(OTHER_PRODUCT);

  await expectProposalWording(page.locator("body"));

  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  const accessibility = await new AxeBuilder({ page })
    .include("section:has(#brandName)")
    .withTags(["wcag2a", "wcag2aa"])
    // The settings cards' grey field labels (#969798 on white) fail colour contrast on main today.
    .disableRules(["color-contrast"])
    .analyze();
  expect(
    accessibility.violations
      .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`),
  ).toEqual([]);

  await branding.scrollIntoViewIfNeeded();
  await branding.screenshot({ path: testInfo.outputPath("branding-card.png") });
  await page.screenshot({ path: testInfo.outputPath("settings-general.png"), fullPage: true });

  // Saving another Branding field keeps the stored prefix: the dashboard sends back what it loaded.
  await branding.getByLabel(/Brand Name/).fill("Northwind Live");
  await page.getByRole("button", { name: "Update Settings" }).click();
  await expect(page.getByText("Settings updated successfully.")).toBeVisible();
  const { saved } = await (await request.get(`${backendOrigin}/__e2e/settings`)).json();
  expect(saved).toHaveLength(1);
  expect(saved[0].branding).toMatchObject({ brandName: "Northwind Live", linkPrefix: STORED_PREFIX, defaultFont: "Inter" });

  await expect(branding.getByLabel(/Brand Name/)).toHaveValue("Northwind Live");
  expect(await visibleTextAndValues(page)).not.toMatch(OTHER_PRODUCT);

  expect(problems.get(page)).toEqual([]);
});

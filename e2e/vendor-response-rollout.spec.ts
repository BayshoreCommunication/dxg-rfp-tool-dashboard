import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const proposalId = "6a7aa6f2c7e1575700216e0a";
const url = `/vendor-response/annual-leadership-summit-${proposalId}?email=vendor%40example.com&tid=tracking-8&accessGrant=test-grant`;

test("rollout-off vendor links retain the complete legacy response flow", async ({
  page,
}, testInfo) => {
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Submit your proposal" })).toBeVisible();
  await expect(page.getByText("Responding to", { exact: false })).toBeVisible();
  await expect(page.getByText("Annual Leadership Summit", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Response contact email *")).toHaveValue(
    "vendor@example.com",
  );
  await expect(page.getByRole("button", { name: "Choose files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit response" })).toBeVisible();
  await expect(page.locator('form [role="alert"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Compliance/i })).toHaveCount(0);
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact || ""),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("vendor-response-rollout-off.png"),
    fullPage: true,
  });
});

test("legacy fallback remains keyboard reachable and usable on mobile", async ({
  page,
}) => {
  test.skip(!test.info().project.name.includes("mobile"), "mobile-only assertions");
  await page.goto(url);
  const vendorName = page.getByLabel("Company / vendor name *");
  await vendorName.focus();
  await expect(vendorName).toBeFocused();
  await page.keyboard.type("AV Partners");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Submitted by *")).toBeFocused();
  for (const label of ["Choose files", "Submit response"]) {
    const button = page.getByRole("button", { name: label });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport();
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const signIn = async (page: import("@playwright/test").Page) => {
  await page.goto("/sign-in");
  await page
    .getByPlaceholder("name@company.com")
    .fill("assistant-e2e@example.com");
  await page.locator('input[type="password"]').fill("assistant-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(
    page.getByRole("textbox", { name: "Search proposals..." }),
  ).toBeVisible({ timeout: 20_000 });
};

test("authenticated dashboard uses the admin dark palette", async ({
  page,
}, testInfo) => {
  await signIn(page);

  const localToggle = page.getByTestId("dev-theme-toggle");
  await expect(localToggle).toBeVisible();
  await expect(localToggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByTestId("layout-shell")).toHaveCSS(
    "background-color",
    "rgb(7, 19, 28)",
  );
  await expect(page.locator("aside")).toHaveCSS(
    "background-color",
    "rgb(13, 29, 40)",
  );

  const firstMetric = page.getByRole("link", {
    name: /Total Proposals:/,
  });
  await expect(firstMetric).toHaveCSS(
    "background-color",
    "rgb(13, 29, 40)",
  );

  const latestProposals = page
    .getByRole("heading", { name: "Latest Proposals" })
    .locator(
      "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' bg-white ')][1]",
    );
  await expect(latestProposals).toHaveCSS(
    "background-color",
    "rgb(13, 29, 40)",
  );

  await localToggle.click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.getByTestId("layout-shell")).toHaveCSS(
    "background-color",
    "rgb(244, 247, 250)",
  );
  await localToggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact || ""),
    ),
  ).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath("dashboard-dark.png"),
    fullPage: true,
  });
});

test("protected routes retain the dark canvas", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);

  for (const route of [
    "/proposals",
    "/email",
    "/vendor-responses",
    "/notification",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(page.getByTestId("layout-shell")).toHaveCSS(
      "background-color",
      "rgb(7, 19, 28)",
    );
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(
      page.locator(
        '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
      ),
    ).toHaveCount(0);

    const largeLightSurfaces = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.width * rect.height < 5_000 || rect.bottom < 0) return false;
          if (element.closest(".rfp-root")) return false;
          if (element.closest(".theme-light-proof")) return false;
          const color = getComputedStyle(element).backgroundColor;
          const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
          return Boolean(
            channels && channels.every((channel) => channel >= 225),
          );
        })
        .map((element) => ({
          tag: element.tagName,
          className: element.className,
          background: getComputedStyle(element).backgroundColor,
        }))
        .slice(0, 10),
    );
    expect(largeLightSurfaces, `${route} has large light surfaces`).toEqual([]);
  }
});

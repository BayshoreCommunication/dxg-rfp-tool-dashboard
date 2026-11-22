import { expect as baseExpect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { ORGANIZATION_TYPE_OPTIONS, US_TIME_ZONE_OPTIONS } from "../components/auth/onboardingOptions";
import { expectProposalWording } from "./support/wording";

// The new-organization setup wizard (/welcome) fits the window: on a laptop or desktop screen the
// page never scrolls and each step's primary button is in view; on a phone the page scrolls as
// usual, in one column. Against the stub backend (usersPageFixture.mjs answers the organization
// profile and moves the step on, the way the backend does).

// `next dev` compiles on demand, so give navigations more room than the suite's default.
const expect = baseExpect.configure({ timeout: 45_000 });

const backendOrigin = process.env.E2E_BACKEND_ORIGIN ?? "http://127.0.0.1:8011";
const welcomeStub = `${backendOrigin}/__e2e/welcome`;

// The wizard fits the window from the lg breakpoint (1024 px wide) up.
const DESKTOP_VIEWPORTS = [
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1680, height: 933 },
];
// The sizes whose screenshots are kept.
const SCREENSHOT_AT = new Set(["1024x768", "1280x720", "1680x933"]);

const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith("mobile");

test.beforeEach(async ({ request }) => {
  test.setTimeout(240_000);
  await request.post(welcomeStub, { data: { on: true, step: "details" } });
});
test.afterEach(async ({ request }) => {
  await request.post(welcomeStub, { data: { on: false } });
});

// An organization still in onboarding is sent to the wizard, at the step it had reached.
const openWizard = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill("owner-e2e@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("role-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/welcome$/, { timeout: 180_000 });
  await expect(page.getByRole("heading", { name: "Welcome, Olivia" })).toBeVisible();
};

type Measure = {
  scrollHeight: number;
  innerHeight: number;
  scrollWidth: number;
  innerWidth: number;
  // Boxes on the page that scroll their own content (the form inside the card would).
  innerScroll: string[];
};

const measure = (page: Page) =>
  page.evaluate((): Measure => {
    const innerScroll: string[] = [];
    for (const box of Array.from(document.querySelectorAll("body *:not(textarea)"))) {
      const overflow = getComputedStyle(box).overflowY;
      if ((overflow === "auto" || overflow === "scroll") && box.scrollHeight > box.clientHeight + 1) {
        innerScroll.push(`${box.tagName.toLowerCase()} ${box.scrollHeight} > ${box.clientHeight}`);
      }
    }
    const root = document.documentElement;
    return {
      scrollHeight: root.scrollHeight,
      innerHeight: window.innerHeight,
      scrollWidth: root.scrollWidth,
      innerWidth: window.innerWidth,
      innerScroll,
    };
  });

const insideViewport = async (page: Page, target: Locator) => {
  const box = await target.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box, "the button is on the page").not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
};

// The page itself does not scroll, in either direction, and the step's primary button is in view.
const pageFits = async (page: Page, button: Locator, step: string, { innerScrollAllowed = false } = {}) => {
  await expect(button).toBeVisible();
  const measured = await measure(page);
  const { width, height } = page.viewportSize()!;
  console.log(`[onboarding-fit] ${width}x${height} ${step}: scrollHeight ${measured.scrollHeight} / innerHeight ${measured.innerHeight}, scrollWidth ${measured.scrollWidth} / innerWidth ${measured.innerWidth}, inner scroll: ${measured.innerScroll.join("; ") || "none"}`);
  expect(measured.scrollHeight, `${step}: the page does not scroll down`).toBeLessThanOrEqual(measured.innerHeight + 1);
  expect(measured.scrollWidth, `${step}: the page does not scroll sideways`).toBeLessThanOrEqual(measured.innerWidth);
  await insideViewport(page, button);
  if (!innerScrollAllowed) expect(measured.innerScroll, `${step}: nothing scrolls inside the card`).toEqual([]);
  return measured;
};

const top = async (target: Locator) => (await target.boundingBox())!;

const longest = (options: { value: string; label: string }[]) =>
  options.reduce((widest, option) => (option.label.length > widest.label.length ? option : widest));

// A select here has no arrow of its own and clips a label that is too long, with no ellipsis.
// Choose the option and compare its label, set in the select's own font, with the room inside
// the select's padding.
const labelFitsSelect = async (page: Page, label: string, option: { value: string; label: string }) => {
  const select = page.getByLabel(label);
  await select.selectOption(option.value);
  const measured = await select.evaluate((node) => {
    const control = node as HTMLSelectElement;
    const style = getComputedStyle(control);
    const probe = document.createElement("span");
    probe.textContent = control.selectedOptions[0].text;
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0";
    probe.style.font = style.font;
    probe.style.letterSpacing = style.letterSpacing;
    document.body.append(probe);
    const text = probe.getBoundingClientRect().width;
    probe.remove();
    return {
      shown: control.selectedOptions[0].text,
      text,
      room: control.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight),
    };
  });
  const { width, height } = page.viewportSize()!;
  console.log(`[onboarding-fit] ${width}x${height} ${label}: "${measured.shown}" is ${measured.text.toFixed(1)} px wide, the select has room for ${measured.room.toFixed(1)} px`);
  expect(measured.shown).toBe(option.label);
  expect(measured.text, `${label}: "${option.label}" is not cut off`).toBeLessThanOrEqual(measured.room);
};

// The form answers once the page has hydrated; before that a click would submit it natively.
const saveCompany = async (page: Page) => {
  await expect(async () => {
    await page.getByLabel("Company name").fill("Northwind Events");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await baseExpect(page.getByRole("heading", { name: "Choose your plan" })).toBeVisible({ timeout: 5_000 });
  }).toPass();
};

for (const viewport of DESKTOP_VIEWPORTS) {
  const size = `${viewport.width}x${viewport.height}`;

  test(`every step fits a ${viewport.width} × ${viewport.height} window without scrolling`, async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "The desktop sizes are checked in the desktop project.");
    await page.setViewportSize(viewport);
    await openWizard(page);
    // The whole card, both panels: the progress list is on every step.
    const card = page.getByRole("list", { name: "Setup progress" }).locator("xpath=ancestor::div[contains(@class,'rounded-[2.5rem]')]");
    const shot = async (step: string) => {
      if (SCREENSHOT_AT.has(size)) await page.screenshot({ path: testInfo.outputPath(`onboarding-${step}-${size}.png`) });
    };

    // Company.
    const proceed = page.getByRole("button", { name: "Continue", exact: true });
    await pageFits(page, proceed, "company");
    // A refused submit adds its error above the fields: the page still does not scroll and the
    // button is still in view. (The form answers once the page has hydrated.)
    const refused = page.getByRole("alert").filter({ hasText: "Enter your company name." });
    await expect(async () => {
      await page.getByLabel("Company name").fill("");
      await proceed.click();
      await baseExpect(refused).toBeVisible({ timeout: 5_000 });
    }).toPass();
    await pageFits(page, proceed, "company, with an error");
    await insideViewport(page, refused);
    if (SCREENSHOT_AT.has(size)) await page.screenshot({ path: testInfo.outputPath(`onboarding-company-error-${size}.png`) });
    // Typing clears the error; the rest of the step is checked without it.
    await page.getByLabel("Company name").fill("Northwind");
    await expect(refused).toHaveCount(0);
    await page.getByLabel("Company name").fill("");
    // The short fields sit side by side, the left one first; the company name keeps the full width.
    const name = await top(page.getByLabel("Company name"));
    const type = await top(page.getByLabel("Organization type"));
    const industry = await top(page.getByLabel("Industry (optional)"));
    const country = await top(page.getByLabel("Country"));
    const zone = await top(page.getByLabel("Time zone"));
    const events = await top(page.getByLabel("Events per year (optional)"));
    expect(Math.abs(type.y + type.height / 2 - (industry.y + industry.height / 2))).toBeLessThanOrEqual(2);
    expect(type.x + type.width).toBeLessThanOrEqual(industry.x);
    expect(Math.abs(country.y - zone.y)).toBeLessThanOrEqual(2);
    expect(country.x + country.width).toBeLessThanOrEqual(zone.x);
    expect(name.y).toBeLessThan(type.y);
    expect(type.y).toBeLessThan(country.y);
    expect(country.y).toBeLessThan(events.y);
    // Text stays readable and the controls stay a comfortable size.
    for (const label of ["Company name", "Organization type", "Industry (optional)", "Country", "Time zone", "Events per year (optional)"]) {
      const field = page.getByLabel(label);
      expect(Number.parseFloat(await field.evaluate((node) => getComputedStyle(node).fontSize)), `${label} text size`).toBeGreaterThanOrEqual(15);
    }
    for (const select of [type, country, zone]) expect(select.height).toBeGreaterThanOrEqual(44);
    expect((await top(proceed)).height).toBeGreaterThanOrEqual(44);
    // The longest organization type and the longest time zone name are not cut off in their fields.
    await labelFitsSelect(page, "Organization type", longest(ORGANIZATION_TYPE_OPTIONS));
    await labelFitsSelect(page, "Time zone", longest(US_TIME_ZONE_OPTIONS));
    // Tab order follows the visual order.
    await page.getByLabel("Company name").focus();
    for (const label of ["Organization type", "Industry (optional)", "Country", "Time zone", "Events per year (optional)"]) {
      await page.keyboard.press("Tab");
      await expect(page.getByLabel(label)).toBeFocused();
    }
    await page.keyboard.press("Tab");
    await expect(proceed).toBeFocused();
    await expectProposalWording(card);
    await page.getByLabel("Company name").fill("Northwind Events");
    await page.getByLabel("Company name").blur();
    await shot("company");

    // Plan.
    await saveCompany(page);
    await pageFits(page, page.getByRole("button", { name: "Start free trial" }), "plan");
    await expectProposalWording(card);
    await shot("plan");

    // Team.
    await page.getByRole("button", { name: "Start free trial" }).click();
    await expect(page.getByRole("heading", { name: "Invite your team" })).toBeVisible();
    await pageFits(page, page.getByRole("button", { name: "Send invitations" }), "team");
    await insideViewport(page, page.getByRole("button", { name: "Skip for now" }));
    await expectProposalWording(card);
    await shot("team");

    // One invitation sent, with its result listed, still fits.
    await page.getByLabel("Email addresses").fill("maya.manager@example.com");
    await page.getByRole("button", { name: "Send invitations" }).click();
    await expect(page.getByText("1 invitation sent")).toBeVisible();
    await pageFits(page, page.getByRole("button", { name: "Send invitations" }), "team, one invitation sent", { innerScrollAllowed: true });
    await insideViewport(page, page.getByRole("button", { name: "Go to dashboard" }));
  });
}

test("a window too short for the form scrolls inside the card and keeps the button in view", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "The desktop sizes are checked in the desktop project.");
  await page.setViewportSize({ width: 1280, height: 540 });
  await openWizard(page);
  const proceed = page.getByRole("button", { name: "Continue", exact: true });
  const measured = await pageFits(page, proceed, "company, short window", { innerScrollAllowed: true });
  expect(measured.innerScroll).toHaveLength(1);
  // Everything is still reachable: the first and the last field scroll into view under the pointer.
  await page.getByLabel("Events per year (optional)").scrollIntoViewIfNeeded();
  await insideViewport(page, page.getByLabel("Events per year (optional)"));
  await insideViewport(page, proceed);
  await page.getByLabel("Company name").scrollIntoViewIfNeeded();
  await insideViewport(page, page.getByLabel("Company name"));
  await insideViewport(page, proceed);
  // The button stays put and never covers the field that has the keyboard focus.
  await page.getByLabel("Events per year (optional)").focus();
  const field = await top(page.getByLabel("Events per year (optional)"));
  const button = await top(proceed);
  expect(field.y + field.height).toBeLessThanOrEqual(button.y);
});

test("a refused submit brings the error into view when the form is scrolled inside the card", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "The desktop sizes are checked in the desktop project.");
  await page.setViewportSize({ width: 1280, height: 540 });
  await openWizard(page);
  const proceed = page.getByRole("button", { name: "Continue", exact: true });
  const alert = page.getByRole("alert").filter({ hasText: "Enter your company name." });
  // Where the alert sits against the visible part of the box that scrolls the form.
  const alertInScrollBox = () =>
    alert.evaluate((node) => {
      let box = node.parentElement!;
      while (getComputedStyle(box).overflowY !== "auto") box = box.parentElement!;
      const visible = box.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      return { inside: rect.top >= visible.top - 0.5 && rect.bottom <= visible.bottom + 0.5, scrolled: box.scrollTop };
    });
  const scrollFormToEnd = () =>
    page.getByLabel("Events per year (optional)").evaluate((node) => {
      let box = node.parentElement!;
      while (getComputedStyle(box).overflowY !== "auto") box = box.parentElement!;
      box.scrollTo({ top: box.scrollHeight, behavior: "instant" });
    });

  // The form answers once the page has hydrated; before that a click would submit it natively.
  await expect(async () => {
    await page.getByLabel("Company name").fill("");
    await scrollFormToEnd();
    await proceed.click();
    await baseExpect(alert).toBeVisible({ timeout: 5_000 });
  }).toPass();
  await expect.poll(async () => (await alertInScrollBox()).inside, { message: "the new error is in view" }).toBe(true);

  // Scrolled away from the error, the same refusal brings it back; the keyboard focus stays on the button.
  await scrollFormToEnd();
  const away = await alertInScrollBox();
  expect(away.inside, "the error is out of view once the form is scrolled down").toBe(false);
  await proceed.click();
  await expect.poll(async () => (await alertInScrollBox()).inside, { message: "the repeated error is back in view" }).toBe(true);
  await expect(proceed).toBeFocused();
  await insideViewport(page, proceed);
  const { scrollHeight, innerHeight } = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight }));
  expect(scrollHeight, "the page itself still does not scroll").toBeLessThanOrEqual(innerHeight + 1);
});

// Fit mode needs height as well as width (the `fit:` variant in globals.css): 520 px. Under that
// the card could not hold the brand panel's text or a step's buttons, so the page scrolls instead.
const FIT_MIN_HEIGHT = 520;

// The brand panel's three blocks (logo, text, copyright), top to bottom: the smallest gap between
// two of them. Negative when they overlap.
const brandPanelGap = (page: Page) =>
  page.getByRole("heading", { name: "Let's set up your workspace." }).evaluate((heading) => {
    const panel = heading.parentElement!.parentElement!;
    const blocks = Array.from(panel.children)
      .map((child) => child.getBoundingClientRect())
      .filter((rect) => rect.height < panel.getBoundingClientRect().height);
    let gap = Number.POSITIVE_INFINITY;
    for (let i = 1; i < blocks.length; i += 1) gap = Math.min(gap, blocks[i].top - blocks[i - 1].bottom);
    return { gap, cutOff: panel.scrollHeight - panel.clientHeight };
  });

test(`the shortest window that fits (1280 × ${FIT_MIN_HEIGHT}) cuts nothing off`, async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "The desktop sizes are checked in the desktop project.");
  await page.setViewportSize({ width: 1280, height: FIT_MIN_HEIGHT });
  await openWizard(page);
  const brand = await brandPanelGap(page);
  console.log(`[onboarding-fit] 1280x${FIT_MIN_HEIGHT} brand panel: smallest gap between its blocks ${brand.gap.toFixed(1)} px, cut off by ${brand.cutOff} px`);
  expect(brand.gap, "the brand panel's blocks do not touch").toBeGreaterThanOrEqual(16);
  expect(brand.cutOff, "the brand panel is not cut off").toBeLessThanOrEqual(0);
  await pageFits(page, page.getByRole("button", { name: "Continue", exact: true }), "company, shortest fit", { innerScrollAllowed: true });
  await saveCompany(page);
  await pageFits(page, page.getByRole("button", { name: "Start free trial" }), "plan, shortest fit", { innerScrollAllowed: true });
  await page.getByRole("button", { name: "Start free trial" }).click();
  await expect(page.getByRole("heading", { name: "Invite your team" })).toBeVisible();
  await pageFits(page, page.getByRole("button", { name: "Send invitations" }), "team, shortest fit", { innerScrollAllowed: true });
  await insideViewport(page, page.getByRole("button", { name: "Skip for now" }));
  // The form still has a usable height left to scroll in.
  const field = await top(page.getByLabel("Email addresses"));
  expect(field.height).toBeGreaterThanOrEqual(44);
});

for (const height of [400, FIT_MIN_HEIGHT - 1]) {
  test(`a wide window too short to fit (1280 × ${height}) scrolls as a page`, async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "The desktop sizes are checked in the desktop project.");
    await page.setViewportSize({ width: 1280, height });
    await openWizard(page);
    const scrollsAsPage = async (step: string) => {
      const measured = await measure(page);
      console.log(`[onboarding-fit] 1280x${height} ${step}: scrollHeight ${measured.scrollHeight} / innerHeight ${measured.innerHeight} (the page scrolls), inner scroll: ${measured.innerScroll.join("; ") || "none"}`);
      expect(measured.scrollHeight, `${step}: the page scrolls down`).toBeGreaterThan(measured.innerHeight);
      expect(measured.scrollWidth, `${step}: the page does not scroll sideways`).toBeLessThanOrEqual(measured.innerWidth);
      expect(measured.innerScroll, `${step}: nothing scrolls inside the card`).toEqual([]);
      const brand = await brandPanelGap(page);
      expect(brand.gap, `${step}: the brand panel's blocks do not touch`).toBeGreaterThanOrEqual(16);
      expect(brand.cutOff, `${step}: the brand panel is not cut off`).toBeLessThanOrEqual(0);
    };
    const reachable = async (button: Locator) => {
      await button.scrollIntoViewIfNeeded();
      await insideViewport(page, button);
    };

    await scrollsAsPage("company");
    await reachable(page.getByLabel("Company name"));
    await reachable(page.getByRole("button", { name: "Continue", exact: true }));
    await saveCompany(page);
    await scrollsAsPage("plan");
    await reachable(page.getByRole("button", { name: "Start free trial" }));
    await page.getByRole("button", { name: "Start free trial" }).click();
    await expect(page.getByRole("heading", { name: "Invite your team" })).toBeVisible();
    await scrollsAsPage("team");
    await reachable(page.getByRole("button", { name: "Send invitations" }));
    await reachable(page.getByRole("button", { name: "Skip for now" }));
    await expectProposalWording(page.locator("body"));
  });
}

test("on a phone the wizard scrolls as a page, in one column", async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), "The phone size is checked in the mobile project.");
  await page.setViewportSize({ width: 375, height: 812 });
  await openWizard(page);
  const sideways = async (step: string) => {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    expect(scrollWidth, `${step}: no sideways scroll`).toBeLessThanOrEqual(innerWidth);
  };
  const reachable = async (button: Locator) => {
    await button.scrollIntoViewIfNeeded();
    await insideViewport(page, button);
    expect((await top(button)).height).toBeGreaterThanOrEqual(44);
  };

  // Company: one column, in order, nothing cut off, every control at least 44 px high.
  await sideways("company");
  const labels = ["Company name", "Organization type", "Industry (optional)", "Country", "Time zone", "Events per year (optional)"];
  let previousBottom = 0;
  for (const label of labels) {
    const field = page.getByLabel(label);
    const box = await top(field);
    expect(box.y, `${label} sits below the field before it`).toBeGreaterThanOrEqual(previousBottom);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    // An input sits inside its bordered box, which is the touch target.
    const target = (await field.evaluate((node) => node.tagName)) === "INPUT" ? field.locator("xpath=..") : field;
    expect((await top(target)).height, `${label} touch target`).toBeGreaterThanOrEqual(44);
    expect(Number.parseFloat(await field.evaluate((node) => getComputedStyle(node).fontSize)), `${label} text size`).toBeGreaterThanOrEqual(15);
    previousBottom = box.y + box.height;
  }
  const page1 = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight }));
  console.log(`[onboarding-fit] 375x812 company: scrollHeight ${page1.scrollHeight} / innerHeight ${page1.innerHeight} (the page scrolls)`);
  await reachable(page.getByRole("button", { name: "Continue", exact: true }));
  await expectProposalWording(page.locator("body"));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("onboarding-company-375x812.png"), fullPage: true });

  await saveCompany(page);
  await sideways("plan");
  await reachable(page.getByRole("button", { name: "Start free trial" }));
  await expectProposalWording(page.locator("body"));

  await page.getByRole("button", { name: "Start free trial" }).click();
  await expect(page.getByRole("heading", { name: "Invite your team" })).toBeVisible();
  await sideways("team");
  await reachable(page.getByRole("button", { name: "Send invitations" }));
  await reachable(page.getByRole("button", { name: "Skip for now" }));
  await expectProposalWording(page.locator("body"));
});

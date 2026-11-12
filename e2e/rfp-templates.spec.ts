import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { expectProposalWording } from "./support/wording";

// ORG-605: RFP templates as each role, against the stub backend
// (e2e/support/proposalTemplatesFixture.mjs), which applies the backend's role, visibility and
// plan-limit rules. `next dev` compiles on demand, so waits are longer than the suite default.
const expect = baseExpect.configure({ timeout: 45_000 });

const STUB = `http://127.0.0.1:${process.env.ASSISTANT_E2E_BACKEND_PORT || 8011}`;
type Role = "owner" | "admin" | "manager" | "planner" | "viewer";
type StubState = {
  templates: Array<{ title: string; scope: string; publishedAt: string | null; archived: boolean }>;
  createdRfps: Array<{ ownerUserId: string; proposal: { _id: string; event: { eventName: string } } }>;
  saveRequests: Array<{ proposalId: string; title: string; scope: string; presentationLayout?: string }>;
};

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  test.setTimeout(300_000);
  await page.request.post(`${STUB}/__e2e/reset`);
  await page.request.post(`${STUB}/__e2e/proposal-deletion`, { data: { seed: true, name: "Annual Leadership Summit" } });
  await page.request.post(`${STUB}/__e2e/proposal-templates`, { data: { reset: true } });
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    if (message.type() === "error") seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
});

const stubState = async (page: Page): Promise<StubState> => (await page.request.get(`${STUB}/__e2e/proposal-templates`)).json();

const signInAs = async (page: Page, role: Role) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`${role}-e2e@example.com`);
  // Email first: the page asks the backend how this address signs in, then shows the password.
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("role-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
  // Only what happens on the screens under test counts.
  problems.get(page)!.length = 0;
};

// Every state: no serious accessibility violations, nothing wider than the screen, the copy says
// "proposal" not "RFP", no console errors, and a screenshot as evidence.
const check = async (page: Page, testInfo: TestInfo, name: string, region: Locator) => {
  await expect(region).toBeVisible();
  const handle = await region.elementHandle();
  const selector = await handle!.evaluate((element) => {
    element.setAttribute("data-e2e-region", "rfp-templates");
    return '[data-e2e-region="rfp-templates"]';
  });
  const accessibility = await new AxeBuilder({ page }).include(selector).withTags(["wcag2a", "wcag2aa"]).analyze();
  await handle!.evaluate((element) => element.removeAttribute("data-e2e-region"));
  expect(
    accessibility.violations
      .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectProposalWording(region);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(problems.get(page)).toEqual([]);
};

const templateSection = (page: Page) => page.getByRole("region", { name: "Proposal templates" });
const row = (page: Page, title: string) => templateSection(page).getByRole("listitem").filter({ hasText: title });

const openSaveDialog = async (page: Page) => {
  await page.goto("/proposals");
  await page.getByRole("button", { name: "Save as template" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Save as template" });
  await expect(dialog.getByLabel("Template name")).toHaveValue("Annual Leadership Summit");
  return dialog;
};

for (const role of ["planner", "manager"] as const) {
  test(`${role}: saves a proposal as a personal template and is not offered the organization`, async ({ page }, testInfo) => {
    await signInAs(page, role);
    const dialog = await openSaveDialog(page);
    await expect(dialog.getByRole("radio")).toHaveCount(0);
    await expect(dialog.getByText("Saved as a personal template that only you see.")).toBeVisible();
    await expect(dialog.getByText("Vendors, responses, dates, contacts and uploaded files are not copied.")).toBeVisible();
    await check(page, testInfo, `${role}-save-dialog`, dialog);
    await dialog.getByLabel("Template name").fill("Leadership summit starter");
    await dialog.getByLabel("Presentation layout (optional)").selectOption({ label: "Classic" });
    await dialog.getByRole("button", { name: "Save template" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Leadership summit starter saved to your templates.")).toBeVisible();

    const { saveRequests } = await stubState(page);
    expect(saveRequests).toHaveLength(1);
    expect(saveRequests[0]).toMatchObject({ title: "Leadership summit starter", scope: "personal", presentationLayout: "template-two" });

    await page.goto("/settings/templates");
    const saved = row(page, "Leadership summit starter");
    await expect(saved.getByText("Personal", { exact: true })).toBeVisible();
    await expect(saved.getByText("Classic layout")).toBeVisible();
    await expect(saved.getByRole("button", { name: /^Share / })).toHaveCount(0);
  });
}

for (const role of ["owner", "admin"] as const) {
  test(`${role}: saves a proposal as an organization template`, async ({ page }, testInfo) => {
    await signInAs(page, role);
    const dialog = await openSaveDialog(page);
    await expect(dialog.getByRole("radio", { name: /Only me/ })).toBeChecked();
    await dialog.getByRole("radio", { name: /Everyone in my organization/ }).check();
    await dialog.getByLabel("Template name").fill("Leadership summit standard");
    await check(page, testInfo, `${role}-save-dialog`, dialog);
    await dialog.getByRole("button", { name: "Save template" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Leadership summit standard saved and shared with your organization.")).toBeVisible();

    const { saveRequests } = await stubState(page);
    expect(saveRequests[0]).toMatchObject({ title: "Leadership summit standard", scope: "organization" });

    await page.goto("/settings/templates");
    const saved = row(page, "Leadership summit standard");
    await expect(saved.getByText("Organization", { exact: true })).toBeVisible();
    await expect(saved.getByText("Published", { exact: true })).toBeVisible();
  });
}

test("planner: starts a proposal from a template, and sees only templates that are theirs to use", async ({ page }, testInfo) => {
  await signInAs(page, "planner");
  await page.goto("/proposals/add-new-proposal");
  await page.getByRole("button", { name: "Start from a template" }).click();
  const picker = page.getByRole("dialog", { name: "Start from a template" });
  await expect(picker.getByRole("radio", { name: /Annual kickoff/ })).toBeVisible();
  await expect(picker.getByRole("radio", { name: /My roadshow/ })).toBeVisible();
  // Someone else's personal template, an unpublished or archived organization template: never listed.
  for (const hidden of ["Peter's private template", "Owner's own checklist", "Draft gala", "Old expo booth"]) {
    await expect(picker.getByText(hidden)).toHaveCount(0);
  }
  await expect(picker.getByRole("button", { name: "Create proposal" })).toBeDisabled();
  await picker.getByRole("radio", { name: /Annual kickoff/ }).check();
  await picker.getByLabel("Event name (optional)").fill("Spring Partner Summit");
  await check(page, testInfo, "planner-template-picker", picker);
  await picker.getByRole("button", { name: "Create proposal" }).click();
  await expect(page).toHaveURL(/\/proposals\/proposal-edit\?proposalId=[a-f0-9]{24}$/, { timeout: 60_000 });

  const { createdRfps } = await stubState(page);
  expect(createdRfps).toHaveLength(1);
  expect(createdRfps[0].ownerUserId).toBe("4".repeat(24));
  expect(createdRfps[0].proposal.event.eventName).toBe("Spring Partner Summit");
  expect(page.url()).toContain(createdRfps[0].proposal._id);
});

test("planner: at the plan limit, starting from a template shows the upgrade prompt instead of an error", async ({ page }, testInfo) => {
  await page.request.post(`${STUB}/__e2e/proposal-templates`, { data: { planLimit: true } });
  await signInAs(page, "planner");
  await page.goto("/proposals/add-new-proposal");
  await page.getByRole("button", { name: "Start from a template" }).click();
  const picker = page.getByRole("dialog", { name: "Start from a template" });
  await picker.getByRole("radio", { name: /My roadshow/ }).check();
  // The browser logs the refused request itself; only what the page does with it counts here.
  problems.get(page)!.length = 0;
  await picker.getByRole("button", { name: "Create proposal" }).click();
  const limit = picker.getByRole("status");
  await expect(limit).toContainText("You've reached your plan's proposal limit");
  await expect(limit).toContainText("Your organization has created 2 of the 2 proposals its plan includes.");
  await expect(limit.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/support");
  await expect(picker.getByRole("alert")).toHaveCount(0);
  await expect(picker.getByRole("button", { name: "Create proposal" })).toHaveCount(0);
  await check(page, testInfo, "planner-template-plan-limit", picker);
  await expect(page).toHaveURL(/\/proposals\/add-new-proposal$/);
  expect((await stubState(page)).createdRfps).toHaveLength(0);
});

for (const role of ["owner", "admin"] as const) {
  test(`${role}: publishes, unpublishes, archives and restores organization templates under Settings`, async ({ page }, testInfo) => {
    await signInAs(page, role);
    await page.goto("/settings/templates");
    const section = templateSection(page);
    await expect(page.getByRole("link", { name: "Templates" })).toHaveAttribute("aria-current", "page");
    await expect(row(page, "Annual kickoff").getByText("Published", { exact: true })).toBeVisible();
    await expect(row(page, "Draft gala").getByText("Not published", { exact: true })).toBeVisible();
    // Another member's personal templates are never listed, whatever the role.
    await expect(section.getByText("Peter's private template")).toHaveCount(0);
    await expect(section.getByText("My roadshow")).toHaveCount(0);
    await expect(section.getByText("Owner's own checklist")).toHaveCount(role === "owner" ? 1 : 0);
    await check(page, testInfo, `${role}-template-list`, section);

    await section.getByRole("button", { name: "Unpublish Annual kickoff" }).click();
    await expect(row(page, "Annual kickoff").getByText("Not published", { exact: true })).toBeVisible();
    await section.getByRole("button", { name: "Publish Draft gala" }).click();
    await expect(row(page, "Draft gala").getByText("Published", { exact: true })).toBeVisible();

    await section.getByRole("button", { name: "Archive Draft gala" }).click();
    const archive = page.getByRole("dialog", { name: "Archive Draft gala?" });
    await check(page, testInfo, `${role}-archive-dialog`, archive);
    await archive.getByRole("button", { name: "Archive template" }).click();
    await expect(archive).toBeHidden();
    await expect(section.getByText("Draft gala")).toHaveCount(0);

    await section.getByRole("button", { name: "Archived", exact: true }).click();
    await expect(row(page, "Old expo booth")).toBeVisible();
    await section.getByRole("button", { name: "Restore Draft gala" }).click();
    await expect(section.getByText("Draft gala")).toHaveCount(0);
    await section.getByRole("button", { name: "Active", exact: true }).click();
    // Archiving unpublished it: a restored template waits for someone to publish it again.
    await expect(row(page, "Draft gala").getByText("Not published", { exact: true })).toBeVisible();

    const { templates } = await stubState(page);
    expect(templates.find((item) => item.title === "Annual kickoff")).toMatchObject({ publishedAt: null, archived: false });
    expect(templates.find((item) => item.title === "Draft gala")).toMatchObject({ publishedAt: null, archived: false });
    expect(problems.get(page)).toEqual([]);
  });
}

test("owner: shares a personal template with the organization after confirming", async ({ page }) => {
  await signInAs(page, "owner");
  await page.goto("/settings/templates");
  await templateSection(page).getByRole("button", { name: "Share Owner's own checklist with the organization" }).click();
  const confirm = page.getByRole("dialog", { name: "Share Owner's own checklist with your organization?" });
  await confirm.getByRole("button", { name: "Share template" }).click();
  await expect(row(page, "Owner's own checklist").getByText("Published", { exact: true })).toBeVisible();
  await expect(row(page, "Owner's own checklist").getByText("Organization", { exact: true })).toBeVisible();
});

test("planner: sees published organization templates read-only and manages their own", async ({ page }, testInfo) => {
  await signInAs(page, "planner");
  await page.goto("/settings/templates");
  const section = templateSection(page);
  await expect(row(page, "Annual kickoff")).toBeVisible();
  await expect(row(page, "My roadshow")).toBeVisible();
  for (const hidden of ["Peter's private template", "Owner's own checklist", "Draft gala"]) {
    await expect(section.getByText(hidden)).toHaveCount(0);
  }
  for (const name of ["Unpublish Annual kickoff", "Archive Annual kickoff", "Edit Annual kickoff", "Share My roadshow with the organization"]) {
    await expect(section.getByRole("button", { name })).toHaveCount(0);
  }
  await expect(section.getByText("Only Owners and Admins can publish, unpublish or archive organization templates.")).toBeVisible();
  await check(page, testInfo, "planner-template-list", section);

  await section.getByRole("button", { name: "Edit My roadshow" }).click();
  const edit = page.getByRole("dialog", { name: "Edit template details" });
  await edit.getByLabel("Template name").fill("Regional roadshow");
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(edit).toBeHidden();
  await expect(row(page, "Regional roadshow")).toBeVisible();
  // The Archived view holds only what this member may see: not the organization's archive.
  await section.getByRole("button", { name: "Archived", exact: true }).click();
  await expect(section.getByText("No archived templates")).toBeVisible();
  await expect(section.getByText("Old expo booth")).toHaveCount(0);
});

test("viewer: is offered no templates anywhere", async ({ page }) => {
  await signInAs(page, "viewer");
  await page.goto("/proposals");
  await expect(page.getByRole("button", { name: "Save a copy" }).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Save as template" })).toHaveCount(0);

  await page.goto("/proposals/add-new-proposal");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Start from a template" })).toHaveCount(0);

  await page.goto("/settings");
  await expect(page.getByRole("link", { name: "Security" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("link", { name: "Templates" })).toHaveCount(0);

  const response = await page.goto("/settings/templates");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("region", { name: "Proposal templates" })).toHaveCount(0);
});

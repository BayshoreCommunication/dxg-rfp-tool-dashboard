import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

// ORG-607: the organization vendor list under Settings, and picking vendors when sending an RFP,
// as each role, against the stub backend (e2e/support/vendorListFixture.mjs), which applies the
// backend's role rules. `next dev` compiles on demand, so waits are longer than the suite default.
const expect = baseExpect.configure({ timeout: 45_000 });

const STUB = "http://127.0.0.1:8011";
type Role = "owner" | "admin" | "manager" | "planner" | "viewer";

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  test.setTimeout(300_000);
  await page.request.post(`${STUB}/__e2e/reset`);
  await page.request.post(`${STUB}/__e2e/vendor-list`, { data: { reset: true } });
  const seen: string[] = [];
  problems.set(page, seen);
  page.on("console", (message) => {
    if (message.type() === "error") seen.push(message.text());
  });
  page.on("pageerror", (error) => seen.push(String(error)));
});

const signInAs = async (page: Page, role: Role) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("name@company.com").fill(`vendor-list-${role}@example.com`);
  // Email first: the page asks the backend how this address signs in, then shows the password.
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="password"]').fill("vendor-list-e2e-password");
  await page.getByRole("button", { name: "Sign In to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
  // Only what happens on the screens under test counts.
  problems.get(page)!.length = 0;
};

// Every state: no serious accessibility violations, nothing wider than the screen, the copy says
// "RFP", no console errors, and a screenshot as evidence.
const check = async (page: Page, testInfo: TestInfo, name: string, region: Locator) => {
  await expect(region).toBeVisible();
  const handle = await region.elementHandle();
  const selector = await handle!.evaluate((element) => {
    element.setAttribute("data-e2e-region", "vendor-list");
    return '[data-e2e-region="vendor-list"]';
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
  expect(await region.textContent()).not.toMatch(/proposal/i);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(problems.get(page)).toEqual([]);
};

const vendorSection = (page: Page) => page.getByRole("region", { name: "Vendor list" });

for (const role of ["owner", "admin", "manager"] as const) {
  test(`${role}: adds, edits, archives and restores vendors`, async ({ page }, testInfo) => {
    await signInAs(page, role);
    await page.goto("/settings/vendors");
    const section = vendorSection(page);
    await expect(section.getByText("Brightline AV")).toBeVisible();
    await expect(page.getByRole("link", { name: "Vendors" })).toHaveAttribute("aria-current", "page");
    await expect(section.getByText("3 vendors", { exact: true })).toBeVisible();
    await check(page, testInfo, `${role}-list`, section);

    // Add, with pasted contacts.
    await section.getByRole("button", { name: "Add vendor" }).click();
    const add = page.getByRole("dialog", { name: "Add vendor" });
    await add.getByLabel("Company").fill("Northlight Rigging");
    await add.getByLabel(/Category/).fill("Rigging");
    await add.getByRole("button", { name: "Paste contacts" }).click();
    await add.getByLabel("Paste a list of contacts").fill("Ravi Shah <ravi@northlight.example>\nNoor Ali, noor@northlight.example\nno address on this line");
    await add.getByRole("button", { name: "Add pasted contacts" }).click();
    await expect(add.getByRole("status")).toContainText("Added 2 contacts. Skipped 1 line without a valid email address.");
    await check(page, testInfo, `${role}-add-dialog`, add);
    await add.getByRole("button", { name: "Add vendor" }).click();
    await expect(add).toBeHidden();
    await expect(section.getByText("Northlight Rigging")).toBeVisible();
    await expect(section.getByText("noor@northlight.example")).toBeVisible();
    await expect(section.getByText("4 vendors", { exact: true })).toBeVisible();

    // A company already on the list is refused in plain words.
    await section.getByRole("button", { name: "Add vendor" }).click();
    await add.getByLabel("Company").fill("brightline av");
    await add.getByRole("button", { name: "Add vendor" }).click();
    await expect(add.getByRole("alert")).toContainText("A vendor with this company name is already on the list.");
    await add.getByRole("button", { name: "Cancel" }).click();

    // Edit.
    await section.getByRole("button", { name: "Edit Northlight Rigging" }).click();
    const edit = page.getByRole("dialog", { name: "Edit Northlight Rigging" });
    await edit.getByLabel("Company").fill("Northlight Rigging Co");
    await edit.getByRole("button", { name: "Remove contact 2" }).click();
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(edit).toBeHidden();
    await expect(section.getByText("Northlight Rigging Co")).toBeVisible();
    await expect(section.getByText("noor@northlight.example")).toBeHidden();

    // Search and category filter.
    await section.getByRole("searchbox", { name: "Search vendors" }).fill("stag");
    await expect(section.getByText("Harbor Stage Systems")).toBeVisible();
    await expect(section.getByText("Brightline AV")).toBeHidden();
    await section.getByRole("searchbox", { name: "Search vendors" }).fill("");
    await section.getByRole("combobox", { name: "Filter by category" }).selectOption("Lighting");
    await expect(section.getByText("Brightline AV")).toBeVisible();
    await expect(section.getByText("Harbor Stage Systems")).toBeHidden();
    await section.getByRole("combobox", { name: "Filter by category" }).selectOption("");

    // Archive, then restore from the archived view.
    await section.getByRole("button", { name: "Archive Brightline AV" }).click();
    const archive = page.getByRole("dialog", { name: "Archive Brightline AV?" });
    await check(page, testInfo, `${role}-archive-dialog`, archive);
    await archive.getByRole("button", { name: "Archive vendor" }).click();
    await expect(archive).toBeHidden();
    await expect(section.getByText("Brightline AV")).toBeHidden();
    await section.getByRole("button", { name: "Archived" }).click();
    await expect(section.getByText("Old Stage Rentals")).toBeVisible();
    await check(page, testInfo, `${role}-archived`, section);
    await section.getByRole("button", { name: "Restore Brightline AV" }).click();
    await expect(section.getByText("Brightline AV")).toBeHidden();
    await section.getByRole("button", { name: "Active" }).click();
    await expect(section.getByText("Brightline AV")).toBeVisible();
    expect(problems.get(page)).toEqual([]);
  });
}

test("owner: an empty list offers the first vendor", async ({ page }, testInfo) => {
  await page.request.post(`${STUB}/__e2e/vendor-list`, { data: { empty: true } });
  await signInAs(page, "owner");
  await page.goto("/settings/vendors");
  const section = vendorSection(page);
  await expect(section.getByText("No vendors yet")).toBeVisible();
  await expect(section.getByRole("button", { name: "Add vendor" })).toHaveCount(2);
  await check(page, testInfo, "owner-empty", section);
});

test("planner: reads and searches the list but cannot change it", async ({ page }, testInfo) => {
  await signInAs(page, "planner");
  await page.goto("/settings/vendors");
  const section = vendorSection(page);
  await expect(section.getByText("Harbor Stage Systems")).toBeVisible();
  await expect(section.getByRole("button", { name: "Add vendor" })).toHaveCount(0);
  await expect(section.getByRole("button", { name: /^(Edit|Archive|Restore) / })).toHaveCount(0);
  await expect(section.getByRole("button", { name: "Archived" })).toHaveCount(0);
  await expect(section.getByText("Only Owners, Admins and Team Managers can add, edit or archive vendors.")).toBeVisible();
  // More than three contacts are folded away until asked for.
  await expect(section.getByText("lou@harborstage.example")).toBeHidden();
  await section.getByRole("button", { name: "Show 1 more contacts for Harbor Stage Systems" }).click();
  await expect(section.getByText("lou@harborstage.example")).toBeVisible();
  await section.getByRole("searchbox", { name: "Search vendors" }).fill("audio");
  await expect(section.getByText("Soundstage Collective")).toBeVisible();
  await expect(section.getByText("Harbor Stage Systems")).toBeHidden();
  await check(page, testInfo, "planner-list", section);
});

test("viewer: the vendor list does not exist", async ({ page }, testInfo) => {
  await signInAs(page, "viewer");
  await page.goto("/settings");
  await expect(page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Security" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vendors" })).toHaveCount(0);
  const response = await page.goto("/settings/vendors");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Vendor list" })).toHaveCount(0);
  await expect(page.getByText("Brightline AV")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("viewer-not-found.png"), fullPage: true });

  // Nothing to pick from when sending either.
  await page.request.post(`${STUB}/__e2e/proposal-deletion`, { data: { seed: true, name: "QA ONLY RFP" } });
  await page.goto("/email/send-email");
  await expect(page.getByRole("button", { name: "Send Campaign" })).toBeEnabled();
  await expect(page.getByText("Pick from your vendor list")).toHaveCount(0);
});

test("owner: picks vendors when sending and saves a new one to the list", async ({ page }, testInfo) => {
  await page.request.post(`${STUB}/__e2e/proposal-deletion`, { data: { seed: true, name: "QA ONLY RFP" } });
  await signInAs(page, "owner");
  await page.goto("/email/send-email");
  const picker = page.getByRole("region", { name: "Pick from your vendor list" });
  await expect(picker.getByRole("checkbox", { name: "Brightline AV: all contacts" })).toBeVisible();
  // Archived vendors are not offered; a vendor without contacts cannot be ticked.
  await expect(picker.getByText("Old Stage Rentals")).toHaveCount(0);
  await expect(picker.getByRole("checkbox", { name: "Soundstage Collective: all contacts" })).toBeDisabled();

  await picker.getByRole("checkbox", { name: "Brightline AV: all contacts" }).check();
  await picker.getByRole("checkbox", { name: /Sam Lee/ }).check();
  await expect(page.getByRole("button", { name: "Remove jane@brightline.example" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove sam@harborstage.example" })).toBeVisible();

  // A typed address that is not on the list can be saved as a new vendor.
  const recipients = page.getByRole("textbox", { name: "Add recipient email addresses" });
  await recipients.fill("crew@northlight.example");
  await recipients.press("Enter");
  await expect(picker.getByText("crew@northlight.example isn't on your vendor list.")).toBeVisible();
  await check(page, testInfo, "owner-send-picker", picker);
  await picker.getByRole("button", { name: "Save new vendor to the list" }).click();
  const save = page.getByRole("dialog", { name: "Add vendor" });
  await expect(save.getByLabel("Contact 1 email")).toHaveValue("crew@northlight.example");

  // The company is already there: offer to add the contact to it.
  await save.getByLabel("Company").fill("Harbor Stage Systems");
  await save.getByRole("button", { name: "Add vendor" }).click();
  await expect(save.getByText("is already on your vendor list. Add this contact to it instead?")).toBeVisible();
  await check(page, testInfo, "owner-send-company-taken", save);
  await save.getByRole("button", { name: "Add to Harbor Stage Systems" }).click();
  await expect(save).toBeHidden();
  await expect(picker.getByRole("button", { name: "Save new vendor to the list" })).toHaveCount(0);
  await expect(picker.getByRole("checkbox", { name: "crew@northlight.example" })).toBeChecked();

  // A second new address becomes a new vendor.
  await recipients.fill("bids@polestar.example");
  await recipients.press("Enter");
  await picker.getByRole("button", { name: "Save new vendor to the list" }).click();
  await save.getByLabel("Company").fill("Polestar Video");
  await save.getByRole("button", { name: "Add vendor" }).click();
  await expect(save).toBeHidden();
  await expect(picker.getByRole("checkbox", { name: "Polestar Video: all contacts" })).toBeChecked();

  await page.getByRole("checkbox", { name: /I reviewed the recipients/ }).check();
  await page.getByRole("button", { name: "Send Campaign" }).click();
  await expect(page).toHaveURL(/\/email$/);
  const { sentEmails, vendors } = await (await page.request.get(`${STUB}/__e2e/vendor-list`)).json();
  expect(sentEmails).toHaveLength(1);
  expect(sentEmails[0].recipientEmails).toEqual([
    "jane@brightline.example", "bids@brightline.example", "sam@harborstage.example", "crew@northlight.example", "bids@polestar.example",
  ]);
  expect(vendors.find((vendor: { company: string }) => vendor.company === "Harbor Stage Systems").contacts).toHaveLength(5);
  expect(vendors.some((vendor: { company: string }) => vendor.company === "Polestar Video")).toBe(true);
});

test("planner: picks from the list when sending but is not offered to save", async ({ page }, testInfo) => {
  await page.request.post(`${STUB}/__e2e/proposal-deletion`, { data: { seed: true, name: "QA ONLY RFP" } });
  await signInAs(page, "planner");
  await page.goto("/email/send-email");
  const picker = page.getByRole("region", { name: "Pick from your vendor list" });
  await picker.getByRole("searchbox", { name: "Search your vendor list" }).fill("light");
  await expect(picker.getByText("Harbor Stage Systems")).toBeHidden();
  await picker.getByRole("checkbox", { name: /Jane Doe/ }).check();
  await expect(page.getByRole("button", { name: "Remove jane@brightline.example" })).toBeVisible();
  const recipients = page.getByRole("textbox", { name: "Add recipient email addresses" });
  await recipients.fill("crew@northlight.example");
  await recipients.press("Enter");
  await expect(page.getByRole("button", { name: "Remove crew@northlight.example" })).toBeVisible();
  await expect(picker.getByRole("button", { name: "Save new vendor to the list" })).toHaveCount(0);
  await check(page, testInfo, "planner-send-picker", picker);
});

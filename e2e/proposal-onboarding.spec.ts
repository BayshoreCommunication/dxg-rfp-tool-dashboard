import { expect, test } from '@playwright/test';
const fixture = 'http://127.0.0.1:8011/__e2e/onboarding';

test.beforeEach(async ({ page }) => {
  await page.request.post(fixture, { data: { reset: true } });
  await page.goto('/sign-in');
  await page.getByPlaceholder('name@company.com').fill('assistant-e2e@example.com');
  await page.locator('input[type="password"]').fill('assistant-e2e-password');
  await page.getByRole('button', { name: 'Sign In to Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/proposals/cccccccccccccccccccccccc/assistant');
  await expect(page.getByLabel('Message the proposal assistant')).toBeVisible();
});

test('brief upload → one progress card → extraction failure → retry → meaningful result and next missing question', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('input[type="file"]').setInputFiles({ name: 'Northstar-brief.txt', mimeType: 'text/plain', buffer: Buffer.from('Northstar Leadership Summit. September 14–16, 2027. 450 attendees. Venue undecided.') });
  await page.getByRole('button', { name: 'Send message' }).click();
  const progress = page.getByRole('status', { name: 'Attachment progress' });
  await expect(progress).toContainText('Checking your file');
  await expect(progress).toHaveCount(1);
  await expect(page.getByText('Guided question 1', { exact: true })).toBeHidden();
  await expect(page.getByText(/I’ve received your brief/)).toBeVisible();
  await expect(page.getByText(/current saved event name is still/)).toHaveCount(0);
  await page.request.post(fixture, { data: { scan: 'ready' } });
  await expect(progress).toContainText('Reading your brief', { timeout: 15_000 });
  await expect(page.getByText('Extracting requirements from the attached files.', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('reading-brief.png') });
  await expect.poll(async () => (await (await page.request.get(fixture)).json()).requests.filter((item: { intent: string }) => item.intent === 'extract_requirements').length).toBe(1);
  await page.request.post(fixture, { data: { outcome: 'failed' } });
  await expect(page.getByRole('button', { name: 'Retry extraction' })).toBeVisible();
  await expect(progress).toHaveCount(0);
  await expect(page.getByText('Guided question 1', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Retry extraction' }).click();
  await expect(progress).toHaveCount(1);
  await expect.poll(async () => (await (await page.request.get(fixture)).json()).requests.filter((item: { intent: string }) => item.intent === 'extract_requirements').length).toBe(2);
  await page.request.post(fixture, { data: { outcome: 'complete' } });
  await expect(page.getByText(/I found Northstar Leadership Summit/)).toBeVisible();
  await expect(page.getByText('Guided question 1', { exact: true })).toBeVisible();
  await expect(page.getByText('What is this event called?', { exact: true })).toHaveCount(0);
  await expect(progress).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry extraction' })).toHaveCount(0);
  const state = await (await page.request.get(fixture)).json();
  expect(state.uploadCount).toBe(1);
  expect(state.requests.filter((item: { intent: string }) => item.intent === 'extract_requirements')).toHaveLength(2);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('brief-reviewed.png') });
});

test('scan failure survives reload and only explicit continue reveals the manual questions', async ({ page }, testInfo) => {
  await page.request.post(fixture, { data: { scan: 'failed' } });
  await page.locator('input[type="file"]').setInputFiles({ name: 'unreadable-brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('Synthetic failed scan fixture') });
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText(/unreadable-brief.pdf couldn’t be processed/)).toBeVisible();
  await expect(page.getByText('Guided question 1', { exact: true })).toBeHidden();
  await page.reload();
  await expect(page.getByText(/unreadable-brief.pdf couldn’t be processed/)).toBeVisible();
  await expect(page.getByText('Loading the conversation…', { exact: true })).toBeHidden();
  await expect(page.getByText(/I’ve received your brief/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry file check' })).toBeVisible();
  await expect(page.getByText('Guided question 1', { exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('file-recovery.png') });
  await page.getByRole('button', { name: 'Continue without these files' }).click();
  await expect(page.getByText('Guided question 1', { exact: true })).toBeVisible();
  const state = await (await page.request.get(fixture)).json();
  expect(state.requests.filter((item: { intent: string }) => item.intent === 'extract_requirements')).toHaveLength(0);
});

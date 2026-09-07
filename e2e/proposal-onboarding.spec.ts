import { expect, test, type Locator } from '@playwright/test';
const fixture = 'http://127.0.0.1:8011/__e2e/onboarding';

async function expectReadableSelection(option: Locator, background: string) {
  await expect(option).toHaveCSS('background-color', background);
  await expect(option).toHaveCSS('color', 'rgb(255, 255, 255)');
  const contrast = await option.evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      const [red, green, blue] = color.match(/[\d.]+/g)!.slice(0, 3).map(value => {
        const channel = Number(value) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return red * 0.2126 + green * 0.7152 + blue * 0.0722;
    };
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
}

test.beforeEach(async ({ page }) => {
  await page.request.post(fixture, { data: { reset: true } });
  await page.goto('/sign-in');
  await page.getByPlaceholder('name@company.com').fill('assistant-e2e@example.com');
  await page.locator('input[type="password"]').fill('assistant-e2e-password');
  await page.getByRole('button', { name: 'Sign In to Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/proposals/cccccccccccccccccccccccc/assistant');
  await expect(page.getByLabel('Message the proposal assistant')).toBeVisible();
  await expect(page.getByRole('link', {name:'Open RFP questions', exact:true})).toHaveCount(0);
});

test('new proposal first attachment uses one compact timed loader and never flashes a guided question', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.request.post(fixture, { data: { delays: { create: 500, upload: 1500, chat: 1200 } } });
  await page.goto('/proposals/add-new-proposal');
  await expect(page.getByText('Let’s build your event RFP', {exact:true})).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: 'first-brief.txt', mimeType: 'text/plain', buffer: Buffer.from('Northstar Leadership Summit, September 14–16, 2027.') });
  await page.evaluate(() => {
    const observed: string[] = [];
    const orderErrors: string[] = [];
    Object.assign(window, { prematureQuestions: observed, attachmentOrderErrors: orderErrors });
    new MutationObserver(() => {
      const thread = document.querySelector('[data-testid="proposal-conversation-scroll"]');
      const progress = thread?.querySelector('[aria-label="Attachment progress"]');
      if (progress) {
        const paragraphs = [...thread!.querySelectorAll('p, [data-testid="attachment-acknowledgement"]')];
        const user = paragraphs.find(node => node.textContent === 'Please review the attached file.');
        const ack = paragraphs.find(node => /^(I’ll upload your brief|I’ve received your brief)/.test(node.textContent ?? ''));
        if (!user || !ack || !(user.compareDocumentPosition(ack) & Node.DOCUMENT_POSITION_FOLLOWING) || !(ack.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING)) orderErrors.push(thread!.textContent ?? '');
      }
      const question = [...document.querySelectorAll('p')].find(node => /^Guided question \d+$/.test(node.textContent ?? '') && node.getClientRects().length > 0);
      const emptyWelcome = [...document.querySelectorAll('li')].some(node => node.textContent?.startsWith('Share a few event details or attach a brief below.') && node.getClientRects().length > 0);
      if (question || emptyWelcome) observed.push(document.querySelector('main')?.textContent ?? '');
    }).observe(document.body, { childList: true, subtree: true, attributes: true });
  });
  await page.getByRole('button', {name:'Send message', exact:true}).click();
  await expect(page.getByText('Please review the attached file.', {exact:true})).toBeVisible();
  await expect(page.getByTestId('attachment-acknowledgement')).toBeVisible();
  const attachmentProgress = page.getByRole('status', {name:'Attachment progress'});
  await expect(attachmentProgress).toContainText('Uploading your brief');
  await expect(attachmentProgress.locator('[data-attachment-loader-pixel]')).toHaveCount(9);
  await expect(attachmentProgress).toContainText(/\d+\.\d+s/);
  const compactLoader = await attachmentProgress.boundingBox();
  expect(compactLoader?.height).toBeLessThanOrEqual(48);
  expect(compactLoader?.width).toBeLessThanOrEqual(280);
  await page.screenshot({path:testInfo.outputPath('attachment-pixel-loader.png')});
  await expect(page).toHaveURL(/\/proposals\/cccccccccccccccccccccccc\/assistant$/, {timeout:30_000});
  await expect(page.getByRole('status', {name:'Attachment progress'})).toContainText('Checking your file', { timeout: 20_000 });
  expect(await page.evaluate(() => (window as unknown as {prematureQuestions:string[]}).prematureQuestions)).toEqual([]);
  await expect(page.getByText('Guided question 1', {exact:true})).toBeHidden();
  await page.request.post(fixture, { data: { scan: 'ready' } });
  await expect(page.getByRole('status', {name:'Attachment progress'})).toContainText('Reading your brief', {timeout:30_000});
  expect(await page.evaluate(() => (window as unknown as {prematureQuestions:string[]}).prematureQuestions)).toEqual([]);
  await expect.poll(async () => (await (await page.request.get(fixture)).json()).requests.filter((item: {intent:string}) => item.intent === 'extract_requirements').length).toBe(1);
  await expect.poll(async () => (await (await page.request.get(fixture)).json()).messages.some((item: {runType:string;status:string}) => item.runType === 'proposal_context' && item.status === 'pending')).toBe(true);
  await page.request.post(fixture, { data: { outcome:'complete' } });
  await expect(page.getByText(/I found Northstar Leadership Summit/)).toBeVisible();
  await expect(page.getByText('I’ve pulled out the key details from your brief. Let’s confirm them and fill in anything missing, one question at a time.', {exact:true})).toBeVisible();
  await expect(page.getByRole('link', {name:/Review & apply|View details|Open RFP questions/})).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as {attachmentOrderErrors:string[]}).attachmentOrderErrors)).toEqual([]);
  const steps = await page.getByTestId('proposal-conversation-scroll').innerText();
  expect(steps.indexOf('Please review the attached file.')).toBeLessThan(steps.indexOf('I’ve received your brief'));
  expect(steps.indexOf('I’ve received your brief')).toBeLessThan(steps.indexOf('I found Northstar'));
  expect(steps.indexOf('I found Northstar')).toBeLessThan(steps.indexOf('GUIDED QUESTION'));
  await expect(page.getByText('What is this event called?', {exact:true})).toHaveCount(0);
  const state = await (await page.request.get(fixture)).json();
  expect(state.uploadCount).toBe(1);
  expect(state.requests.filter((request: {intent:string}) => request.intent === 'chat')).toHaveLength(1);
  expect(state.requests.filter((request: {intent:string}) => request.intent === 'extract_requirements')).toHaveLength(1);
});

test('a new empty conversation does not ask field-gap questions before the first contribution', async ({page}) => {
  await expect(page.getByText('Share a few event details or attach a brief below.', {exact:false})).toBeVisible();
  await expect(page.getByText('What is this event called?', {exact:true})).toHaveCount(0);
  await expect(page.getByText('Guided question 1', {exact:true})).toHaveCount(0);
});

test('shared date picker selections stay readable on hover and keyboard focus', async ({page}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const year = new Date().getFullYear() + 1;
  await page.request.post(fixture, {data: {questions: [{
    id: 'q-start-date', code: 'field:startDate', severity: 'question',
    paths: ['/content/event/startDate'], prompt: 'When does the event start?',
    status: 'open', impact: 'schedule', answerType: 'date', options: [],
    suggestedAnswer: `${year}-11-16`,
  }]}});
  await page.reload();
  const input = page.getByLabel('Answer this question', {exact:true});
  await expect(input).toHaveValue(`11/16/${year}`);
  await page.getByRole('button', {name:'Open Select Date calendar'}).click();
  const selected = page.locator('.dxg-datepicker .react-datepicker__day--selected');
  await selected.hover();
  await expectReadableSelection(selected, 'rgb(6, 101, 117)');
  await page.screenshot({path:testInfo.outputPath('selected-date-hover.png')});
  await selected.press('ArrowRight');
  const keyboardDay = page.locator('.dxg-datepicker .react-datepicker__day--keyboard-selected');
  await expectReadableSelection(keyboardDay, 'rgb(6, 101, 117)');
  // Keyboard browsing must not commit a new value until the user chooses it.
  await expect(input).toHaveValue(`11/16/${year}`);
  await page.getByRole('button', {name:/November .*choose year/}).click();
  const selectedYear = page.getByRole('button', {name:`Choose year ${year}`, exact:true});
  await selectedYear.hover();
  await expectReadableSelection(selectedYear, 'rgb(6, 101, 117)');
  await selectedYear.press('Escape');
  await input.press('Escape');

  // Exercise state combinations against the actual loaded app + vendor CSS.
  // This DOM-only local fixture also covers the shared date-time/time wrappers.
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'calendar-style-fixture';
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:white;overflow:auto;padding:16px';
    host.innerHTML = `<div class="dxg-datepicker dxg-datepicker--with-time"><div class="react-datepicker__month-container">
      <div tabindex="0" data-case="selected" class="react-datepicker__day react-datepicker__day--selected">16</div>
      <div tabindex="0" data-case="keyboard" class="react-datepicker__day react-datepicker__day--keyboard-selected">17</div>
      <div tabindex="0" data-case="today-keyboard" class="react-datepicker__day react-datepicker__day--today react-datepicker__day--keyboard-selected">7</div>
      <div tabindex="0" data-case="outside-selected" class="react-datepicker__day react-datepicker__day--outside-month react-datepicker__day--selected">30</div>
      <div tabindex="0" data-case="disabled-selected" class="react-datepicker__day react-datepicker__day--disabled react-datepicker__day--selected">1</div>
      <div tabindex="0" data-case="disabled-keyboard" class="react-datepicker__day react-datepicker__day--disabled react-datepicker__day--keyboard-selected">2</div>
    </div></div>
    <div class="dxg-datepicker dxg-timepicker"><div class="react-datepicker__time-container"><div class="react-datepicker__time"><div class="react-datepicker__time-box"><ul class="react-datepicker__time-list">
      <li tabindex="0" data-case="time" class="react-datepicker__time-list-item react-datepicker__time-list-item--selected">10:00 AM</li>
    </ul></div></div></div></div>`;
    document.body.append(host);
  });
  for (const name of ['selected', 'keyboard', 'today-keyboard', 'outside-selected', 'time']) {
    const option = page.locator(`[data-case="${name}"]`);
    await page.mouse.move(0, 0);
    // Blur the previous option so this assertion covers the resting state.
    await page.locator('#calendar-style-fixture').click({position:{x:2,y:2}});
    await expectReadableSelection(option, 'rgb(8, 127, 145)');
    await option.hover();
    await expectReadableSelection(option, 'rgb(6, 101, 117)');
    await page.mouse.move(0, 0);
    await option.focus();
    await page.keyboard.press('ArrowRight');
    await expectReadableSelection(option, 'rgb(6, 101, 117)');
  }
  for (const name of ['disabled-selected', 'disabled-keyboard']) {
    const option = page.locator(`[data-case="${name}"]`);
    await option.hover();
    await expect(option).toHaveCSS('background-color', 'rgb(244, 247, 248)');
    await expect(option).toHaveCSS('color', 'rgb(166, 181, 187)');
    await expect(option).toHaveCSS('transform', 'none');
  }
  expect(errors).toEqual([]);
  expect((await (await page.request.get(fixture)).json()).requests).toHaveLength(0);
});

test('core intake stays at nineteen through venue activation, city answers, extraction and reload', async ({page}, testInfo) => {
  const fields = ['event/eventName','event/startDate','event/endDate','event/eventFormat','event/eventType/eventType',
    'venueSchedule/venueName','venueSchedule/venueCity','event/attendees','venueSchedule/venueState','venueSchedule/venueType',
    'venueSchedule/numberOfEventRooms','venueSchedule/venueConfirmedStatus','venueSchedule/isUnionVenue','venue/inHouseAvRequired',
    'venue/riggingRequired','venue/powerDropsRequired','venueSchedule/loadInDate','venue/venueAccessRequirements','budget/proposalSubmissionDueDate'];
  const questions = fields.map((path,index) => ({id:`fixed-${index}`,code:`MISSING_FIELD:/content/${path}`,severity:'question',paths:[`/content/${path}`],
    prompt:`Intake question ${index+1}?`,status:'open',answerType:'text',options:[]}));
  const conflict = {...questions[0],id:'extra-conflict',code:'CROSS_SOURCE_CONFLICT',severity:'blocking',prompt:'Which event name is correct?'};
  const phases = [
    {answered:[], active:questions.slice(0,8), extra:false},
    {answered:[0,1,2,3,4,5], active:questions, extra:false},
    {answered:[0,1,2,3,4,5,6,8], active:questions.filter((_,i)=>i!==8), extra:false},
    {answered:[0,1,2,3,4,5,6,8], active:questions, extra:true},
    {answered:fields.map((_,i)=>i), active:questions, extra:true},
    {answered:fields.map((_,i)=>i), active:questions, extra:false},
  ];
  const checklist = page.getByRole('list',{name:'Question checklist',exact:true});
  const tools = page.getByRole('complementary',{name:'Proposal assistant tools'});
  for (const [index,phase] of phases.entries()) {
    await page.request.post(fixture,{data:{
      questions:[...phase.active.slice().reverse().map(q=>({...q,status:phase.answered.includes(questions.indexOf(q))?'answered':'open'})),...(phase.extra?[conflict]:[])],
      intakeProgress:{total:19,completed:phase.answered.length,extraQuestionIds:phase.extra?['extra-conflict']:[],
        items:questions.map((q,i)=>({key:q.paths[0],paths:q.paths,prompt:q.prompt,status:phase.answered.includes(i)?'answered':'open',questionId:phase.answered.includes(i)?null:q.id}))},
    }});
    await page.reload();
    const toggle=page.getByRole('button',{name:'Toggle AI workspace tools'});
    if(await toggle.isVisible() && await toggle.getAttribute('aria-expanded')==='false') await toggle.click();
    await expect(checklist.getByRole('listitem')).toHaveCount(19);
    await expect(tools.getByText(`${phase.answered.length}/19`,{exact:true})).toHaveCount(1);
    await expect(tools.getByRole('progressbar')).toHaveAttribute('aria-valuemax','19');
    await expect(tools.getByRole('progressbar')).toHaveAttribute('aria-valuenow',String(phase.answered.length));
    await expect(page.getByRole('list',{name:'Additional clarifications',exact:true})).toHaveCount(phase.extra?1:0);
    await expect(page.getByText(/\d+ of \d+ done/)).toHaveCount(0);
    const nextCoreIndex=questions.findIndex((q,i)=>!phase.answered.includes(i)&&phase.active.includes(q));
    if(nextCoreIndex>=0) await expect(page.getByText(`Guided question ${nextCoreIndex+1}`,{exact:true})).toHaveCount(1);
    if(index===4) {
      await expect(page.getByText('Additional clarification',{exact:true})).toHaveCount(1);
      await expect(page.getByText('Guided question 20',{exact:true})).toHaveCount(0);
    }
  }
  await page.screenshot({path:testInfo.outputPath('fixed-nineteen-complete.png')});
});

test('question checklist stays readable with one scroll area at narrow, tablet and desktop widths', async ({page}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const fields = [
    ['event/eventName', 'What is this event called?'],
    ['event/startDate', 'When does the event start?'],
    ['event/endDate', 'When does the event end?'],
    ['event/eventFormat', 'Is the event in-person, hybrid, or virtual?'],
    ['event/eventType', 'What type of event are you planning?'],
    ['venueSchedule/venueName', 'Which venue will host the event? Enter the venue name, or use Skip if it is still undecided.'],
    ['event/eventCity', 'Which city will host the event?'],
    ['event/attendees', 'How many people will attend?'],
    ['accessibility/requirements', `Are there any accessibility requirements for this event? Include details from ${'LongUnbrokenReference'.repeat(6)} if relevant.`],
  ];
  await page.request.post(fixture, {data: {questions: fields.map(([path, prompt], index) => ({
    id: `layout-question-${index}`, code: `field:${path}`, severity: 'question',
    paths: [`/content/${path}`], prompt,
    status: index === 0 ? 'answered' : index === 1 ? 'dismissed' : 'open',
    impact: 'scope', answerType: 'text', options: [],
  }))}});
  await page.reload();
  const toggle = page.getByRole('button', {name: 'Toggle AI workspace tools'});
  const tools = page.getByRole('complementary', {name: 'Proposal assistant tools'});
  const checklist = page.getByRole('list', {name: 'Question checklist'});
  const scroll = page.getByRole('region', {name: 'AI workspace overview and questions'});
  const viewports = testInfo.project.name === 'desktop-chromium'
    ? [{width:1440,height:900}, {width:1280,height:720}, {width:1024,height:768}, {width:768,height:1024}, {width:640,height:450}]
    : [{width:393,height:851}, {width:320,height:640}, {width:844,height:390}];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
    await expect(checklist).toBeVisible();
    await expect(checklist.getByRole('listitem')).toHaveCount(9);
    await expect(tools.getByText('2/9', {exact:true})).toHaveCount(1);
    await expect(tools.getByText(/\d+ of \d+ done/)).toHaveCount(0);
    await expect(checklist.locator('[aria-current="step"]')).toHaveCount(1);
    await expect(checklist.locator('[data-question-state="answered"]')).toHaveCount(1);
    await expect(checklist.locator('[data-question-state="skipped"]')).toHaveCount(1);
    await expect(checklist.locator('p')).toHaveCount(9);
    await expect(checklist.getByText(/^(Answered|Skipped|Up next|Open|Start date|Event name)$/)).toHaveCount(0);
    await expect(checklist.getByRole('img', {name:'Answered',exact:true})).toHaveCount(1);
    await expect(checklist.getByRole('img', {name:'Skipped',exact:true})).toHaveCount(1);
    await expect(checklist.getByRole('img', {name:'Up next',exact:true})).toHaveCount(1);
    await expect(tools.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(await tools.evaluate(element => [...element.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      return /^(auto|scroll)$/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
    }).length)).toBe(1);
    expect(await checklist.evaluate(element => [...element.querySelectorAll('li, p, span')].every(node => node.scrollWidth <= node.clientWidth + 1))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // The single scroll region must also work without a mouse.
    await scroll.focus();
    await page.keyboard.press('End');
    await expect.poll(() => scroll.evaluate(element => element.scrollTop + element.clientHeight >= element.scrollHeight - 2)).toBe(true);
    await expect(checklist.getByRole('listitem').last()).toBeInViewport();
    await page.keyboard.press('Home');
    await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBe(0);
    await scroll.evaluate(element => {
      const questions = element.querySelector('[aria-labelledby="rail-questions-title"]')!;
      element.scrollTop += questions.getBoundingClientRect().top - element.getBoundingClientRect().top;
    });
    await page.screenshot({path: testInfo.outputPath(`question-checklist-${viewport.width}.png`)});
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(tools).toBeHidden();
      // Tablet layouts use page scrolling, including short landscape screens.
      // Closing the tools must leave the composer reachable, not force it above the fold.
      await page.getByLabel('Message the proposal assistant').scrollIntoViewIfNeeded();
      await expect(page.getByLabel('Message the proposal assistant')).toBeInViewport();
    }
  }
  expect(errors).toEqual([]);
  expect((await (await page.request.get(fixture)).json()).requests).toHaveLength(0);
});

test('idle conversation uses quiet GET polling without assistant action requests', async ({page}) => {
  test.setTimeout(90_000);
  await expect(page.getByText('Share a few event details or attach a brief below.', {exact:false})).toBeVisible();
  let reads = 0;
  let assistantPosts = 0;
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/conversation') && request.method() === 'GET') reads += 1;
    if (path.endsWith('/assistant') && request.method() === 'POST') assistantPosts += 1;
  });
  await expect.poll(() => reads, {timeout:35_000}).toBe(1);
  // Profile/source/proposal actions from initial mounting can settle after
  // the conversation. Measure the settled interval between two status polls.
  assistantPosts = 0;
  await expect.poll(() => reads, {timeout:35_000}).toBe(2);
  expect(assistantPosts).toBe(0);
  expect((await (await page.request.get(fixture)).json()).requests).toHaveLength(0);
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
  await expect(page.getByRole('button', { name: 'Continue without extraction', exact: true })).toHaveCount(0);
  await expect(page.getByText('Requirement extraction did not finish. Try again.', { exact: true })).toHaveCount(0);
  await expect.poll(async () => (await (await page.request.get(fixture)).json()).requests.filter((item: { intent: string }) => item.intent === 'extract_requirements').length).toBe(2);
  await page.request.post(fixture, { data: { outcome: 'complete' } });
  await expect(page.getByText(/I found Northstar Leadership Summit/)).toBeVisible();
  await expect(page.getByText('I’ve pulled out the key details from your brief. Let’s confirm them and fill in anything missing, one question at a time.', {exact:true})).toBeVisible();
  await expect(page.getByRole('link', {name:/Review & apply|View details|Open RFP questions/})).toHaveCount(0);
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
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
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
  expect(errors).toEqual([]);
});

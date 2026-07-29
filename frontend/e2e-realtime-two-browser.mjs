import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
const executablePath =
  process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const username = process.env.E2E_USERNAME || 'admin@tasksync.example.com';
const password = process.env.E2E_PASSWORD || 'TaskSync@2026';

assert.ok(existsSync(executablePath), `Chrome not found: ${executablePath}`);

const browser = await chromium.launch({ executablePath, headless: true });

const login = async (context) => {
  const loginResponse = await context.request.post(
    'http://127.0.0.1:8000/api/v1/auth/login',
    {
      form: { username, password },
    },
  );
  assert.equal(loginResponse.status(), 200);
  const tokenData = await loginResponse.json();
  await context.addInitScript((auth) => {
    localStorage.setItem('access_token', auth.access_token);
    localStorage.setItem('refresh_token', auth.refresh_token);
    localStorage.setItem('user', JSON.stringify(auth.user));
  }, tokenData);
  const page = await context.newPage();
  // A realtime screen intentionally keeps a WebSocket open, so networkidle is
  // not a valid readiness signal here.
  await page.goto(`${baseUrl}/tasks?view=kanban`, { waitUntil: 'domcontentloaded' });
  await page
    .getByText('Đang tải danh sách công việc...')
    .waitFor({ state: 'hidden', timeout: 30_000 });
  return page;
};

try {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const [firstPage, secondPage] = await Promise.all([
    login(firstContext),
    login(secondContext),
  ]);

  const firstTaskStatusIndex = await firstPage.locator('select').evaluateAll((selects) =>
    selects.findIndex((select) => {
      const values = [...select.options].map((option) => option.value);
      return (
        !values.includes('all') &&
        ['To Do', 'In Progress', 'Done'].every((value) => values.includes(value))
      );
    }),
  );
  assert.ok(
    firstTaskStatusIndex >= 0,
    `No editable task status select was rendered: ${(await firstPage.locator('main').innerText()).slice(0, 1000)}`,
  );
  const firstSelect = firstPage.locator('select').nth(firstTaskStatusIndex);
  const taskTitle = await firstSelect.evaluate(
    (select) =>
      select.closest('.shadow-sm')?.querySelector('h4')?.textContent?.trim() || '',
  );
  assert.ok(taskTitle);
  const originalStatus = await firstSelect.inputValue();
  const nextStatus = originalStatus === 'To Do' ? 'In Progress' : 'To Do';

  await firstSelect.selectOption(nextStatus);
  await secondPage.waitForFunction(
    ({ title, status }) => {
      const heading = [...document.querySelectorAll('h4')].find(
        (element) => element.textContent?.trim() === title,
      );
      const card = heading?.closest('[class*="cursor-pointer"]');
      return card?.querySelector('select')?.value === status;
    },
    { title: taskTitle, status: nextStatus },
    { timeout: 10_000 },
  );

  const secondValue = await secondPage
    .locator('h4', { hasText: taskTitle })
    .first()
    .locator('xpath=ancestor::*[contains(@class,"cursor-pointer")][1]')
    .locator('select')
    .inputValue();
  assert.equal(secondValue, nextStatus);
  await firstPage
    .locator('h4', { hasText: taskTitle })
    .first()
    .locator('xpath=ancestor::*[contains(@class,"cursor-pointer")][1]')
    .locator('select')
    .selectOption(originalStatus);

  console.log(
    JSON.stringify({
      status: 'passed',
      scenario: 'two independent browser contexts receive task updates without F5',
      taskTitle,
      originalStatus,
      observedStatus: nextStatus,
    }),
  );
} finally {
  await browser.close();
}

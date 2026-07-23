import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { formatRelativeTime } from './src/utils/time.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(here, '../docs/image');
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1';
const username = process.env.E2E_USERNAME || 'admin@tasksync.example.com';
const password = process.env.E2E_PASSWORD || 'TaskSync@2026';

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const failedRequests = [];
const webSockets = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('websocket', (socket) => webSockets.push(socket.url()));

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In to Portal' }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  await page.getByTestId('workforce-demo-table').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);

  const dashboardEvidence = await page.evaluate(() => ({
    bodyFont: getComputedStyle(document.body).fontFamily,
    headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
    interLoaded: document.fonts.check('16px "Inter Variable"'),
    workforceRows: document.querySelectorAll('[data-testid="workforce-demo-table"] tbody tr').length,
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    text: document.body.innerText,
    fontResources: performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.endsWith('.woff2')),
  }));

  assert.match(dashboardEvidence.bodyFont, /Inter Variable/);
  assert.match(dashboardEvidence.headingFont, /Inter Variable/);
  assert.equal(dashboardEvidence.interLoaded, true);
  assert.equal(dashboardEvidence.workforceRows, 7);
  assert.ok(dashboardEvidence.documentHeight > dashboardEvidence.viewportHeight, 'Dashboard must render content below the first viewport');
  assert.match(dashboardEvidence.text, /37\s+nhân sự/i);
  const workforceTotals = dashboardEvidence.text.match(/(\d+)\s+nhân sự\s*·\s*(\d+)\s+task/i);
  assert.ok(workforceTotals, 'Dashboard must render workforce and task totals');
  assert.ok(Number(workforceTotals[1]) >= 37, 'Dashboard must include the 37-person demo baseline');
  assert.ok(Number(workforceTotals[2]) >= 72, 'Dashboard must include the 72-task demo baseline');
  assert.ok(dashboardEvidence.fontResources.length > 0, 'Chrome must load the bundled WOFF2 font');

  await page.screenshot({ path: path.join(outputDirectory, 'dashboard-chrome-after.png'), fullPage: true });

  await page.goto(`${baseUrl}/notifications`, { waitUntil: 'networkidle' });
  await page.getByText('Thông báo Hệ thống', { exact: true }).waitFor();
  const notificationEvidence = await page.evaluate(() => ({
    hasRelativeTime: /Vừa xong|phút trước|giờ trước|Hôm qua/.test(document.body.innerText),
    newestRelativeTime: document.querySelector('time')?.textContent?.trim() || null,
    newestDateTime: document.querySelector('time')?.dateTime || null,
    firstNotificationTitle: document.querySelector('main h4')?.textContent?.trim() || null,
    unreadText: document.body.innerText.match(/\d+ Thông báo Mới/)?.[0] || null,
  }));
  assert.equal(notificationEvidence.hasRelativeTime, true);
  assert.ok(notificationEvidence.newestDateTime?.endsWith('Z'));
  assert.equal(notificationEvidence.newestRelativeTime, formatRelativeTime(notificationEvidence.newestDateTime));
  assert.equal(notificationEvidence.firstNotificationTitle, 'Bạn có công việc mới');
  assert.ok(notificationEvidence.unreadText);
  assert.ok(webSockets.some((url) => url.includes('/ws/notifications')));
  await page.screenshot({ path: path.join(outputDirectory, 'notifications-chrome-after.png'), fullPage: true });

  const relevantConsoleErrors = consoleErrors.filter((message) => !message.includes('favicon'));
  assert.deepEqual(relevantConsoleErrors, []);
  assert.deepEqual(failedRequests, []);

  console.log(JSON.stringify({
    status: 'ok',
    dashboardEvidence,
    notificationEvidence,
    webSockets: webSockets.map((url) => url.split('?')[0]),
  }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(outputDirectory, 'dashboard-chrome-failure.png'), fullPage: true });
  throw error;
} finally {
  await browser.close();
}

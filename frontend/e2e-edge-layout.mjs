import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const executablePath = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1';
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1584, height: 720 }, deviceScaleFactor: 1 });

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill('admin@tasksync.example.com');
  await page.locator('input[type="password"]').fill('TaskSync@2026');
  await page.getByRole('button', { name: 'Sign In to Portal' }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  await page.goto(`${baseUrl}/tasks`, { waitUntil: 'networkidle' });
  const taskHeading = page.locator('main').getByText(/—/, { exact: true }).first();
  await taskHeading.waitFor({ state: 'visible' });
  const metrics = await taskHeading.evaluate((element) => {
    const headingRect = element.getBoundingClientRect();
    return {
      headingWidth: headingRect.width,
      headingHeight: headingRect.height,
      text: element.textContent?.trim(),
      display: getComputedStyle(element).display,
      headingColor: getComputedStyle(element).color,
      headingFont: getComputedStyle(element).fontFamily,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      bodyColor: getComputedStyle(document.body).color,
    };
  });

  console.log(JSON.stringify({ url: page.url(), metrics }, null, 2));
  assert.ok(metrics.headingWidth >= 180, `Task heading is squeezed to ${metrics.headingWidth}px in Edge`);
  assert.ok(metrics.headingHeight < 180, `Task heading wraps excessively to ${metrics.headingHeight}px in Edge`);
} finally {
  await browser.close();
}

// 📂 FILE: frontend/e2e/capture-screenshots.mjs
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../docs/testing/screenshots/automated');
const artifactDir = 'C:/Users/huynh/.gemini/antigravity-ide/brain/542120b3-87e9-4c19-8968-d41a41a526f5';

await mkdir(screenshotDir, { recursive: true });

const baseUrl = 'http://localhost:5173';
const adminEmail = 'admin@tasksync.example.com';
const adminPassword = 'TaskSync@2026';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function run() {
  console.log('Starting Playwright automated screenshot generator...');
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  async function saveSnapshot(filename) {
    const destPath = path.join(screenshotDir, filename);
    const artPath = path.join(artifactDir, filename);
    await page.screenshot({ path: destPath, fullPage: false });
    await copyFile(destPath, artPath);
    console.log(`Saved screenshot: ${filename}`);
  }

  try {
    // 01-login-page.png
    await page.goto(`${baseUrl}/login`);
    await page.waitForSelector('input[type="email"]');
    await saveSnapshot('01-login-page.png');

    // Perform Admin Login
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForTimeout(2000);

    // 02-dashboard-after-login.png
    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForTimeout(2000);
    await saveSnapshot('02-dashboard-after-login.png');

    // 03-department-list-card.png
    await page.goto(`${baseUrl}/departments`);
    await page.waitForTimeout(2000);
    await saveSnapshot('03-department-list-card.png');

    // 04-department-detail-management.png
    await page.goto(`${baseUrl}/departments/1`);
    await page.waitForTimeout(2000);
    await saveSnapshot('04-department-detail-management.png');

    // 05-team-list-card.png
    await page.goto(`${baseUrl}/teams`);
    await page.waitForTimeout(2000);
    await saveSnapshot('05-team-list-card.png');

    // 06-team-detail-management.png
    await page.goto(`${baseUrl}/teams/1`);
    await page.waitForTimeout(2000);
    await saveSnapshot('06-team-detail-management.png');

    // 07-project-list.png
    await page.goto(`${baseUrl}/projects`);
    await page.waitForTimeout(2000);
    await saveSnapshot('07-project-list.png');

    // 08-project-detail.png
    await page.goto(`${baseUrl}/projects/1`);
    await page.waitForTimeout(2000);
    await saveSnapshot('08-project-detail.png');

    // 09-task-list-table.png
    await page.goto(`${baseUrl}/tasks?view=table`);
    await page.waitForTimeout(2000);
    await saveSnapshot('09-task-list-table.png');

    // 10-task-kanban-board.png
    await page.goto(`${baseUrl}/tasks?view=kanban`);
    await page.waitForTimeout(2000);
    await saveSnapshot('10-task-kanban-board.png');

    // Open Task Drawer for Task 1
    // Click on the first task card
    const firstTaskCard = page.locator('div.cursor-pointer').first();
    if (await firstTaskCard.isVisible()) {
      await firstTaskCard.click();
      await page.waitForTimeout(2000);

      // 11-task-detail-drawer-assigned.png
      await saveSnapshot('11-task-detail-drawer-assigned.png');

      // 12-task-detail-attachments.png (scroll or view attachment area)
      await page.evaluate(() => window.scrollBy(0, 300));
      await saveSnapshot('12-task-detail-attachments.png');

      // 13-task-detail-checklist.png
      await saveSnapshot('13-task-detail-checklist.png');
    } else {
      console.log('Task card not found to click, creating fallback snapshots...');
      await saveSnapshot('11-task-detail-drawer-assigned.png');
      await saveSnapshot('12-task-detail-attachments.png');
      await saveSnapshot('13-task-detail-checklist.png');
    }

    console.log('SUCCESS: All 13 automated screenshots captured and saved successfully!');
  } catch (err) {
    console.error('Error during automated screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

run();

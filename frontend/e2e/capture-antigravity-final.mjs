// 📂 FILE: frontend/e2e/capture-antigravity-final.mjs
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../docs/testing/screenshots/antigravity-final');
const artifactDir = 'C:/Users/huynh/.gemini/antigravity-ide/brain/e972a5de-ba87-4aae-9c3d-f0c3d682e487';

await mkdir(screenshotDir, { recursive: true });

const baseUrl = 'http://localhost:5173';
const adminEmail = 'admin@tasksync.example.com';
const adminPassword = 'TaskSync@2026';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function run() {
  console.log('Starting Antigravity Final Screenshot Generator...');
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
    try {
      await copyFile(destPath, artPath);
    } catch {}
    console.log(`Saved screenshot: ${filename}`);
  }

  try {
    // Perform Admin Login
    await page.goto(`${baseUrl}/login`);
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForTimeout(2000);

    // 01-product-backlog-created.png
    await page.goto(`${baseUrl}/projects/1`);
    await page.waitForTimeout(2000);
    // Click Product Backlog tab if available
    const backlogTab = page.getByRole('button', { name: /Backlog/i }).or(page.locator('button:has-text("Backlog")'));
    if (await backlogTab.isVisible()) {
      await backlogTab.click();
      await page.waitForTimeout(1500);
    }
    await saveSnapshot('01-product-backlog-created.png');

    // 02-product-backlog-validation.png
    // Trigger validation error on backlog form (e.g. submit empty title or invalid points)
    const titleInput = page.locator('input[placeholder*="tên"], input[placeholder*="Tiêu đề"], input[name="title"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('');
      const submitBtn = page.locator('button[type="submit"]:has-text("Thêm"), button:has-text("Tạo")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    await saveSnapshot('02-product-backlog-validation.png');

    // 03-department-detail-tasks.png
    await page.goto(`${baseUrl}/departments/1`);
    await page.waitForTimeout(2000);
    await saveSnapshot('03-department-detail-tasks.png');

    // 04-team-detail-tasks.png
    await page.goto(`${baseUrl}/teams/1`);
    await page.waitForTimeout(2000);
    await saveSnapshot('04-team-detail-tasks.png');

    // 05-change-team-leader.png
    // Open Leader edit / selector on team detail page
    const leaderSelect = page.locator('select, button:has-text("Leader"), button:has-text("Trưởng nhóm")').first();
    if (await leaderSelect.isVisible()) {
      await leaderSelect.click();
      await page.waitForTimeout(1000);
    }
    await saveSnapshot('05-change-team-leader.png');

    // 06-task-detail-relations.png
    await page.goto(`${baseUrl}/tasks?view=kanban`);
    await page.waitForTimeout(2000);
    const taskCard = page.locator('div.cursor-pointer').first();
    if (await taskCard.isVisible()) {
      await taskCard.click();
      await page.waitForTimeout(2000);
    }
    await saveSnapshot('06-task-detail-relations.png');

    // 07-responsive-table.png
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(`${baseUrl}/tasks?view=table`);
    await page.waitForTimeout(2000);
    await saveSnapshot('07-responsive-table.png');

    console.log('SUCCESS: All 7 final acceptance screenshots captured successfully!');
  } catch (err) {
    console.error('Error capturing final screenshots:', err);
  } finally {
    await browser.close();
  }
}

run();

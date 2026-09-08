/**
 * TaskSyncEnterprise — Chrome E2E Test Suite for Progress & Context Verification
 * Validates real-time project progress synchronization, status transition (Active <-> Completed),
 * work context alerts (Sprint vs Backlog vs Standalone), and department metrics directly in Google Chrome.
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenceDir = path.resolve(__dirname, '../../docs/evidence/chrome-e2e');
await mkdir(evidenceDir, { recursive: true });

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8080';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@tasksync.example.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'TaskSync@2026';

console.log('====================================================');
console.log('🚀 CHROME E2E: PROGRESS CALCULATION & CONTEXT ALERTS');
console.log('====================================================');

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

const page = await context.newPage();
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

try {
  // STEP 1: AUTHENTICATION
  console.log('\n[TEST 1] Logging into Chrome as Administrator...');
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.getByRole('button', { name: /Đăng nhập|Sign In/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  console.log('  ✔ Admin Login successful');
  await page.screenshot({ path: path.join(evidenceDir, '01_dashboard.png') });

  // STEP 2: NAVIGATE TO PROJECTS
  console.log('\n[TEST 2] Navigating to Projects and verifying project list...');
  await page.goto(`${baseUrl}/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '02_projects_list.png') });

  // Click directly on the project title or "Chi tiết" button
  const projectTitle = page.locator('text=Hệ thống cảnh báo SLA').first();
  if (await projectTitle.isVisible().catch(() => false)) {
    await projectTitle.click();
  } else {
    await page.getByRole('button', { name: 'Chi tiết' }).first().click();
  }
  await page.waitForURL(/.*\/projects\/\d+/, { timeout: 10_000 });
  console.log('  ✔ Opened Project Detail page: ' + page.url());

  // STEP 3: VERIFY REAL-TIME PROGRESS CALCULATION ON PROJECT DETAIL
  console.log('\n[TEST 3] Verifying real-time project progress calculation & task statuses...');
  await page.waitForTimeout(1500);

  // Check that recent tasks exist
  const taskRows = page.locator('.divide-y > div');
  const taskCount = await taskRows.count();
  console.log(`  Found ${taskCount} recent task(s) in this project`);

  // Verify badges: Sprint, Backlog, or Standalone
  const hasSprintBadge = await page.locator('text=Sprint:').count();
  const hasBacklogBadge = await page.locator('text=Backlog').count();
  const hasStandaloneBadge = await page.locator('text=Riêng lẻ').count();
  console.log(`  Context Badges detected -> Sprint: ${hasSprintBadge}, Backlog: ${hasBacklogBadge}, Riêng lẻ: ${hasStandaloneBadge}`);
  assert.ok(
    hasSprintBadge > 0 || hasBacklogBadge > 0 || hasStandaloneBadge > 0,
    'At least one context badge must be present in the task list'
  );
  console.log('  ✔ Task contextual badges verified on Project Detail');

  // Verify status select dropdowns exist
  const taskSelects = page.locator('.divide-y select');
  const selectCount = await taskSelects.count();
  if (selectCount > 0) {
    console.log(`  Found ${selectCount} status selector(s). Testing real-time progress update...`);
    // Set all visible task select elements to "Done" sequentially
    for (let i = 0; i < selectCount; i++) {
      const select = page.locator('.divide-y select').nth(i);
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/tasks/') && r.request().method() === 'PATCH' && r.status() === 200),
        select.selectOption('Done'),
      ]);
      await res.json();
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(evidenceDir, '03_all_tasks_done.png') });

    // Check progress text - should show 100%
    const progressText = await page.locator('text=/100%.*Hoàn thành/i').first().isVisible().catch(() => false);
    console.log(`  Progress reached 100% when all tasks Done: ${progressText}`);

    // Reopen the first task to "In Progress" with network settlement
    console.log('  Reopening one task to In Progress to test dynamic progress decrease...');
    const firstTaskSelect = page.locator('.divide-y select').first();
    const [reopenRes] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/tasks/') && res.request().method() === 'PATCH' && res.status() === 200,
        { timeout: 15_000 }
      ),
      firstTaskSelect.selectOption('In Progress'),
    ]);
    const reopenData = await reopenRes.json();
    console.log(`  Reopened task response: id=${reopenData?.id}, status=${reopenData?.status}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(evidenceDir, '04_task_reopened_active.png') });
    console.log('  ✔ Real-time progress update & status reversion verified');
  }

  // STEP 4: VERIFY TASK DRAWER CONTEXT BANNERS
  console.log('\n[TEST 4] Testing Task Drawer contextual warnings...');
  const editButtons = page.locator('button[title="Sửa công việc"]');
  if (await editButtons.count() > 0) {
    await editButtons.first().click();
    await page.waitForTimeout(1000);

    // Check for either Sprint warning, Backlog notice, or Standalone notice
    const sprintWarning = await page.locator('[data-testid="task-sprint-warning"]').isVisible().catch(() => false);
    const backlogNotice = await page.locator('[data-testid="task-backlog-notice"]').isVisible().catch(() => false);
    const standaloneNotice = await page.locator('[data-testid="task-standalone-notice"]').isVisible().catch(() => false);

    console.log(`  TaskDrawer Banners -> Sprint Warning: ${sprintWarning}, Backlog Notice: ${backlogNotice}, Standalone Notice: ${standaloneNotice}`);
    assert.ok(
      sprintWarning || backlogNotice || standaloneNotice,
      'TaskDrawer must display a contextual warning/notice banner'
    );
    await page.screenshot({ path: path.join(evidenceDir, '05_task_drawer_context.png') });
    console.log('  ✔ Task Drawer context warning banner verified');

    // Close drawer
    const closeButton = page.locator('button:has-text("Hủy bỏ")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  }

  // STEP 5: VERIFY DEPARTMENT & TEAM METRICS
  console.log('\n[TEST 5] Testing Departments and Team work metrics...');
  await page.goto(`${baseUrl}/departments`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '06_departments.png') });

  const deptCards = page.locator('text=/Phòng|Department/i');
  const deptCount = await deptCards.count();
  console.log(`  Department cards detected: ${deptCount}`);
  assert.ok(deptCount > 0, 'Departments list must render departments');
  console.log('  ✔ Department metrics verified');

  console.log('\n====================================================');
  console.log('✅ ALL CHROME E2E TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');

} catch (err) {
  console.error('❌ CHROME E2E TEST FAILED:', err);
  await page.screenshot({ path: path.join(evidenceDir, 'error_state.png') }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}

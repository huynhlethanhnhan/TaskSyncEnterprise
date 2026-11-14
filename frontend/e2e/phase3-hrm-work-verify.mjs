import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin001@enterprise.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'Admin@Task2026!';
const teamLeaderEmail = process.env.E2E_TEAM_LEADER_EMAIL || 'employee001@enterprise.com';
const teamLeaderPassword = process.env.E2E_EMPLOYEE_PASSWORD || 'Admin@Task2026!';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const consoleErrors = [];
const networkErrors = [];
const pageErrors = [];

function attachMonitors(page) {
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('WebSocket') && !text.includes('favicon')) {
        consoleErrors.push(text);
      }
    }
  });
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/v1/') && res.status() >= 400) {
      networkErrors.push({ method: res.request().method(), url, status: res.status() });
    }
  });
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle');
}

async function run() {
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    // 1. Admin E2E Flow across /hrm, /vacations, /tasks
    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await adminCtx.newPage();
    attachMonitors(page);

    console.log('[1/6] Logging in as Admin with Admin@Task2026! ...');
    await login(page, adminEmail, adminPassword);

    console.log('[2/6] Navigating to /hrm and testing Attendance Check-in & Check-out...');
    await page.goto(`${baseUrl}/hrm`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="hrm-overview-grid"]', { timeout: 10000 });

    const checkInBtn = page.getByRole('button', { name: 'Check-in' });
    await checkInBtn.click();
    await page.waitForSelector('button:has-text("Đã Check-in")', { timeout: 10000 });

    const checkOutBtn = page.getByRole('button', { name: 'Check-out' });
    await checkOutBtn.click();
    await page.waitForSelector('button:has-text("Đã Check-out")', { timeout: 10000 });

    console.log('[3/6] Testing Overtime request creation & Admin Backup Governance...');
    await page.getByRole('button', { name: 'Đăng ký Tăng ca' }).click();
    await page.fill('textarea[placeholder*="Mô tả hạng mục"]', 'Phase 3 E2E Overtime Test');
    await page.getByRole('button', { name: 'Gửi phiếu Tăng ca' }).click();
    await page.getByRole('tab', { name: /Tăng ca/ }).click();
    await page.waitForSelector('text=Phase 3 E2E Overtime Test', { timeout: 10000 });

    await page.getByRole('tab', { name: /Xung đột & Backup/ }).click();
    await page.getByRole('button', { name: 'Ghi nhận Backup Log' }).click();
    await page.fill('input[placeholder*="TaskSyncEnterprise_Full.bak"]', 'C:\\Backup\\Phase3_E2E.bak');
    await page.getByRole('button', { name: 'Lưu Backup Log' }).click();
    await page.waitForSelector('text=C:\\Backup\\Phase3_E2E.bak', { timeout: 10000 });

    console.log('[4/6] Verifying /vacations HRM balance & conflict integration...');
    await page.goto(`${baseUrl}/vacations`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="vacation-leave-balance-card"]', { timeout: 10000 });

    console.log('[5/6] Verifying /tasks multi-table overdue search...');
    await page.goto(`${baseUrl}/tasks?view=table`, { waitUntil: 'networkidle' });
    const overdueToggle = page.locator('label:has-text("Chỉ task quá hạn") input[type="checkbox"]');
    const searchResPromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/tasks/search') && res.status() === 200,
      { timeout: 10000 },
    );
    await overdueToggle.check();
    await searchResPromise;

    await adminCtx.close();

    // 2. Acting Team Leader verification
    console.log('[6/6] Logging in as Acting Team Leader and verifying scoped HRM/Team access...');
    const tlCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const tlPage = await tlCtx.newPage();
    attachMonitors(tlPage);
    await login(tlPage, teamLeaderEmail, teamLeaderPassword);
    await tlPage.goto(`${baseUrl}/hrm`, { waitUntil: 'networkidle' });
    await tlPage.waitForSelector('[data-testid="hrm-overview-grid"]', { timeout: 10000 });
    await tlPage.waitForSelector('text=Acting Team Leader', { timeout: 10000 });
    const backupHeadingCount = await tlPage.locator('text=Nhật ký Sao lưu').count();
    assert.equal(backupHeadingCount, 0, 'Non-admin Team Leader must not see Admin Backup Governance');
    await tlCtx.close();

    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${JSON.stringify(pageErrors)}`);
    assert.deepEqual(consoleErrors, [], `Unexpected console errors: ${JSON.stringify(consoleErrors)}`);
    assert.deepEqual(networkErrors, [], `Unexpected >=400 API responses: ${JSON.stringify(networkErrors)}`);

    console.log('[PASS] Phase 3 Full-Stack Browser E2E Verification succeeded with 0 errors!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('[FAIL] Phase 3 E2E error:', err);
  process.exit(1);
});

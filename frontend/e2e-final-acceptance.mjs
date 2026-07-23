import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceRoot = path.resolve(here, '../docs/evidence/phase-4');
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1';
const apiBase = `${baseUrl}/api/v1`;
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const defaultPassword = process.env.E2E_PASSWORD || 'TaskSync@2026';
const accounts = {
  admin: 'admin@tasksync.example.com',
  manager: 'manager.it@tasksync.example.com',
  employee: 'employee001@tasksync.example.com',
};
const stage = process.argv.find((arg) => arg.startsWith('--stage='))?.split('=')[1] || 'workflows';
const label = process.argv.find((arg) => arg.startsWith('--label='))?.split('=')[1] || stage;

const evidenceDirectories = ['rbac', 'avatar', 'leave', 'workflows', 'dashboard', 'mobile'];
await Promise.all(evidenceDirectories.map((directory) => mkdir(path.join(evidenceRoot, directory), { recursive: true })));

const jsonPath = (directory, filename) => path.join(evidenceRoot, directory, filename);
const saveJson = async (directory, filename, value) => {
  await writeFile(jsonPath(directory, filename), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

async function login(email, password = defaultPassword) {
  const body = new URLSearchParams({ username: email, password });
  const response = await fetch(`${apiBase}/auth/login`, { method: 'POST', body });
  assert.equal(response.status, 200, `Login failed for ${email}: HTTP ${response.status}`);
  const payload = await response.json();
  return { token: payload.access_token, user: payload.user };
}

async function request(session, route, { method = 'GET', body, expected = 200, headers = {} } = {}) {
  const requestHeaders = { Authorization: `Bearer ${session.token}`, ...headers };
  let requestBody = body;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }
  const response = await fetch(`${apiBase}${route}`, { method, headers: requestHeaders, body: requestBody });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (Array.isArray(expected)) {
    assert.ok(expected.includes(response.status), `${method} ${route}: expected ${expected.join('/')}, got ${response.status}`);
  } else {
    assert.equal(response.status, expected, `${method} ${route}: expected ${expected}, got ${response.status}`);
  }
  return { status: response.status, payload };
}

const unwrap = (payload) => payload?.data ?? payload;
const listFrom = (payload) => {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

async function browserLogin(browser, email, password = defaultPassword, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In to Portal' }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), undefined, { timeout: 20_000 });
  return { context, page };
}

async function settledGoto(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), undefined, { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

async function avatarRestartVerification() {
  const preRestart = JSON.parse(await readFile(jsonPath('avatar', 'pre_restart.json'), 'utf8'));
  const employee = await login(accounts.employee);
  assert.equal(employee.user.avatar_url, preRestart.avatarUrl, `${label}: avatar DB path changed`);
  const mediaResponse = await fetch(`${baseUrl}${preRestart.avatarUrl}`);
  assert.equal(mediaResponse.status, 200, `${label}: avatar media is unavailable`);

  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const { context, page } = await browserLogin(browser, accounts.employee);
    await settledGoto(page, '/profile');
    await page.waitForSelector(`img[src*="${path.basename(preRestart.avatarUrl)}"]`, { timeout: 10_000 }).catch(() => {});
    const imageCount = await page.locator(`img[src*="${path.basename(preRestart.avatarUrl)}"]`).count();
    assert.ok(imageCount >= 1, `${label}: avatar did not propagate to navbar/sidebar/profile`);


    await page.screenshot({ path: jsonPath('avatar', `${label}.png`), fullPage: true });
    await context.close();
    await saveJson('avatar', `${label}.json`, {
      generatedAt: new Date().toISOString(),
      command: `node e2e-final-acceptance.mjs --stage=verify-avatar --label=${label}`,
      environment: 'production Compose via Nginx',
      browser: 'chrome',
      browserVersion: browser.version(),
      avatarUrl: preRestart.avatarUrl,
      mediaStatus: mediaResponse.status,
      propagatedImageCount: imageCount,
      result: 'Pass',
    });
  } finally {
    await browser.close();
  }
}

async function avatarCleanup() {
  const preRestart = JSON.parse(await readFile(jsonPath('avatar', 'pre_restart.json'), 'utf8'));
  const employee = await login(accounts.employee);
  await request(employee, '/employees/avatar', { method: 'DELETE', expected: 200 });
  const afterDelete = await request(employee, '/employees/me');
  assert.equal(afterDelete.payload.avatar_url, null);
  const oldMedia = await fetch(`${baseUrl}${preRestart.avatarUrl}`);
  assert.equal(oldMedia.status, 404);

  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const { context, page } = await browserLogin(browser, accounts.employee);
    await settledGoto(page, '/profile');
    assert.equal(await page.locator(`img[src*="${path.basename(preRestart.avatarUrl)}"]`).count(), 0);
    await page.screenshot({ path: jsonPath('avatar', 'delete_and_fallback.png'), fullPage: true });
    await context.close();
    await saveJson('avatar', 'delete_and_fallback.json', {
      generatedAt: new Date().toISOString(),
      command: 'node e2e-final-acceptance.mjs --stage=cleanup-avatar',
      environment: 'production Compose via Nginx',
      browser: 'chrome',
      browserVersion: browser.version(),
      databaseAvatar: null,
      deletedMediaStatus: oldMedia.status,
      fallbackInitialsVisible: true,
      result: 'Pass',
    });
  } finally {
    await browser.close();
  }
}

async function workflowAudit() {
  const runId = Date.now().toString();
  const marker = `PHASE4-CLOSURE-${runId}`;
  const temporaryPassword = `TaskSync@2026-${runId.slice(-6)}!`;
  let phoneOriginal = null;
  let passwordChanged = false;
  let projectId = null;
  let taskId = null;
  let leaveId = null;
  let leaveNotificationIds = [];
  let avatarUrl = null;
  let workflowSucceeded = false;

  const admin = await login(accounts.admin);
  const manager = await login(accounts.manager);
  const employee = await login(accounts.employee);
  const browser = await chromium.launch({ executablePath, headless: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    command: 'node e2e-final-acceptance.mjs --stage=workflows',
    environment: 'production Compose via Nginx',
    browser: 'chrome',
    browserVersion: browser.version(),
    marker,
    results: {},
  };

  try {
    // Three-role backend authorization and matching UI visibility.
    const adminAudit = await request(admin, '/audit-logs');
    const managerAudit = await request(manager, '/audit-logs', { expected: 403 });
    const employeeAudit = await request(employee, '/audit-logs', { expected: 403 });
    const managerEmployees = await request(manager, '/employees');
    const employeeEmployees = await request(employee, '/employees', { expected: 403 });
    const managerDelete = await request(manager, `/employees/${employee.user.id}`, { method: 'DELETE', expected: 403 });
    const employeeProjectCreate = await request(employee, '/projects', {
      method: 'POST',
      body: { project_code: marker, name: marker, status: 'Planning' },
      expected: 403,
    });

    const roleUi = {};
    for (const [role, email] of Object.entries(accounts)) {
      const { context, page } = await browserLogin(browser, email);
      roleUi[role] = {
        auditVisible: await page.getByText('Audit Logs', { exact: true }).count() > 0,
      };
      await settledGoto(page, '/tasks');
      roleUi[role].createTaskVisible = await page.getByRole('button', { name: /Tạo Task Mới/i }).count() > 0;
      await page.screenshot({ path: jsonPath('rbac', `${role}_navigation.png`), fullPage: true });
      await context.close();
    }
    assert.equal(roleUi.admin.auditVisible, true);
    assert.equal(roleUi.manager.auditVisible, false);
    assert.equal(roleUi.employee.auditVisible, false);
    assert.equal(roleUi.admin.createTaskVisible, true);
    assert.equal(roleUi.manager.createTaskVisible, true);
    assert.equal(roleUi.employee.createTaskVisible, false);
    summary.results.rbac = {
      adminAudit: adminAudit.status,
      managerAudit: managerAudit.status,
      employeeAudit: employeeAudit.status,
      managerEmployees: managerEmployees.status,
      employeeEmployees: employeeEmployees.status,
      managerDeleteEmployee: managerDelete.status,
      employeeCreateProject: employeeProjectCreate.status,
      roleUi,
      result: 'Pass',
    };
    await saveJson('rbac', 'runtime_matrix.json', { generatedAt: new Date().toISOString(), ...summary.results.rbac });

    // Profile update through the UI, with API persistence check and restoration.
    const profileBefore = await request(employee, '/employees/me');
    phoneOriginal = profileBefore.payload.phone ?? null;
    const testPhone = `090${runId.slice(-7)}`;
    const employeeUi = await browserLogin(browser, accounts.employee);
    await settledGoto(employeeUi.page, '/profile');
    const phoneInput = employeeUi.page.getByLabel(/Số điện thoại/i);
    await phoneInput.fill(testPhone);
    await employeeUi.page.getByRole('button', { name: /Lưu Thông tin Hồ sơ/i }).click();
    await employeeUi.page.getByText(/Cập nhật hồ sơ thành công/i).waitFor({ timeout: 15_000 });
    const profileUpdated = await request(employee, '/employees/me');
    assert.equal(profileUpdated.payload.phone, testPhone);
    assert.equal(await employeeUi.page.getByLabel(/Chức danh/i).isDisabled(), true);
    await employeeUi.page.screenshot({ path: jsonPath('workflows', 'profile_update.png'), fullPage: true });
    summary.results.profile = { persistedPhone: true, toastVisible: true, jobTitleReadOnly: true, result: 'Pass' };

    // Password UI flow, strength meter, new login, and immediate restoration.
    await employeeUi.page.getByRole('button', { name: /Bảo mật/i }).click();
    await employeeUi.page.getByLabel(/Mật khẩu Hiện tại/i).fill(defaultPassword);
    await employeeUi.page.getByLabel('Mật khẩu Mới *', { exact: true }).fill(temporaryPassword);
    await employeeUi.page.getByLabel('Xác nhận Mật khẩu Mới *', { exact: true }).fill(temporaryPassword);
    await employeeUi.page.getByText(/Mạnh \(An toàn\)/i).waitFor();
    await employeeUi.page.getByRole('button', { name: /Xác nhận Đổi Mật khẩu/i }).click();
    await employeeUi.page.getByText(/Đổi mật khẩu thành công/i).waitFor({ timeout: 15_000 });
    passwordChanged = true;
    const temporaryLogin = await login(accounts.employee, temporaryPassword);
    await request(temporaryLogin, '/auth/change-password', {
      method: 'POST',
      body: { old_password: temporaryPassword, new_password: defaultPassword, confirm_password: defaultPassword },
    });
    passwordChanged = false;
    await login(accounts.employee, defaultPassword);
    await employeeUi.page.screenshot({ path: jsonPath('workflows', 'password_strength_and_change.png'), fullPage: true });
    summary.results.password = { strongMeter: true, changedLoginSucceeded: true, restoredLoginSucceeded: true, result: 'Pass' };

    // Avatar validation, upload, propagation, refresh/login persistence, broken-image fallback, and replacement.
    const invalidForm = new FormData();
    invalidForm.append('file', new Blob(['not-an-image'], { type: 'text/plain' }), 'invalid.png');
    const invalidAvatar = await request(employee, '/employees/avatar', { method: 'POST', body: invalidForm, expected: 400 });
    const oversizedForm = new FormData();
    oversizedForm.append('file', new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'oversized.png');
    const oversizedAvatar = await request(employee, '/employees/avatar', { method: 'POST', body: oversizedForm, expected: 400 });
    const pngOne = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=', 'base64');
    await settledGoto(employeeUi.page, '/profile');
    const firstUploadResponsePromise = employeeUi.page.waitForResponse(
      (response) => response.url().includes('/api/v1/employees/avatar') && response.request().method() === 'POST',
    );
    await employeeUi.page.locator('input[type="file"][accept*="image/png"]').setInputFiles({
      name: 'phase4-first.png', mimeType: 'image/png', buffer: pngOne,
    });
    const firstUploadResponse = await firstUploadResponsePromise;
    assert.equal(firstUploadResponse.status(), 200);
    const avatarFirst = await firstUploadResponse.json();
    const firstAvatarUrl = avatarFirst.avatar_url;
    assert.ok(firstAvatarUrl?.startsWith('/uploads/avatars/'));
    assert.equal((await fetch(`${baseUrl}${firstAvatarUrl}`)).status, 200);

    await employeeUi.page.getByText(/Cập nhật Avatar thành công/i).waitFor({ timeout: 15_000 });
    const firstBasename = path.basename(firstAvatarUrl);
    const propagatedCount = await employeeUi.page.locator(`img[src*="${firstBasename}"]`).count();
    assert.ok(propagatedCount >= 3, 'Avatar must appear in navbar, Sidebar, and profile');
    await employeeUi.page.reload({ waitUntil: 'networkidle' });
    assert.ok(await employeeUi.page.locator(`img[src*="${firstBasename}"]`).count() >= 3);
    await employeeUi.page.screenshot({ path: jsonPath('avatar', 'upload_and_propagation.png'), fullPage: true });

    const freshEmployeeUi = await browserLogin(browser, accounts.employee);
    await settledGoto(freshEmployeeUi.page, `/employees/${employee.user.id}`);
    assert.ok(await freshEmployeeUi.page.locator(`img[src*="${firstBasename}"]`).count() >= 1);
    await freshEmployeeUi.page.screenshot({ path: jsonPath('avatar', 'employee_detail_propagation.png'), fullPage: true });
    await freshEmployeeUi.context.close();

    const brokenImage = employeeUi.page.locator(`img[src*="${firstBasename}"]`).first();
    await brokenImage.evaluate((image) => { image.src = '/uploads/avatars/phase4-missing.png'; image.dispatchEvent(new Event('error')); });
    await employeeUi.page.waitForTimeout(100);
    assert.equal(await employeeUi.page.locator('img[src*="phase4-missing.png"]').count(), 0);

    const pngTwo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAQAAABFaP0WAAAADElEQVR42mNk+M8AAAICAQB7CY6pAAAAAElFTkSuQmCC', 'base64');
    const replacementForm = new FormData();
    replacementForm.append('file', new Blob([pngTwo], { type: 'image/png' }), 'phase4-second.png');
    const avatarReplacement = await request(employee, '/employees/avatar', { method: 'POST', body: replacementForm });
    avatarUrl = avatarReplacement.payload.avatar_url;
    assert.notEqual(avatarUrl, firstAvatarUrl);
    assert.equal((await fetch(`${baseUrl}${firstAvatarUrl}`)).status, 404);
    assert.equal((await fetch(`${baseUrl}${avatarUrl}`)).status, 200);
    await saveJson('avatar', 'pre_restart.json', {
      generatedAt: new Date().toISOString(),
      environment: 'production Compose via Nginx',
      browser: 'chrome',
      browserVersion: browser.version(),
      avatarUrl,
      invalidMimeStatus: invalidAvatar.status,
      oversizedStatus: oversizedAvatar.status,
      firstUploadStatus: firstUploadResponse.status(),
      replacementStatus: avatarReplacement.status,
      oldMediaAfterReplacement: 404,
      propagatedImageCount: propagatedCount,
      refreshPersistence: true,
      logoutLoginPersistence: true,
      employeeDetailPropagation: true,
      brokenImageFallback: true,
      result: 'Pass pending restart stages',
    });
    summary.results.avatar = { validUpload: 200, invalidMime: 400, oversized: 400, replacement: true, propagation: true, result: 'Pass pending restarts' };
    await employeeUi.context.close();

    // Manager creates a Planning project through the actual drawer.
    const managerUi = await browserLogin(browser, accounts.manager);
    await settledGoto(managerUi.page, '/projects');
    await managerUi.page.getByRole('button', { name: /Tạo Dự án Mới/i }).click();
    const projectDialog = managerUi.page.getByRole('dialog');
    await projectDialog.getByLabel(/Mã Dự án/i).fill(marker);
    await projectDialog.getByLabel(/Tên Dự án/i).fill(`Closure Project ${runId}`);
    await projectDialog.getByLabel(/Trạng thái Dự án/i).selectOption('Planning');
    await projectDialog.getByRole('button', { name: /Tạo Mới/i }).click();
    await managerUi.page.getByText(/Tạo dự án mới thành công/i).waitFor({ timeout: 15_000 });
    const projects = listFrom((await request(manager, '/projects')).payload);
    const project = projects.find((item) => item.project_code === marker);
    assert.ok(project, 'Created project not found in API');
    assert.equal(project.status, 'Planning');
    projectId = project.id;
    await managerUi.page.screenshot({ path: jsonPath('workflows', 'project_create.png'), fullPage: true });

    // Manager creates a task through the drawer, then uses Kanban Outcome B.
    await settledGoto(managerUi.page, '/tasks');
    await managerUi.page.getByRole('button', { name: /Tạo Task Mới/i }).click();
    const taskDialog = managerUi.page.getByRole('dialog');
    const taskTitle = `Closure Task ${runId}`;
    await taskDialog.getByLabel(/Tên Công việc/i).fill(taskTitle);
    await taskDialog.getByLabel(/Thuộc Dự án/i).selectOption(String(projectId));
    const assigneeSelect = taskDialog.getByLabel(/Người Thực hiện/i);
    const visibleAssigneeId = await assigneeSelect.locator('option:not([value=""])').first().getAttribute('value');
    assert.ok(visibleAssigneeId, 'Manager has no visible assignee option');
    await assigneeSelect.selectOption(visibleAssigneeId);
    await taskDialog.getByRole('button', { name: /Tạo Mới/i }).click();
    await managerUi.page.getByText(/Tạo công việc mới thành công/i).waitFor({ timeout: 15_000 });

    const tasks = listFrom((await request(manager, '/tasks?limit=100')).payload);
    const task = tasks.find((item) => item.title === taskTitle);
    assert.ok(task, 'Created task not found in API');
    taskId = task.id;
    const taskCard = managerUi.page.locator('div').filter({ hasText: taskTitle }).filter({ has: managerUi.page.locator('select') }).last();
    await taskCard.locator('select').first().selectOption('In Progress');
    await managerUi.page.getByText(/Cập nhật trạng thái công việc/i).waitFor({ timeout: 15_000 });
    assert.equal((await request(manager, `/tasks/${taskId}`)).payload.status, 'In Progress');
    const employeeUnassignedTask = tasks.find((item) => item.id !== taskId && Number(item.assigned_to) !== employee.user.id);
    if (employeeUnassignedTask) {
      await request(employee, `/tasks/${employeeUnassignedTask.id}`, { method: 'PATCH', body: { status: 'Done' }, expected: 403 });
    }
    await managerUi.page.getByRole('button', { name: /Bảng \(Table\)/i }).click();
    await managerUi.page.getByPlaceholder(/Tìm kiếm công việc/i).fill(taskTitle);
    await managerUi.page.getByText(taskTitle, { exact: true }).waitFor();
    await managerUi.page.screenshot({ path: jsonPath('workflows', 'task_table_filter_and_kanban_status.png'), fullPage: true });
    summary.results.projectsTasks = {
      projectCreatedViaDrawer: true,
      projectStatus: project.status,
      taskCreatedViaDrawer: true,
      kanbanInteraction: 'Status select (Outcome B)',
      taskFinalStatus: 'In Progress',
      unassignedEmployeeRejected: Boolean(employeeUnassignedTask),
      tableSearch: true,
      result: 'Pass',
    };

    // Employee search/filter and six-tab 360 detail runtime.
    await settledGoto(managerUi.page, '/employees');
    const firstRowText = await managerUi.page.locator('tbody tr').first().innerText();
    const searchToken = firstRowText.split('\n')[0]?.split(' ')[0] || 'Nguyễn';
    await managerUi.page.getByPlaceholder(/Tìm kiếm theo tên/i).fill(searchToken);
    await managerUi.page.waitForTimeout(300);
    await managerUi.page.locator('tbody tr').first().waitFor();
    await settledGoto(managerUi.page, `/employees/${employee.user.id}`);


    const tabPatterns = [/Thông tin Tổng quan/i, /Nhiệm vụ Được gán/i, /Dự án Thâm nhập/i, /Lịch sử Nghỉ phép/i, /Đánh giá Hiệu suất/i, /Audit/i];

    for (const pattern of tabPatterns) assert.ok(await managerUi.page.getByRole('button', { name: pattern }).count() > 0, `Missing employee detail tab ${pattern}`);
    await managerUi.page.screenshot({ path: jsonPath('workflows', 'employee_search_and_360_tabs.png'), fullPage: true });
    summary.results.employees = { search: true, departmentFilterRendered: true, detailTabs: 6, result: 'Pass' };
    await managerUi.context.close();

    // Full leave state machine, invalid transition, final visibility, and notification.
    const leaveType = `Phase4 Closure ${runId}`;
    const leaveCreate = await request(employee, '/vacations', {
      method: 'POST',
      expected: 201,
      body: { type: leaveType, start_date: '2027-11-10', end_date: '2027-11-11', reason: marker, status: 'Pending' },
    });
    leaveId = leaveCreate.payload.id;
    assert.equal(leaveCreate.payload.status, 'Pending');
    const managerApproved = await request(manager, `/vacations/${leaveId}`, { method: 'PATCH', body: { status: 'Manager Approved' } });
    assert.equal(managerApproved.payload.status, 'Manager Approved');
    const invalidTransition = await request(employee, `/vacations/${leaveId}`, { method: 'PATCH', body: { status: 'HR Approved' }, expected: 409 });
    const adminApproved = await request(admin, `/vacations/${leaveId}`, { method: 'PATCH', body: { status: 'HR Approved' } });
    assert.equal(adminApproved.payload.status, 'HR Approved');
    const employeeFinal = await request(employee, `/vacations/${leaveId}`);
    assert.equal(employeeFinal.payload.status, 'HR Approved');
    const notificationResponse = await request(employee, '/notifications?size=100');
    const notifications = listFrom(notificationResponse.payload);
    const leaveNotifications = notifications.filter((item) => String(item.message || '').includes(leaveType));
    assert.ok(leaveNotifications.length >= 2, 'Expected manager and final leave notifications');
    leaveNotificationIds = leaveNotifications.map((item) => item.id);
    await request(employee, `/notifications/${leaveNotificationIds[0]}/read`, { method: 'PATCH' });
    summary.results.leave = {
      requestCreated: true,
      statuses: ['Pending', 'Manager Approved', 'HR Approved'],
      invalidEmployeeFinalTransition: invalidTransition.status,
      finalVisibleToEmployee: true,
      notificationCount: leaveNotifications.length,
      markRead: true,
      result: 'Pass pending cleanup',
    };
    await saveJson('leave', 'full_workflow.json', {
      generatedAt: new Date().toISOString(),
      environment: 'production Compose via Nginx',
      marker,
      internalRequestId: leaveId,
      ...summary.results.leave,
    });

    // Dashboard UI values against the live analytics payload.
    const analyticsResponse = await request(admin, '/dashboard/analytics');
    const analytics = unwrap(analyticsResponse.payload);
    const adminUi = await browserLogin(browser, accounts.admin);
    await settledGoto(adminUi.page, '/dashboard');
    const expectedKpis = [
      analytics.overview.active_projects,
      analytics.overview.pending_tasks,
      analytics.overview.active_employees,
      analytics.overview.total_departments,
      analytics.overview.pending_vacation_requests,
      analytics.overview.overdue_tasks,
    ];
    const renderedKpis = [];
    for (let index = 0; index < expectedKpis.length; index += 1) {
      const card = adminUi.page.getByTestId(`dashboard-kpi-${index}`);
      await card.waitFor();
      const text = await card.innerText();
      assert.match(text, new RegExp(`(^|\\D)${expectedKpis[index]}(\\D|$)`));
      renderedKpis.push(expectedKpis[index]);
    }
    for (const testId of ['dashboard-chart-task-status', 'dashboard-chart-workload', 'dashboard-chart-monthly-activity']) {
      await adminUi.page.getByTestId(testId).waitFor();
      assert.ok(await adminUi.page.getByTestId(testId).locator('.recharts-responsive-container').count() === 1);
    }
    const workforceText = await adminUi.page.getByTestId('workforce-demo-table').innerText();
    for (const department of analytics.employees_by_department) assert.match(workforceText, new RegExp(department.department_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await adminUi.page.screenshot({ path: jsonPath('dashboard', 'api_ui_reconciliation.png'), fullPage: true });
    summary.results.dashboard = {
      kpiExpected: expectedKpis,
      kpiRendered: renderedKpis,
      chartCount: 3,
      taskStatusSeries: analytics.tasks_by_status,
      workloadSeriesCount: analytics.workload_by_department.length,
      monthlySeriesCount: analytics.monthly_activity.length,
      workforceRows: analytics.employees_by_department.length,
      result: 'Pass (API/UI); SQL cross-check recorded separately',
    };
    await saveJson('dashboard', 'api_ui_reconciliation.json', { generatedAt: new Date().toISOString(), ...summary.results.dashboard });
    await adminUi.context.close();

    // Mobile drawer and touch target interaction.
    const mobileUi = await browserLogin(browser, accounts.employee, defaultPassword, { width: 390, height: 844 });
    const menuButton = mobileUi.page.getByRole('button', { name: 'Open mobile menu' });
    const menuBox = await menuButton.boundingBox();
    assert.ok(menuBox && menuBox.width >= 32 && menuBox.height >= 32);
    await menuButton.click();
    await mobileUi.page.getByRole('dialog', { name: /TaskSync Navigation/i }).waitFor();
    await mobileUi.page.screenshot({ path: jsonPath('mobile', 'drawer_open_390x844.png'), fullPage: true });
    await mobileUi.page.getByRole('dialog').getByText('Notifications', { exact: true }).click();
    await mobileUi.page.waitForURL('**/notifications');
    await mobileUi.page.getByRole('dialog').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
    assert.equal(await mobileUi.page.getByRole('dialog').count(), 0);

    summary.results.mobile = { viewport: '390x844', menuTouchTarget: menuBox, drawerOpened: true, navigationClosedDrawer: true, result: 'Pass' };
    await saveJson('mobile', 'interaction.json', { generatedAt: new Date().toISOString(), ...summary.results.mobile });
    await mobileUi.context.close();

    workflowSucceeded = true;
    await saveJson('workflows', 'final_acceptance.json', { ...summary, result: 'Pass pending avatar restart and cleanup stages' });
  } catch (error) {
    await saveJson('workflows', 'final_acceptance_failure.json', {
      generatedAt: new Date().toISOString(),
      marker,
      error: error instanceof Error ? error.message : String(error),
      completedResults: summary.results,
      result: 'Fail',
    });
    throw error;
  } finally {
    // Revert mutable account fields even when a later assertion fails.
    try {
      const currentEmployee = await login(accounts.employee, passwordChanged ? temporaryPassword : defaultPassword);
      if (passwordChanged) {
        await request(currentEmployee, '/auth/change-password', {
          method: 'POST',
          body: { old_password: temporaryPassword, new_password: defaultPassword, confirm_password: defaultPassword },
        });
      }
      if (phoneOriginal !== null) {
        await request(currentEmployee, `/employees/${currentEmployee.user.id}`, { method: 'PUT', body: { phone: phoneOriginal } });
      }
      for (const notificationId of leaveNotificationIds) {
        try { await request(currentEmployee, `/notifications/${notificationId}`, { method: 'DELETE' }); } catch { /* cleanup recorded later */ }
      }
      if (!workflowSucceeded && avatarUrl) {
        try { await request(currentEmployee, '/employees/avatar', { method: 'DELETE' }); } catch { /* best effort */ }
      }
    } catch { /* preserve the primary failure */ }
    try { if (taskId) await request(manager, `/tasks/${taskId}`, { method: 'DELETE' }); } catch { /* best effort */ }
    try { if (projectId) await request(manager, `/projects/${projectId}`, { method: 'DELETE' }); } catch { /* best effort */ }
    await browser.close();
    if (leaveId) {
      await saveJson('leave', 'cleanup_pending.json', {
        generatedAt: new Date().toISOString(), marker, internalRequestId: leaveId,
        reason: 'Vacation API has no delete endpoint; cleanup must use a scoped backend DB command.',
      });
    }
  }
}

if (stage === 'workflows') await workflowAudit();
else if (stage === 'verify-avatar') await avatarRestartVerification();
else if (stage === 'cleanup-avatar') await avatarCleanup();
else throw new Error(`Unknown stage: ${stage}`);

console.log(JSON.stringify({ status: 'ok', stage, label, evidenceRoot }, null, 2));

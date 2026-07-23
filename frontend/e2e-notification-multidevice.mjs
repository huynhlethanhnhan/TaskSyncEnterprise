import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(here, '../docs/evidence/phase-4/notifications');

const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1';
const password = process.env.E2E_PASSWORD || 'TaskSync@2026';
const browser = await chromium.launch({ executablePath, headless: true });
await mkdir(outputDirectory, { recursive: true });

async function login(page, email) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In to Portal' }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
}

async function api(page, path, options = {}) {
  return page.evaluate(async ({ path: requestPath, options: requestOptions }) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(requestPath, {
      ...requestOptions,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(requestOptions.headers || {}),
      },
    });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`);
    return body;
  }, { path, options });
}

const adminContext = await browser.newContext();
const employeeContext = await browser.newContext();
const adminPage = await adminContext.newPage();
const employeePage = await employeeContext.newPage();
let createdTaskId;
let notificationIds = [];

try {
  const websocketFrames = [];
  employeePage.on('websocket', (socket) => {
    socket.on('framereceived', (event) => websocketFrames.push(String(event.payload)));
  });

  await Promise.all([
    login(adminPage, 'admin@tasksync.example.com'),
    login(employeePage, 'employee028@tasksync.example.com'),
  ]);
  await employeePage.goto(`${baseUrl}/notifications`, { waitUntil: 'networkidle' });

  const employeesResponse = await api(adminPage, '/api/v1/employees?size=100');
  const employees = employeesResponse?.data?.items || employeesResponse?.data || employeesResponse;
  const projectsResponse = await api(adminPage, '/api/v1/projects?size=100');
  const projects = projectsResponse?.data?.items || projectsResponse?.data || projectsResponse;
  const employee = employees.find((item) => item.email === 'employee028@tasksync.example.com');
  assert.ok(employee, 'Demo employee must exist');
  assert.ok(projects.length > 0, 'At least one demo project must exist');

  const marker = `Realtime multi-device ${Date.now()}`;
  const startedAt = Date.now();
  const task = await api(adminPage, '/api/v1/tasks', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projects[0].id,
      title: marker,
      description: 'Automated WebSocket delivery check',
      priority: 'Medium',
      status: 'To Do',
      assigned_to: employee.id,
    }),
  });
  createdTaskId = task.id;

  await employeePage.getByText(marker, { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  const elapsedMs = Date.now() - startedAt;
  const matchingFrame = websocketFrames
    .map((frame) => {
      try { return JSON.parse(frame); } catch { return null; }
    })
    .find((frame) => frame?.message === marker);

  assert.ok(matchingFrame, 'Employee browser must receive the task notification over WebSocket');
  assert.ok(elapsedMs < 5_000, `Realtime notification took ${elapsedMs}ms`);

  await employeePage.waitForTimeout(300);
  const notificationsResponse = await api(employeePage, '/api/v1/notifications?size=100');
  const notifications = notificationsResponse?.data?.items || notificationsResponse?.data || notificationsResponse;
  const matchingNotifications = notifications.filter((item) => item.message?.includes(marker));
  notificationIds = matchingNotifications.map((item) => item.id);
  assert.equal(matchingNotifications.length, 1, 'One task assignment must create exactly one notification');

  const evidence = {
    status: 'ok',
    generatedAt: new Date().toISOString(),
    browser: 'chrome',
    browserVersion: browser.version(),
    elapsedMs,
    websocketPayload: matchingFrame,
    matchingNotificationCount: matchingNotifications.length,
  };
  await employeePage.screenshot({ path: path.join(outputDirectory, 'realtime_ws.png'), fullPage: true });
  await writeFile(path.join(outputDirectory, 'latency_benchmark.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  if (createdTaskId) {
    await api(adminPage, `/api/v1/tasks/${createdTaskId}`, { method: 'DELETE' }).catch(() => undefined);
  }
  for (const id of notificationIds) {
    await api(adminPage, `/api/v1/notifications/${id}`, { method: 'DELETE' }).catch(() => undefined);
  }
  await browser.close();
}

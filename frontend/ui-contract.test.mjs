import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('bundles one local font for consistent Chrome and Eagle rendering', async () => {
  const css = await read('./src/index.css');
  const main = await read('./src/main.jsx');
  const bundledFontCss = await read('./node_modules/@fontsource-variable/inter/wght.css');
  assert.match(main, /@fontsource-variable\/inter\/wght\.css/);
  assert.match(bundledFontCss, /@font-face/);
  assert.match(bundledFontCss, /url\([^)]*\.woff2/);
  assert.match(css, /--font-sans:\s*['"]Inter Variable/);
});

test('navbar unread badge comes from the notification query', async () => {
  const shell = await read('./src/layouts/ApplicationShell.tsx');
  assert.doesNotMatch(shell, /unreadNotificationsCount=\{3\}/);
  assert.match(shell, /notifications\.filter\(.*!.*is_read/);
});

test('notification API methods match FastAPI routes and refresh promptly', async () => {
  const services = await read('./src/api/services.ts');
  const hooks = await read('./src/hooks/useNotifications.ts');
  assert.match(services, /api\.patch\(`\/notifications\/\$\{id\}\/read`\)/);
  assert.match(services, /api\.patch\('\/notifications\/read-all'\)/);
  assert.match(hooks, /refetchInterval:\s*1000\s*\*\s*(?:5|10|15)/);
});

test('dashboard includes the requested workforce demo table', async () => {
  const dashboard = await read('./src/pages/dashboard/DashboardPage.tsx');
  assert.match(dashboard, /data-testid=["']workforce-demo-table["']/);
  assert.match(dashboard, /dashboard-kpi-/);
  assert.match(dashboard, /dashboard-chart-task-status/);
  assert.match(dashboard, /Phân bổ nhân sự và công việc/);
});

test('project creation drawer supplies the backend-required project code', async () => {
  const drawer = await read('./src/components/drawers/ProjectDrawer.tsx');
  assert.match(drawer, /project_code:\s*projectCode\.trim\(\)\.toUpperCase\(\)/);
  assert.match(drawer, /required=\{!project\}/);
});

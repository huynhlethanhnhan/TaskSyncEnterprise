import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('bundles one local font for consistent Chrome and Eagle rendering', async () => {
  const css = await read('./src/index.css');
  const main = await read('./src/main.tsx');
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

test('development websocket bypasses the Vite proxy during backend reloads', async () => {
  const viteConfig = await read('./vite.config.js');
  const hooks = await read('./src/hooks/useNotifications.ts');

  assert.doesNotMatch(viteConfig, /['"]\/ws['"]\s*:/);
  assert.match(hooks, /import\.meta\.env\.DEV/);
  assert.match(hooks, /ws:\/\/127\.0\.0\.1:8000\/ws\/notifications/);
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

test('work manager navigation and sprint planning prevent conflicting actions', async () => {
  const shell = await read('./src/layouts/ApplicationShell.tsx');
  const backlog = await read('./src/components/backlog/BacklogManager.tsx');
  const sprints = await read('./src/components/sprints/SprintsManager.tsx');

  assert.doesNotMatch(shell, /key:\s*['"]\/kanban['"]/);
  assert.match(backlog, /sprints\.filter\(\(s\) => s\.status === ['"]Planned['"]\)/);
  assert.match(backlog, /useCreateTopic/);
  assert.match(sprints, /sprintStatus === ['"]Active['"]/);
  assert.match(sprints, /Sprint sẽ trở về trạng thái Planned/);
});

test('department UI consumes project and sprint work metrics', async () => {
  const services = await read('./src/api/services.ts');
  const departmentPage = await read('./src/pages/departments/DepartmentPage.tsx');

  assert.match(services, /completed_project_count\?: number/);
  assert.match(services, /sprint_count\?: number/);
  assert.match(departmentPage, /dept\.completed_project_count/);
  assert.match(departmentPage, /dept\.sprint_count/);
});

test('task management defaults to Kanban and project detail has one task board', async () => {
  const shell = await read('./src/layouts/ApplicationShell.tsx');
  const taskPage = await read('./src/pages/tasks/TaskPage.tsx');
  const projectDetail = await read('./src/pages/projects/ProjectDetailPage.tsx');

  assert.match(shell, /navigate\(['"]\/tasks\?view=kanban['"]\)/);
  assert.match(taskPage, /roleId === 3/);
  assert.doesNotMatch(projectDetail, /\{\s*id:\s*['"]board['"]/);
  assert.doesNotMatch(projectDetail, /activeTab === ['"]board['"]/);
  assert.match(projectDetail, /Công việc \(Kanban\)/);
});

test('task attachment mutations update the visible detail cache immediately', async () => {
  const drawer = await read('./src/components/drawers/TaskDrawer.tsx');

  assert.match(drawer, /setQueryData<TaskItem>\(\[['"]tasks['"], task\.id\]/);
  assert.match(drawer, /attachments:\s*\[\.\.\.\(current\?\.attachments \|\| task\.attachments \|\| \[\]\), newAttachment\]/);
  assert.match(drawer, /attachments:\s*\(current\?\.attachments \|\| task\.attachments \|\| \[\]\)\.filter/);
});

test('sprint selector starts from an active project and employee audit uses the real route', async () => {
  const sprints = await read('./src/pages/tasks/SprintsPage.tsx');
  const employeeDetail = await read('./src/pages/employees/EmployeeDetailPage.tsx');
  const teamPage = await read('./src/pages/teams/TeamPage.tsx');

  assert.match(sprints, /projects\.find\(\(project\) => project\.status === ['"]Active['"]\)/);
  assert.match(employeeDetail, /\/audit-logs\?employee_id=/);
  assert.doesNotMatch(teamPage, /console\.log/);
});

test('authentication changes clear role-scoped server state', async () => {
  const auth = await read('./src/providers/AuthProvider.tsx');

  assert.match(auth, /useQueryClient/);
  assert.match(auth, /queryClient\.clear\(\)/);
});

test('realtime events refresh task and avatar data across browser sessions', async () => {
  const realtime = await read('./src/hooks/useNotifications.ts');
  const taskPage = await read('./src/pages/tasks/TaskPage.tsx');

  assert.match(realtime, /JSON\.parse\(event\.data\)/);
  assert.match(realtime, /queryClient\.invalidateQueries\(\{\s*queryKey:\s*\[['"]tasks['"]\]/);
  assert.match(realtime, /queryClient\.invalidateQueries\(\{\s*queryKey:\s*\[['"]employees['"]\]/);
  assert.match(taskPage, /<Avatar\s+name=\{assignee\.full_name\}\s+src=\{assignee\.avatar_url\}/);
});

test('collaboration and leave changes refresh across browser sessions without F5', async () => {
  const realtime = await read('./src/hooks/useNotifications.ts');

  for (const [eventName, queryKey] of [
    ['topic.changed', 'topics'],
    ['feedback.changed', 'feedback'],
    ['file.changed', 'files'],
    ['vacation.changed', 'vacations'],
  ]) {
    assert.match(realtime, new RegExp(eventName.replace('.', '\\.')));
    assert.match(
      realtime,
      new RegExp(`queryKey:\\s*\\[['"]${queryKey}['"]\\]`),
    );
  }
});

test('employee self-service and settings use the shared system UI contracts', async () => {
  const shell = await read('./src/layouts/ApplicationShell.tsx');
  const card = await read('./src/components/common/Card.tsx');
  const settings = await read('./src/pages/settings/SettingsPage.tsx');

  assert.doesNotMatch(shell, /Create Leave Request|vacations-request|PlusCircle/);
  assert.match(shell, /isAdmin \? ['"]System Settings['"] : ['"]My Settings['"]/);
  assert.match(card, /first:pt-4/);
  assert.match(settings, /useTheme/);
  assert.match(settings, /tasksync_language/);
  assert.doesNotMatch(settings, /setTimeout/);
});

test('task administration is limited while assignees can update status', async () => {
  const taskPage = await read('./src/pages/tasks/TaskPage.tsx');
  const drawer = await read('./src/components/drawers/TaskDrawer.tsx');

  assert.match(taskPage, /team\.leader_id/);
  assert.match(taskPage, /const canEditTask = /);
  assert.match(taskPage, /canEdit=\{canEditTask\(editingTask\)\}/);
  assert.match(drawer, /if \(!canEdit && !isAssignedToCurrentUser\) return/);
  assert.match(drawer, /const canUpdateStatus = canEdit \|\| isAssignedToCurrentUser/);
  assert.match(drawer, /disabled=\{!canEdit\}/);
});

test('task assignees are project-scoped and never fall back to global employees', async () => {
  const drawer = await read('./src/components/drawers/TaskDrawer.tsx');
  const hooks = await read('./src/hooks/useProjects.ts');
  const services = await read('./src/api/services.ts');

  assert.match(hooks, /queryKey:\s*\['project-eligible-assignees', projectId\]/);
  assert.match(hooks, /getEligibleAssignees\(projectId!, signal\)/);
  assert.match(services, /\/eligible-assignees`/);
  assert.doesNotMatch(drawer, /projectMembers\.length > 0 \? projectMembers : _employees/);
  assert.match(drawer, /setAssignedTo\(''\)/);
  assert.match(drawer, /Không có Người thực hiện phù hợp/);
});

test('organization project metrics navigate to a scoped project list', async () => {
  const departmentPage = await read('./src/pages/departments/DepartmentPage.tsx');
  const departmentDetail = await read('./src/pages/departments/DepartmentDetailPage.tsx');
  const teamDetail = await read('./src/pages/teams/TeamDetailPage.tsx');
  const employeeDetail = await read('./src/pages/employees/EmployeeDetailPage.tsx');
  const projectPage = await read('./src/pages/projects/ProjectPage.tsx');
  const projectDetail = await read('./src/pages/projects/ProjectDetailPage.tsx');

  assert.match(departmentPage, /projects\?department_id=\$\{dept\.id\}/);
  assert.match(departmentDetail, /projects\?department_id=\$\{department\.id\}/);
  assert.match(teamDetail, /projects\?team_id=\$\{team\.id\}/);
  assert.match(employeeDetail, /navigate\(`\/projects\/\$\{p\.id\}`\)/);
  assert.match(projectPage, /searchParams\.get\('department_id'\)/);
  assert.match(projectPage, /searchParams\.get\('team_id'\)/);
  assert.match(projectPage, /useProjects\(projectFilters\)/);
  assert.match(projectPage, /department_id: departmentId \|\| undefined/);
  assert.match(
    projectDetail,
    /isAdminOrManager\s*\? \[\{ id: 'settings'/,
  );
});

test('delegated team leaders receive a direct scoped team route', async () => {
  const shell = await read('./src/layouts/ApplicationShell.tsx');
  const router = await read('./src/router/AppRouter.tsx');
  const auth = await read('./src/providers/AuthProvider.tsx');

  assert.match(auth, /is_team_leader\?: boolean/);
  assert.match(shell, /user\?\.is_team_leader/);
  assert.match(shell, /label: 'My Team'/);
  assert.match(shell, /navigate\(`\/teams\/\$\{user\?\.team_id\}`\)/);
  assert.match(
    router,
    /path="\/teams\/:id"[\s\S]*?<ProtectedRoute>[\s\S]*?<TeamDetailPage/,
  );
});

test('browser acceptance health check follows the configured API origin', async () => {
  const acceptanceRunner = await read('./e2e/run-acceptance.mjs');

  assert.match(
    acceptanceRunner,
    /const backendHealthUrl = new URL\('\/health', apiBaseUrl\)\.toString\(\)/,
  );
  assert.match(acceptanceRunner, /fetch\(backendHealthUrl\)/);
  assert.doesNotMatch(
    acceptanceRunner,
    /fetch\(['"]http:\/\/127\.0\.0\.1:8000\/health['"]\)/,
  );
});

test('browser acceptance retains four-role dashboard evidence without role skips', async () => {
  const acceptanceRunner = await read('./e2e/run-acceptance.mjs');

  assert.match(acceptanceRunner, /manager_dashboard\.png/);
  assert.match(acceptanceRunner, /team-leader_dashboard\.png/);
  assert.match(acceptanceRunner, /employee_dashboard\.png/);
  assert.doesNotMatch(acceptanceRunner, /SKIPPED \(Account unseeded\)/);
  assert.match(acceptanceRunner, /Employee login failed for \$\{employeeEmail\}/);
  assert.match(acceptanceRunner, /assert\.deepEqual\(metrics\.consoleErrors, \[\]/);
  assert.match(acceptanceRunner, /assert\.deepEqual\(metrics\.networkErrors, \[\]/);
});

test('non-manager dashboards do not request the protected Department directory', async () => {
  const dashboard = await read('./src/pages/dashboard/DashboardPage.tsx');
  const departmentHooks = await read('./src/hooks/useDepartments.ts');

  assert.match(departmentHooks, /useDepartments = \(enabled = true\)/);
  assert.match(departmentHooks, /queryFn: departmentsApi\.getAll,[\s\S]*?enabled,/);
  assert.match(dashboard, /useDepartments\(permissions\.canManageDepartment\)/);
});

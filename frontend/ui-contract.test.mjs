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

test('dark variant is bound to class strategy and project detail omits budget', async () => {
  const css = await read('./src/index.css');
  const projectDetail = await read('./src/pages/projects/ProjectDetailPage.tsx');

  assert.match(css, /@custom-variant\s+dark\s+\(&:\s*where\(\.dark,\s*\.dark\s*\*\)\);/);
  assert.doesNotMatch(projectDetail, /Ngân sách/);
  assert.doesNotMatch(projectDetail, /project\.budget/);
});

test('task drawer and project detail provide sprint, backlog, and standalone work context warnings', async () => {
  const taskDrawer = await read('./src/components/drawers/TaskDrawer.tsx');
  const projectDetail = await read('./src/pages/projects/ProjectDetailPage.tsx');

  // Verify TaskDrawer context banners
  assert.match(taskDrawer, /data-testid=["']task-sprint-warning["']/);
  assert.match(taskDrawer, /data-testid=["']task-backlog-notice["']/);
  assert.match(taskDrawer, /data-testid=["']task-standalone-notice["']/);
  assert.match(taskDrawer, /Sprint Burndown Chart/);
  assert.match(taskDrawer, /Công việc Riêng lẻ \(Standalone Task\)/);

  // Verify ProjectDetailPage context badges and real-time progress
  assert.match(projectDetail, /computedProgress/);
  assert.match(projectDetail, /effectiveProjectStatus/);
  assert.match(projectDetail, /Sprint:/);
  assert.match(projectDetail, /Backlog/);
  assert.match(projectDetail, /Riêng lẻ/);
});

test('phase 3 HRM portal, task multi-table search, and Admin@Task2026! password contract are wired', async () => {
  const services = await read('./src/api/services.ts');
  const hrmHooks = await read('./src/hooks/useHRM.ts');
  const hrmPage = await read('./src/pages/hrm/HRMHubPage.tsx');
  const vacationPage = await read('./src/pages/vacations/VacationPage.tsx');
  const taskPage = await read('./src/pages/tasks/TaskPage.tsx');
  const employeeDrawer = await read('./src/components/drawers/EmployeeDrawer.tsx');
  const router = await read('./src/router/AppRouter.tsx');
  const shell = await read('./src/layouts/ApplicationShell.tsx');

  // Password & system role standard sync (3 DB roles: 1 Admin, 2 Manager, 3 Employee)
  assert.match(employeeDrawer, /setPassword\(['"]Admin@Task2026!['"]\)/);
  assert.match(employeeDrawer, /setRoleId\(3\)/);
  assert.doesNotMatch(employeeDrawer, /setRoleId\(4\)/);
  assert.doesNotMatch(employeeDrawer, /value:\s*['"]4['"]/);
  assert.doesNotMatch(employeeDrawer, /TaskSync@2026/);

  // HRM endpoints + React Query hooks + Router + Navigation
  assert.match(services, /\/tasks\/search/);
  assert.match(services, /\/hrm\/me\/overview/);
  assert.match(services, /\/hrm\/leave-task-conflicts/);
  assert.match(services, /\/hrm\/attendance\/check-in/);
  assert.match(services, /\/hrm\/overtime\/\$\{overtimeId\}\/leader-note/);
  assert.match(services, /\/hrm\/contracts/);
  assert.match(services, /\/hrm\/backups/);
  assert.match(hrmHooks, /@tanstack\/react-query/);
  assert.match(router, /path="\/hrm"[\s\S]*?<HRMHubPage/);
  assert.match(shell, /key:\s*['"]\/hrm['"]/);
  assert.match(hrmPage, /data-testid=["']hrm-overview-grid["']/);

  // VacationPage HRM integration & anti-self-approval UI guard
  assert.match(vacationPage, /useHrmLeaveBalanceMe/);
  assert.match(vacationPage, /useHrmLeaveTaskConflicts/);
  assert.match(vacationPage, /canManagerAction && !isOwner/);

  // TaskPage server-side multi-table search
  assert.match(taskPage, /useSearchTasks/);
  assert.match(taskPage, /overdue_only:\s*overdueOnly/);
});

test('Phase 4: Settings runtime sync, Badge nowrap, Full HRM Payroll/Recruitment/Popups & Employee 360 HRM tab', async () => {
  const settingsProvider = await read('src/providers/SettingsProvider.tsx');
  const badge = await read('src/components/common/Badge.tsx');
  const hrmModals = await read('src/components/hrm/HrmModals.tsx');
  const hrmPage = await read('src/pages/hrm/HRMHubPage.tsx');
  const empDetail = await read('src/pages/employees/EmployeeDetailPage.tsx');
  const empHrmTab = await read('src/components/hrm/EmployeeHrmTabPanel.tsx');
  const settingsPage = await read('src/pages/settings/SettingsPage.tsx');

  // #2 Settings synchronization
  assert.match(settingsProvider, /settingsApi\.getRuntime/);
  assert.match(settingsProvider, /classList\.toggle\(['"]compact['"]/);
  assert.match(settingsProvider, /document\.title\s*=/);
  assert.match(settingsPage, /useSettings/);

  // #1 Badge no-wrap & DataTable standardization
  assert.match(badge, /whitespace-nowrap/);
  assert.match(hrmPage, /DataTableWrapper/);
  assert.match(hrmPage, /min-w-\[140px\]/);

  // #3 HRM Payroll, Recruitment/Onboarding, Attendance/OT/Contract Popups, Employee 360 Tab
  assert.match(hrmModals, /PayrollDetailModal/);
  assert.match(hrmModals, /CandidateModal/);
  assert.match(hrmModals, /CandidateOnboardModal/);
  assert.match(hrmModals, /AttendanceDetailModal/);
  assert.match(hrmPage, /useCalculatePayrolls/);
  assert.match(hrmPage, /useOnboardCandidate/);
  assert.match(empDetail, /EmployeeHrmTabPanel/);
  assert.match(empHrmTab, /useHrmPayrolls/);
  assert.match(empHrmTab, /useHrmContracts/);
});

test('Phase 5: Sidebar/Table Pin, Navbar Back/Theme Sync, Select Arrow Fix, Attendance Self-Edit & Route Progress', async () => {
  const sidebar = await read('src/components/layout/Sidebar.tsx');
  const navbar = await read('src/components/layout/Navbar.tsx');
  const shell = await read('src/layouts/ApplicationShell.tsx');
  const themeProvider = await read('src/providers/ThemeProvider.tsx');
  const css = await read('src/index.css');
  const selectComp = await read('src/components/ui/Select.tsx');
  const dataTable = await read('src/components/data-display/DataTableWrapper.tsx');
  const tabsComp = await read('src/components/navigation/Tabs.tsx');
  const hrmModals = await read('src/components/hrm/HrmModals.tsx');
  const hrmPage = await read('src/pages/hrm/HRMHubPage.tsx');
  const notifPage = await read('src/pages/notifications/NotificationsPage.tsx');

  // Sidebar chevron toggle + T home + Back/Home navigation + Theme Sync
  assert.match(sidebar, /onBrandClick/);
  assert.match(sidebar, /ChevronLeft|ChevronRight/);
  assert.match(navbar, /navigate\(-1\)/);
  assert.match(navbar, /navigate\('\/dashboard'\)/);
  assert.match(shell, /updatePrefs\(\{\s*theme:/);
  assert.match(shell, /useIsFetching/);
  assert.match(shell, /role="progressbar"/);
  assert.match(themeProvider, /React\.useCallback/);

  // Single Select arrow + fluid container card grids + Google Sheets Freeze Panes
  assert.match(css, /appearance:\s*none\s*!important/);
  assert.match(css, /picker-icon/);
  assert.match(css, /card-grid-fluid/);
  assert.match(selectComp, /truncate/);
  assert.match(tabsComp, /flex-wrap/);
  assert.match(dataTable, /pinnedLeftCount/);
  assert.match(dataTable, /table-freeze-toolbar/);
  assert.match(dataTable, /onEmptyAction/);

  // Attendance time HH:MM / HH:MM:SS formatter, Admin self-edit, & Undo Check-out
  assert.match(hrmModals, /formatTimeHHMM/);
  assert.match(hrmModals, /initialEditMode/);
  assert.match(hrmModals, /Xóa giờ Check-out/);
  assert.match(hrmPage, /Chỉnh sửa giờ hôm nay/);
  assert.match(hrmPage, /isAdmin \|\| \(isManager && !isSelf\)/);
  assert.match(notifPage, /Làm mới hộp thư/);
});

test('Phase 6: Global StatusBadge, EntityActions, full vi/en i18n & mobile sticky header contract', async () => {
  const globalLabels = await read('src/utils/globalLabels.ts');
  const statusBadge = await read('src/components/common/StatusBadge.tsx');
  const entityActions = await read('src/components/common/EntityActions.tsx');
  const navbar = await read('src/components/layout/Navbar.tsx');
  const shell = await read('src/layouts/ApplicationShell.tsx');

  assert.match(globalLabels, /export (?:const|function) getStatusMeta/);
  assert.match(globalLabels, /export (?:const|function) getStatusLabel/);
  assert.match(globalLabels, /export (?:const|function) getStatusSelectClass/);
  assert.match(globalLabels, /export const GLOBAL_ACTION_TEXT/);
  assert.match(statusBadge, /useSettings/);
  assert.match(entityActions, /useSettings/);
  assert.match(entityActions, /IconActionButton/);
  assert.match(entityActions, /role="tooltip"/);
  assert.match(navbar, /onOpenMobileMenu/);
  assert.match(shell, /sticky top-0 z-header/);
  assert.match(shell, /onOpenMobileMenu=\{\(\) => setMobileDrawerOpen\(true\)\}/);
  const taskPage = await read('src/pages/tasks/TaskPage.tsx');
  assert.match(taskPage, /getStatusSelectClass/);

  const badgePages = [
    'src/pages/tasks/TaskPage.tsx',
    'src/pages/projects/ProjectPage.tsx',
    'src/pages/departments/DepartmentPage.tsx',
    'src/pages/teams/TeamPage.tsx',
    'src/pages/dashboard/DashboardPage.tsx',
    'src/pages/vacations/VacationPage.tsx',
    'src/pages/hrm/HRMHubPage.tsx',
    'src/pages/employees/EmployeePage.tsx',
    'src/pages/profile/ReportsPage.tsx',
  ];
  for (const pagePath of badgePages) {
    const src = await read(pagePath);
    assert.match(src, /<StatusBadge/, `${pagePath} must use <StatusBadge>`);
    assert.match(src, /useSettings/, `${pagePath} must use useSettings`);
  }

  const actionPages = [
    'src/pages/tasks/TaskPage.tsx',
    'src/pages/projects/ProjectPage.tsx',
    'src/pages/departments/DepartmentPage.tsx',
    'src/pages/teams/TeamPage.tsx',
    'src/pages/vacations/VacationPage.tsx',
    'src/pages/hrm/HRMHubPage.tsx',
    'src/pages/employees/EmployeePage.tsx',
  ];
  for (const pagePath of actionPages) {
    const src = await read(pagePath);
    assert.match(src, /<EntityActions/, `${pagePath} must use <EntityActions>`);
  }
});

test('Phase 7: Portal Dropdown, 3-dot table EntityActions, FileText detail icon, centered cards & Avatar status badge', async () => {
  const avatar = await read('src/components/common/Avatar.tsx');
  const dropdown = await read('src/components/common/Dropdown.tsx');
  const entityActions = await read('src/components/common/EntityActions.tsx');
  const employeePage = await read('src/pages/employees/EmployeePage.tsx');
  const taskPage = await read('src/pages/tasks/TaskPage.tsx');
  const hrmPage = await read('src/pages/hrm/HRMHubPage.tsx');
  const deptPage = await read('src/pages/departments/DepartmentPage.tsx');
  const teamPage = await read('src/pages/teams/TeamPage.tsx');
  const projectPage = await read('src/pages/projects/ProjectPage.tsx');

  // Avatar status indicator outside overflow-hidden inner crop
  assert.match(avatar, /ring-2 ring-surface/);
  assert.match(avatar, /-bottom-0\.5 -right-0\.5/);

  // Portal dropdown prevents overflow-x-auto table clipping
  assert.match(dropdown, /createPortal/);
  assert.match(dropdown, /position:\s*['"]fixed['"]/);

  // EntityActions replaces Eye with FileText and supports layout="menu"
  assert.doesNotMatch(entityActions, /\bEye\b/);
  assert.match(entityActions, /\bFileText\b/);
  assert.match(entityActions, /MoreVertical/);
  assert.match(entityActions, /layout\s*===\s*['"]menu['"]/);
  assert.match(entityActions, /align\s*===\s*['"]center['"]/);

  // Table rows use 3-dot dropdown menu & cards preserve clean footer alignment + truncation
  const card = await read('src/components/common/Card.tsx');
  assert.match(card, /hasShorthandPadding/);
  assert.match(employeePage, /layout="menu"/);
  assert.match(taskPage, /layout="menu"/);
  assert.match(hrmPage, /layout="menu"/);
  assert.doesNotMatch(hrmPage, /\bEye\b/);
  assert.match(hrmPage, /\bFileText\b/);
  assert.match(deptPage, /justify-center/);
  assert.match(teamPage, /align="end"/);
  assert.match(projectPage, /align="end"/);
});

test('Phase 8: Sprint task rename, SP timeline overlap guard, borderless actions, employee contact edit & balanced Dashboard', async () => {
  const entityActions = await read('src/components/common/EntityActions.tsx');
  const jiraTimeline = await read('src/components/timeline/JiraTimeline.tsx');
  const taskDrawer = await read('src/components/drawers/TaskDrawer.tsx');
  const sprintsManager = await read('src/components/sprints/SprintsManager.tsx');
  const employeeDrawer = await read('src/components/drawers/EmployeeDrawer.tsx');
  const employeeDetail = await read('src/pages/employees/EmployeeDetailPage.tsx');
  const dashboard = await read('src/pages/dashboard/DashboardPage.tsx');

  // Borderless action icons including 3-dot button
  assert.doesNotMatch(entityActions, /border-border\/80/);
  assert.doesNotMatch(entityActions, /border-rose-200\/80/);
  assert.match(entityActions, /tone="neutral"/);

  // JiraTimeline 3 SP pill overlap fix
  assert.match(jiraTimeline, /widthPercent >= 16/);
  assert.match(jiraTimeline, /overflow-hidden/);

  // TaskDrawer sends minimal diff on edit and restricts story_points to Fibonacci choices
  assert.match(taskDrawer, /if \(normalizedTitle !== originalTitle\)/);
  assert.match(taskDrawer, /\[1, 2, 3, 5, 8, 13\]/);
  assert.match(sprintsManager, /TaskDrawer/);

  // Employee gender, address & contact edit support
  assert.match(employeeDrawer, /setGender/);
  assert.match(employeeDrawer, /setAddress/);
  assert.match(employeeDrawer, /contactOnly/);
  assert.match(employeeDetail, /formatGenderLabel/);
  assert.match(employeeDetail, /EmployeeDrawer/);

  // Dashboard equalized spacing, chart height preservation & clutter removal
  assert.doesNotMatch(dashboard, /items-start/);
  assert.match(dashboard, /items-stretch/);
  assert.doesNotMatch(dashboard, /upcoming_birthdays/);
  assert.doesNotMatch(dashboard, /className="h-64 flex-1"/);
  assert.match(dashboard, /<div className="h-64 w-full min-w-0">/);
  assert.match(dashboard, /<ResponsiveContainer width="100%" height=\{256\}>/);
});

test('Phase 9: Employee contracts outside HRM, live online/offline presence, modern Select portal, ConfirmDialog & Dashboard chart selectors', async () => {
  const selectComp = await read('src/components/ui/Select.tsx');
  const pagination = await read('src/components/data-display/Pagination.tsx');
  const globalLabels = await read('src/utils/globalLabels.ts');
  const employeePage = await read('src/pages/employees/EmployeePage.tsx');
  const employeeDetail = await read('src/pages/employees/EmployeeDetailPage.tsx');
  const profilePage = await read('src/pages/profile/ProfilePage.tsx');
  const sprintsManager = await read('src/components/sprints/SprintsManager.tsx');
  const teamPage = await read('src/pages/teams/TeamPage.tsx');
  const vacationModal = await read('src/pages/vacations/VacationFormModal.tsx');
  const dashboard = await read('src/pages/dashboard/DashboardPage.tsx');

  // Modern portaled Select with hidden Playwright-compatible native select + aligned Pagination
  assert.match(selectComp, /createPortal/);
  assert.match(selectComp, /role="listbox"/);
  assert.match(selectComp, /opacity-\[0\.001\]/);
  assert.match(pagination, /whitespace-nowrap/);
  assert.match(pagination, /<Select/);

  // Live online / offline / disabled presence across labels & employee views
  assert.match(globalLabels, /online:/);
  assert.match(globalLabels, /offline:/);
  assert.match(employeePage, /is_online/);
  assert.match(employeeDetail, /is_online/);

  // Contracts accessible from Employee directory, Detail overview, and self-service Profile
  assert.match(employeePage, /useHrmContracts/);
  assert.match(employeeDetail, /ContractFormModal/);
  assert.match(profilePage, /useHrmContracts/);
  assert.match(profilePage, /contracts/);

  // Replace raw window.confirm & raw selects cleanly
  assert.doesNotMatch(sprintsManager, /window\.confirm/);
  assert.match(sprintsManager, /<ConfirmDialog/);
  assert.match(sprintsManager, /<Select/);
  assert.doesNotMatch(teamPage, /<select\b/);
  assert.doesNotMatch(vacationModal, /<select\b/);
  assert.doesNotMatch(profilePage, /<select\b/);

  // Dashboard Row 3 chart data selectors & legends
  assert.match(dashboard, /distributionMode/);
  assert.match(dashboard, /deptScope/);
  assert.match(dashboard, /deptMetric/);
  assert.match(dashboard, /activitySeries/);
  assert.match(dashboard, /activityRange/);
  assert.match(dashboard, /<Select/);
});

test('Phase 10: Real forgot/reset password flow & Admin notification + pending reset queue', async () => {
  const forgotPage = await read('src/pages/auth/ForgotPasswordPage.tsx');
  const resetPage = await read('src/pages/auth/ResetPasswordPage.tsx');
  const resetModal = await read('src/components/modals/ResetPasswordModal.tsx');
  const employeePage = await read('src/pages/employees/EmployeePage.tsx');
  const employeeDetail = await read('src/pages/employees/EmployeeDetailPage.tsx');
  const profilePage = await read('src/pages/profile/ProfilePage.tsx');
  const loginPage = await read('src/pages/auth/LoginPage.tsx');
  const indexCss = await read('src/index.css');
  const appRouter = await read('src/router/AppRouter.tsx');

  assert.doesNotMatch(forgotPage, /setTimeout/);
  assert.match(forgotPage, /authApi\.forgotPassword/);
  assert.match(resetPage, /authApi\.resetPassword/);
  assert.match(appRouter, /\/reset-password/);
  assert.match(resetModal, /useAdminResetPassword/);
  assert.match(employeePage, /usePasswordResetRequests/);
  assert.match(employeePage, /ResetPasswordModal/);
  assert.match(employeeDetail, /usePasswordResetRequests/);
  assert.match(employeeDetail, /ResetPasswordModal/);

  // Employee self-service reset request inside Profile Security tab + no double * or double password eye icon
  assert.match(profilePage, /authApi\.forgotPassword/);
  assert.doesNotMatch(profilePage, /Mật khẩu Hiện tại \*/);
  assert.doesNotMatch(profilePage, /<Eye/);
  assert.doesNotMatch(resetModal, /<Eye/);
  assert.doesNotMatch(resetPage, /<Eye/);
  assert.doesNotMatch(loginPage, /<Eye/);
  assert.match(indexCss, /::-ms-reveal/);

  // Native <input type="month"> replaced with MonthYearSelect + Docker nginx proxies /uploads/
  const hrmPage = await read('src/pages/hrm/HRMHubPage.tsx');
  const hrmModals = await read('src/components/hrm/HrmModals.tsx');
  const nginxConf = await read('nginx.conf');
  assert.doesNotMatch(hrmPage, /type="month"/);
  assert.doesNotMatch(hrmModals, /type="month"/);
  assert.match(hrmPage, /<MonthYearSelect/);
  assert.match(hrmModals, /<MonthYearSelect/);
  assert.match(nginxConf, /location \/uploads\//);
});




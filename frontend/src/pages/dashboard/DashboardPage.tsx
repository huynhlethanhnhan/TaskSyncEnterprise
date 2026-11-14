import * as React from 'react';
import { useNavigate } from 'react-router';
import {
  Users,
  Briefcase,
  CheckSquare,
  Clock,
  Building2,
  Sparkles,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Calendar as CalendarIcon,
  UserCheck,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { ProjectDrawer } from '../../components/drawers/ProjectDrawer';
import { TaskDrawer } from '../../components/drawers/TaskDrawer';
import { EmployeeDrawer } from '../../components/drawers/EmployeeDrawer';
import { useDashboardAnalytics } from '../../hooks/useDashboard';
import { useCreateProject } from '../../hooks/useProjects';
import { useTasks, useCreateTask } from '../../hooks/useTasks';
import { useCreateEmployee } from '../../hooks/useEmployees';
import { useDepartments } from '../../hooks/useDepartments';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { type ProjectItem, type TaskItem } from '../../api/services';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { t, statusLabel, formatDate, isEnglish } = useSettings();

  // Queries
  const { data: analytics, isLoading: isAnalyticsLoading, isError: isAnalyticsError, refetch: refetchAnalytics } = useDashboardAnalytics();
  const { data: tasks = [] } = useTasks();
  const { data: departments = [] } = useDepartments(permissions.canManageDepartment);

  // Mutations & Drawers
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const createEmployee = useCreateEmployee();

  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = React.useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = React.useState(false);
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = React.useState(false);

  // Interactive Chart Selectors
  const [distributionMode, setDistributionMode] = React.useState<
    'task_status' | 'task_priority' | 'project_status' | 'leave_status'
  >('task_status');
  const [deptScope, setDeptScope] = React.useState<string>('top5');
  const [deptMetric, setDeptMetric] = React.useState<'open_overdue' | 'total_open' | 'employees'>('open_overdue');
  const [activityRange, setActivityRange] = React.useState<'all' | '6' | '3'>('all');
  const [activitySeries, setActivitySeries] = React.useState<'created' | 'created_vs_done'>('created');

  const currentDate = new Date().toLocaleDateString(isEnglish ? 'en-US' : 'vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgentTasks = React.useMemo(() => {
    const now = new Date();
    return tasks.filter((taskItem) => {
      const isPending = taskItem.status !== 'Done';
      const isOverdue = taskItem.deadline ? new Date(taskItem.deadline) < now : false;
      const isHighPriority = taskItem.priority === 'High' || taskItem.priority === 'Urgent';
      return isPending && (isOverdue || isHighPriority);
    }).slice(0, 5);
  }, [tasks]);

  const handleSaveProject = async (data: Partial<ProjectItem>) => {
    try {
      await createProject.mutateAsync(data);
      toast.success(t('Khởi tạo dự án mới thành công', 'Project created successfully'));
      setIsProjectDrawerOpen(false);
    } catch {
      toast.error(t('Không thể tạo dự án. Vui lòng thử lại.', 'Unable to create project. Please try again.'));
    }
  };

  const handleSaveTask = async (data: Partial<TaskItem>) => {
    try {
      await createTask.mutateAsync(data);
      toast.success(t('Khởi tạo công việc mới thành công', 'Task created successfully'));
      setIsTaskDrawerOpen(false);
    } catch {
      toast.error(t('Không thể tạo công việc. Vui lòng thử lại.', 'Unable to create task. Please try again.'));
    }
  };

  const handleSaveEmployee = async (data: any) => {
    try {
      await createEmployee.mutateAsync(data);
      toast.success(t('Thêm nhân viên mới thành công', 'Employee added successfully'));
      setIsEmployeeDrawerOpen(false);
    } catch {
      toast.error(t('Không thể thêm nhân viên. Vui lòng thử lại.', 'Unable to add employee. Please try again.'));
    }
  };

  const chartDistributionData = React.useMemo(() => {
    if (distributionMode === 'task_priority') {
      const counts = new Map<string, number>();
      const order = ['Urgent', 'High', 'Medium', 'Low'];
      for (const taskItem of tasks) {
        const key = taskItem.priority || 'Medium';
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return order
        .filter((key) => (counts.get(key) || 0) > 0)
        .map((key) => ({
          status: key,
          label: statusLabel(key),
          count: counts.get(key) || 0,
        }));
    }
    if (distributionMode === 'project_status') {
      return (analytics?.projects_by_status || []).map((item) => ({
        ...item,
        label: statusLabel(item.status),
      }));
    }
    if (distributionMode === 'leave_status') {
      return (analytics?.leave_by_status || []).map((item) => ({
        ...item,
        label: statusLabel(item.status),
      }));
    }
    return (analytics?.tasks_by_status || []).map((item) => ({
      ...item,
      label: statusLabel(item.status),
    }));
  }, [analytics?.leave_by_status, analytics?.projects_by_status, analytics?.tasks_by_status, distributionMode, statusLabel, tasks]);

  const departmentChartOptions = React.useMemo(() => {
    const names = new Set<string>();
    for (const row of analytics?.workload_by_department || []) {
      if (row.department_name) names.add(row.department_name);
    }
    for (const row of analytics?.employees_by_department || []) {
      if (row.department_name) names.add(row.department_name);
    }
    return Array.from(names);
  }, [analytics?.employees_by_department, analytics?.workload_by_department]);

  const filteredDepartmentChartData = React.useMemo(() => {
    const empCountMap = new Map<string, number>();
    for (const empRow of analytics?.employees_by_department || []) {
      empCountMap.set(empRow.department_name, empRow.employee_count || 0);
    }

    const baseRows = (analytics?.workload_by_department || []).map((row) => ({
      ...row,
      employee_count: empCountMap.get(row.department_name) ?? 0,
      shortName:
        row.department_name.length > 13
          ? `${row.department_name.slice(0, 12)}…`
          : row.department_name,
    }));

    let scoped = baseRows;
    if (deptScope.startsWith('dept:')) {
      const target = deptScope.slice(5);
      scoped = baseRows.filter((r) => r.department_name === target);
    } else if (deptScope === 'with_tasks') {
      scoped = baseRows.filter(
        (r) =>
          (deptMetric === 'employees'
            ? r.employee_count
            : r.total_tasks + r.pending_tasks + r.overdue_tasks) > 0,
      );
    } else if (deptScope === 'top5') {
      scoped = [...baseRows]
        .sort((a, b) =>
          deptMetric === 'employees'
            ? b.employee_count - a.employee_count
            : b.total_tasks + b.pending_tasks - (a.total_tasks + a.pending_tasks),
        )
        .slice(0, 5);
    }
    return scoped;
  }, [analytics?.employees_by_department, analytics?.workload_by_department, deptMetric, deptScope]);

  const filteredMonthlyActivityData = React.useMemo(() => {
    const doneByMonth = new Map<string, number>();
    for (const taskItem of tasks) {
      if (taskItem.status === 'Done' && taskItem.created_at) {
        const monthKey = String(taskItem.created_at).slice(0, 7);
        doneByMonth.set(monthKey, (doneByMonth.get(monthKey) || 0) + 1);
      }
    }
    const base = (analytics?.monthly_activity || []).map((row) => ({
      ...row,
      done: doneByMonth.get(row.month) ?? 0,
    }));
    if (activityRange === '3') return base.slice(-3);
    if (activityRange === '6') return base.slice(-6);
    return base;
  }, [activityRange, analytics?.monthly_activity, tasks]);

  if (isAnalyticsLoading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader
          title={t('Bảng điều khiển Tổng quan', 'Executive Dashboard')}
          description={t('Đang tải dữ liệu tổng quan doanh nghiệp thời gian thực...', 'Loading real-time enterprise analytics...')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isAnalyticsError || !analytics) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader
          title={t('Bảng điều khiển Tổng quan', 'Executive Dashboard')}
          description={t('Hệ thống báo cáo và phân tích quản trị doanh nghiệp', 'Enterprise operations and performance analytics')}
        />
        <ErrorState
          title={t('Lỗi tải dữ liệu Dashboard', 'Failed to load Dashboard')}
          message={t('Không thể kết nối đến máy chủ API backend. Vui lòng kiểm tra lại dịch vụ.', 'Cannot connect to the backend API server. Please verify the service is running.')}
          onRetry={() => refetchAnalytics()}
        />
      </div>
    );
  }

  const {
    overview,
    employees_by_department = [],
    workload_by_department = [],
    upcoming_deadlines = [],
    upcoming_leaves = [],
    pending_approvals = [],
  } = analytics;


  const roleId = Number(user?.role_id);
  const roleStr = (user?.role || '').toLowerCase();
  const isAdmin = roleId === 1 || roleStr === 'admin';
  const isManager = roleId === 2 || roleStr === 'manager';
  const isManagerOrAdmin = isAdmin || isManager;
  const isBaseEmployee = !isManagerOrAdmin;
  
  // ROW 2: Primary Executive KPI Cards
  const kpis = isBaseEmployee
    ? [
        {
          title: t('Dự án của tôi', 'My Projects'),
          value: overview.active_projects.toString(),
          badge: `${t('Tổng', 'Total')} ${overview.total_projects}`,
          icon: <Briefcase className="h-4 w-4 text-emerald-500" />,
          subtext: t('Đang tham gia', 'Participating'),
          onClick: () => navigate('/projects'),
        },
        {
          title: t('Task của tôi', 'My Tasks'),
          value: overview.pending_tasks.toString(),
          badge: `${overview.total_tasks ? Math.round((overview.completed_tasks / overview.total_tasks) * 100) : 0}% ${statusLabel('Done')}`,
          icon: <CheckSquare className="h-4 w-4 text-sky-500" />,
          subtext: `${overview.completed_tasks} ${t('xong', 'done')}`,
          onClick: () => navigate('/tasks'),
        },
        {
          title: t('Task Quá hạn', 'Overdue Tasks'),
          value: overview.overdue_tasks.toString(),
          badge: overview.overdue_tasks > 0 ? t('Cần xử lý', 'Needs Action') : t('Đúng hạn 100%', '100% On Time'),
          icon: <Clock className="h-4 w-4 text-rose-500" />,
          subtext: t('Vượt deadline', 'Past due'),
          onClick: () => navigate('/tasks'),
        },
        {
          title: t('Nghỉ phép cá nhân', 'My Leave Requests'),
          value: (overview.pending_vacation_requests || 0).toString(),
          badge: `${t('Tổng', 'Total')} ${overview.vacation_requests || 0}`,
          icon: <UserCheck className="h-4 w-4 text-amber-500" />,
          subtext: t('Trạng thái đơn', 'Request status'),
          onClick: () => navigate('/vacations'),
        },
      ]
    : [
        {
          title: t('Dự án Active', 'Active Projects'),
          value: overview.active_projects.toString(),
          badge: `${t('Tổng', 'Total')} ${overview.total_projects}`,
          icon: <Briefcase className="h-4 w-4 text-emerald-500" />,
          subtext: t('Đang triển khai', 'In execution'),
          onClick: () => navigate('/projects'),
        },
        {
          title: t('Task Đang xử lý', 'Open Tasks'),
          value: overview.pending_tasks.toString(),
          badge: `${overview.total_tasks ? Math.round((overview.completed_tasks / overview.total_tasks) * 100) : 0}% ${statusLabel('Done')}`,
          icon: <CheckSquare className="h-4 w-4 text-sky-500" />,
          subtext: `${overview.completed_tasks} ${t('xong', 'done')}`,
          onClick: () => navigate('/tasks'),
        },
        {
          title: t('Nhân sự Active', 'Active Staff'),
          value: overview.active_employees.toString(),
          badge: `${t('Tổng', 'Total')} ${overview.total_employees}`,
          icon: <Users className="h-4 w-4 text-purple-500" />,
          subtext: t('Nhân sự hoạt động', 'Active employees'),
          onClick: () => navigate('/employees'),
        },
        {
          title: t('Phòng ban', 'Departments'),
          value: overview.total_departments.toString(),
          badge: t('Cơ cấu tổ chức', 'Org Structure'),
          icon: <Building2 className="h-4 w-4 text-indigo-500" />,
          subtext: t('Đang hoạt động', 'Operational'),
          onClick: () => navigate('/departments'),
        },
        ...(isManagerOrAdmin ? [{
          title: t('Nghỉ phép Chờ Duyệt', 'Pending Leave'),
          value: (overview.pending_vacation_requests || 0).toString(),
          badge: `${t('Tổng', 'Total')} ${overview.vacation_requests || 0}`,
          icon: <UserCheck className="h-4 w-4 text-amber-500" />,
          subtext: t('Cần phê duyệt', 'Awaiting review'),
          onClick: () => navigate('/vacations'),
        }] : []),
        {
          title: t('Task Quá hạn', 'Overdue Tasks'),
          value: overview.overdue_tasks.toString(),
          badge: overview.overdue_tasks > 0 ? t('Cần xử lý', 'Needs Action') : t('Đúng hạn 100%', '100% On Time'),
          icon: <Clock className="h-4 w-4 text-rose-500" />,
          subtext: t('Vượt deadline', 'Past due'),
          onClick: () => navigate('/tasks'),
        },
      ];

  const distributionTitle =
    distributionMode === 'task_priority'
      ? t('Phân bổ theo Mức ưu tiên', 'Task Priority Breakdown')
      : distributionMode === 'project_status'
        ? t('Phân bổ Trạng thái Dự án', 'Project Status Breakdown')
        : distributionMode === 'leave_status'
          ? t('Phân bổ Đơn nghỉ phép', 'Leave Request Breakdown')
          : t('Phân bổ Trạng thái Task', 'Task Status Breakdown');

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* 🚀 ROW 1: Welcome Header, Quick Actions & System Health */}
      <Card className="bg-gradient-to-r from-primary/10 via-surface to-accent/20 border-border">
        <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary tracking-tight">
                {t('Chào mừng trở lại,', 'Welcome back,')} {user?.full_name || user?.name || t('Thành viên', 'Member')}!
              </h1>
              <Badge variant="success" showDot size="sm">{t('Hệ thống Sẵn sàng', 'System Operational')}</Badge>
            </div>
            <p className="text-xs text-text-muted">
              {t('Báo cáo tổng quan hoạt động kinh doanh và tiến độ dự án ngày', 'Enterprise operations and project progress summary for')}{' '}
              <span className="font-semibold text-text-primary">{currentDate}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {permissions.canCreateProject && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsProjectDrawerOpen(true)}
              >
                {t('Dự án Mới', 'New Project')}
              </Button>
            )}
            {permissions.canCreateTask && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsTaskDrawerOpen(true)}
              >
                {t('Task Mới', 'New Task')}
              </Button>
            )}
            {permissions.canCreateEmployee && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsEmployeeDrawerOpen(true)}
              >
                {t('Nhân viên Mới', 'New Employee')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4 text-primary" />}
              onClick={() => refetchAnalytics()}
            >
              {t('Làm mới', 'Refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 📊 ROW 2: Executive KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isBaseEmployee ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-6`}>
        {kpis.map((kpi, index) => (
          <Card key={index} data-testid={`dashboard-kpi-${index}`} variant="interactive" className="cursor-pointer h-full" onClick={kpi.onClick}>
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-muted">{kpi.title}</span>
                <div className="p-1.5 rounded-md bg-accent">{kpi.icon}</div>
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight text-text-primary">{kpi.value}</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-text-muted">{kpi.subtext}</span>
                  <Badge variant="outline" size="sm" className="text-[9px] px-1.5 py-0">
                    {kpi.badge}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 📈 ROW 3: Business Intelligence Visualizations */}
      <div className={`grid grid-cols-1 ${isBaseEmployee ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6 items-stretch`}>
        {/* Chart 1: Task / Project / Leave Distribution (Donut Chart) */}
        <Card data-testid="dashboard-chart-task-status" className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 min-w-0 truncate">
              <CheckSquare className="h-4 w-4 text-sky-500 shrink-0" />
              <span className="truncate">{distributionTitle}</span>
            </CardTitle>
            <Select
              size="sm"
              containerClassName="w-[155px] shrink-0"
              aria-label={t('Chọn nguồn dữ liệu phân bổ', 'Select distribution dataset')}
              value={distributionMode}
              onChange={(e) => setDistributionMode(e.target.value as any)}
              options={[
                { value: 'task_status', label: t('Trạng thái Task', 'Task Status') },
                { value: 'task_priority', label: t('Mức ưu tiên Task', 'Task Priority') },
                { value: 'project_status', label: t('Trạng thái Dự án', 'Project Status') },
                { value: 'leave_status', label: t('Đơn nghỉ phép', 'Leave Requests') },
              ]}
            />
          </CardHeader>
          <CardContent className="flex-1 flex items-center">
            <div className="h-64 w-full min-w-0">
              {chartDistributionData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-text-muted">
                  {t('Chưa có dữ liệu cho bộ lọc này', 'No data available for this selection')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={256}>
                  <PieChart>
                    <Pie
                      data={chartDistributionData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="48%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={4}
                    >
                      {chartDistributionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Department Workload (Bar Chart) - Admin & Manager Only */}
        {!isBaseEmployee && (
          <Card data-testid="dashboard-chart-workload" className="h-full flex flex-col">
            <CardHeader className="flex flex-col gap-2.5 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-purple-500 shrink-0" />
                  <span className="truncate">{t('Khối lượng theo Phòng ban', 'Department Breakdown')}</span>
                </CardTitle>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  size="sm"
                  aria-label={t('Phạm vi phòng ban', 'Department scope')}
                  value={deptScope}
                  onChange={(e) => setDeptScope(e.target.value)}
                  options={[
                    { value: 'top5', label: t('Top 5 phòng ban', 'Top 5 Depts') },
                    { value: 'with_tasks', label: t('Có dữ liệu', 'Non-zero') },
                    { value: 'all', label: t('Tất cả phòng ban', 'All Depts') },
                    ...departmentChartOptions.map((deptName) => ({
                      value: `dept:${deptName}`,
                      label: deptName,
                    })),
                  ]}
                />
                <Select
                  size="sm"
                  aria-label={t('Chỉ số phòng ban', 'Department metric')}
                  value={deptMetric}
                  onChange={(e) => setDeptMetric(e.target.value as any)}
                  options={[
                    { value: 'open_overdue', label: t('Đang làm & Quá hạn', 'Open & Overdue') },
                    { value: 'total_open', label: t('Tổng & Đang làm', 'Total & Open') },
                    { value: 'employees', label: t('Quy mô nhân sự', 'Headcount') },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
              <div className="h-64 w-full min-w-0">
                {filteredDepartmentChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-text-muted">
                    {t('Không có phòng ban nào khớp bộ lọc', 'No matching departments')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={256}>
                    <BarChart
                      data={filteredDepartmentChartData}
                      margin={{ top: 8, right: 8, left: -12, bottom: deptScope === 'all' ? 18 : 4 }}
                    >
                      <XAxis
                        dataKey="shortName"
                        interval={deptScope === 'all' ? 'preserveStartEnd' : 0}
                        tick={{ fontSize: 10 }}
                        angle={deptScope === 'all' ? -18 : 0}
                        textAnchor={deptScope === 'all' ? 'end' : 'middle'}
                        height={deptScope === 'all' ? 42 : 24}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.department_name || ''
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      {deptMetric === 'employees' ? (
                        <Bar
                          dataKey="employee_count"
                          name={t('Nhân sự', 'Employees')}
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                        />
                      ) : deptMetric === 'total_open' ? (
                        <>
                          <Bar
                            dataKey="total_tasks"
                            name={t('Tổng Task', 'Total Tasks')}
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="pending_tasks"
                            name={t('Đang xử lý', 'Open Tasks')}
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />
                        </>
                      ) : (
                        <>
                          <Bar
                            dataKey="pending_tasks"
                            name={t('Đang xử lý', 'Open Tasks')}
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="overdue_tasks"
                            name={t('Quá hạn', 'Overdue')}
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                          />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart 3: Monthly Activity (Area Chart) */}
        <Card data-testid="dashboard-chart-monthly-activity" className="h-full flex flex-col">
          <CardHeader className="flex flex-col gap-2.5 pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 min-w-0">
                <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="truncate">{t('Xu hướng Hoạt động Tháng', 'Monthly Activity Trend')}</span>
              </CardTitle>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                size="sm"
                aria-label={t('Chuỗi dữ liệu hoạt động', 'Activity series')}
                value={activitySeries}
                onChange={(e) => setActivitySeries(e.target.value as any)}
                options={[
                  { value: 'created', label: t('Task tạo mới', 'Created Tasks') },
                  { value: 'created_vs_done', label: t('Tạo mới & Hoàn thành', 'Created vs Done') },
                ]}
              />
              <Select
                size="sm"
                aria-label={t('Khoảng thời gian tháng', 'Activity range')}
                value={activityRange}
                onChange={(e) => setActivityRange(e.target.value as any)}
                options={[
                  { value: 'all', label: t('Toàn bộ chu kỳ', 'All Months') },
                  { value: '6', label: t('6 tháng gần nhất', 'Last 6 Months') },
                  { value: '3', label: t('3 tháng gần nhất', 'Last 3 Months') },
                ]}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex items-center">
            <div className="h-64 w-full min-w-0">
              {filteredMonthlyActivityData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-text-muted">
                  {t('Chưa có dữ liệu hoạt động theo tháng', 'No monthly activity data yet')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={256}>
                  <AreaChart data={filteredMonthlyActivityData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area
                      type="monotone"
                      dataKey="created"
                      name={t('Tạo mới', 'Created')}
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    {activitySeries === 'created_vs_done' && (
                      <Area
                        type="monotone"
                        dataKey="done"
                        name={t('Hoàn thành', 'Done')}
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.18}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 📋 ROW 4: Urgent Work Items & Pending Approvals */}
      <div className={`grid grid-cols-1 ${isManagerOrAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 items-stretch`}>
        {/* Urgent Attention Work Items */}
        <Card className={`${isManagerOrAdmin ? 'lg:col-span-2' : ''} h-full flex flex-col`}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                {t('Công việc Cần Chú ý Nhanh', 'Urgent Work Items')}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                {t('Xem tất cả', 'View All')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-start space-y-3">
            {urgentTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{t('Mọi công việc đều đúng tiến độ!', 'All tasks are on track!')}</p>
              </div>
            ) : (
              urgentTasks.slice(0, 4).map((taskItem) => (
                <div key={taskItem.id} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-text-primary truncate" title={taskItem.title}>
                      {taskItem.title}
                    </h4>
                    <p className="text-[11px] text-text-muted mt-0.5 truncate">
                      {t('Hạn:', 'Deadline:')} {taskItem.deadline ? formatDate(taskItem.deadline) : 'N/A'}
                    </p>
                  </div>
                  <StatusBadge status={taskItem.priority || 'Urgent'} size="sm" className="shrink-0" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals - Admin & Manager Only */}
        {isManagerOrAdmin && (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-amber-500" />
                  {t('Phê duyệt Đơn Nghỉ phép', 'Pending Leave Approvals')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/vacations')}>
                  {t('Quản lý Nghỉ', 'Manage Leave')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-start space-y-3">
              {pending_approvals.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-4">
                  <p className="text-xs text-text-muted text-center">{t('Không có đơn nghỉ phép nào chờ duyệt', 'No pending leave requests')}</p>
                </div>
              ) : (
                pending_approvals.slice(0, 4).map((req) => (
                  <div key={req.id} className="p-3 rounded-lg border border-border/60 bg-surface/50 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-text-primary">
                      <span className="min-w-0 truncate" title={req.requested_by_name}>{req.requested_by_name}</span>
                      <StatusBadge status="Pending" size="sm" className="shrink-0" />
                    </div>
                    <p className="text-[11px] text-text-secondary truncate">{t('Loại:', 'Type:')} {statusLabel(req.type)} ({formatDate(req.start_date)} - {formatDate(req.end_date)})</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 🗓️ ROW 5: Upcoming Deadlines & Upcoming Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Upcoming Deadlines */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-sky-500" />
              {t('Sắp tới Deadline (14 ngày tới)', 'Upcoming Deadlines (Next 14 Days)')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-start space-y-2.5">
            {upcoming_deadlines.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-4">
                <p className="text-xs text-text-muted text-center">{t('Không có deadline sắp tới', 'No upcoming deadlines')}</p>
              </div>
            ) : (
              upcoming_deadlines.slice(0, 5).map((deadlineTask) => (
                <div key={deadlineTask.id} className="p-2.5 rounded-lg border border-border/60 bg-surface flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-text-primary truncate min-w-0 flex-1" title={deadlineTask.title}>{deadlineTask.title}</span>
                  <span className="text-text-muted text-[11px] shrink-0">
                    {deadlineTask.deadline ? formatDate(deadlineTask.deadline) : ''}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Leaves */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-indigo-500" />
              {t('Lịch Nghỉ phép Sắp tới', 'Upcoming Leaves')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-start space-y-2.5">
            {upcoming_leaves.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-4">
                <p className="text-xs text-text-muted text-center">{t('Không có lịch nghỉ sắp tới', 'No upcoming leaves')}</p>
              </div>
            ) : (
              upcoming_leaves.slice(0, 5).map((l) => (
                <div key={l.id} className="p-2.5 rounded-lg border border-border/60 bg-surface flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary truncate" title={l.employee_name}>{l.employee_name}</p>
                    <p className="text-[10px] text-text-muted truncate">{statusLabel(l.type)}</p>
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary shrink-0">{formatDate(l.start_date)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 📊 ROW 6: Workforce & Task Allocation Table - Admin & Manager Only */}
      {!isBaseEmployee && (
        <Card data-testid="workforce-demo-table">
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t('Phân bổ nhân sự và công việc', 'Workforce & Task Allocation')}</CardTitle>
                <CardDescription>{t('Bảng dữ liệu trực tiếp từ phòng ban, task assignment và deadline', 'Live breakdown across departments, task assignments, and deadlines')}</CardDescription>
              </div>
              <Badge variant="outline">{overview.total_employees} {t('nhân sự', 'staff')} · {overview.total_tasks} {t('task', 'tasks')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-b border-border/80 bg-slate-50/90 dark:bg-slate-900/90 text-text-muted select-none uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t('Phòng ban', 'Department')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('Nhân sự', 'Staff')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('Tổng task', 'Total Tasks')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('Đang xử lý', 'Open Tasks')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('Quá hạn', 'Overdue')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Tình trạng', 'Health')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {employees_by_department.map((row: any) => {
                    const deptWorkload = workload_by_department.find((w: any) => w.department_name === row.department_name);
                    const totalTasks = deptWorkload?.total_tasks || 0;
                    const pendingTasks = deptWorkload?.pending_tasks || 0;
                    const overdueTasks = deptWorkload?.overdue_tasks || 0;
                    return (
                      <tr key={row.department_name} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-text-primary max-w-[220px] truncate" title={row.department_name}>
                          {row.department_name}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">{row.employee_count}</td>
                        <td className="px-4 py-3 text-right text-text-secondary">{totalTasks}</td>
                        <td className="px-4 py-3 text-right font-semibold text-sky-600">{pendingTasks}</td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600">{overdueTasks}</td>
                        <td className="px-4 py-3">
                          <Badge variant={overdueTasks > 0 ? 'warning' : 'success'} showDot>
                            {overdueTasks > 0 ? t('Cần theo dõi', 'Needs Attention') : t('Đúng tiến độ', 'On Track')}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Drawers */}
      {permissions.canCreateProject && (
        <ProjectDrawer
          isOpen={isProjectDrawerOpen}
          onClose={() => setIsProjectDrawerOpen(false)}
          onSave={handleSaveProject}
          isLoading={createProject.isPending}
        />
      )}

      {permissions.canCreateTask && (
        <TaskDrawer
          isOpen={isTaskDrawerOpen}
          onClose={() => setIsTaskDrawerOpen(false)}
          onSave={handleSaveTask}
          isLoading={createTask.isPending}
        />
      )}

      {permissions.canCreateEmployee && (
        <EmployeeDrawer
          isOpen={isEmployeeDrawerOpen}
          onClose={() => setIsEmployeeDrawerOpen(false)}
          departments={departments}
          onSave={handleSaveEmployee}
          isLoading={createEmployee.isPending}
        />
      )}
    </div>
  );
};

export default DashboardPage;

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
  Gift,
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
import { Button } from '../../components/ui/Button';
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
import { type ProjectItem, type TaskItem } from '../../api/services';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const permissions = usePermissions();

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

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgentTasks = React.useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      const isPending = t.status !== 'Done';
      const isOverdue = t.deadline ? new Date(t.deadline) < now : false;
      const isHighPriority = t.priority === 'High' || t.priority === 'Urgent';
      return isPending && (isOverdue || isHighPriority);
    }).slice(0, 5);
  }, [tasks]);

  const handleSaveProject = async (data: Partial<ProjectItem>) => {
    try {
      await createProject.mutateAsync(data);
      toast.success('Khởi tạo dự án mới thành công');
      setIsProjectDrawerOpen(false);
    } catch {
      toast.error('Không thể tạo dự án. Vui lòng thử lại.');
    }
  };

  const handleSaveTask = async (data: Partial<TaskItem>) => {
    try {
      await createTask.mutateAsync(data);
      toast.success('Khởi tạo công việc mới thành công');
      setIsTaskDrawerOpen(false);
    } catch {
      toast.error('Không thể tạo công việc. Vui lòng thử lại.');
    }
  };

  const handleSaveEmployee = async (data: any) => {
    try {
      await createEmployee.mutateAsync(data);
      toast.success('Thêm nhân viên mới thành công');
      setIsEmployeeDrawerOpen(false);
    } catch {
      toast.error('Không thể thêm nhân viên. Vui lòng thử lại.');
    }
  };

  if (isAnalyticsLoading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader
          title={`Executive Dashboard`}
          description="Đang tải dữ liệu tổng quan doanh nghiệp thời gian thực..."
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
        <PageHeader title="Executive Dashboard" description="Hệ thống báo cáo và phân tích quản trị doanh nghiệp" />
        <ErrorState
          title="Lỗi tải dữ liệu Dashboard"
          message="Không thể kết nối đến máy chủ API backend. Vui lòng kiểm tra lại dịch vụ."
          onRetry={() => refetchAnalytics()}
        />
      </div>
    );
  }

  const {
    overview,
    tasks_by_status = [],
    employees_by_department = [],
    workload_by_department = [],
    monthly_activity = [],
    upcoming_deadlines = [],
    upcoming_leaves = [],
    upcoming_birthdays = [],
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
          title: 'Dự án của tôi',
          value: overview.active_projects.toString(),
          badge: `Tổng ${overview.total_projects}`,
          icon: <Briefcase className="h-4 w-4 text-emerald-500" />,
          subtext: 'Đang tham gia',
          onClick: () => navigate('/projects'),
        },
        {
          title: 'Task của tôi',
          value: overview.pending_tasks.toString(),
          badge: `${overview.total_tasks ? Math.round((overview.completed_tasks / overview.total_tasks) * 100) : 0}% Hoàn thành`,
          icon: <CheckSquare className="h-4 w-4 text-sky-500" />,
          subtext: `${overview.completed_tasks} xong`,
          onClick: () => navigate('/tasks'),
        },
        {
          title: 'Task Quá hạn',
          value: overview.overdue_tasks.toString(),
          badge: overview.overdue_tasks > 0 ? 'Cần xử lý' : 'Đúng hạn 100%',
          icon: <Clock className="h-4 w-4 text-rose-500" />,
          subtext: 'Vượt deadline',
          onClick: () => navigate('/tasks'),
        },
        {
          title: 'Nghỉ phép cá nhân',
          value: (overview.pending_vacation_requests || 0).toString(),
          badge: `Tổng ${overview.vacation_requests || 0}`,
          icon: <UserCheck className="h-4 w-4 text-amber-500" />,
          subtext: 'Trạng thái đơn',
          onClick: () => navigate('/vacations'),
        },
      ]
    : [
        {
          title: 'Dự án Active',
          value: overview.active_projects.toString(),
          badge: `Tổng ${overview.total_projects}`,
          icon: <Briefcase className="h-4 w-4 text-emerald-500" />,
          subtext: 'Đang triển khai',
          onClick: () => navigate('/projects'),
        },
        {
          title: 'Task Đang xử lý',
          value: overview.pending_tasks.toString(),
          badge: `${overview.total_tasks ? Math.round((overview.completed_tasks / overview.total_tasks) * 100) : 0}% Hoàn thành`,
          icon: <CheckSquare className="h-4 w-4 text-sky-500" />,
          subtext: `${overview.completed_tasks} xong`,
          onClick: () => navigate('/tasks'),
        },
        {
          title: 'Nhân sự Active',
          value: overview.active_employees.toString(),
          badge: `Tổng ${overview.total_employees}`,
          icon: <Users className="h-4 w-4 text-purple-500" />,
          subtext: 'Nhân sự hoạt động',
          onClick: () => navigate('/employees'),
        },
        {
          title: 'Phòng ban',
          value: overview.total_departments.toString(),
          badge: 'Cơ cấu tổ chức',
          icon: <Building2 className="h-4 w-4 text-indigo-500" />,
          subtext: 'Đang hoạt động',
          onClick: () => navigate('/departments'),
        },
        ...(isManagerOrAdmin ? [{
          title: 'Nghỉ phép Chờ Duyệt',
          value: (overview.pending_vacation_requests || 0).toString(),
          badge: `Tổng ${overview.vacation_requests || 0}`,
          icon: <UserCheck className="h-4 w-4 text-amber-500" />,
          subtext: 'Cần phê duyệt',
          onClick: () => navigate('/vacations'),
        }] : []),
        {
          title: 'Task Quá hạn',
          value: overview.overdue_tasks.toString(),
          badge: overview.overdue_tasks > 0 ? 'Cần xử lý' : 'Đúng hạn 100%',
          icon: <Clock className="h-4 w-4 text-rose-500" />,
          subtext: 'Vượt deadline',
          onClick: () => navigate('/tasks'),
        },
      ];

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* 🚀 ROW 1: Welcome Header, Quick Actions & System Health */}
      <Card className="bg-gradient-to-r from-primary/10 via-surface to-accent/20 border-border">
        <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary tracking-tight">
                Chào mừng trở lại, {user?.full_name || user?.name || 'Thành viên'}!
              </h1>
              <Badge variant="success" showDot size="sm">System Operational</Badge>
            </div>
            <p className="text-xs text-text-muted">
              Báo cáo tổng quan hoạt động kinh doanh và tiến độ dự án ngày <span className="font-semibold text-text-primary">{currentDate}</span>
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
                Dự án Mới
              </Button>
            )}
            {permissions.canCreateTask && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsTaskDrawerOpen(true)}
              >
                Task Mới
              </Button>
            )}
            {permissions.canCreateEmployee && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsEmployeeDrawerOpen(true)}
              >
                Nhân viên Mới
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4 text-primary" />}
              onClick={() => refetchAnalytics()}
            >
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 📊 ROW 2: Executive KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isBaseEmployee ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-3`}>
        {kpis.map((kpi, index) => (
          <Card key={index} data-testid={`dashboard-kpi-${index}`} variant="interactive" className="cursor-pointer" onClick={kpi.onClick}>
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
      <div className={`grid grid-cols-1 ${isBaseEmployee ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
        {/* Chart 1: Task Status Distribution (Donut Chart) */}
        <Card data-testid="dashboard-chart-task-status">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-sky-500" />
              Phân bổ Trạng thái Task
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tasks_by_status}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {tasks_by_status.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Department Workload (Bar Chart) - Admin & Manager Only */}
        {!isBaseEmployee && (
          <Card data-testid="dashboard-chart-workload">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-500" />
                Khối lượng Task theo Phòng ban
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workload_by_department}>
                  <XAxis dataKey="department_name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="pending_tasks" name="Đang xử lý" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue_tasks" name="Quá hạn" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Chart 3: Monthly Activity (Area Chart) */}
        <Card data-testid="dashboard-chart-monthly-activity">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Xu hướng Hoạt động Tháng
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly_activity}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="created" name="Tạo mới" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 📋 ROW 4: Recent Activities Timeline & Pending Approvals */}
      <div className={`grid grid-cols-1 ${isManagerOrAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 items-start`}>
        {/* Urgent Attention Work Items */}
        <Card className={isManagerOrAdmin ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Công việc Cần Chú ý Nhanh (Urgent Work Items)
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                Xem tất cả
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentTasks.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Mọi công việc đều đúng tiến độ!</p>
              </div>
            ) : (
              urgentTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">{t.title}</h4>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Deadline: {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : 'N/A'} · Ưu tiên: {t.priority || 'Normal'}
                    </p>
                  </div>
                  <Badge variant="danger" size="sm">Cần xử lý</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals - Admin & Manager Only */}
        {isManagerOrAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-amber-500" />
                  Phê duyệt Đơn Nghỉ phép
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/vacations')}>
                  Quản lý Nghỉ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending_approvals.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">Không có đơn nghỉ phép nào chờ duyệt</p>
              ) : (
                pending_approvals.map((req) => (
                  <div key={req.id} className="p-3 rounded-lg border border-border/60 bg-surface/50 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                      <span>{req.requested_by_name}</span>
                      <Badge variant="warning" size="sm">Pending</Badge>
                    </div>
                    <p className="text-[11px] text-text-secondary">Loại: {req.type} ({req.start_date} - {req.end_date})</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 🗓️ ROW 5: Upcoming Deadlines, Leaves & Birthdays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-sky-500" />
              Sắp tới Deadline (Next 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {upcoming_deadlines.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Không có deadline sắp tới</p>
            ) : (
              upcoming_deadlines.map((t) => (
                <div key={t.id} className="p-2.5 rounded-lg border border-border/60 bg-surface flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary truncate">{t.title}</span>
                  <span className="text-text-muted text-[11px] shrink-0">
                    {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Leaves */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-indigo-500" />
              Lịch Nghỉ phép Sắp tới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {upcoming_leaves.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Không có lịch nghỉ sắp tới</p>
            ) : (
              upcoming_leaves.map((l) => (
                <div key={l.id} className="p-2.5 rounded-lg border border-border/60 bg-surface flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-text-primary">{l.employee_name}</p>
                    <p className="text-[10px] text-text-muted">{l.type}</p>
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary">{l.start_date}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Birthdays */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Gift className="h-4 w-4 text-pink-500" />
              Sinh nhật Nhân sự
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {upcoming_birthdays.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Không có sinh nhật sắp tới</p>
            ) : (
              upcoming_birthdays.map((b) => (
                <div key={b.id} className="p-2.5 rounded-lg border border-border/60 bg-surface flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-text-primary">{b.full_name}</p>
                    <p className="text-[10px] text-text-muted">{b.department_name || 'Phòng ban'}</p>
                  </div>
                  <Badge variant="outline" size="sm">
                    {b.days_until !== undefined
                      ? b.days_until === 0
                        ? '🎉 Hôm nay'
                        : `Còn ${b.days_until} ngày`
                      : b.date_of_birth}
                  </Badge>
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
                <CardTitle>Phân bổ nhân sự và công việc</CardTitle>
                <CardDescription>Bảng dữ liệu trực tiếp từ phòng ban, task assignment và deadline</CardDescription>
              </div>
              <Badge variant="outline">{overview.total_employees} nhân sự · {overview.total_tasks} task</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-b border-border/80 bg-slate-50/90 dark:bg-slate-900/90 text-text-muted select-none uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Phòng ban</th>
                    <th className="px-4 py-3 text-right font-semibold">Nhân sự</th>
                    <th className="px-4 py-3 text-right font-semibold">Tổng task</th>
                    <th className="px-4 py-3 text-right font-semibold">Đang xử lý</th>
                    <th className="px-4 py-3 text-right font-semibold">Quá hạn</th>
                    <th className="px-4 py-3 font-semibold">Tình trạng</th>
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
                        <td className="px-4 py-3 font-semibold text-text-primary">{row.department_name}</td>
                        <td className="px-4 py-3 text-right text-text-secondary">{row.employee_count}</td>
                        <td className="px-4 py-3 text-right text-text-secondary">{totalTasks}</td>
                        <td className="px-4 py-3 text-right font-semibold text-sky-600">{pendingTasks}</td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600">{overdueTasks}</td>
                        <td className="px-4 py-3">
                          <Badge variant={overdueTasks > 0 ? 'warning' : 'success'} showDot>
                            {overdueTasks > 0 ? 'Cần theo dõi' : 'Đúng tiến độ'}
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

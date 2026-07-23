import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
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
} from 'recharts';
import api from '../../api/axios';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useEmployees } from '../../hooks/useEmployees';
import { exportToCsv } from '../../utils/csv';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'projects' | 'tasks' | 'workload' | 'vacations' | 'gaps'>('projects');

  // Queries
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();

  const { data: vacations = [], isLoading: vacationsLoading } = useQuery<any[]>({
    queryKey: ['reports-vacations'],
    queryFn: async () => {
      const res = await api.get('/vacations');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const loading = projectsLoading || tasksLoading || employeesLoading || vacationsLoading;

  // 1. Projects Statistics & Computations
  const projectStats = React.useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'Active').length;
    const completed = projects.filter((p) => p.status === 'Completed').length;
    const atRisk = projects.filter((p) => p.status === 'Suspended').length;

    const list = projects.map((p) => {
      const projTasks = tasks.filter((t) => t.project_id === p.id);
      const totalTasks = projTasks.length;
      const completedTasks = projTasks.filter((t) => t.status === 'Done').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const overdueTasks = projTasks.filter((t) => t.status !== 'Done' && t.deadline && new Date(t.deadline) < new Date()).length;

      return {
        ...p,
        totalTasks,
        completedTasks,
        progress,
        overdueTasks,
      };
    });

    return { total, active, completed, atRisk, list };
  }, [projects, tasks]);

  // 2. Tasks Statistics & Computations
  const taskStats = React.useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'To Do').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const done = tasks.filter((t) => t.status === 'Done').length;
    const overdue = tasks.filter((t) => t.status !== 'Done' && t.deadline && new Date(t.deadline) < new Date()).length;

    const statusChartData = [
      { name: 'To Do', value: todo },
      { name: 'In Progress', value: inProgress },
      { name: 'Done', value: done },
    ];

    const priorityChartData = [
      { name: 'Low', value: tasks.filter((t) => t.priority === 'Low').length },
      { name: 'Medium', value: tasks.filter((t) => t.priority === 'Medium').length },
      { name: 'High', value: tasks.filter((t) => t.priority === 'High').length },
      { name: 'Urgent', value: tasks.filter((t) => t.priority === 'Urgent').length },
    ];

    return { total, todo, inProgress, done, overdue, statusChartData, priorityChartData };
  }, [tasks]);

  // 3. Workload Statistics & Computations
  const workloadStats = React.useMemo(() => {
    return employees.map((emp) => {
      const empTasks = tasks.filter((t) => t.assigned_to === emp.id);
      const activeTasks = empTasks.filter((t) => t.status !== 'Done').length;
      const overdueTasks = empTasks.filter((t) => t.status !== 'Done' && t.deadline && new Date(t.deadline) < new Date()).length;
      const highPriorityTasks = empTasks.filter((t) => t.priority === 'High' || t.priority === 'Urgent').length;

      return {
        name: emp.full_name,
        activeTasks,
        overdueTasks,
        highPriorityTasks,
      };
    }).sort((a, b) => b.activeTasks - a.activeTasks);
  }, [employees, tasks]);

  // 4. Vacation Statistics & Computations
  const vacationStats = React.useMemo(() => {
    const total = vacations.length;
    const pending = vacations.filter((v) => v.status === 'Pending').length;
    const approved = vacations.filter((v) => v.status === 'Approved' || v.status === 'HR Approved' || v.status === 'Manager Approved').length;

    return { total, pending, approved };
  }, [vacations]);

  // Exports
  const handleProjectExport = () => {
    const headers = ['Project Name', 'Project Code', 'Status', 'Tasks Count', 'Completion Rate (%)', 'Overdue Tasks'];
    const rows = projectStats.list.map((p) => [
      p.name,
      p.project_code || '—',
      p.status,
      p.totalTasks,
      p.progress,
      p.overdueTasks,
    ]);
    exportToCsv('ProjectPerformanceReport.csv', headers, rows);
  };

  const handleTaskExport = () => {
    const headers = ['Task Title', 'Status', 'Priority', 'Project ID', 'Deadline'];
    const rows = tasks.map((t) => [
      t.title || t.name,
      t.status,
      t.priority,
      t.project_id || '—',
      t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '—',
    ]);
    exportToCsv('TasksDistributionReport.csv', headers, rows);
  };

  const handleWorkloadExport = () => {
    const headers = ['Employee Name', 'Active Tasks', 'Overdue Tasks', 'High Priority Tasks'];
    const rows = workloadStats.map((w) => [
      w.name,
      w.activeTasks,
      w.overdueTasks,
      w.highPriorityTasks,
    ]);
    exportToCsv('EmployeeWorkloadReport.csv', headers, rows);
  };

  if (loading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title="Báo cáo & Phân tích (Reports)" description="Đang tải dữ liệu tổng hợp..." />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header */}
      <PageHeader
        title="Báo cáo & Phân tích (Reports)"
        description="Tổng hợp chỉ số hiệu suất doanh nghiệp, tiến độ dự án và phân tích khối lượng công việc"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Overview', href: '/dashboard' },
              { label: 'Reports' },
            ]}
          />
        }
      />

      {/* Tabs Header */}
      <Card>
        <CardContent className="p-2 border-b border-border/60 flex flex-wrap gap-1.5 bg-accent/20">
          {[
            { id: 'projects', label: 'Báo cáo Dự án' },
            { id: 'tasks', label: 'Báo cáo Công việc' },
            { id: 'workload', label: 'Tải lượng Nhân sự' },
            { id: 'vacations', label: 'Báo cáo Nghỉ phép' },
            { id: 'gaps', label: 'Khoảng trống Hệ thống' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-surface text-text-primary shadow-sm border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* TAB CONTENTS */}
      <div className="space-y-6">
        {/* Tab 1: Project Portfolio Report */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Tổng số Dự án</span>
                  <p className="text-2xl font-black text-text-primary mt-2">{projectStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Đang hoạt động (Active)</span>
                  <p className="text-2xl font-black text-emerald-500 mt-2">{projectStats.active}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Đã hoàn thành</span>
                  <p className="text-2xl font-black text-sky-500 mt-2">{projectStats.completed}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Đang tạm dừng (Suspended)</span>
                  <p className="text-2xl font-black text-amber-500 mt-2">{projectStats.atRisk}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/60 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Hiệu suất hoàn thành danh mục dự án
                </CardTitle>
                <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleProjectExport}>
                  Xuất CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-accent/40 text-text-secondary border-b border-border">
                        <th className="p-3 font-semibold">Tên Dự án</th>
                        <th className="p-3 font-semibold">Mã code</th>
                        <th className="p-3 font-semibold">Trạng thái</th>
                        <th className="p-3 font-semibold text-center">Tổng số Task</th>
                        <th className="p-3 font-semibold text-center">Tỷ lệ hoàn thành</th>
                        <th className="p-3 font-semibold text-center">Task quá hạn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {projectStats.list.map((p) => (
                        <tr key={p.id} className="hover:bg-accent/20 transition-colors">
                          <td className="p-3 font-semibold text-text-primary">{p.name}</td>
                          <td className="p-3 text-text-secondary font-mono uppercase">{p.project_code || '—'}</td>
                          <td className="p-3">
                            <Badge variant={p.status === 'Active' ? 'success' : p.status === 'Completed' ? 'primary' : 'warning'} size="sm">
                              {p.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-text-secondary">{p.totalTasks}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-accent rounded-full h-1.5 overflow-hidden shrink-0">
                                <div className="bg-primary h-full" style={{ width: `${p.progress}%` }} />
                              </div>
                              <span className="font-semibold">{p.progress}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {p.overdueTasks > 0 ? (
                              <span className="text-rose-500 font-bold">{p.overdueTasks} task</span>
                            ) : (
                              <span className="text-emerald-500 font-semibold">✓ Đạt</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Tasks Reports */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Tổng số công việc</span>
                  <p className="text-2xl font-black text-text-primary mt-2">{taskStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Đã hoàn thành</span>
                  <p className="text-2xl font-black text-emerald-500 mt-2">{taskStats.done}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Đang tiến hành</span>
                  <p className="text-2xl font-black text-sky-500 mt-2">{taskStats.inProgress}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Công việc Quá hạn</span>
                  <p className="text-2xl font-black text-rose-500 mt-2">{taskStats.overdue}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart: Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-secondary">Trạng thái Công việc</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStats.statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskStats.statusChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bar Chart: Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-secondary">Mức độ ưu tiên</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskStats.priorityChartData}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {taskStats.priorityChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-end">
              <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleTaskExport}>
                Xuất danh sách công việc (CSV)
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Employee Workload */}
        {activeTab === 'workload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-border/60 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Thống kê tải lượng công việc của nhân sự
                </CardTitle>
                <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleWorkloadExport}>
                  Xuất dữ liệu tải lượng (CSV)
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-accent/40 text-text-secondary border-b border-border">
                        <th className="p-3 font-semibold">Tên Nhân viên</th>
                        <th className="p-3 font-semibold text-center w-36">Task đang làm (Active)</th>
                        <th className="p-3 font-semibold text-center w-36">Task khẩn cấp / Cao</th>
                        <th className="p-3 font-semibold text-center w-36">Task vượt deadline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {workloadStats.map((w, idx) => (
                        <tr key={idx} className="hover:bg-accent/20 transition-colors">
                          <td className="p-3 font-semibold text-text-primary">{w.name}</td>
                          <td className="p-3 text-center text-text-secondary font-bold">{w.activeTasks}</td>
                          <td className="p-3 text-center">
                            {w.highPriorityTasks > 0 ? (
                              <span className="text-amber-500 font-bold">{w.highPriorityTasks} task</span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {w.overdueTasks > 0 ? (
                              <span className="text-rose-500 font-bold">{w.overdueTasks} task</span>
                            ) : (
                              <span className="text-emerald-500 font-semibold">Không</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 4: Vacations */}
        {activeTab === 'vacations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Tổng đơn phép</span>
                  <p className="text-2xl font-black text-text-primary mt-2">{vacationStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Đang chờ duyệt</span>
                  <p className="text-2xl font-black text-amber-500 mt-2">{vacationStats.pending}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Đã duyệt (Approved)</span>
                  <p className="text-2xl font-black text-emerald-500 mt-2">{vacationStats.approved}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Danh sách vắng mặt gần đây
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {vacations.length === 0 ? (
                  <p className="text-xs text-text-muted py-8 text-center">Không tìm thấy dữ liệu nghỉ phép.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-accent/40 text-text-secondary border-b border-border">
                          <th className="p-3 font-semibold">Nhân sự</th>
                          <th className="p-3 font-semibold">Loại phép</th>
                          <th className="p-3 font-semibold">Bắt đầu</th>
                          <th className="p-3 font-semibold">Kết thúc</th>
                          <th className="p-3 font-semibold">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {vacations.slice(0, 10).map((v) => {
                          const emp = employees.find((e) => e.id === v.requested_by);
                          return (
                            <tr key={v.id} className="hover:bg-accent/20 transition-colors">
                              <td className="p-3 font-semibold text-text-primary">{emp?.full_name || 'Nhân sự'}</td>
                              <td className="p-3 text-text-secondary">{v.type}</td>
                              <td className="p-3 text-text-secondary">{new Date(v.start_date).toLocaleDateString('vi-VN')}</td>
                              <td className="p-3 text-text-secondary">{new Date(v.end_date).toLocaleDateString('vi-VN')}</td>
                              <td className="p-3">
                                <Badge variant={v.status === 'Approved' || v.status === 'HR Approved' ? 'success' : v.status === 'Pending' ? 'warning' : 'danger'} size="sm">
                                  {v.status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 5: GAPS */}
        {activeTab === 'gaps' && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-rose-200/40 dark:border-rose-950/20 bg-rose-500/[0.01]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="danger">Agile Gap</Badge>
                    <CardTitle className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                      Biểu đồ Agile Sprints (Burndown & Velocity)
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-text-secondary leading-relaxed space-y-2">
                  <p>
                    Để xây dựng biểu đồ Burndown và đo lường Velocity của Sprint, cơ sở dữ liệu cần hỗ trợ lưu trữ lịch sử thay đổi (snapshots) của task theo từng ngày. Do backend SQL Server chưa cấu hình bảng sự kiện này, việc giả lập biểu đồ Burndown là không chính xác và dễ gây hiểu nhầm về tiến độ.
                  </p>
                  <p className="font-semibold text-text-primary mt-3">Đề xuất Schema Sprints History DDL:</p>
                  <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto">
{`CREATE TABLE sprint_snapshots (
  id INT IDENTITY(1,1) PRIMARY KEY,
  sprint_id INT NOT NULL,
  snapshot_date DATE NOT NULL,
  remaining_story_points INT NOT NULL,
  completed_story_points INT NOT NULL
);`}
                  </pre>
                </CardContent>
              </Card>

              <Card className="border-rose-200/40 dark:border-rose-950/20 bg-rose-500/[0.01]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="danger">Feedback Gap</Badge>
                    <CardTitle className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                      Báo cáo Phản hồi & Thảo luận Chuyên đề (Feedback & Topics)
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-text-secondary leading-relaxed space-y-2">
                  <p>
                    Hệ thống phản hồi và thảo luận chuyên đề hiện chưa có thực thể (Entity) lưu trữ hay API hoàn chỉnh ở backend. Do đó các chỉ số phân loại ý kiến phản hồi theo mức độ hài lòng hoặc số lượng chủ đề thảo luận đang hoạt động được ghi nhận như một khoảng trống thiết kế kỹ thuật.
                  </p>
                  <p className="font-semibold text-text-primary mt-3">Đề xuất API Router Contract:</p>
                  <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto">
{`GET /api/v1/feedback/summary -> FeedbackSummaryResponse
GET /api/v1/topics/analytics  -> TopicsAnalyticsResponse`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;

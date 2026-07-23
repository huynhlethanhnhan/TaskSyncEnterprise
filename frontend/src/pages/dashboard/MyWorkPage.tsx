import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Calendar as CalendarIcon,
  Bell,
  User,
  CheckCircle,
  Briefcase,
  AlertTriangle,
  Play,
  HeartHandshake,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';
import api from '../../api/axios';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';

export const MyWorkPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const updateStatus = useUpdateTaskStatus();

  const [activeTab, setActiveTab] = React.useState<'today' | 'assigned' | 'requests' | 'sprint'>('today');

  // Load tasks and projects
  const { data: myTasks = [], isLoading, isError, refetch } = useTasks(true);
  const { data: projects = [] } = useProjects();

  // Load vacations
  const { data: vacations = [], isLoading: vacationsLoading } = useQuery<any[]>({
    queryKey: ['my-vacations-work'],
    queryFn: async () => {
      const res = await api.get('/vacations');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: taskId, status: newStatus });
      toast.success('Cập nhật thành công', `Công việc đã được chuyển sang "${newStatus}".`);
      refetch();
    } catch {
      toast.error('Lỗi cập nhật', 'Không thể thay đổi trạng thái công việc.');
    }
  };

  const tasksDueToday = React.useMemo(() => {
    const todayStr = new Date().toDateString();
    return myTasks.filter((t) => t.deadline && new Date(t.deadline).toDateString() === todayStr);
  }, [myTasks]);

  const myLeaves = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return vacations.filter((v) => {
      const isApproved = v.status === 'Approved' || v.status === 'HR Approved' || v.status === 'Manager Approved';
      const isMine = Number(v.requested_by) === Number(user?.id);
      const isUpcoming = v.start_date && new Date(v.start_date) >= today;
      return isApproved && isMine && isUpcoming;
    });
  }, [vacations, user]);

  const myRequests = React.useMemo(() => {
    return vacations.filter((v) => Number(v.requested_by) === Number(user?.id));
  }, [vacations, user]);

  const urgentTasks = React.useMemo(() => {
    const now = new Date();
    return myTasks.filter((t) => {
      const isPending = t.status !== 'Done';
      const isOverdue = t.deadline ? new Date(t.deadline) < now : false;
      const isHighPriority = t.priority === 'High' || t.priority === 'Urgent';
      return isPending && (isOverdue || isHighPriority);
    });
  }, [myTasks]);

  const tasksByProject = React.useMemo(() => {
    const map: Record<number, { project: any; tasks: any[] }> = {};
    myTasks.forEach((t) => {
      const projId = t.project_id || 0;
      if (!map[projId]) {
        const project = projects.find((p) => p.id === projId) || { name: 'Khác' };
        map[projId] = { project, tasks: [] };
      }
      map[projId].tasks.push(t);
    });
    return Object.values(map);
  }, [myTasks, projects]);

  const stats = React.useMemo(() => {
    return myTasks.reduce(
      (acc, t) => {
        acc.total += 1;
        if (t.status === 'Done') acc.done += 1;
        else if (t.status === 'In Progress') acc.inProgress += 1;
        else acc.todo += 1;
        return acc;
      },
      { total: 0, todo: 0, inProgress: 0, done: 0 }
    );
  }, [myTasks]);

  if (isLoading || vacationsLoading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title="Không gian làm việc của tôi" description="Đang tải dữ liệu cá nhân..." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title="Không gian làm việc của tôi" description="Công việc và lịch trình cá nhân" />
        <ErrorState
          title="Không thể tải dữ liệu công việc"
          message="Vui lòng thử lại hoặc liên hệ quản trị viên hệ thống."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Không gian làm việc của tôi"
        description="Quản lý công việc cá nhân, tiến độ thực hiện và các dịch vụ tự phục vụ nhân sự"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Overview', href: '/dashboard' },
              { label: 'My Work' },
            ]}
          />
        }
      />

      {/* KPI Stats cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tổng Task được giao', val: stats.total, variant: 'outline' },
          { label: 'Công việc cần làm', val: stats.todo, variant: 'warning' },
          { label: 'Đang triển khai', val: stats.inProgress, variant: 'primary' },
          { label: 'Đã hoàn thành', val: stats.done, variant: 'success' },
        ].map((item, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">{item.label}</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-text-primary">{item.val}</span>
                <Badge variant={item.variant as any} size="sm">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-6 items-start">
        {/* Left Column: Tabbed Lists */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-2 border-b border-border/60 flex flex-wrap gap-1.5 bg-accent/20">
              {[
                { id: 'today', label: `Hôm nay (${tasksDueToday.length + myLeaves.length})` },
                { id: 'assigned', label: `Công việc của tôi (${myTasks.length})` },
                { id: 'requests', label: `Nghỉ phép & Đề xuất (${myRequests.length})` },
                { id: 'sprint', label: 'Sprint hiện tại (Agile)' },
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

            <CardContent className="p-4">
              {/* Tab 1: TODAY */}
              {activeTab === 'today' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-2">Công việc đến hạn hôm nay</h3>
                    {tasksDueToday.length === 0 ? (
                      <p className="text-xs text-text-muted py-4 border border-dashed border-border rounded-xl text-center bg-surface/40">
                        Không có công việc nào cần hoàn thành hôm nay.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {tasksDueToday.map((task) => (
                          <div key={task.id} className="p-3 border border-border rounded-xl bg-surface flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-800 transition">
                            <span className="text-xs font-semibold text-text-primary truncate">{task.title || task.name}</span>
                            <Badge variant={task.priority === 'High' || task.priority === 'Urgent' ? 'danger' : 'outline'} size="sm">
                              {task.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-2 mt-4">Kế hoạch vắng mặt sắp tới (Approved)</h3>
                    {myLeaves.length === 0 ? (
                      <p className="text-xs text-text-muted py-4 border border-dashed border-border rounded-xl text-center bg-surface/40">
                        Không có lịch nghỉ phép nào đã được duyệt sắp tới.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {myLeaves.map((vac) => (
                          <div key={vac.id} className="p-3 border border-border rounded-xl bg-surface/50 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-text-primary">Nghỉ phép loại: {vac.type}</p>
                              <p className="text-[10px] text-text-muted">Từ {new Date(vac.start_date).toLocaleDateString('vi-VN')} đến {new Date(vac.end_date).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <Badge variant="success">Approved</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: ASSIGNED TO ME */}
              {activeTab === 'assigned' && (
                <div className="space-y-6">
                  {tasksByProject.length === 0 ? (
                    <p className="text-xs text-text-muted py-12 text-center">Bạn chưa được phân công công việc nào.</p>
                  ) : (
                    tasksByProject.map((group) => (
                      <div key={group.project.id || 0} className="space-y-2">
                        <div className="flex items-center gap-2 border-b border-border pb-1.5">
                          <Briefcase className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-xs font-bold text-text-primary">{group.project.name}</span>
                        </div>
                        <div className="space-y-2">
                          {group.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3.5 border border-border rounded-xl bg-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-800 transition"
                            >
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-text-primary">{task.title || task.name}</p>
                                <div className="flex flex-wrap gap-1.5 text-[9px] text-text-muted">
                                  {task.task_code && <span className="font-mono">{task.task_code}</span>}
                                  {task.deadline && (
                                    <span>Hạn chót: {new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
                                  )}
                                  <span>Độ ưu tiên: {task.priority}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {task.status === 'To Do' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Play className="h-3 w-3" />}
                                    onClick={() => handleStatusChange(task.id, 'In Progress')}
                                  >
                                    Bắt đầu làm
                                  </Button>
                                )}
                                {task.status === 'In Progress' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<CheckCircle className="h-3 w-3" />}
                                    onClick={() => handleStatusChange(task.id, 'Done')}
                                  >
                                    Hoàn thành
                                  </Button>
                                )}
                                <Badge variant={task.status === 'Done' ? 'success' : task.status === 'In Progress' ? 'primary' : 'warning'}>
                                  {task.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: MY REQUESTS */}
              {activeTab === 'requests' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">Đơn đề xuất đã gửi ({myRequests.length})</span>
                    <Button variant="primary" size="sm" onClick={() => navigate('/vacations?new=true')}>
                      Tạo đơn mới
                    </Button>
                  </div>

                  {myRequests.length === 0 ? (
                    <p className="text-xs text-text-muted py-8 text-center border border-dashed border-border rounded-xl bg-surface/30">
                      Chưa gửi đơn đề xuất nào.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-border rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-accent/40 text-text-secondary border-b border-border">
                            <th className="p-3 font-semibold">Loại nghỉ</th>
                            <th className="p-3 font-semibold">Ngày bắt đầu</th>
                            <th className="p-3 font-semibold">Ngày kết thúc</th>
                            <th className="p-3 font-semibold">Trạng thái duyệt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {myRequests.map((r) => (
                            <tr key={r.id} className="hover:bg-accent/20 transition-colors">
                              <td className="p-3 font-semibold text-text-primary">{r.type}</td>
                              <td className="p-3 text-text-secondary">{new Date(r.start_date).toLocaleDateString('vi-VN')}</td>
                              <td className="p-3 text-text-secondary">{new Date(r.end_date).toLocaleDateString('vi-VN')}</td>
                              <td className="p-3">
                                <Badge variant={r.status === 'Approved' || r.status === 'HR Approved' ? 'success' : r.status === 'Pending' ? 'warning' : 'danger'} size="sm">
                                  {r.status === 'Pending' ? 'Chờ duyệt' : r.status === 'HR Approved' || r.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: SPRINTS */}
              {activeTab === 'sprint' && (
                <div className="space-y-4">
                  <div className="p-4 border border-rose-200/40 bg-rose-500/[0.02] rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="danger">Agile Gap</Badge>
                      <h4 className="font-bold text-xs text-rose-600 dark:text-rose-400">Hệ thống Sprints & Backlog chưa có dữ liệu backend</h4>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Để bắt đầu quản lý Agile, backend cần bổ sung mô hình dữ liệu bảng <code className="px-1 py-0.5 rounded bg-secondary font-mono">sprints</code> và các quan hệ bảng với task công việc. Các task hiển thị ở đây là các task có trạng thái đang triển khai được lấy từ danh mục chung.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-text-primary uppercase tracking-wide">Tasks đang thực hiện</h5>
                    {myTasks.filter(t => t.status === 'In Progress').length === 0 ? (
                      <p className="text-xs text-text-muted py-4 text-center border border-dashed border-border rounded-xl">
                        Không có task nào đang thực hiện trong sprint.
                      </p>
                    ) : (
                      myTasks.filter(t => t.status === 'In Progress').map(t => (
                        <div key={t.id} className="p-3 border border-border rounded-xl bg-surface flex items-center justify-between text-xs">
                          <span className="font-semibold text-text-primary truncate">{t.title || t.name}</span>
                          <Badge variant="primary">In Progress</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sidebar Alerts & Portals */}
        <div className="space-y-6">
          {/* Urgent Actions */}
          <Card className="border-rose-200/40 dark:border-rose-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Cần chú ý khẩn cấp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentTasks.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-3">Không có công việc khẩn cấp hoặc quá hạn nào.</p>
              ) : (
                urgentTasks.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg border border-rose-200/35 bg-rose-50/20 dark:bg-rose-950/10 flex items-center justify-between text-xs cursor-pointer hover:bg-rose-50/30 transition-colors"
                    onClick={() => navigate('/tasks')}
                  >
                    <span className="font-semibold text-text-primary truncate">{t.title || t.name}</span>
                    <Badge variant="danger" size="sm" className="text-[9px] shrink-0 ml-2">Overdue / High</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Self-Service Portal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Self-Service Action Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Đăng ký Nghỉ phép', icon: <CalendarIcon className="text-indigo-500" />, onClick: () => navigate('/vacations?new=true'), badge: 'Form' },
                { label: 'Hộp thư thông báo', icon: <Bell className="text-amber-500" />, onClick: () => navigate('/notifications'), badge: 'Inbox' },
                { label: 'Mở lịch biểu dự án', icon: <Clock className="text-sky-500" />, onClick: () => navigate('/calendar'), badge: 'Calendar' },
                { label: 'Gửi Ý kiến Phản hồi', icon: <HeartHandshake className="text-rose-500" />, onClick: () => navigate('/feedback'), badge: 'Feedback' },
                { label: 'Thư mục tệp chung', icon: <FolderOpen className="text-emerald-500" />, onClick: () => navigate('/files'), badge: 'Files' },
              ].map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border/80 bg-surface/50 text-xs font-semibold text-text-primary hover:bg-secondary cursor-pointer transition-colors"
                  onClick={act.onClick}
                >
                  <div className="flex items-center gap-2">
                    {act.icon}
                    <span>{act.label}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-text-muted font-normal">
                    <span>{act.badge}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyWorkPage;

import * as React from 'react';
import { useNavigate } from 'react-router';
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
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';

const MyWorkPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { t, statusLabel, formatDate } = useSettings();
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
      toast.success(
        t('Cập nhật thành công', 'Updated successfully'),
        `${t('Công việc đã được chuyển sang', 'Task moved to')} "${statusLabel(newStatus)}".`,
      );
      refetch();
    } catch {
      toast.error(t('Lỗi cập nhật', 'Update failed'), t('Không thể thay đổi trạng thái công việc.', 'Unable to update task status.'));
    }
  };

  const tasksDueToday = React.useMemo(() => {
    const todayStr = new Date().toDateString();
    return myTasks.filter((taskItem) => taskItem.deadline && new Date(taskItem.deadline).toDateString() === todayStr);
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
    return myTasks.filter((taskItem) => {
      const isPending = taskItem.status !== 'Done';
      const isOverdue = taskItem.deadline ? new Date(taskItem.deadline) < now : false;
      const isHighPriority = taskItem.priority === 'High' || taskItem.priority === 'Urgent';
      return isPending && (isOverdue || isHighPriority);
    });
  }, [myTasks]);

  const tasksByProject = React.useMemo(() => {
    const map: Record<number, { project: any; tasks: any[] }> = {};
    myTasks.forEach((taskItem) => {
      const projId = taskItem.project_id || 0;
      if (!map[projId]) {
        const project = projects.find((p) => p.id === projId) || { name: t('Khác', 'Other') };
        map[projId] = { project, tasks: [] };
      }
      map[projId].tasks.push(taskItem);
    });
    return Object.values(map);
  }, [myTasks, projects, t]);

  const stats = React.useMemo(() => {
    return myTasks.reduce(
      (acc, taskItem) => {
        acc.total += 1;
        if (taskItem.status === 'Done') acc.done += 1;
        else if (taskItem.status === 'In Progress') acc.inProgress += 1;
        else acc.todo += 1;
        return acc;
      },
      { total: 0, todo: 0, inProgress: 0, done: 0 }
    );
  }, [myTasks]);

  if (isLoading || vacationsLoading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader
          title={t('Không gian làm việc của tôi', 'My Workspace')}
          description={t('Đang tải dữ liệu cá nhân...', 'Loading personal workspace data...')}
        />
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
        <PageHeader
          title={t('Không gian làm việc của tôi', 'My Workspace')}
          description={t('Công việc và lịch trình cá nhân', 'Personal tasks and schedule')}
        />
        <ErrorState
          title={t('Không thể tải dữ liệu công việc', 'Failed to load work items')}
          message={t('Vui lòng thử lại hoặc liên hệ quản trị viên hệ thống.', 'Please try again or contact your system administrator.')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('Không gian làm việc của tôi', 'My Workspace')}
        description={t('Quản lý công việc cá nhân, tiến độ thực hiện và các dịch vụ tự phục vụ nhân sự', 'Manage your personal tasks, execution progress, and HR self-service actions')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Tổng quan', 'Overview'), href: '/dashboard' },
              { label: t('Việc của tôi', 'My Work') },
            ]}
          />
        }
      />

      {/* KPI Stats cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: t('Tổng Task được giao', 'Total Assigned Tasks'), val: stats.total, status: 'Active' },
          { label: t('Công việc cần làm', 'To Do Tasks'), val: stats.todo, status: 'To Do' },
          { label: t('Đang triển khai', 'In Progress Tasks'), val: stats.inProgress, status: 'In Progress' },
          { label: t('Đã hoàn thành', 'Completed Tasks'), val: stats.done, status: 'Done' },
        ].map((item, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">{item.label}</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-text-primary">{item.val}</span>
                <StatusBadge status={item.status} size="sm" />
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
                { id: 'today', label: `${t('Hôm nay', 'Today')} (${tasksDueToday.length + myLeaves.length})` },
                { id: 'assigned', label: `${t('Công việc của tôi', 'Assigned Tasks')} (${myTasks.length})` },
                { id: 'requests', label: `${t('Nghỉ phép & Đề xuất', 'Leave & Requests')} (${myRequests.length})` },
                { id: 'sprint', label: t('Sprint hiện tại (Agile)', 'Current Sprint (Agile)') },
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
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-2">{t('Công việc đến hạn hôm nay', 'Tasks Due Today')}</h3>
                    {tasksDueToday.length === 0 ? (
                      <p className="text-xs text-text-muted py-4 border border-dashed border-border rounded-xl text-center bg-surface/40">
                        {t('Không có công việc nào cần hoàn thành hôm nay.', 'No tasks due today.')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {tasksDueToday.map((task) => (
                          <div key={task.id} className="p-3 border border-border rounded-xl bg-surface flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-800 transition">
                            <span className="text-xs font-semibold text-text-primary truncate">{task.title || task.name}</span>
                            <StatusBadge status={task.priority || 'Medium'} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-2 mt-4">{t('Kế hoạch vắng mặt sắp tới (Đã duyệt)', 'Upcoming Approved Leave')}</h3>
                    {myLeaves.length === 0 ? (
                      <p className="text-xs text-text-muted py-4 border border-dashed border-border rounded-xl text-center bg-surface/40">
                        {t('Không có lịch nghỉ phép nào đã được duyệt sắp tới.', 'No upcoming approved leave scheduled.')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {myLeaves.map((vac) => (
                          <div key={vac.id} className="p-3 border border-border rounded-xl bg-surface/50 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-text-primary">{t('Nghỉ phép loại:', 'Leave type:')} {statusLabel(vac.type)}</p>
                              <p className="text-[10px] text-text-muted">{t('Từ', 'From')} {formatDate(vac.start_date)} {t('đến', 'to')} {formatDate(vac.end_date)}</p>
                            </div>
                            <StatusBadge status="Approved" size="sm" />
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
                    <p className="text-xs text-text-muted py-12 text-center">{t('Bạn chưa được phân công công việc nào.', 'No tasks assigned to you yet.')}</p>
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
                                    <span>{t('Hạn chót:', 'Deadline:')} {formatDate(task.deadline)}</span>
                                  )}
                                  <span>{t('Độ ưu tiên:', 'Priority:')} {statusLabel(task.priority)}</span>
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
                                    {t('Bắt đầu làm', 'Start')}
                                  </Button>
                                )}
                                {task.status === 'In Progress' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<CheckCircle className="h-3 w-3" />}
                                    onClick={() => handleStatusChange(task.id, 'Done')}
                                  >
                                    {t('Hoàn thành', 'Complete')}
                                  </Button>
                                )}
                                <StatusBadge status={task.status} size="sm" />
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
                    <span className="text-xs font-bold text-text-primary">{t('Đơn đề xuất đã gửi', 'Submitted Requests')} ({myRequests.length})</span>
                    <Button variant="primary" size="sm" onClick={() => navigate('/vacations?new=true')}>
                      {t('Tạo đơn mới', 'New Request')}
                    </Button>
                  </div>

                  {myRequests.length === 0 ? (
                    <p className="text-xs text-text-muted py-8 text-center border border-dashed border-border rounded-xl bg-surface/30">
                      {t('Chưa gửi đơn đề xuất nào.', 'No requests submitted yet.')}
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-border rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-accent/40 text-text-secondary border-b border-border">
                            <th className="p-3 font-semibold">{t('Loại nghỉ', 'Leave Type')}</th>
                            <th className="p-3 font-semibold">{t('Ngày bắt đầu', 'Start Date')}</th>
                            <th className="p-3 font-semibold">{t('Ngày kết thúc', 'End Date')}</th>
                            <th className="p-3 font-semibold">{t('Trạng thái duyệt', 'Status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {myRequests.map((r) => (
                            <tr key={r.id} className="hover:bg-accent/20 transition-colors">
                              <td className="p-3 font-semibold text-text-primary">{statusLabel(r.type)}</td>
                              <td className="p-3 text-text-secondary">{formatDate(r.start_date)}</td>
                              <td className="p-3 text-text-secondary">{formatDate(r.end_date)}</td>
                              <td className="p-3">
                                <StatusBadge status={r.status} size="sm" />
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
                <div className="space-y-4 font-sans text-xs">
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-text-primary uppercase tracking-wide">{t('Tasks trong Sprint hiện tại', 'Tasks in Current Sprint')}</h5>
                    {myTasks.filter((taskItem) => taskItem.sprint_id !== null).length === 0 ? (
                      <p className="text-xs text-text-muted py-6 text-center border border-dashed border-border rounded-xl bg-surface/50">
                        {t('Không có task nào được lên lịch cho Sprint hiện tại của bạn.', 'No tasks scheduled in your active sprint.')}
                      </p>
                    ) : (
                      myTasks
                        .filter((taskItem) => taskItem.sprint_id !== null)
                        .map((taskItem) => (
                          <div
                            key={taskItem.id}
                            className="p-3 border border-border rounded-xl bg-surface flex items-center justify-between gap-3 text-xs hover:border-primary/20 transition-all"
                          >
                            <span className="font-semibold text-text-primary truncate">{taskItem.title || taskItem.name}</span>
                            <StatusBadge status={taskItem.status} size="sm" />
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
                {t('Cần chú ý khẩn cấp', 'Urgent Attention')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentTasks.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-3">{t('Không có công việc khẩn cấp hoặc quá hạn nào.', 'No urgent or overdue tasks.')}</p>
              ) : (
                urgentTasks.slice(0, 4).map((taskItem) => (
                  <div
                    key={taskItem.id}
                    className="p-3 rounded-lg border border-rose-200/35 bg-rose-50/20 dark:bg-rose-950/10 flex items-center justify-between text-xs cursor-pointer hover:bg-rose-50/30 transition-colors"
                    onClick={() => navigate('/tasks')}
                  >
                    <span className="font-semibold text-text-primary truncate">{taskItem.title || taskItem.name}</span>
                    <Badge variant="danger" size="sm" className="text-[9px] shrink-0 ml-2">{t('Quá hạn / Cao', 'Overdue / High')}</Badge>
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
                {t('Cổng Tự phục vụ Nhân sự', 'Self-Service Action Portal')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: t('Đăng ký Nghỉ phép', 'Request Leave'), icon: <CalendarIcon className="text-indigo-500" />, onClick: () => navigate('/vacations?new=true'), badge: t('Biểu mẫu', 'Form') },
                { label: t('Hộp thư thông báo', 'Notification Inbox'), icon: <Bell className="text-amber-500" />, onClick: () => navigate('/notifications'), badge: t('Hộp thư', 'Inbox') },
                { label: t('Mở lịch biểu dự án', 'Project Calendar'), icon: <Clock className="text-sky-500" />, onClick: () => navigate('/calendar'), badge: t('Lịch biểu', 'Calendar') },
                { label: t('Gửi Ý kiến Phản hồi', 'Submit Feedback'), icon: <HeartHandshake className="text-rose-500" />, onClick: () => navigate('/feedback'), badge: t('Góp ý', 'Feedback') },
                { label: t('Thư mục tệp chung', 'Shared Files'), icon: <FolderOpen className="text-emerald-500" />, onClick: () => navigate('/files'), badge: t('Tài liệu', 'Files') },
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

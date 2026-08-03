import * as React from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Plus,
  Briefcase,
  CheckSquare,
  Layers,
  RefreshCw,
  Calendar as CalendarIcon,
  FolderOpen,
  MessageSquare,
  Activity,
  Settings,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/common/Avatar';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useProjectDetail, useUpdateProject } from '../../hooks/useProjects';
import { useTasks, useCreateTask, useUpdateTask, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useEmployees } from '../../hooks/useEmployees';
import { useToast } from '../../providers/ToastProvider';
import { TaskDrawer } from '../../components/drawers/TaskDrawer';
import { type TaskItem } from '../../api/services';
import { JiraTimeline } from '../../components/timeline/JiraTimeline';
import { BacklogManager } from '../../components/backlog/BacklogManager';
import { SprintsManager } from '../../components/sprints/SprintsManager';
import { TopicsManager } from '../../components/topics/TopicsManager';
import { FilesManager } from '../../components/files/FilesManager';
import { useAuth } from '../../providers/AuthProvider';
import { useTeams } from '../../hooks/useTeams';
import { useDepartments } from '../../hooks/useDepartments';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const projectId = Number(id);
  const role = (user?.role || '').toLowerCase();
  const isStaff = role === 'employee' || role === 'staff' || Number(user?.role_id) === 3;
  const isAdminOrManager =
    role === 'admin' || role === 'manager' || Number(user?.role_id) === 1 || Number(user?.role_id) === 2;

  const [activeTab, setActiveTab] = React.useState('overview');

  // React Query Hooks
  const { data: project, isLoading: isProjectLoading, isError: isProjectError, refetch } = useProjectDetail(projectId);
  const { data: allTasks = [], refetch: refetchTasks } = useTasks(isStaff);
  const { data: employees = [] } = useEmployees();
  const { data: teams = [] } = useTeams();
  const { data: departments = [] } = useDepartments();
  const isTeamLeader = teams.some((team) => Number(team.leader_id) === Number(user?.id));
  const canManageTasks = isAdminOrManager || isTeamLeader;
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();

  // Task Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null);

  // Settings form states
  const [projName, setProjName] = React.useState('');
  const [projCode, setProjCode] = React.useState('');
  const [projDesc, setProjDesc] = React.useState('');
  const [projStatus, setProjStatus] = React.useState('Active');
  const [projDeptId, setProjDeptId] = React.useState<number | null>(null);
  const [projTeamId, setProjTeamId] = React.useState<number | null>(null);
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);

  React.useEffect(() => {
    if (project) {
      setProjName(project.name || '');
      setProjCode(project.project_code || '');
      setProjDesc(project.description || '');
      setProjStatus(project.status || 'Active');
      setProjDeptId(project.department_id ?? null);
      setProjTeamId(project.team_id ?? null);
    }
  }, [project]);

  const projectTasks = React.useMemo(() => {
    return allTasks.filter((t) => Number(t.project_id) === projectId);
  }, [allTasks, projectId]);

  const taskCounts = React.useMemo(() => {
    return projectTasks.reduce(
      (acc, t) => {
        if (t.status === 'Done') acc.done += 1;
        else if (t.status === 'In Progress') acc.inProgress += 1;
        else acc.todo += 1;
        return acc;
      },
      { todo: 0, inProgress: 0, done: 0 }
    );
  }, [projectTasks]);

  const completionRate = projectTasks.length ? Math.round((taskCounts.done / projectTasks.length) * 100) : 0;

  // Handle saving task in drawer
  const handleSaveTask = async (data: Partial<TaskItem>) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, payload: data });
        toast.success('Cập nhật task thành công');
      } else {
        await createTask.mutateAsync({ ...data, project_id: projectId });
        toast.success('Tạo task mới thành công');
      }
      setIsDrawerOpen(false);
      refetchTasks();
    } catch {
      toast.error('Lỗi khi lưu công việc');
    }
  };

  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task);
    setIsDrawerOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingTask(null);
    setIsDrawerOpen(true);
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateTaskStatus.mutateAsync({ id: taskId, status: newStatus });
      toast.success('Cập nhật trạng thái thành công');
      refetchTasks();
    } catch {
      toast.error('Lỗi cập nhật trạng thái');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    try {
      setIsSavingSettings(true);
      await updateProject.mutateAsync({
        id: projectId,
        payload: {
          name: projName.trim(),
          project_code: projCode.trim(),
          description: projDesc.trim() || null,
          status: projStatus,
          department_id: projDeptId ? Number(projDeptId) : null,
          team_id: projTeamId ? Number(projTeamId) : null,
        },
      });
      toast.success('Cập nhật cài đặt dự án thành công');
      refetch();
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.detail)
          ? err?.response?.data?.detail[0]?.msg
          : err?.response?.data?.detail) ||
        'Lỗi khi lưu cài đặt dự án';
      toast.error('Cập nhật thất bại', errorMsg);
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isProjectLoading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title="Chi tiết Dự án" description="Đang tải dữ liệu dự án..." />
        <SkeletonCard />
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title="Chi tiết Dự án" description="Thông tin dự án" />
        <ErrorState
          title="Không tìm thấy dự án"
          message="Dự án không tồn tại hoặc đã bị xóa khỏi hệ thống."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Define dynamic project level tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'timeline', label: 'Timeline (Jira)', icon: <CalendarIcon className="h-4 w-4" /> },
    { id: 'tasks', label: 'Công việc (Kanban)', icon: <CheckSquare className="h-4 w-4" /> },
    { id: 'backlog', label: 'Backlog', icon: <Layers className="h-4 w-4" /> },
    { id: 'sprints', label: 'Sprints', icon: <RefreshCw className="h-4 w-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="h-4 w-4" /> },
    { id: 'files', label: 'Files', icon: <FolderOpen className="h-4 w-4" /> },
    { id: 'discussions', label: 'Discussions', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={project.name}
        description={project.description || 'Chi tiết thông tin công việc và tiến độ dự án.'}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dự án', href: '/projects' },
              { label: project.name },
            ]}
          />
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/projects')}
          >
            Quay lại danh sách
          </Button>
        }
      />

      {/* Tabs Header Grid */}
      <div className="flex border-b border-border overflow-x-auto gap-2 pb-[1px] scrollbar-thin">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border-b-2 ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tabs Content Areas */}
      <div className="space-y-6">
        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && <JiraTimeline projectId={projectId} />}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Tiến độ Dự án</span>
                    <Badge variant="primary">{completionRate}% Hoàn thành</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-3 w-full bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${completionRate}%` }} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center pt-2">
                    <div className="p-3 rounded-xl border border-amber-200/40 bg-amber-500/[0.02]">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Cần làm (To Do)</span>
                      <p className="text-xl font-bold text-amber-600 mt-1">{taskCounts.todo}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-sky-200/40 bg-sky-500/[0.02]">
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Đang làm (In Progress)</span>
                      <p className="text-xl font-bold text-sky-600 mt-1">{taskCounts.inProgress}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-200/40 bg-emerald-500/[0.02]">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Hoàn thành (Done)</span>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{taskCounts.done}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tasks Quick Peek */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Công việc gần đây ({projectTasks.length})</span>
                    {canManageTasks && (
                      <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                        Thêm công việc
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projectTasks.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-6">Chưa có công việc nào gắn với dự án này.</p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {projectTasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p
                              className="text-xs font-semibold text-text-primary hover:text-primary cursor-pointer"
                              onClick={() => handleOpenEdit(task)}
                            >
                              {task.title || task.name}
                            </p>
                            <span className="text-[10px] text-text-muted">Độ ưu tiên: {task.priority || 'Medium'}</span>
                          </div>
                          <Badge variant={task.status === 'Done' ? 'success' : task.status === 'In Progress' ? 'primary' : 'warning'} showDot>
                            {task.status || 'To Do'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Overview Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin dự án</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">Mã Dự án:</span>
                    <span className="font-mono font-bold text-text-primary">{project.project_code || `PRJ-${project.id}`}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">Trạng thái:</span>
                    <Badge variant="primary" showDot>{project.status || 'Active'}</Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">Phòng ban:</span>
                    <span className="font-semibold text-text-primary">
                      {project.department_name || <span className="text-text-muted italic">Chưa gán</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">Team phụ trách:</span>
                    <span className="font-semibold text-text-primary">
                      {project.team_name || <span className="text-text-muted italic">Chưa gán</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">Ngày khởi tạo:</span>
                    <span className="font-semibold text-text-primary">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'task-table' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Tasks List ({projectTasks.length})</CardTitle>
                <CardDescription>Bảng phân phối công việc dự án</CardDescription>
              </div>
              {canManageTasks && (
                <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                  Tạo Task Mới
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {projectTasks.length === 0 ? (
                <div className="text-center py-12 text-xs text-text-muted border border-dashed border-border rounded-xl">
                  Chưa có công việc nào. Nhấp "Tạo Task Mới" để bắt đầu.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-accent/40 border-b border-border text-text-muted uppercase tracking-wider font-semibold">
                        <th className="p-3">Tên Task</th>
                        <th className="p-3">Độ ưu tiên</th>
                        <th className="p-3">Thời hạn</th>
                        <th className="p-3">Người thực hiện</th>
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {projectTasks.map((t) => {
                        const assignee = employees.find(emp => emp.id === t.assigned_to);
                        return (
                          <tr key={t.id} className="hover:bg-accent/20 transition-colors">
                            <td className="p-3 font-semibold text-text-primary">{t.title || t.name}</td>
                            <td className="p-3">
                              <Badge variant={t.priority === 'High' ? 'danger' : 'warning'}>
                                {t.priority || 'Medium'}
                              </Badge>
                            </td>
                            <td className="p-3 text-text-muted">
                              {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '—'}
                            </td>
                            <td className="p-3">
                              {assignee ? (
                                <div className="flex items-center gap-1.5">
                                  <Avatar name={assignee.full_name} src={assignee.avatar_url} size="sm" />
                                  <span className="font-medium text-text-primary">{assignee.full_name}</span>
                                </div>
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              <Select
                                value={t.status || 'To Do'}
                                disabled={!canManageTasks}
                                onChange={(e) => handleStatusChange(t.id, e.target.value)}
                                options={[
                                  { value: 'To Do', label: 'To Do' },
                                  { value: 'In Progress', label: 'In Progress' },
                                  { value: 'Done', label: 'Done' },
                                ]}
                              />
                            </td>
                            <td className="p-3 text-right">
                              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(t)}>
                                Sửa / Xem chi tiết
                              </Button>
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
        )}

        {/* TASKS KANBAN TAB */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {['To Do', 'In Progress', 'Done'].map((colStatus) => {
              const colTasks = projectTasks.filter(t => (t.status || 'To Do') === colStatus);
              return (
                <div key={colStatus} className="space-y-4 rounded-2xl border border-border bg-surface/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${
                        colStatus === 'Done' ? 'bg-emerald-500' : colStatus === 'In Progress' ? 'bg-sky-500' : 'bg-amber-500'
                      }`} />
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">{colStatus}</h3>
                    </div>
                    <Badge variant="primary">{colTasks.length}</Badge>
                  </div>

                  <div className="space-y-3 min-h-[300px]">
                    {colTasks.length === 0 ? (
                      <p className="text-center py-12 text-[10px] text-text-muted border border-dashed border-border rounded-xl">
                        Không có task trong cột này
                      </p>
                    ) : (
                      colTasks.map((t) => {
                        const assignee = employees.find(e => e.id === t.assigned_to);
                        return (
                          <Card key={t.id} variant="interactive" onClick={() => handleOpenEdit(t)}>
                            <CardContent className="p-3 space-y-3">
                              <h4 className="text-xs font-bold text-text-primary leading-tight">{t.title || t.name}</h4>
                              <div className="flex items-center justify-between text-[10px] pt-2 border-t border-border/60">
                                {assignee ? (
                                  <div className="flex items-center gap-1">
                                    <Avatar name={assignee.full_name} src={assignee.avatar_url} size="sm" />
                                    <span className="font-semibold text-text-primary truncate max-w-[80px]">{assignee.full_name}</span>
                                  </div>
                                ) : (
                                  <span className="text-text-muted">Chưa gán</span>
                                )}
                                <Badge variant={t.priority === 'High' ? 'danger' : 'warning'} size="sm">
                                  {t.priority || 'Medium'}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BACKLOG TAB */}
        {activeTab === 'backlog' && (
          <BacklogManager projectId={projectId} />
        )}

        {/* SPRINTS TAB */}
        {activeTab === 'sprints' && (
          <SprintsManager projectId={projectId} />
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <Card>
            <CardHeader>
              <CardTitle>Lịch hạn chót công việc dự án (Project Calendar)</CardTitle>
              <CardDescription>Thời hạn hoàn thành (Deadlines) của các task trong dự án này</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectTasks.filter(t => t.deadline).length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6 w-full col-span-2">Không có hạn chót công việc nào được cấu hình cho dự án này.</p>
                ) : (
                  projectTasks.filter(t => t.deadline).map((task) => (
                    <div key={task.id} className="p-3.5 rounded-xl border border-border flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-text-primary">{task.title || task.name}</p>
                        <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                          <span>Hạn: {new Date(task.deadline || '').toLocaleDateString('vi-VN')}</span>
                        </p>
                      </div>
                      <Badge variant={task.status === 'Done' ? 'success' : 'warning'}>{task.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* FILES TAB */}
        {activeTab === 'files' && (
          <FilesManager projectId={projectId} />
        )}

        {/* DISCUSSIONS TAB */}
        {activeTab === 'discussions' && (
          <TopicsManager projectId={projectId} />
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <Card>
            <CardHeader>
              <CardTitle>Nhật ký hoạt động dự án (Activity Log)</CardTitle>
              <CardDescription>Các cập nhật, chỉnh sửa và hoạt động gần đây thuộc dự án</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative border-l border-border pl-6 space-y-5 text-xs text-text-secondary">
                <div className="relative">
                  <span className="absolute -left-[30px] top-0.5 p-1 rounded-full bg-emerald-500 text-white"><CheckSquare className="h-3 w-3" /></span>
                  <p className="font-semibold text-text-primary">Hoàn thành thống kê tiến độ</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Vừa xong · Hệ thống tự động phân tích</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[30px] top-0.5 p-1 rounded-full bg-primary text-white"><Briefcase className="h-3 w-3" /></span>
                  <p className="font-semibold text-text-primary">Khởi tạo dự án và cấu hình thành viên</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Ngày {project.created_at ? new Date(project.created_at).toLocaleDateString('vi-VN') : '—'} · Quản trị viên</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Thiết lập dự án</CardTitle>
              <CardDescription>Cập nhật tên, mã dự án, mô tả và trạng thái hoạt động</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
                <Input
                  label="Tên dự án *"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  required
                />
                <Input
                  label="Mã dự án *"
                  value={projCode}
                  onChange={(e) => setProjCode(e.target.value)}
                  required
                />
                <Select
                  label="Phòng ban phụ trách *"
                  value={projDeptId ? String(projDeptId) : ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setProjDeptId(val);
                    setProjTeamId(null);
                  }}
                  options={[
                    { value: '', label: '-- Chọn Phòng ban phụ trách --' },
                    ...departments.map((d) => ({
                      value: String(d.id),
                      label: d.name,
                    })),
                  ]}
                  required
                />
                <Select
                  label="Team phụ trách (Primary Team)"
                  value={projTeamId ? String(projTeamId) : ''}
                  onChange={(e) => setProjTeamId(e.target.value ? Number(e.target.value) : null)}
                  options={[
                    { value: '', label: projDeptId ? '-- Chọn Team (Tùy chọn) --' : '-- Chọn Phòng ban trước --' },
                    ...teams
                      .filter((t) => Number(t.department_id) === Number(projDeptId))
                      .map((t) => ({
                        value: String(t.id),
                        label: t.name,
                      })),
                  ]}
                  disabled={!projDeptId}
                />
                <Textarea
                  label="Mô tả chi tiết"
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  rows={4}
                />
                <Select
                  label="Trạng thái"
                  value={projStatus}
                  onChange={(e) => setProjStatus(e.target.value)}
                  options={[
                    { value: 'Active', label: 'Active (Đang hoạt động)' },
                    { value: 'Completed', label: 'Completed (Hoàn thành)' },
                    { value: 'Suspended', label: 'Suspended (Tạm dừng)' },
                  ]}
                />
                <Button variant="primary" size="sm" type="submit" isLoading={isSavingSettings}>
                  Cập nhật Thiết lập
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Drawer Modal */}
      <TaskDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        task={editingTask}
        projects={[project]}
        employees={employees}
        onSave={handleSaveTask}
        canEdit={canManageTasks}
        isLoading={createTask.isPending || updateTask.isPending}
      />
    </div>
  );
};

export default ProjectDetailPage;

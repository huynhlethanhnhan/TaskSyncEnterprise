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
  Users,
  UserPlus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EntityActions } from '../../components/common/EntityActions';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import {
  useProjectDetail,
  useUpdateProject,
  useDeleteProject,
  useProjectMembersList,
  useProjectMembers,
  useAddProjectMember,
} from '../../hooks/useProjects';
import { useTasks, useCreateTask, useUpdateTask, useUpdateTaskStatus, useDeleteTask } from '../../hooks/useTasks';
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
import { useSettings } from '../../providers/SettingsProvider';
import { useTeams } from '../../hooks/useTeams';
import { useDepartments } from '../../hooks/useDepartments';
import { getStatusSelectClass } from '../../utils/globalLabels';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { t, statusLabel, formatDate } = useSettings();
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
  const isTeamLeader = teams.some((team) => Number(team.leader_id) === Number(user?.id) && Number(team.id) === Number(project?.team_id));
  const isCreator = project?.created_by === user?.id;
  const canManageTasks = isAdminOrManager || isTeamLeader || isCreator;
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();

  // Member management states & hooks
  const [isAddMemberOpen, setIsAddMemberOpen] = React.useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState('');
  const { data: projectMembers = [], isLoading: isMembersLoading } = useProjectMembersList(projectId);
  const { data: eligibleAssignees = [] } = useProjectMembers(projectId);
  const addProjectMember = useAddProjectMember();

  const handleAddMemberSubmit = async () => {
    if (!selectedEmployeeId) return;
    try {
      await addProjectMember.mutateAsync({
        projectId,
        employeeId: Number(selectedEmployeeId),
      });
      toast.success(
        t('Thêm thành viên thành công', 'Member added'),
        t('Nhân sự đã được thêm vào dự án.', 'Employee has been added to the project.'),
      );
      setSelectedEmployeeId('');
      setIsAddMemberOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || t('Không thể thêm thành viên', 'Unable to add member');
      toast.error(t('Lỗi thêm thành viên', 'Failed to add member'), msg);
    }
  };

  // Task Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null);
  const [taskToDelete, setTaskToDelete] = React.useState<TaskItem | null>(null);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = React.useState(false);

  const deleteTaskMutation = useDeleteTask();
  const deleteProjectMutation = useDeleteProject();

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTaskMutation.mutateAsync(taskToDelete.id);
      toast.success(
        t('Xóa công việc thành công', 'Task deleted'),
        `${t('Đã xóa task', 'Deleted task')} ${taskToDelete.title || taskToDelete.name}.`,
      );
    } catch {
      toast.error(
        t('Lỗi khi xóa công việc', 'Failed to delete task'),
        t('Không thể xóa task vào lúc này.', 'Unable to delete task right now.'),
      );
    } finally {
      setTaskToDelete(null);
    }
  };

  const handleConfirmDeleteProject = async () => {
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      toast.success(
        t('Xóa dự án thành công', 'Project deleted'),
        `${t('Đã xóa vĩnh viễn dự án', 'Permanently deleted project')} ${project.name}.`,
      );
      navigate('/projects');
    } catch {
      toast.error(
        t('Lỗi khi xóa dự án', 'Failed to delete project'),
        t('Không thể xóa dự án vào lúc này.', 'Unable to delete project right now.'),
      );
    } finally {
      setIsDeleteProjectOpen(false);
    }
  };

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
    return allTasks.filter((taskItem) => Number(taskItem.project_id) === projectId);
  }, [allTasks, projectId]);

  const taskCounts = React.useMemo(() => {
    return projectTasks.reduce(
      (acc, taskItem) => {
        if (taskItem.status === 'Done') acc.done += 1;
        else if (taskItem.status === 'In Progress') acc.inProgress += 1;
        else acc.todo += 1;
        return acc;
      },
      { todo: 0, inProgress: 0, done: 0 }
    );
  }, [projectTasks]);

  const computedProgress = React.useMemo(() => {
    if (projectTasks.length > 0) {
      return Math.round((taskCounts.done / projectTasks.length) * 100);
    }
    return Math.round(project?.progress_percent ?? 0);
  }, [projectTasks.length, taskCounts.done, project?.progress_percent]);

  const effectiveProjectStatus = React.useMemo(() => {
    if (projectTasks.length > 0) {
      if (taskCounts.done === projectTasks.length) return 'Completed';
      if (project?.status === 'Completed') return 'Active';
    }
    return project?.status || 'Active';
  }, [projectTasks.length, taskCounts.done, project?.status]);

  // Handle saving task in drawer
  const handleSaveTask = async (data: Partial<TaskItem>) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, payload: data });
        toast.success(t('Cập nhật task thành công', 'Task updated successfully'));
      } else {
        await createTask.mutateAsync({ ...data, project_id: projectId });
        toast.success(t('Tạo task mới thành công', 'Task created successfully'));
      }
      setIsDrawerOpen(false);
      refetchTasks();
      refetch();
    } catch {
      toast.error(t('Lỗi khi lưu công việc', 'Failed to save task'));
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
      toast.success(t('Cập nhật trạng thái thành công', 'Status updated successfully'));
      refetchTasks();
      refetch();
    } catch {
      toast.error(t('Lỗi cập nhật trạng thái', 'Failed to update status'));
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
      toast.success(t('Cập nhật cài đặt dự án thành công', 'Project settings updated'));
      refetch();
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.detail)
          ? err?.response?.data?.detail[0]?.msg
          : err?.response?.data?.detail) ||
        t('Lỗi khi lưu cài đặt dự án', 'Failed to save project settings');
      toast.error(t('Cập nhật thất bại', 'Update failed'), errorMsg);
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isProjectLoading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader
          title={t('Chi tiết Dự án', 'Project Details')}
          description={t('Đang tải dữ liệu dự án...', 'Loading project data...')}
        />
        <SkeletonCard />
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title={t('Chi tiết Dự án', 'Project Details')} description={t('Thông tin dự án', 'Project overview')} />
        <ErrorState
          title={t('Không tìm thấy dự án', 'Project not found')}
          message={t('Dự án không tồn tại hoặc đã bị xóa khỏi hệ thống.', 'The project does not exist or has been removed.')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Define dynamic project level tabs
  const tabs = [
    { id: 'overview', label: t('Tổng quan', 'Overview'), icon: <Briefcase className="h-4 w-4" /> },
    { id: 'members', label: t('Thành viên', 'Members'), icon: <Users className="h-4 w-4" /> },
    { id: 'timeline', label: t('Timeline (Jira)', 'Timeline (Jira)'), icon: <CalendarIcon className="h-4 w-4" /> },
    { id: 'tasks', label: t('Công việc (Kanban)', 'Tasks (Kanban)'), icon: <CheckSquare className="h-4 w-4" /> },
    { id: 'backlog', label: t('Backlog', 'Backlog'), icon: <Layers className="h-4 w-4" /> },
    { id: 'sprints', label: t('Sprints', 'Sprints'), icon: <RefreshCw className="h-4 w-4" /> },
    { id: 'calendar', label: t('Lịch biểu', 'Calendar'), icon: <CalendarIcon className="h-4 w-4" /> },
    { id: 'files', label: t('Tài liệu', 'Files'), icon: <FolderOpen className="h-4 w-4" /> },
    { id: 'discussions', label: t('Thảo luận', 'Discussions'), icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'activity', label: t('Hoạt động', 'Activity'), icon: <Activity className="h-4 w-4" /> },
    ...(isAdminOrManager
      ? [{ id: 'settings', label: t('Cài đặt', 'Settings'), icon: <Settings className="h-4 w-4" /> }]
      : []),
  ];

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={project.name}
        description={project.description || t('Chi tiết thông tin công việc và tiến độ dự án.', 'Detailed tasks and progress tracking for this project.')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Dự án', 'Projects'), href: '/projects' },
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
            {t('Quay lại danh sách', 'Back to List')}
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
                    <span>{t('Tiến độ Dự án', 'Project Progress')}</span>
                    <Badge variant="primary">{computedProgress}% {statusLabel('Done')}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-3 w-full bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, computedProgress))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center pt-2">
                    <div className="p-3 rounded-xl border border-amber-200/40 bg-amber-500/[0.02]">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{statusLabel('To Do')}</span>
                      <p className="text-xl font-bold text-amber-600 mt-1">{taskCounts.todo}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-sky-200/40 bg-sky-500/[0.02]">
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">{statusLabel('In Progress')}</span>
                      <p className="text-xl font-bold text-sky-600 mt-1">{taskCounts.inProgress}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-200/40 bg-emerald-500/[0.02]">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{statusLabel('Done')}</span>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{taskCounts.done}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tasks Quick Peek */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t('Công việc gần đây', 'Recent Tasks')} ({projectTasks.length})</span>
                    {canManageTasks && (
                      <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                        {t('Thêm công việc', 'Add Task')}
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projectTasks.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-6">{t('Chưa có công việc nào gắn với dự án này.', 'No tasks assigned to this project yet.')}</p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {projectTasks.slice(0, 10).map((task) => (
                        <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-xs font-semibold text-text-primary hover:text-primary cursor-pointer truncate"
                              onClick={() => handleOpenEdit(task)}
                              title={task.title || task.name}
                            >
                              {task.title || task.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-text-muted">{t('Độ ưu tiên:', 'Priority:')} {statusLabel(task.priority || 'Medium')}</span>
                              {task.sprint_id ? (
                                <Badge variant="primary" size="sm" className="text-[9px] py-0 px-1.5 font-semibold">
                                  🏃 {t('Sprint:', 'Sprint:')} {task.sprint_name || `#${task.sprint_id}`}
                                </Badge>
                              ) : task.is_from_backlog ? (
                                <Badge variant="warning" size="sm" className="text-[9px] py-0 px-1.5 font-semibold">
                                  📦 {t('Backlog', 'Backlog')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" size="sm" className="text-[9px] py-0 px-1.5 font-semibold text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800">
                                  ⚡ {t('Riêng lẻ', 'Standalone')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {canManageTasks ? (
                              <select
                                value={task.status || 'To Do'}
                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                className={`h-6 px-2.5 rounded-full font-semibold text-[11px] border cursor-pointer focus:outline-none transition-colors ${getStatusSelectClass(task.status || 'To Do')}`}
                              >
                                <option value="To Do" className="bg-surface text-text-primary">{statusLabel('To Do')}</option>
                                <option value="In Progress" className="bg-surface text-text-primary">{statusLabel('In Progress')}</option>
                                <option value="Done" className="bg-surface text-text-primary">{statusLabel('Done')}</option>
                              </select>
                            ) : (
                              <StatusBadge status={task.status || 'To Do'} size="sm" />
                            )}
                            {canManageTasks && (
                              <EntityActions
                                onEdit={() => handleOpenEdit(task)}
                                onDelete={() => setTaskToDelete(task)}
                              />
                            )}
                          </div>
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
                  <CardTitle>{t('Thông tin dự án', 'Project Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Mã Dự án:', 'Project Code:')}</span>
                    <span className="font-mono font-bold text-text-primary">{project.project_code || `PRJ-${project.id}`}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Trạng thái:', 'Status:')}</span>
                    <StatusBadge status={effectiveProjectStatus} size="sm" />
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Độ ưu tiên:', 'Priority:')}</span>
                    {project.priority ? (
                      <StatusBadge status={project.priority} size="sm" />
                    ) : (
                      <span className="text-text-muted italic">—</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Tiến độ:', 'Progress:')}</span>
                    <span className="font-bold text-text-primary">{computedProgress}%</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Phòng ban:', 'Department:')}</span>
                    <span className="font-semibold text-text-primary">
                      {project.department_name || <span className="text-text-muted italic">{t('Chưa gán', 'Unassigned')}</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Team phụ trách:', 'Primary Team:')}</span>
                    <span className="font-semibold text-text-primary">
                      {project.team_name || <span className="text-text-muted italic">{t('Chưa gán', 'Unassigned')}</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Người tạo:', 'Created By:')}</span>
                    <span className="font-semibold text-text-primary">
                      {(() => {
                        if (!project.created_by) return <span className="text-text-muted italic">—</span>;
                        const creator = employees.find((e) => Number(e.id) === Number(project.created_by));
                        if (creator) {
                          return (
                            <span className="flex items-center gap-1.5">
                              <Avatar name={creator.full_name} src={creator.avatar_url} size="sm" />
                              <span>{creator.full_name}</span>
                            </span>
                          );
                        }
                        return `${t('Nhân sự', 'Employee')} #${project.created_by}`;
                      })()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Ngày bắt đầu:', 'Start Date:')}</span>
                    <span className="font-semibold text-text-primary">
                      {project.start_date ? formatDate(project.start_date) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Ngày kết thúc:', 'End Date:')}</span>
                    <span className="font-semibold text-text-primary">
                      {project.end_date ? formatDate(project.end_date) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-text-muted">{t('Ngày khởi tạo:', 'Created At:')}</span>
                    <span className="font-semibold text-text-primary">
                      {project.created_at ? formatDate(project.created_at) : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>{t('Thành viên Dự án', 'Project Members')} ({projectMembers.length})</CardTitle>
                <CardDescription>
                  {t('Danh sách nhân sự tham gia trực tiếp và được cấp quyền theo dõi dự án này.', 'Employees assigned directly with access to track and collaborate on this project.')}
                </CardDescription>
              </div>
              {canManageTasks && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  onClick={() => setIsAddMemberOpen(true)}
                >
                  {t('Thêm thành viên', 'Add Member')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isMembersLoading ? (
                <p className="text-xs text-text-muted text-center py-6">{t('Đang tải danh sách thành viên...', 'Loading project members...')}</p>
              ) : projectMembers.length === 0 ? (
                <div className="text-center py-12 text-xs text-text-muted border border-dashed border-border rounded-xl">
                  {t('Chưa có thành viên cụ thể nào được gán trực tiếp cho dự án này.', 'No members directly assigned to this project yet.')}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {projectMembers.map((member: any) => (
                    <div key={member.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.full_name} src={member.avatar_url} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">{member.full_name}</span>
                            {member.employee_code && (
                              <span className="text-[10px] font-mono text-text-muted">({member.employee_code})</span>
                            )}
                          </div>
                          <span className="text-[11px] text-text-muted">
                            {member.job_title || member.position || member.email || t('Thành viên dự án', 'Project Member')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge isActive={Boolean(member.is_active)} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TASKS TAB */}
        {activeTab === 'task-table' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>{t('Danh sách Công việc', 'Tasks List')} ({projectTasks.length})</CardTitle>
                <CardDescription>{t('Bảng phân phối công việc dự án', 'Project task allocation table')}</CardDescription>
              </div>
              {canManageTasks && (
                <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                  {t('Tạo Task Mới', 'Create Task')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {projectTasks.length === 0 ? (
                <div className="text-center py-12 text-xs text-text-muted border border-dashed border-border rounded-xl">
                  {t('Chưa có công việc nào. Nhấp "Tạo Task Mới" để bắt đầu.', 'No tasks yet. Click "Create Task" to get started.')}
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-accent/40 border-b border-border text-text-muted uppercase tracking-wider font-semibold">
                        <th className="p-3">{t('Tên Task', 'Task Name')}</th>
                        <th className="p-3">{t('Độ ưu tiên', 'Priority')}</th>
                        <th className="p-3">{t('Thời hạn', 'Deadline')}</th>
                        <th className="p-3">{t('Người thực hiện', 'Assignee')}</th>
                        <th className="p-3">{t('Trạng thái', 'Status')}</th>
                        <th className="p-3 text-center w-20">{t('Hành động', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {projectTasks.map((taskItem) => {
                        const assignee = employees.find(emp => emp.id === taskItem.assigned_to);
                        const taskTitle = taskItem.title || taskItem.name;
                        return (
                          <tr key={taskItem.id} className="hover:bg-accent/20 transition-colors">
                            <td className="p-3 font-semibold text-text-primary max-w-[260px] truncate" title={taskTitle}>
                              {taskTitle}
                            </td>
                            <td className="p-3">
                              <StatusBadge status={taskItem.priority || 'Medium'} size="sm" />
                            </td>
                            <td className="p-3 text-text-muted whitespace-nowrap">
                              {taskItem.deadline ? formatDate(taskItem.deadline) : '—'}
                            </td>
                            <td className="p-3">
                              {assignee ? (
                                <div className="flex items-center gap-1.5 min-w-0 max-w-[160px]">
                                  <Avatar name={assignee.full_name} src={assignee.avatar_url} size="sm" />
                                  <span className="font-medium text-text-primary truncate" title={assignee.full_name}>
                                    {assignee.full_name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              <select
                                value={taskItem.status || 'To Do'}
                                disabled={!canManageTasks}
                                onChange={(e) => handleStatusChange(taskItem.id, e.target.value)}
                                className={`h-7 px-2.5 rounded-full font-semibold text-xs border cursor-pointer focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${getStatusSelectClass(taskItem.status || 'To Do')}`}
                              >
                                <option value="To Do" className="bg-surface text-text-primary">{statusLabel('To Do')}</option>
                                <option value="In Progress" className="bg-surface text-text-primary">{statusLabel('In Progress')}</option>
                                <option value="Done" className="bg-surface text-text-primary">{statusLabel('Done')}</option>
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <EntityActions
                                layout="menu"
                                align="center"
                                onView={() => handleOpenEdit(taskItem)}
                                onEdit={canManageTasks ? () => handleOpenEdit(taskItem) : undefined}
                              />
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
              const colTasks = projectTasks.filter(taskItem => (taskItem.status || 'To Do') === colStatus);
              return (
                <div key={colStatus} className="space-y-4 rounded-2xl border border-border bg-surface/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${
                        colStatus === 'Done' ? 'bg-emerald-500' : colStatus === 'In Progress' ? 'bg-sky-500' : 'bg-amber-500'
                      }`} />
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">{statusLabel(colStatus)}</h3>
                    </div>
                    <Badge variant="primary">{colTasks.length}</Badge>
                  </div>

                  <div className="space-y-3 min-h-[300px]">
                    {colTasks.length === 0 ? (
                      <p className="text-center py-12 text-[10px] text-text-muted border border-dashed border-border rounded-xl">
                        {t('Không có task trong cột này', 'No tasks in this column')}
                      </p>
                    ) : (
                      colTasks.map((taskItem) => {
                        const assignee = employees.find(e => e.id === taskItem.assigned_to);
                        return (
                          <Card key={taskItem.id} variant="interactive" onClick={() => handleOpenEdit(taskItem)}>
                            <CardContent className="p-3 space-y-3">
                              <h4 className="text-xs font-bold text-text-primary leading-tight">{taskItem.title || taskItem.name}</h4>
                              <div className="flex items-center justify-between text-[10px] pt-2 border-t border-border/60">
                                {assignee ? (
                                  <div className="flex items-center gap-1">
                                    <Avatar name={assignee.full_name} src={assignee.avatar_url} size="sm" />
                                    <span className="font-semibold text-text-primary truncate max-w-[80px]">{assignee.full_name}</span>
                                  </div>
                                ) : (
                                  <span className="text-text-muted">{t('Chưa gán', 'Unassigned')}</span>
                                )}
                                <StatusBadge status={taskItem.priority || 'Medium'} size="sm" />
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
              <CardTitle>{t('Lịch hạn chót công việc dự án', 'Project Deadline Calendar')}</CardTitle>
              <CardDescription>{t('Thời hạn hoàn thành (Deadlines) của các task trong dự án này', 'Task due dates scheduled within this project')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectTasks.filter(taskItem => taskItem.deadline).length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6 w-full col-span-2">{t('Không có hạn chót công việc nào được cấu hình cho dự án này.', 'No task deadlines configured for this project.')}</p>
                ) : (
                  projectTasks.filter(taskItem => taskItem.deadline).map((task) => (
                    <div key={task.id} className="p-3.5 rounded-xl border border-border flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-text-primary">{task.title || task.name}</p>
                        <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                          <span>{t('Hạn:', 'Due:')} {formatDate(task.deadline || '')}</span>
                        </p>
                      </div>
                      <StatusBadge status={task.status} size="sm" />
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
              <CardTitle>{t('Nhật ký hoạt động dự án', 'Project Activity Log')}</CardTitle>
              <CardDescription>{t('Các cập nhật, chỉnh sửa và hoạt động gần đây thuộc dự án', 'Recent updates, edits, and milestones for this project')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative border-l border-border pl-6 space-y-5 text-xs text-text-secondary">
                <div className="relative">
                  <span className="absolute -left-[30px] top-0.5 p-1 rounded-full bg-emerald-500 text-white"><CheckSquare className="h-3 w-3" /></span>
                  <p className="font-semibold text-text-primary">{t('Hoàn thành thống kê tiến độ', 'Progress summary synchronized')}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{t('Vừa xong · Hệ thống tự động phân tích', 'Just now · Automated analytics')}</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[30px] top-0.5 p-1 rounded-full bg-primary text-white"><Briefcase className="h-3 w-3" /></span>
                  <p className="font-semibold text-text-primary">{t('Khởi tạo dự án và cấu hình thành viên', 'Project initialized and members configured')}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{t('Ngày', 'Date')} {project.created_at ? formatDate(project.created_at) : '—'} · {t('Quản trị viên', 'Administrator')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && isAdminOrManager && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Thiết lập dự án', 'Project Settings')}</CardTitle>
              <CardDescription>{t('Cập nhật tên, mã dự án, mô tả và trạng thái hoạt động', 'Update project title, code, description, and status')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
                <Input
                  label={t('Tên dự án *', 'Project Name *')}
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  required
                />
                <Input
                  label={t('Mã dự án *', 'Project Code *')}
                  value={projCode}
                  onChange={(e) => setProjCode(e.target.value)}
                  required
                />
                <Select
                  label={t('Phòng ban phụ trách *', 'Department *')}
                  value={projDeptId ? String(projDeptId) : ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setProjDeptId(val);
                    setProjTeamId(null);
                  }}
                  options={[
                    { value: '', label: t('-- Chọn Phòng ban phụ trách --', '-- Select Department --') },
                    ...departments.map((d) => ({
                      value: String(d.id),
                      label: d.name,
                    })),
                  ]}
                  required
                />
                <Select
                  label={t('Team phụ trách (Primary Team)', 'Primary Team')}
                  value={projTeamId ? String(projTeamId) : ''}
                  onChange={(e) => setProjTeamId(e.target.value ? Number(e.target.value) : null)}
                  options={[
                    { value: '', label: projDeptId ? t('-- Chọn Team (Tùy chọn) --', '-- Select Team (Optional) --') : t('-- Chọn Phòng ban trước --', '-- Select Department First --') },
                    ...teams
                      .filter((teamItem) => Number(teamItem.department_id) === Number(projDeptId))
                      .map((teamItem) => ({
                        value: String(teamItem.id),
                        label: teamItem.name,
                      })),
                  ]}
                  disabled={!projDeptId}
                />
                <Textarea
                  label={t('Mô tả chi tiết', 'Description')}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  rows={4}
                />
                <Select
                  label={t('Trạng thái', 'Status')}
                  value={projStatus}
                  onChange={(e) => setProjStatus(e.target.value)}
                  options={[
                    { value: 'Planning', label: statusLabel('Planning') },
                    { value: 'Active', label: statusLabel('Active') },
                    { value: 'Completed', label: statusLabel('Completed') },
                  ]}
                />
                <Button variant="primary" size="sm" type="submit" isLoading={isSavingSettings}>
                  {t('Cập nhật Thiết lập', 'Save Settings')}
                </Button>
              </form>

              {/* Danger Zone */}
              <div className="mt-8 pt-6 border-t border-rose-500/20 max-w-xl">
                <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> {t('Vùng Nguy Hiểm (Danger Zone)', 'Danger Zone')}
                </h4>
                <p className="text-xs text-text-muted mb-4">
                  {t('Xóa dự án này sẽ gỡ bỏ liên kết của toàn bộ sprint, backlog và các công việc liên quan. Hành động này không thể hoàn tác.', 'Deleting this project will remove all associated sprints, backlog items, and tasks. This action cannot be undone.')}
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  type="button"
                  onClick={() => setIsDeleteProjectOpen(true)}
                >
                  {t('Xóa Vĩnh viễn Dự án', 'Delete Project Permanently')}
                </Button>
              </div>
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
        canDelete={canManageTasks}
        onDelete={(task) => {
          setIsDrawerOpen(false);
          setTaskToDelete(task);
        }}
        isLoading={createTask.isPending || updateTask.isPending}
      />

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title={t('Thêm thành viên vào dự án', 'Add Member to Project')}
        description={t('Chọn nhân sự từ danh sách thuộc Phòng ban / Team để thêm vào dự án.', 'Select an employee from the Department / Team to assign to this project.')}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(false)}>
              {t('Hủy bỏ', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddMemberSubmit}
              disabled={!selectedEmployeeId}
              isLoading={addProjectMember.isPending}
            >
              {t('Thêm vào dự án', 'Add to Project')}
            </Button>
          </div>
        }
      >
        <Select
          label={t('Chọn nhân viên *', 'Select Employee *')}
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          options={[
            { value: '', label: t('-- Chọn nhân viên hợp lệ --', '-- Select Eligible Employee --') },
            ...eligibleAssignees.map((emp: any) => ({
              value: String(emp.id),
              label: `${emp.full_name}${emp.employee_code ? ` (${emp.employee_code})` : ''}`,
            })),
          ]}
        />
      </Modal>

      {/* Task Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        title={t('Xóa công việc', 'Delete Task')}
        message={t(
          `Bạn có chắc chắn muốn xóa công việc "${taskToDelete?.title || taskToDelete?.name}"?`,
          `Are you sure you want to delete task "${taskToDelete?.title || taskToDelete?.name}"?`,
        )}
        confirmText={t('Xóa', 'Delete')}
        onConfirm={handleConfirmDeleteTask}
        isLoading={deleteTaskMutation.isPending}
      />

      {/* Project Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteProjectOpen}
        onClose={() => setIsDeleteProjectOpen(false)}
        title={t('Xóa vĩnh viễn dự án', 'Delete Project Permanently')}
        message={t(
          `Bạn có chắc chắn muốn xóa vĩnh viễn dự án "${project.name}"? Toàn bộ tài nguyên liên quan sẽ bị gỡ bỏ.`,
          `Are you sure you want to permanently delete "${project.name}"? All linked resources will be removed.`,
        )}
        confirmText={t('Xóa Dự án', 'Delete Project')}
        onConfirm={handleConfirmDeleteProject}
        isLoading={deleteProjectMutation.isPending}
      />
    </div>
  );
};

export default ProjectDetailPage;

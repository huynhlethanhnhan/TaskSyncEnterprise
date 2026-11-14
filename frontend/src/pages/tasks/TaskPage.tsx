import * as React from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Search, LayoutGrid, List, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/common/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EntityActions } from '../../components/common/EntityActions';
import { Avatar } from '../../components/common/Avatar';
import { Dropdown } from '../../components/common/Dropdown';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Pagination } from '../../components/data-display/Pagination';
import { DataTableWrapper } from '../../components/data-display/DataTableWrapper';
import { TaskDrawer } from '../../components/drawers/TaskDrawer';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { TaskDeleteRequestModal } from '../../components/modals/TaskDeleteRequestModal';
import { useTasks, useSearchTasks, useCreateTask, useUpdateTask, useUpdateTaskStatus, useDeleteTask } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useEmployees } from '../../hooks/useEmployees';
import { useSprints } from '../../hooks/useSprintBacklog';
import { useTopics } from '../../hooks/useTopics';
import { useDepartments } from '../../hooks/useDepartments';
import { useTeams } from '../../hooks/useTeams';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { GLOBAL_ACTION_TEXT, getStatusDotClass, getStatusMeta, getStatusSelectClass } from '../../utils/globalLabels';
import { extractApiError } from '../../utils/errorHelpers';
import { type TaskItem } from '../../api/services';

const STATUS_COLUMNS = ['To Do', 'In Progress', 'Done'];

const TaskPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { t, statusLabel } = useSettings();
  const role = (user?.role || '').toLowerCase();
  const roleId = Number(user?.role_id);
  const isTeamLeaderRole = Boolean((user as any)?.is_team_leader) || role === 'team_leader';
  const isAdminOrManager = role === 'admin' || role === 'manager' || roleId === 1 || roleId === 2;
  const isStaff = (!isAdminOrManager && !isTeamLeaderRole) || (roleId === 3 && !isTeamLeaderRole);

  const [requestDeleteTask, setRequestDeleteTask] = React.useState<TaskItem | null>(null);

  const { data: tasks = [], isLoading, isError, refetch } = useTasks(isStaff);
  const { data: projects = [] } = useProjects();
  const { data: employees = [] } = useEmployees();
  const { data: allSprints = [] } = useSprints();
  const { data: allTopics = [] } = useTopics();
  const { data: departments = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  const checkIsTeamLeaderOfProject = (projectId: number) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project || !project.team_id) return false;
    const team = teams.find((t) => t.id === project.team_id);
    return team ? Number(team.leader_id) === Number(user?.id) : false;
  };

  const canEditTask = (task: TaskItem | null) => {
    if (!task) return isAdminOrManager;
    if (isAdminOrManager) return true;
    if (Number(task.created_by) === Number(user?.id)) return true;
    return checkIsTeamLeaderOfProject(task.project_id);
  };

  const departmentMap = React.useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  // Filters & State
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const viewMode = (viewParam === 'table' || viewParam === 'kanban') ? viewParam : 'kanban';
  const setViewMode = (mode: 'kanban' | 'table') => {
    setSearchParams({ view: mode });
  };
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [projectFilter, setProjectFilter] = React.useState('all');
  const [sprintFilter, setSprintFilter] = React.useState('all');
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const useServerSearch = overdueOnly || sprintFilter !== 'all';
  const { data: serverSearchTasks = [] } = useSearchTasks(
    {
      keyword: searchTerm.trim() || undefined,
      project_id: projectFilter !== 'all' ? Number(projectFilter) : undefined,
      sprint_id: sprintFilter !== 'all' ? Number(sprintFilter) : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      overdue_only: overdueOnly,
    },
    useServerSearch,
  );

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null);

  const filteredTasks = React.useMemo(() => {
    const sourceTasks = useServerSearch ? serverSearchTasks : tasks;
    return sourceTasks.filter((t) => {
      const titleStr = (t.title || t.name || '').toLowerCase();
      const matchSearch = useServerSearch || titleStr.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchProject = projectFilter === 'all' || String(t.project_id) === projectFilter;
      const matchSprint = sprintFilter === 'all' || String(t.sprint_id) === sprintFilter;
      return matchSearch && matchStatus && matchPriority && matchProject && matchSprint;
    });
  }, [useServerSearch, serverSearchTasks, tasks, searchTerm, statusFilter, priorityFilter, projectFilter, sprintFilter]);

  const paginatedTasks = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;

  const handleOpenCreate = () => {
    setEditingTask(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (task: TaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setIsDrawerOpen(true);
  };

  const handleStatusChange = async (taskId: number, newStatus: string, e?: React.ChangeEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateTaskStatus.mutateAsync({ id: taskId, status: newStatus });
      toast.success('Cập nhật trạng thái công việc', `Đã chuyển task sang "${newStatus}".`);
    } catch (err: any) {
      const apiError = extractApiError(err, 'Không thể thay đổi trạng thái task.');
      toast.error(`Lỗi [${apiError.status}]`, apiError.message);
    }
  };

  // Delete Confirmation State
  const [taskToDelete, setTaskToDelete] = React.useState<TaskItem | null>(null);

  const handleDeleteClick = (task: TaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTaskToDelete(task);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask.mutateAsync(taskToDelete.id);
      toast.success('Đã xóa task thành công');
      setTaskToDelete(null);
    } catch (err) {
      const apiError = extractApiError(err, 'Lỗi khi xóa task');
      toast.error(`Lỗi [${apiError.status}]`, apiError.message);
    }
  };

  const handleSave = async (data: Partial<TaskItem>) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, payload: data });
        toast.success('Cập nhật công việc thành công');
      } else {
        await createTask.mutateAsync(data);
        toast.success('Tạo công việc mới thành công');
      }
      setIsDrawerOpen(false);
    } catch (err) {
      const apiError = extractApiError(err, 'Lỗi lưu công việc');
      toast.error(`Lỗi [${apiError.status}]`, apiError.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader
          title={t('Quản lý Công việc (Tasks)', 'Task Management')}
          description={t('Đang tải danh sách công việc...', 'Loading task list...')}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader
          title={t('Quản lý Công việc (Tasks)', 'Task Management')}
          description={t('Kanban board & danh sách công việc', 'Kanban board & task list')}
        />
        <ErrorState
          title={t('Không thể tải công việc', 'Unable to load tasks')}
          message={t('Đã xảy ra lỗi khi kết nối đến API server backend.', 'Failed to connect to the backend API server.')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Data Table Column Schema
  const columns = [
    {
      accessorKey: 'title',
      header: t('Tên Công việc', 'Task Name'),
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const taskTitle = row.original.title || row.original.name || t('Công việc chưa đặt tên', 'Untitled Task');
        return (
          <div className="max-w-[260px] truncate font-semibold text-text-primary" title={taskTitle}>
            {taskTitle}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: t('Trạng thái', 'Status'),
      cell: ({ row }: { row: { original: TaskItem } }) => (
        <StatusBadge status={row.original.status || 'To Do'} />
      ),
    },
    {
      accessorKey: 'priority',
      header: t('Độ ưu tiên', 'Priority'),
      cell: ({ row }: { row: { original: TaskItem } }) => (
        <StatusBadge status={row.original.priority || 'Medium'} showDot={false} />
      ),
    },
    {
      accessorKey: 'project_id',
      header: t('Dự án', 'Project'),
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const proj = projects.find((p) => p.id === row.original.project_id);
        return (
          <span className="block max-w-[170px] truncate text-xs text-text-secondary" title={proj?.name || '—'}>
            {proj?.name || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'sprint_id',
      header: 'Sprint',
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const projectSprints = allSprints.filter((s) => s.project_id === row.original.project_id);
        return (
          <select
            value={row.original.sprint_id || ''}
            disabled={!canEditTask(null)}
            onChange={async (e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              try {
                await updateTask.mutateAsync({
                  id: row.original.id,
                  payload: { sprint_id: val }
                });
                toast.success('Thành công', 'Đã cập nhật Sprint cho công việc.');
              } catch {
                toast.error('Lỗi', 'Không thể cập nhật Sprint.');
              }
            }}
            className="text-[11px] bg-surface border border-border rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary font-medium min-w-[120px]"
          >
            <option value="">-- Chưa gán --</option>
            {projectSprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      accessorKey: 'topic_id',
      header: 'Epic / Chủ đề',
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const projectTopics = allTopics.filter((t) => t.project_id === row.original.project_id);
        return (
          <select
            value={row.original.topic_id || ''}
            disabled={!canEditTask(null)}
            onChange={async (e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              try {
                await updateTask.mutateAsync({
                  id: row.original.id,
                  payload: { topic_id: val }
                });
                toast.success('Thành công', 'Đã cập nhật Epic cho công việc.');
              } catch {
                toast.error('Lỗi', 'Không thể cập nhật Epic.');
              }
            }}
            className="text-[11px] bg-surface border border-border rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary font-medium min-w-[120px]"
          >
            <option value="">-- Chưa gán --</option>
            {projectTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      id: 'department',
      header: t('Phòng ban', 'Department'),
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const emp = employees.find((e) => Number(e.id) === Number(row.original.assigned_to)) || (row.original as any).assignee;
        const dept = emp?.department_id ? departmentMap.get(emp.department_id) : null;
        return dept ? (
          <span className="block max-w-[160px] truncate font-semibold text-text-primary" title={dept.name}>
            {dept.name}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        );
      },
    },
    {
      accessorKey: 'assigned_to',
      header: t('Người thực hiện', 'Assignee'),
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const emp = employees.find((e) => Number(e.id) === Number(row.original.assigned_to)) || (row.original as any).assignee;
        return emp ? (
          <div className="flex items-center gap-2 min-w-0 max-w-[170px]">
            <Avatar name={emp.full_name} src={emp.avatar_url} size="sm" />
            <span className="text-xs font-medium text-text-primary truncate" title={emp.full_name}>
              {emp.full_name}
            </span>
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        );
      },
    },
    {
      id: 'actions',
      header: t(GLOBAL_ACTION_TEXT.actionsHeader.vi, GLOBAL_ACTION_TEXT.actionsHeader.en),
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const editable = canEditTask(row.original);
        return (
          <EntityActions
            layout="menu"
            align="center"
            onView={!editable ? (e) => handleOpenEdit(row.original, e) : undefined}
            onEdit={editable ? (e) => handleOpenEdit(row.original, e) : undefined}
            onDelete={editable ? (e) => handleDeleteClick(row.original, e) : undefined}
            onRequestDelete={!editable ? (e) => { e.stopPropagation(); setRequestDeleteTask(row.original); } : undefined}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('Quản lý Công việc (Tasks)', 'Task Management')}
        description={t('Theo dõi tiến độ thực thi công việc theo giao diện Kanban Board hoặc Bảng dữ liệu Chi tiết', 'Track task execution progress via Kanban Board or Table view')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Trang chủ', 'Dashboard'), href: '/dashboard' },
              { label: t('Danh sách Công việc', 'Tasks List') },
            ]}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'
                  }`}
              >
                <List className="h-4 w-4" />
                {t('Bảng (Table)', 'Table')}
              </button>
            </div>

            {canEditTask(null) && (
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                {t('Tạo Công việc Mới', 'New Task')}
              </Button>
            )}
          </div>
        }
      />

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
          <Input
            placeholder={t('Tìm kiếm công việc, dự án, sprint...', 'Search tasks, projects, sprints...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-text-muted" />}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: t('Tất cả trạng thái', 'All Statuses') },
              { value: 'To Do', label: statusLabel('To Do') },
              { value: 'In Progress', label: statusLabel('In Progress') },
              { value: 'Done', label: statusLabel('Done') },
            ]}
          />

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'all', label: t('Tất cả độ ưu tiên', 'All Priorities') },
              { value: 'Urgent', label: statusLabel('Urgent') },
              { value: 'High', label: statusLabel('High') },
              { value: 'Medium', label: statusLabel('Medium') },
              { value: 'Low', label: statusLabel('Low') },
            ]}
          />

          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            options={[
              { value: 'all', label: t('Tất cả dự án', 'All Projects') },
              ...projects.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
          />

          <Select
            value={sprintFilter}
            onChange={(e) => setSprintFilter(e.target.value)}
            options={[
              { value: 'all', label: t('Tất cả Sprint', 'All Sprints') },
              ...allSprints
                .filter((s) => projectFilter === 'all' || String(s.project_id) === projectFilter)
                .map((s) => ({ value: String(s.id), label: s.name })),
            ]}
          />

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer select-none px-2">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <span>{t('Chỉ task quá hạn', 'Overdue only')}</span>
          </label>
        </CardContent>
      </Card>

      {/* Main Content Render: Kanban or Table */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {STATUS_COLUMNS.map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => (t.status || 'To Do') === colStatus);
            return (
              <div key={colStatus} className="space-y-4 rounded-2xl border border-border bg-surface/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${getStatusDotClass(colStatus)}`} />
                    <h3 className="text-sm font-bold text-text-primary">{statusLabel(colStatus)}</h3>
                  </div>
                  <Badge variant={getStatusMeta(colStatus).variant}>{colTasks.length}</Badge>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colTasks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
                      {t('Không có công việc nào trong cột này', 'No tasks in this column')}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const proj = projects.find((p) => p.id === task.project_id);
                      const assignee = employees.find((e) => Number(e.id) === Number(task.assigned_to)) || (task as any).assignee;

                      return (
                        <Card
                          key={task.id}
                          variant="interactive"
                          className="cursor-pointer group relative hover:border-primary/50 transition-all shadow-xs"
                          onClick={() => handleOpenEdit(task)}
                        >
                          <CardContent className="p-3.5 space-y-2.5">
                            {/* Row 1: Title full width + 3-dots action menu */}
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className="min-w-0 flex-1 text-xs font-bold leading-relaxed text-text-primary line-clamp-2 break-words"
                                title={task.title || task.name}
                              >
                                {task.title || task.name}
                              </h4>
                              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                <Dropdown
                                  align="right"
                                  trigger={
                                    <button
                                      type="button"
                                      className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-secondary/80 transition-colors"
                                      title={t(GLOBAL_ACTION_TEXT.actionsHeader.vi, GLOBAL_ACTION_TEXT.actionsHeader.en)}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </button>
                                  }
                                  items={[
                                    {
                                      key: 'edit',
                                      label: canEditTask(task)
                                        ? t(GLOBAL_ACTION_TEXT.edit.vi, GLOBAL_ACTION_TEXT.edit.en)
                                        : t(GLOBAL_ACTION_TEXT.view.vi, GLOBAL_ACTION_TEXT.view.en),
                                      icon: <Edit3 className="h-3.5 w-3.5" />,
                                      onClick: () => handleOpenEdit(task),
                                    },
                                    canEditTask(task)
                                      ? {
                                          key: 'delete',
                                          label: t(GLOBAL_ACTION_TEXT.delete.vi, GLOBAL_ACTION_TEXT.delete.en),
                                          icon: <Trash2 className="h-3.5 w-3.5" />,
                                          destructive: true,
                                          onClick: () => handleDeleteClick(task),
                                        }
                                      : {
                                          key: 'request-delete',
                                          label: t(GLOBAL_ACTION_TEXT.requestDelete.vi, GLOBAL_ACTION_TEXT.requestDelete.en),
                                          icon: <Trash2 className="h-3.5 w-3.5" />,
                                          destructive: true,
                                          onClick: () => setRequestDeleteTask(task),
                                        },
                                  ]}
                                />
                              </div>
                            </div>

                            {/* Row 2: Project name & Priority Badge */}
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-text-muted truncate flex-1">
                                {proj?.name || t('Chưa gán dự án', 'Unassigned project')}
                              </p>
                              <StatusBadge status={task.priority || 'Medium'} size="sm" showDot={false} />
                            </div>

                            {/* Row 3: Assignee & Quick Status Dropdown */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs gap-2">
                              {assignee ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Avatar name={assignee.full_name} src={assignee.avatar_url} size="sm" />
                                  <span className="text-[11px] text-text-primary font-medium truncate">
                                    {assignee.full_name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-text-muted">{t('Chưa gán', 'Unassigned')}</span>
                              )}

                              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                <select
                                  value={task.status || 'To Do'}
                                  disabled={!canEditTask(task) && Number(task.assigned_to) !== Number(user?.id)}
                                  onChange={(e) => handleStatusChange(task.id, e.target.value, e)}
                                  className={`h-6 text-[10px] font-semibold rounded-full border px-2 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed ${getStatusSelectClass(task.status || 'To Do')}`}
                                >
                                  <option value="To Do" className="bg-surface text-text-primary">{statusLabel('To Do')}</option>
                                  <option value="In Progress" className="bg-surface text-text-primary">{statusLabel('In Progress')}</option>
                                  <option value="Done" className="bg-surface text-text-primary">{statusLabel('Done')}</option>
                                </select>
                              </div>
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTableWrapper columns={columns} data={paginatedTasks} />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalRecords={filteredTasks.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      )}

      {/* Task Form Drawer Modal */}
      <TaskDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        task={editingTask}
        projects={projects}
        employees={employees}
        onSave={handleSave}
        canEdit={canEditTask(editingTask)}
        canDelete={canEditTask(editingTask)}
        onDelete={(task) => {
          setIsDrawerOpen(false);
          handleDeleteClick(task);
        }}
        isLoading={createTask.isPending || updateTask.isPending}
      />

      <ConfirmationModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        title={t('Xóa công việc', 'Delete Task')}
        message={t('Bạn có chắc chắn muốn xóa công việc này? Hành động này không thể hoàn tác.', 'Are you sure you want to delete this task? This action cannot be undone.')}
        confirmText={t(GLOBAL_ACTION_TEXT.delete.vi, GLOBAL_ACTION_TEXT.delete.en)}
        onConfirm={confirmDelete}
        isLoading={deleteTask.isPending}
      />

      <TaskDeleteRequestModal
        isOpen={!!requestDeleteTask}
        onClose={() => setRequestDeleteTask(null)}
        task={requestDeleteTask}
      />
    </div>
  );
};

export default TaskPage;

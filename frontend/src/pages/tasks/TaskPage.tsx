import * as React from 'react';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Pagination } from '../../components/data-display/Pagination';
import { DataTableWrapper } from '../../components/data-display/DataTableWrapper';
import { TaskDrawer } from '../../components/drawers/TaskDrawer';
import { useTasks, useCreateTask, useUpdateTask, useUpdateTaskStatus, useDeleteTask } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useEmployees } from '../../hooks/useEmployees';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { type TaskItem } from '../../api/services';

const STATUS_COLUMNS = ['To Do', 'In Progress', 'Done'];

export const TaskPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isStaff = user?.role === 'employee' || user?.role === 'staff';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const { data: tasks = [], isLoading, isError, refetch } = useTasks(isStaff);
  const { data: projects = [] } = useProjects();
  const { data: employees = [] } = useEmployees();

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  // Filters & State
  const [viewMode, setViewMode] = React.useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [projectFilter, setProjectFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null);

  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      const titleStr = (t.title || t.name || '').toLowerCase();
      const matchSearch = titleStr.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchProject = projectFilter === 'all' || String(t.project_id) === projectFilter;
      return matchSearch && matchStatus && matchPriority && matchProject;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, projectFilter]);

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
    } catch {
      toast.error('Lỗi cập nhật trạng thái', 'Không thể thay đổi trạng thái task.');
    }
  };

  const handleDelete = async (task: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Xác nhận xóa công việc "${task.title || task.name}"?`)) return;

    try {
      await deleteTask.mutateAsync(task.id);
      toast.success('Đã xóa task thành công');
    } catch {
      toast.error('Lỗi khi xóa task');
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
    } catch {
      toast.error('Lỗi lưu công việc');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Quản lý Công việc (Tasks)" description="Đang tải danh sách công việc..." />
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
        <PageHeader title="Quản lý Công việc (Tasks)" description="Kanban board & danh sách công việc" />
        <ErrorState
          title="Không thể tải công việc"
          message="Đã xảy ra lỗi khi kết nối đến API server backend."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Data Table Column Schema
  const columns = [
    {
      accessorKey: 'title',
      header: 'Tên Công việc',
      cell: ({ row }: { row: { original: TaskItem } }) => (
        <div className="font-semibold text-text-primary">{row.original.title || row.original.name || 'Untitled Task'}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const s = row.original.status || 'To Do';
        return (
          <Badge variant={s === 'Done' ? 'success' : s === 'In Progress' ? 'primary' : 'warning'} showDot>
            {s}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Độ ưu tiên',
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const p = row.original.priority || 'Medium';
        return (
          <Badge variant={p === 'High' ? 'danger' : p === 'Medium' ? 'warning' : 'default'}>
            {p}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'project_id',
      header: 'Dự án',
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const proj = projects.find((p) => p.id === row.original.project_id);
        return <span className="text-xs text-text-secondary">{proj?.name || '—'}</span>;
      },
    },
    {
      accessorKey: 'assigned_to',
      header: 'Người thực hiện',
      cell: ({ row }: { row: { original: TaskItem } }) => {
        const emp = employees.find((e) => e.id === row.original.assigned_to);
        return emp ? (
          <div className="flex items-center gap-2">
            <Avatar name={emp.full_name} size="sm" />
            <span className="text-xs font-medium text-text-primary">{emp.full_name}</span>
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Hành động',
      cell: ({ row }: { row: { original: TaskItem } }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={(e) => handleOpenEdit(row.original, e)}>
            Sửa
          </Button>
          {isAdminOrManager && (
            <Button variant="danger" size="sm" onClick={(e) => handleDelete(row.original, e)}>
              Xóa
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Công việc (Tasks)"
        description="Theo dõi tiến độ thực thi công việc theo giao diện Kanban Board hoặc Bảng dữ liệu Chi tiết"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Danh sách Tasks' },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                  viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                  viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <List className="h-4 w-4" />
                Bảng (Table)
              </button>
            </div>

            {isAdminOrManager && (
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                Tạo Task Mới
              </Button>
            )}
          </div>
        }
      />

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Tìm kiếm công việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-text-muted" />}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'To Do', label: 'To Do (Cần làm)' },
              { value: 'In Progress', label: 'In Progress (Đang làm)' },
              { value: 'Done', label: 'Done (Hoàn thành)' },
            ]}
          />

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Tất cả độ ưu tiên' },
              { value: 'High', label: 'High (Cao)' },
              { value: 'Medium', label: 'Medium (Trung bình)' },
              { value: 'Low', label: 'Low (Thấp)' },
            ]}
          />

          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Tất cả dự án' },
              ...projects.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
          />
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
                    <span
                      className={`h-3 w-3 rounded-full ${
                        colStatus === 'Done' ? 'bg-emerald-500' : colStatus === 'In Progress' ? 'bg-sky-500' : 'bg-amber-500'
                      }`}
                    />
                    <h3 className="text-sm font-bold text-text-primary">{colStatus}</h3>
                  </div>
                  <Badge variant="primary">{colTasks.length}</Badge>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colTasks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
                      Không có task trong cột này
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const proj = projects.find((p) => p.id === task.project_id);
                      const assignee = employees.find((e) => e.id === task.assigned_to);

                      return (
                        <Card
                          key={task.id}
                          variant="interactive"
                          className="cursor-pointer"
                          onClick={() => handleOpenEdit(task)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <h4 className="min-w-0 flex-1 text-sm font-bold leading-snug text-text-primary">
                                {task.title || task.name}
                              </h4>
                              <div className="w-36 shrink-0">
                                <Select
                                  value={task.status || 'To Do'}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleStatusChange(task.id, e.target.value, e)}
                                  options={[
                                    { value: 'To Do', label: 'To Do' },
                                    { value: 'In Progress', label: 'In Progress' },
                                    { value: 'Done', label: 'Done' },
                                  ]}
                                />
                              </div>
                            </div>

                            <p className="text-[11px] font-medium text-text-muted truncate">{proj?.name || 'Chưa gán dự án'}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                              {assignee ? (
                                <div className="flex items-center gap-1.5">
                                  <Avatar name={assignee.full_name} size="sm" />
                                  <span className="text-[11px] text-text-primary font-medium">{assignee.full_name}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-text-muted">Chưa gán</span>
                              )}

                              <Badge variant={task.priority === 'High' ? 'danger' : 'warning'}>
                                {task.priority || 'Medium'}
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
        isLoading={createTask.isPending || updateTask.isPending}
      />
    </div>
  );
};

export default TaskPage;

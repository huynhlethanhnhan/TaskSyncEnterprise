import * as React from 'react';
import {
  useAddBacklogItemToSprint,
  useCompleteSprint,
  useConvertBacklogToTask,
  useCreateSprint,
  useRemoveBacklogItemFromSprint,
  useReopenSprint,
  useSprintAnalytics,
  useSprintPlanning,
  useSprints,
  useStartSprint,
  useCancelSprint,
  useDeleteSprint,
} from '../../hooks/useSprintBacklog';
import { useTasks, useUpdateTask, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useEmployees } from '../../hooks/useEmployees';
import { useTopics } from '../../hooks/useTopics';
import { Avatar } from '../common/Avatar';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../common/Badge';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { Target, Edit, Layers, X, Bookmark, ArrowUp, ArrowDown, Trash2, RefreshCw } from 'lucide-react';
import { EditSprintModal } from './EditSprintModal';
import { SprintBurndownChart } from './SprintBurndownChart';
import { type SprintItem } from '../../api/services';

interface SprintsManagerProps {
  projectId: number;
}

export const SprintsManager: React.FC<SprintsManagerProps> = ({ projectId }) => {
  const toast = useToast();
  const { user } = useAuth();

  const roleId = Number(user?.role_id);
  const isManagerOrAdmin = roleId === 1 || roleId === 2;

  // Load sprints
  const { data: sprints = [], isLoading } = useSprints(projectId);

  // Mutations
  const createMutation = useCreateSprint();
  const startMutation = useStartSprint();
  const completeMutation = useCompleteSprint();
  const cancelMutation = useCancelSprint();
  const deleteMutation = useDeleteSprint();
  const reopenMutation = useReopenSprint();

  // Edit Modal State
  const [editingSprint, setEditingSprint] = React.useState<SprintItem | null>(null);
  const [sprintToDelete, setSprintToDelete] = React.useState<SprintItem | null>(null);

  // Form State
  const [name, setName] = React.useState('');
  const [goal, setGoal] = React.useState('');
  const [capacity, setCapacity] = React.useState(20);

  const handleConfirmDeleteSprint = async () => {
    if (!sprintToDelete) return;
    try {
      await deleteMutation.mutateAsync(sprintToDelete.id);
      toast.success('Xóa Sprint thành công', `Đã xóa Sprint "${sprintToDelete.name}". Các công việc đã được trả về Backlog.`);
    } catch (err: any) {
      toast.error('Lỗi khi xóa Sprint', err.response?.data?.detail || 'Không thể xóa Sprint vào lúc này.');
    } finally {
      setSprintToDelete(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({
        project_id: projectId,
        name: name.trim(),
        goal: goal.trim() || null,
        capacity: Number(capacity),
      });
      toast.success('Tạo Sprint mới thành công', `Sprint "${name}" đã được bổ sung vào danh sách.`);
      setName('');
      setGoal('');
    } catch (err: any) {
      toast.error('Lỗi tạo Sprint', err.response?.data?.detail || 'Không thể tạo Sprint mới.');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await startMutation.mutateAsync(id);
      toast.success('Sprint đã kích hoạt', 'Sprint được chuyển sang trạng thái Active thành công.');
    } catch (err: any) {
      const status = err.response?.status;
      const detailRaw = err.response?.data?.message || err.response?.data?.detail;
      const detailMsg = typeof detailRaw === 'string' ? detailRaw : Array.isArray(detailRaw) ? detailRaw.map((d: any) => d.msg).join(', ') : 'Không thể kích hoạt Sprint.';

      if (status === 409) {
        toast.error('Xung đột trạng thái Sprint (409 Conflict)', detailMsg);
      } else if (status === 403) {
        toast.error('Không có quyền (403 Forbidden)', 'Bạn không có quyền quản lý để kích hoạt Sprint này.');
      } else if (status === 404) {
        toast.error('Không tìm thấy (404 Not Found)', 'Sprint không tồn tại hoặc đã bị xóa.');
      } else if (status === 422) {
        toast.error('Lỗi dữ liệu (422 Unprocessable Entity)', detailMsg);
      } else {
        toast.error('Lỗi hệ thống', detailMsg || 'Không thể kích hoạt Sprint.');
      }
    }
  };

  const handleComplete = async (id: number) => {
    if (!window.confirm('Hoàn thành Sprint này? Công việc chưa xong sẽ được trả về Product Backlog và không bị tự động đánh dấu hoàn thành.')) return;
    try {
      await completeMutation.mutateAsync(id);
      toast.success('Sprint hoàn thành', 'Sprint đã đóng thành công.');
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.detail || 'Không thể hoàn thành Sprint.');
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Xác nhận hủy bỏ Sprint này?')) return;
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Đã hủy Sprint');
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.detail || 'Không thể hủy Sprint.');
    }
  };

  const handleReopen = async (id: number) => {
    if (!window.confirm('Xác nhận mở lại Sprint này? Sprint sẽ trở về trạng thái Planned để có thể lập kế hoạch lại.')) return;
    try {
      await reopenMutation.mutateAsync(id);
      toast.success('Sprint đã được mở lại', 'Sprint đã chuyển về trạng thái Planned.');
    } catch (err: any) {
      toast.error('Lỗi mở lại Sprint', err.response?.data?.detail || 'Không thể mở lại Sprint.');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-xs text-text-muted">Đang tải danh sách Sprints...</div>;
  }

  const statusBadges: Record<string, 'primary' | 'success' | 'danger' | 'warning'> = {
    Planned: 'warning',
    Active: 'success',
    Completed: 'primary',
    Cancelled: 'danger',
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Sprint Box */}
        {isManagerOrAdmin && (
          <Card className="lg:col-span-1 border-primary/20">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Tạo Sprint mới
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  label="Tên Sprint *"
                  placeholder="VD: Sprint 1 - Chức năng Login"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Textarea
                  label="Mục tiêu Sprint (Sprint Goal)"
                  placeholder="Mô tả mục tiêu cần đạt được trong Sprint này..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={3}
                />
                <Input
                  label="Dung lượng Story Points (Capacity)"
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  min={1}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={createMutation.isPending}
                >
                  Khởi tạo Sprint
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Sprints Group List (Jira Style Containers - Matching Image 3) */}
        <div className={`${isManagerOrAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          {sprints.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-xs text-text-muted">
                Chưa có Sprint nào được tạo. Hãy lên kế hoạch cho Sprint đầu tiên.
              </CardContent>
            </Card>
          ) : (
            sprints.map((sprint) => (
              <Card key={sprint.id} className="border border-border shadow-xs overflow-hidden">
                {/* Sprint Header (Matching Image 3) */}
                <CardHeader className="bg-secondary/30 border-b border-border/40 py-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
                        🏃 {sprint.name}
                      </h4>
                      <span className="text-[11px] text-text-muted">
                        ({sprint.start_date ? new Date(sprint.start_date).toLocaleDateString('vi-VN') : 'N/A'} – {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString('vi-VN') : 'N/A'})
                      </span>
                      <Badge variant={statusBadges[sprint.status] || 'primary'}>
                        {sprint.status}
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    {isManagerOrAdmin && (
                      <div className="flex items-center gap-2">
                        {sprint.status === 'Planned' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Edit className="h-3.5 w-3.5" />}
                              onClick={() => setEditingSprint(sprint)}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleStart(sprint.id)}
                              isLoading={startMutation.isPending}
                            >
                              Kích hoạt Sprint
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                              onClick={() => setSprintToDelete(sprint)}
                              className="border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 dark:border-rose-950/20"
                            >
                              Xóa Sprint
                            </Button>
                          </>
                        )}

                        {sprint.status === 'Active' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleComplete(sprint.id)}
                              isLoading={completeMutation.isPending}
                            >
                              Hoàn thành Sprint
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancel(sprint.id)}
                              isLoading={cancelMutation.isPending}
                              className="border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 dark:border-rose-950/20"
                            >
                              Hủy bỏ
                            </Button>
                          </>
                        )}

                        {(sprint.status === 'Completed' || sprint.status === 'Cancelled') && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                              onClick={() => handleReopen(sprint.id)}
                              isLoading={reopenMutation.isPending}
                              className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400"
                            >
                              Mở lại
                            </Button>
                            {sprint.status === 'Cancelled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                                onClick={() => setSprintToDelete(sprint)}
                                className="border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 dark:border-rose-950/20"
                              >
                                Xóa
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {sprint.goal && (
                    <p className="text-xs text-text-secondary mt-1 flex items-start gap-1">
                      <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span>Mục tiêu: {sprint.goal}</span>
                    </p>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Task List Table inside Sprint (Matching Image 3) */}
                  {sprint.status === 'Planned' ? (
                    <SprintPlanningPanel
                      sprintId={sprint.id}
                      projectId={projectId}
                      isManagerOrAdmin={isManagerOrAdmin}
                    />
                  ) : (
                    <SprintJiraTaskTable
                      sprintId={sprint.id}
                      projectId={projectId}
                      isManagerOrAdmin={isManagerOrAdmin}
                      sprintStatus={sprint.status}
                    />
                  )}

                  {/* Progress & Burndown Charts */}
                  {(sprint.status === 'Active' || sprint.status === 'Completed') && (
                    <div className="border-t border-border/40 pt-4 space-y-4">
                      <SprintProgressSection sprintId={sprint.id} />
                      <SprintBurndownChart sprintId={sprint.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {/* Edit Sprint Modal */}
          <EditSprintModal
            isOpen={Boolean(editingSprint)}
            onClose={() => setEditingSprint(null)}
            sprint={editingSprint}
          />

          {/* Delete Sprint Confirmation Modal */}
          <ConfirmationModal
            isOpen={Boolean(sprintToDelete)}
            onClose={() => setSprintToDelete(null)}
            title="Xóa Sprint"
            message={`Bạn có chắc chắn muốn xóa Sprint "${sprintToDelete?.name}"? Toàn bộ công việc liên quan sẽ được tự động giải phóng và chuyển về Product Backlog.`}
            confirmText="Xóa Sprint"
            onConfirm={handleConfirmDeleteSprint}
            isLoading={deleteMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};

const SprintPlanningPanel: React.FC<{
  sprintId: number;
  projectId: number;
  isManagerOrAdmin: boolean;
}> = ({ sprintId, projectId, isManagerOrAdmin }) => {
  const toast = useToast();
  const { data, isLoading } = useSprintPlanning(sprintId);
  const addMutation = useAddBacklogItemToSprint();
  const removeMutation = useRemoveBacklogItemFromSprint();
  const convertMutation = useConvertBacklogToTask();

  if (isLoading) {
    return <div className="py-4 text-center text-xs text-text-muted">Đang tải kế hoạch Sprint...</div>;
  }
  if (!data) {
    return <div className="py-4 text-center text-xs text-text-muted">Không tải được dữ liệu Sprint Planning.</div>;
  }

  const addItem = async (itemId: number) => {
    try {
      await addMutation.mutateAsync({ sprintId, itemId, projectId });
      toast.success('Đã thêm Product Backlog Item vào Sprint');
    } catch {
      toast.error('Không thể thêm Backlog Item vào Sprint');
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await removeMutation.mutateAsync({ sprintId, itemId, projectId });
      toast.success('Đã trả Backlog Item về Product Backlog');
    } catch {
      toast.error('Không thể gỡ Backlog Item khỏi Sprint');
    }
  };

  const convertItem = async (itemId: number) => {
    try {
      await convertMutation.mutateAsync({ id: itemId });
      toast.success('Đã tạo Task từ Backlog Item');
    } catch {
      toast.error('Không thể tạo Task từ Backlog Item');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold uppercase text-text-muted">
          Sprint Backlog ({data.sprint_items.length})
        </span>
        <span className="text-text-secondary">
          Ước lượng: <strong>{data.total_story_points} SP</strong> / Capacity: <strong>{data.capacity} SP</strong>
        </span>
      </div>

      {data.sprint_items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-muted">
          Sprint chưa có Product Backlog Item. Hãy chọn công việc đủ điều kiện bên dưới.
        </div>
      ) : (
        <div className="divide-y divide-border/30 rounded-lg border border-border/40">
          {data.sprint_items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-3 text-xs">
              <div className="min-w-0">
                <div className="truncate font-semibold text-text-primary">{item.title}</div>
                <div className="text-text-muted">{item.priority} · {item.story_points} SP</div>
              </div>
              {isManagerOrAdmin && (
                <div className="flex shrink-0 items-center gap-2">
                  {!item.task_id && (
                    <Button variant="outline" size="sm" onClick={() => convertItem(item.id)}>
                      Tạo Task
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                    Gỡ khỏi Sprint
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isManagerOrAdmin && data.eligible_items.length > 0 && (
        <select
          defaultValue=""
          onChange={(event) => {
            const itemId = Number(event.target.value);
            if (Number.isInteger(itemId) && itemId > 0) {
              void addItem(itemId);
              event.target.value = '';
            }
          }}
          className="h-9 w-full rounded-md border border-input bg-surface px-2 text-xs text-text-primary"
        >
          <option value="" disabled>+ Chọn Product Backlog Item đủ điều kiện...</option>
          {data.eligible_items.map((item) => (
            <option key={item.id} value={item.id}>
              #{item.id} {item.title} ({item.story_points} SP)
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

// Sub-component for rendering Jira-style Task Table inside Sprint (Matching Image 3)
const SprintJiraTaskTable: React.FC<{
  sprintId: number;
  projectId: number;
  isManagerOrAdmin: boolean;
  sprintStatus: string;
}> = ({
  sprintId,
  projectId,
  isManagerOrAdmin,
  sprintStatus,
}) => {
  const toast = useToast();
  const { data: allTasks = [] } = useTasks();
  const { data: employees = [] } = useEmployees();
  const { data: topics = [] } = useTopics(projectId);

  const updateTaskMutation = useUpdateTask();
  const updateStatusMutation = useUpdateTaskStatus();
  const isSprintMutable = sprintStatus === 'Active';

  const assignedTasks = React.useMemo(() => {
    return allTasks.filter((t) => t.project_id === projectId && t.sprint_id === sprintId);
  }, [allTasks, projectId, sprintId]);

  const unassignedTasks = React.useMemo(() => {
    return allTasks.filter((t) => (!projectId || t.project_id === projectId) && (!t.sprint_id || t.sprint_id === null));
  }, [allTasks, projectId]);

  // Story points count by status (Matching Image 3 top badges)
  const spSummary = React.useMemo(() => {
    let todo = 0, inProgress = 0, done = 0;
    assignedTasks.forEach((t) => {
      const sp = t.story_points || 0;
      if (t.status === 'Done') done += sp;
      else if (t.status === 'In Progress') inProgress += sp;
      else todo += sp;
    });
    return { todo, inProgress, done };
  }, [assignedTasks]);

  const handleAssignTask = async (taskId: number) => {
    try {
      await updateTaskMutation.mutateAsync({ id: taskId, payload: { sprint_id: sprintId } });
      toast.success('Đã gán Task vào Sprint');
    } catch {
      toast.error('Lỗi gán task');
    }
  };

  const handleUnassignTask = async (taskId: number) => {
    try {
      await updateTaskMutation.mutateAsync({ id: taskId, payload: { sprint_id: null } });
      toast.success('Đã loại Task khỏi Sprint');
    } catch {
      toast.error('Lỗi gỡ task');
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: taskId, status: newStatus });
      toast.success('Cập nhật trạng thái thành công');
    } catch {
      toast.error('Lỗi đổi trạng thái');
    }
  };

  const handleSPChange = async (taskId: number, newSP: number) => {
    try {
      await updateTaskMutation.mutateAsync({ id: taskId, payload: { story_points: newSP } });
    } catch {
      toast.error('Lỗi cập nhật SP');
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Top Metrics Pills (Matching Image 3) */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] font-bold uppercase text-text-muted flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-primary" />
          Work Items ({assignedTasks.length})
        </span>

        {/* Story Points Summary Badges (Matching Image 3) */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20" title="To Do SP">
            {spSummary.todo} To Do
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20" title="In Progress SP">
            {spSummary.inProgress} In Progress
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title="Done SP">
            {spSummary.done} Done
          </span>
        </div>
      </div>

      {assignedTasks.length === 0 ? (
        <div className="p-4 text-center text-text-muted text-xs border border-dashed border-border rounded-lg bg-surface/50">
          Sprint chưa có công việc nào. Hãy gán User Story từ danh sách phía dưới.
        </div>
      ) : (
        <div className="divide-y divide-border/30 border border-border/40 rounded-lg overflow-hidden bg-background">
          {assignedTasks.map((t) => {
            const emp = (t as any).assignee || employees.find((e) => e.id === t.assigned_to);
            const topic = topics.find((tp) => tp.id === t.topic_id);

            return (
              <div key={t.id} className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-secondary/20 transition-colors">
                {/* Task Key & Icon & Title (Matching Image 3) */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Bookmark className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-mono text-text-muted text-[10px] shrink-0">TS-{t.id}</span>
                  <span className="font-semibold text-text-primary truncate" title={t.title || t.name}>
                    {t.title || t.name}
                  </span>
                </div>

                {/* Right Meta Column (Epic Tag, Status Selector, SP Box, Priority, Assignee Avatar) */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Epic Tag Badge (Matching Image 3) */}
                  {topic ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/10 text-purple-600 border border-purple-500/20 max-w-[130px] truncate">
                      {topic.title || topic.name}
                    </span>
                  ) : null}

                  {/* Status Dropdown Selector (Matching Image 3) */}
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                    disabled={!isSprintMutable}
                    className={`h-7 px-2 rounded font-bold text-[10px] uppercase border cursor-pointer focus:outline-none ${t.status === 'Done'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : t.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400'
                        : 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}
                  >
                    <option value="To Do">TO DO</option>
                    <option value="In Progress">IN PROGRESS</option>
                    <option value="Done">DONE</option>
                  </select>

                  {/* Story Points Editable Input (Matching Image 3) */}
                  <input
                    type="number"
                    defaultValue={t.story_points || 0}
                    onBlur={(e) => handleSPChange(t.id, Number(e.target.value))}
                    disabled={!isManagerOrAdmin || !isSprintMutable}
                    className="w-10 h-7 text-center rounded border border-input bg-surface text-xs font-bold font-mono"
                    title="Story Points"
                    min={0}
                  />

                  {/* Priority Icon (Matching Image 3) */}
                  <span title={`Priority: ${t.priority}`}>
                    {t.priority === 'High' || t.priority === 'Urgent' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-rose-500" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </span>

                  {/* Assignee Avatar (Matching Image 3) */}
                  {emp ? (
                    <div title={`Người thực hiện: ${emp.full_name}`}>
                      <Avatar name={emp.full_name} src={emp.avatar_url} size="sm" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-muted italic">Chưa gán</span>
                  )}

                  {/* Remove Action */}
                  {isManagerOrAdmin && isSprintMutable && (
                    <button
                      type="button"
                      onClick={() => handleUnassignTask(t.id)}
                      className="p-1 rounded text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                      title="Gỡ khỏi Sprint"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Assign Task Picker */}
      {isManagerOrAdmin && isSprintMutable && unassignedTasks.length > 0 && (
        <div className="pt-1">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleAssignTask(Number(e.target.value));
                e.target.value = '';
              }
            }}
            className="w-full h-8 rounded-md border border-input bg-surface px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>+ Gán User Story / Task từ Backlog vào Sprint...</option>
            {unassignedTasks.map((u) => (
              <option key={u.id} value={u.id}>
                TS-{u.id}: {u.title || u.name} ({u.story_points || 0} SP - {u.status})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

// Sub-component for rendering Sprint progress details
const SprintProgressSection: React.FC<{ sprintId: number }> = ({ sprintId }) => {
  const { data: analytics, isLoading } = useSprintAnalytics(sprintId);

  if (isLoading || !analytics) {
    return <div className="text-[10px] text-text-muted italic">Đang phân tích tiến trình Sprint...</div>;
  }

  const taskPercent = analytics.total_tasks > 0 ? Math.round((analytics.completed_tasks / analytics.total_tasks) * 100) : 0;
  const spPercent = analytics.total_story_points > 0 ? Math.round((analytics.completed_story_points / analytics.total_story_points) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-text-secondary">Công việc hoàn thành:</span>
          <span className="text-text-primary">{analytics.completed_tasks}/{analytics.total_tasks} Tasks ({taskPercent}%)</span>
        </div>
        <div className="w-full bg-secondary/40 rounded-full h-1.5">
          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${taskPercent}%` }}></div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-text-secondary">Story Points hoàn thành:</span>
          <span className="text-text-primary">{analytics.completed_story_points}/{analytics.total_story_points} SP ({spPercent}%)</span>
        </div>
        <div className="w-full bg-secondary/40 rounded-full h-1.5">
          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${spPercent}%` }}></div>
        </div>
      </div>
    </div>
  );
};

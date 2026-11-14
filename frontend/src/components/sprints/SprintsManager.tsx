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
import { useProjects } from '../../hooks/useProjects';
import { useEmployees } from '../../hooks/useEmployees';
import { useTopics } from '../../hooks/useTopics';
import { Avatar } from '../common/Avatar';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { StatusBadge } from '../common/StatusBadge';
import { IconActionButton } from '../common/EntityActions';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { ConfirmDialog } from '../modals/ConfirmDialog';
import { TaskDrawer } from '../drawers/TaskDrawer';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { extractApiError } from '../../utils/errorHelpers';
import { Target, Edit, Pencil, Layers, X, Bookmark, ArrowUp, ArrowDown, Trash2, RefreshCw, Play, CheckCircle2, XCircle } from 'lucide-react';
import { EditSprintModal } from './EditSprintModal';
import { SprintBurndownChart } from './SprintBurndownChart';
import { type SprintItem, type TaskItem } from '../../api/services';

interface SprintsManagerProps {
  projectId: number;
}

export const SprintsManager: React.FC<SprintsManagerProps> = ({ projectId }) => {
  const toast = useToast();
  const { user } = useAuth();
  const { t, formatDate } = useSettings();

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
  const [sprintActionConfirm, setSprintActionConfirm] = React.useState<{
    type: 'complete' | 'cancel' | 'reopen';
    sprintId: number;
  } | null>(null);

  // Form State
  const [name, setName] = React.useState('');
  const [goal, setGoal] = React.useState('');
  const [capacity, setCapacity] = React.useState(20);

  const handleConfirmDeleteSprint = async () => {
    if (!sprintToDelete) return;
    try {
      await deleteMutation.mutateAsync(sprintToDelete.id);
      toast.success(
        t('Xóa Sprint thành công', 'Sprint Deleted'),
        t(`Đã xóa Sprint "${sprintToDelete.name}". Các công việc đã được trả về Backlog.`, `Deleted Sprint "${sprintToDelete.name}". Linked tasks were moved back to Backlog.`)
      );
    } catch (err: any) {
      toast.error(t('Lỗi khi xóa Sprint', 'Delete Error'), err.response?.data?.detail || t('Không thể xóa Sprint vào lúc này.', 'Unable to delete Sprint right now.'));
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
      toast.success(
        t('Tạo Sprint mới thành công', 'Sprint Created'),
        t(`Sprint "${name}" đã được bổ sung vào danh sách.`, `Sprint "${name}" has been added.`)
      );
      setName('');
      setGoal('');
    } catch (err: any) {
      toast.error(t('Lỗi tạo Sprint', 'Create Error'), err.response?.data?.detail || t('Không thể tạo Sprint mới.', 'Unable to create Sprint.'));
    }
  };

  const handleStart = async (id: number) => {
    try {
      await startMutation.mutateAsync(id);
      toast.success(t('Sprint đã kích hoạt', 'Sprint Activated'), t('Sprint được chuyển sang trạng thái Active thành công.', 'Sprint transitioned to Active.'));
    } catch (err: any) {
      const status = err.response?.status;
      const detailRaw = err.response?.data?.message || err.response?.data?.detail;
      const detailMsg = typeof detailRaw === 'string' ? detailRaw : Array.isArray(detailRaw) ? detailRaw.map((d: any) => d.msg).join(', ') : t('Không thể kích hoạt Sprint.', 'Unable to start Sprint.');

      if (status === 409) {
        toast.error(t('Xung đột trạng thái Sprint (409 Conflict)', 'Sprint Conflict (409)'), detailMsg);
      } else if (status === 403) {
        toast.error(t('Không có quyền (403 Forbidden)', 'Permission Denied (403)'), t('Bạn không có quyền quản lý để kích hoạt Sprint này.', 'You lack permission to start this Sprint.'));
      } else if (status === 404) {
        toast.error(t('Không tìm thấy (404 Not Found)', 'Not Found (404)'), t('Sprint không tồn tại hoặc đã bị xóa.', 'Sprint not found or already deleted.'));
      } else if (status === 422) {
        toast.error(t('Lỗi dữ liệu (422 Unprocessable Entity)', 'Validation Error (422)'), detailMsg);
      } else {
        toast.error(t('Lỗi hệ thống', 'System Error'), detailMsg || t('Không thể kích hoạt Sprint.', 'Unable to start Sprint.'));
      }
    }
  };

  const handleComplete = (id: number) => {
    setSprintActionConfirm({ type: 'complete', sprintId: id });
  };

  const handleCancel = (id: number) => {
    setSprintActionConfirm({ type: 'cancel', sprintId: id });
  };

  const handleReopen = (id: number) => {
    setSprintActionConfirm({ type: 'reopen', sprintId: id });
  };

  const handleConfirmSprintAction = async () => {
    if (!sprintActionConfirm) return;
    const { type, sprintId } = sprintActionConfirm;
    if (type === 'complete') {
      try {
        await completeMutation.mutateAsync(sprintId);
        toast.success(t('Sprint hoàn thành', 'Sprint Completed'), t('Sprint đã đóng thành công.', 'Sprint has been closed.'));
      } catch (err: any) {
        toast.error(t('Lỗi', 'Error'), err.response?.data?.detail || t('Không thể hoàn thành Sprint.', 'Unable to complete Sprint.'));
      }
      return;
    }
    if (type === 'cancel') {
      try {
        await cancelMutation.mutateAsync(sprintId);
        toast.success(t('Đã hủy Sprint', 'Sprint Cancelled'));
      } catch (err: any) {
        toast.error(t('Lỗi', 'Error'), err.response?.data?.detail || t('Không thể hủy Sprint.', 'Unable to cancel Sprint.'));
      }
      return;
    }
    try {
      await reopenMutation.mutateAsync(sprintId);
      toast.success(t('Sprint đã được mở lại', 'Sprint Reopened'), t('Sprint đã chuyển về trạng thái Planned.', 'Sprint moved back to Planned.'));
    } catch (err: any) {
      toast.error(t('Lỗi mở lại Sprint', 'Reopen Error'), err.response?.data?.detail || t('Không thể mở lại Sprint.', 'Unable to reopen Sprint.'));
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-xs text-text-muted">{t('Đang tải danh sách Sprints...', 'Loading Sprints...')}</div>;
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Sprint Box */}
        {isManagerOrAdmin && (
          <Card className="lg:col-span-1 border-primary/20">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {t('Tạo Sprint mới', 'Create New Sprint')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  label={t('Tên Sprint *', 'Sprint Name *')}
                  placeholder={t('VD: Sprint 1 - Chức năng Login', 'e.g. Sprint 1 - Auth Module')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Textarea
                  label={t('Mục tiêu Sprint (Sprint Goal)', 'Sprint Goal')}
                  placeholder={t('Mô tả mục tiêu cần đạt được trong Sprint này...', 'Describe the goal for this Sprint...')}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={3}
                />
                <Input
                  label={t('Dung lượng Story Points (Capacity)', 'Story Points Capacity')}
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
                  {t('Khởi tạo Sprint', 'Create Sprint')}
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
                {t('Chưa có Sprint nào được tạo. Hãy lên kế hoạch cho Sprint đầu tiên.', 'No Sprints created yet. Plan your first Sprint.')}
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
                        ({sprint.start_date ? formatDate(sprint.start_date) : 'N/A'} – {sprint.end_date ? formatDate(sprint.end_date) : 'N/A'})
                      </span>
                      <StatusBadge status={sprint.status} />
                    </div>

                    {/* Action Buttons */}
                    {isManagerOrAdmin && (
                      <div className="flex items-center gap-1.5">
                        {sprint.status === 'Planned' && (
                          <>
                            <IconActionButton
                              tone="outline"
                              icon={<Edit className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('Chỉnh sửa', 'Edit')}
                              onClick={() => setEditingSprint(sprint)}
                            />
                            <IconActionButton
                              tone="primary"
                              icon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('Kích hoạt Sprint', 'Start Sprint')}
                              isLoading={startMutation.isPending}
                              onClick={() => handleStart(sprint.id)}
                            />
                            <IconActionButton
                              tone="danger"
                              icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('Xóa', 'Delete')}
                              onClick={() => setSprintToDelete(sprint)}
                            />
                          </>
                        )}

                        {sprint.status === 'Active' && (
                          <>
                            <IconActionButton
                              tone="success"
                              icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('Hoàn thành Sprint', 'Complete Sprint')}
                              isLoading={completeMutation.isPending}
                              onClick={() => handleComplete(sprint.id)}
                            />
                            <IconActionButton
                              tone="danger"
                              icon={<XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('Hủy bỏ', 'Cancel')}
                              isLoading={cancelMutation.isPending}
                              onClick={() => handleCancel(sprint.id)}
                            />
                          </>
                        )}

                        {(sprint.status === 'Completed' || sprint.status === 'Cancelled') && (
                          <div className="flex items-center gap-1.5">
                            <IconActionButton
                              tone="outline"
                              icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('Mở lại', 'Reopen')}
                              isLoading={reopenMutation.isPending}
                              onClick={() => handleReopen(sprint.id)}
                            />
                            {sprint.status === 'Cancelled' && (
                              <IconActionButton
                                tone="danger"
                                icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                label={t('Xóa', 'Delete')}
                                onClick={() => setSprintToDelete(sprint)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {sprint.goal && (
                    <p className="text-xs text-text-secondary mt-1 flex items-start gap-1">
                      <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{t('Mục tiêu:', 'Goal:')} {sprint.goal}</span>
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
            title={t('Xóa Sprint', 'Delete Sprint')}
            message={t(
              `Bạn có chắc chắn muốn xóa Sprint "${sprintToDelete?.name}"? Toàn bộ công việc liên quan sẽ được tự động giải phóng và chuyển về Product Backlog.`,
              `Are you sure you want to delete Sprint "${sprintToDelete?.name}"? Linked tasks will be moved back to Product Backlog.`
            )}
            confirmText={t('Xóa Sprint', 'Delete Sprint')}
            onConfirm={handleConfirmDeleteSprint}
            isLoading={deleteMutation.isPending}
          />

          <ConfirmDialog
            isOpen={Boolean(sprintActionConfirm)}
            onClose={() => setSprintActionConfirm(null)}
            onConfirm={handleConfirmSprintAction}
            isLoading={completeMutation.isPending || cancelMutation.isPending || reopenMutation.isPending}
            variant={
              sprintActionConfirm?.type === 'cancel'
                ? 'danger'
                : sprintActionConfirm?.type === 'reopen'
                  ? 'warning'
                  : 'primary'
            }
            title={
              sprintActionConfirm?.type === 'complete'
                ? t('Hoàn thành Sprint', 'Complete Sprint')
                : sprintActionConfirm?.type === 'cancel'
                  ? t('Hủy bỏ Sprint', 'Cancel Sprint')
                  : t('Mở lại Sprint', 'Reopen Sprint')
            }
            message={
              sprintActionConfirm?.type === 'complete'
                ? t(
                    'Hoàn thành Sprint này? Công việc chưa xong sẽ được trả về Product Backlog và không bị tự động đánh dấu hoàn thành.',
                    'Complete this Sprint? Incomplete tasks will return to Product Backlog.'
                  )
                : sprintActionConfirm?.type === 'cancel'
                  ? t('Xác nhận hủy bỏ Sprint này?', 'Confirm cancelling this Sprint?')
                  : t(
                      'Xác nhận mở lại Sprint này? Sprint sẽ trở về trạng thái Planned để có thể lập kế hoạch lại.',
                      'Confirm reopening this Sprint? It will return to Planned status for re-planning.'
                    )
            }
            confirmText={
              sprintActionConfirm?.type === 'complete'
                ? t('Hoàn thành Sprint', 'Complete Sprint')
                : sprintActionConfirm?.type === 'cancel'
                  ? t('Hủy Sprint', 'Cancel Sprint')
                  : t('Mở lại Sprint', 'Reopen Sprint')
            }
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
  const { t, statusLabel } = useSettings();
  const { data, isLoading } = useSprintPlanning(sprintId);
  const addMutation = useAddBacklogItemToSprint();
  const removeMutation = useRemoveBacklogItemFromSprint();
  const convertMutation = useConvertBacklogToTask();

  if (isLoading) {
    return <div className="py-4 text-center text-xs text-text-muted">{t('Đang tải kế hoạch Sprint...', 'Loading Sprint plan...')}</div>;
  }
  if (!data) {
    return <div className="py-4 text-center text-xs text-text-muted">{t('Không tải được dữ liệu Sprint Planning.', 'Failed to load Sprint Planning data.')}</div>;
  }

  const addItem = async (itemId: number) => {
    try {
      await addMutation.mutateAsync({ sprintId, itemId, projectId });
      toast.success(t('Đã thêm Product Backlog Item vào Sprint', 'Added Backlog Item to Sprint'));
    } catch {
      toast.error(t('Không thể thêm Backlog Item vào Sprint', 'Failed to add Backlog Item to Sprint'));
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await removeMutation.mutateAsync({ sprintId, itemId, projectId });
      toast.success(t('Đã trả Backlog Item về Product Backlog', 'Returned Backlog Item to Product Backlog'));
    } catch {
      toast.error(t('Không thể gỡ Backlog Item khỏi Sprint', 'Failed to remove Backlog Item from Sprint'));
    }
  };

  const convertItem = async (itemId: number) => {
    try {
      await convertMutation.mutateAsync({ id: itemId });
      toast.success(t('Đã tạo Task từ Backlog Item', 'Converted Backlog Item to Task'));
    } catch {
      toast.error(t('Không thể tạo Task từ Backlog Item', 'Failed to convert Backlog Item to Task'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold uppercase text-text-muted">
          Sprint Backlog ({data.sprint_items.length})
        </span>
        <span className="text-text-secondary">
          {t('Ước lượng:', 'Estimated:')} <strong>{data.total_story_points} SP</strong> / Capacity: <strong>{data.capacity} SP</strong>
        </span>
      </div>

      {data.sprint_items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-muted">
          {t('Sprint chưa có Product Backlog Item. Hãy chọn công việc đủ điều kiện bên dưới.', 'No Product Backlog Items in this Sprint yet. Pick eligible items below.')}
        </div>
      ) : (
        <div className="divide-y divide-border/30 rounded-lg border border-border/40">
          {data.sprint_items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-3 text-xs">
              <div className="min-w-0">
                <div className="truncate font-semibold text-text-primary">{item.title}</div>
                <div className="text-text-muted">{statusLabel(item.priority)} · {item.story_points} SP</div>
              </div>
              {isManagerOrAdmin && (
                <div className="flex shrink-0 items-center gap-2">
                  {!item.task_id && (
                    <Button variant="outline" size="sm" onClick={() => convertItem(item.id)}>
                      {t('Tạo Task', 'Create Task')}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                    {t('Gỡ khỏi Sprint', 'Remove from Sprint')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isManagerOrAdmin && data.eligible_items.length > 0 && (
        <Select
          size="sm"
          aria-label={t('Thêm Product Backlog Item vào Sprint', 'Add Product Backlog Item to Sprint')}
          value=""
          onChange={(event) => {
            const itemId = Number(event.target.value);
            if (Number.isInteger(itemId) && itemId > 0) {
              void addItem(itemId);
            }
          }}
          options={[
            { value: '', label: t('+ Chọn Product Backlog Item đủ điều kiện...', '+ Select eligible Product Backlog Item...'), disabled: true },
            ...data.eligible_items.map((item) => ({
              value: String(item.id),
              label: `#${item.id} ${item.title} (${item.story_points} SP)`,
            })),
          ]}
        />
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
  const { t, statusLabel } = useSettings();
  const { data: allTasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: employees = [] } = useEmployees();
  const { data: topics = [] } = useTopics(projectId);

  const updateTaskMutation = useUpdateTask();
  const updateStatusMutation = useUpdateTaskStatus();
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = React.useState(false);
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
      toast.success(t('Đã gán Task vào Sprint', 'Assigned Task to Sprint'));
    } catch (err) {
      const apiError = extractApiError(err, t('Lỗi gán task', 'Assign Error'));
      toast.error(`${t('Lỗi', 'Error')} [${apiError.status}]`, apiError.message);
    }
  };

  const handleUnassignTask = async (taskId: number) => {
    try {
      await updateTaskMutation.mutateAsync({ id: taskId, payload: { sprint_id: null } });
      toast.success(t('Đã loại Task khỏi Sprint', 'Removed Task from Sprint'));
    } catch (err) {
      const apiError = extractApiError(err, t('Lỗi gỡ task', 'Unassign Error'));
      toast.error(`${t('Lỗi', 'Error')} [${apiError.status}]`, apiError.message);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: taskId, status: newStatus });
      toast.success(t('Cập nhật trạng thái thành công', 'Status updated'));
    } catch (err) {
      const apiError = extractApiError(err, t('Lỗi đổi trạng thái', 'Status Update Error'));
      toast.error(`${t('Lỗi', 'Error')} [${apiError.status}]`, apiError.message);
    }
  };

  const handleSPChange = async (taskId: number, newSP: number) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        payload: { story_points: newSP === 0 ? null : newSP },
      });
    } catch (err) {
      const apiError = extractApiError(err, t('Lỗi cập nhật SP', 'SP Update Error'));
      toast.error(`${t('Lỗi', 'Error')} [${apiError.status}]`, apiError.message);
    }
  };

  const handleOpenTaskEdit = (taskItem: TaskItem) => {
    setEditingTask(taskItem);
    setIsTaskDrawerOpen(true);
  };

  const handleSaveTask = async (payload: Partial<TaskItem>) => {
    if (!editingTask) return;
    try {
      await updateTaskMutation.mutateAsync({ id: editingTask.id, payload });
      toast.success(t('Cập nhật công việc thành công', 'Task updated'));
      setIsTaskDrawerOpen(false);
    } catch (err) {
      const apiError = extractApiError(err, t('Lỗi lưu công việc', 'Error saving task'));
      toast.error(`${t('Lỗi', 'Error')} [${apiError.status}]`, apiError.message);
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Top Metrics Pills (Matching Image 3) */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] font-bold uppercase text-text-muted flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-primary" />
          {t('Hạng mục Công việc', 'Work Items')} ({assignedTasks.length})
        </span>

        {/* Story Points Summary Badges (Matching Image 3) */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold">
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60" title="To Do SP">
            {spSummary.todo} {statusLabel('To Do')}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60" title="In Progress SP">
            {spSummary.inProgress} {statusLabel('In Progress')}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60" title="Done SP">
            {spSummary.done} {statusLabel('Done')}
          </span>
        </div>
      </div>

      {assignedTasks.length === 0 ? (
        <div className="p-4 text-center text-text-muted text-xs border border-dashed border-border rounded-lg bg-surface/50">
          {t('Sprint chưa có công việc nào. Hãy gán User Story từ danh sách phía dưới.', 'No tasks in this Sprint yet. Assign tasks from below.')}
        </div>
      ) : (
        <div className="divide-y divide-border/30 border border-border/40 rounded-lg overflow-hidden bg-background">
          {assignedTasks.map((tItem) => {
            const emp = (tItem as any).assignee || employees.find((e) => e.id === tItem.assigned_to);
            const topic = topics.find((tp) => tp.id === tItem.topic_id);

            return (
              <div key={tItem.id} className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-secondary/20 transition-colors">
                {/* Task Key & Icon & Title (Matching Image 3) */}
                <button
                  type="button"
                  onClick={() => handleOpenTaskEdit(tItem)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
                >
                  <Bookmark className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-mono text-text-muted text-[10px] shrink-0">TS-{tItem.id}</span>
                  <span className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors" title={tItem.title || tItem.name}>
                    {tItem.title || tItem.name}
                  </span>
                </button>

                {/* Right Meta Column (Epic Tag, Status Selector, SP Box, Priority, Assignee Avatar) */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Epic Tag Badge (Matching Image 3) */}
                  {topic ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60 max-w-[130px] truncate">
                      {topic.title || topic.name}
                    </span>
                  ) : null}

                  {/* Status Dropdown Selector (Matching Image 3) */}
                  <select
                    value={tItem.status}
                    onChange={(e) => handleStatusChange(tItem.id, e.target.value)}
                    disabled={!isSprintMutable}
                    className={`h-7 px-2 rounded-md font-bold text-[10px] uppercase border cursor-pointer focus:outline-none transition-colors ${tItem.status === 'Done'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                      : tItem.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200/90 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60'
                        : 'bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                      }`}
                  >
                    <option value="To Do">{statusLabel('To Do')}</option>
                    <option value="In Progress">{statusLabel('In Progress')}</option>
                    <option value="Done">{statusLabel('Done')}</option>
                  </select>

                  {/* Story Points Editable Selector (Fibonacci) */}
                  <select
                    value={String(tItem.story_points || 0)}
                    onChange={(e) => handleSPChange(tItem.id, Number(e.target.value))}
                    disabled={!isManagerOrAdmin || !isSprintMutable}
                    className="h-7 px-1.5 rounded border border-input bg-surface text-xs font-bold font-mono text-center cursor-pointer disabled:opacity-60"
                    title="Story Points"
                  >
                    <option value="0">-</option>
                    {tItem.story_points && ![1, 2, 3, 5, 8, 13].includes(tItem.story_points) ? (
                      <option value={String(tItem.story_points)}>{tItem.story_points}</option>
                    ) : null}
                    {[1, 2, 3, 5, 8, 13].map((pt) => (
                      <option key={pt} value={String(pt)}>{pt}</option>
                    ))}
                  </select>

                  {/* Priority Icon (Matching Image 3) */}
                  <span title={`${t('Ưu tiên:', 'Priority:')} ${statusLabel(tItem.priority)}`}>
                    {tItem.priority === 'High' || tItem.priority === 'Urgent' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-rose-500" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </span>

                  {/* Assignee Avatar (Matching Image 3) */}
                  {emp ? (
                    <div title={`${t('Người thực hiện:', 'Assignee:')} ${emp.full_name}`}>
                      <Avatar name={emp.full_name} src={emp.avatar_url} size="sm" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-muted italic">{t('Chưa gán', 'Unassigned')}</span>
                  )}

                  {isManagerOrAdmin && (
                    <IconActionButton
                      tone="outline"
                      icon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                      label={t('Chỉnh sửa công việc', 'Edit task')}
                      onClick={() => handleOpenTaskEdit(tItem)}
                    />
                  )}

                  {/* Remove Action */}
                  {isManagerOrAdmin && isSprintMutable && (
                    <button
                      type="button"
                      onClick={() => handleUnassignTask(tItem.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title={t('Gỡ khỏi Sprint', 'Remove from Sprint')}
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
          <Select
            size="sm"
            aria-label={t('Gán User Story hoặc Task vào Sprint', 'Assign Task to Sprint')}
            value=""
            onChange={(e) => {
              if (e.target.value) {
                handleAssignTask(Number(e.target.value));
              }
            }}
            options={[
              { value: '', label: t('+ Gán User Story / Task từ Backlog vào Sprint...', '+ Assign Task from Backlog to Sprint...'), disabled: true },
              ...unassignedTasks.map((u) => ({
                value: String(u.id),
                label: `TS-${u.id}: ${u.title || u.name} (${u.story_points || 0} SP - ${statusLabel(u.status)})`,
              })),
            ]}
          />
        </div>
      )}

      <TaskDrawer
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        task={editingTask}
        projects={projects}
        employees={employees}
        onSave={handleSaveTask}
        isLoading={updateTaskMutation.isPending}
        canEdit={isManagerOrAdmin}
      />
    </div>
  );
};

// Sub-component for rendering Sprint progress details
const SprintProgressSection: React.FC<{ sprintId: number }> = ({ sprintId }) => {
  const { t } = useSettings();
  const { data: analytics, isLoading } = useSprintAnalytics(sprintId);

  if (isLoading || !analytics) {
    return <div className="text-[10px] text-text-muted italic">{t('Đang phân tích tiến trình Sprint...', 'Analyzing Sprint progress...')}</div>;
  }

  const taskPercent = analytics.total_tasks > 0 ? Math.round((analytics.completed_tasks / analytics.total_tasks) * 100) : 0;
  const spPercent = analytics.total_story_points > 0 ? Math.round((analytics.completed_story_points / analytics.total_story_points) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-text-secondary">{t('Công việc hoàn thành:', 'Tasks Completed:')}</span>
          <span className="text-text-primary">{analytics.completed_tasks}/{analytics.total_tasks} {t('Tasks', 'Tasks')} ({taskPercent}%)</span>
        </div>
        <div className="w-full bg-secondary/40 rounded-full h-1.5">
          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${taskPercent}%` }}></div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-text-secondary">{t('Story Points hoàn thành:', 'Story Points Completed:')}</span>
          <span className="text-text-primary">{analytics.completed_story_points}/{analytics.total_story_points} SP ({spPercent}%)</span>
        </div>
        <div className="w-full bg-secondary/40 rounded-full h-1.5">
          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${spPercent}%` }}></div>
        </div>
      </div>
    </div>
  );
};

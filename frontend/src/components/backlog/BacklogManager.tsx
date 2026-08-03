import * as React from 'react';
import { useBacklog, useCreateBacklogItem, useUpdateBacklogItem, useDeleteBacklogItem, useConvertBacklogToTask, useSprints } from '../../hooks/useSprintBacklog';
import { useCreateTopic, useTopics } from '../../hooks/useTopics';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../common/Badge';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { AlertCircle, Play, Trash2, CheckCircle2, Plus } from 'lucide-react';

interface BacklogManagerProps {
  projectId: number;
}

export const BacklogManager: React.FC<BacklogManagerProps> = ({ projectId }) => {
  const toast = useToast();
  const { user } = useAuth();

  const role = (user?.role || '').toLowerCase();
  const roleId = Number(user?.role_id);
  const isManagerOrAdmin = role === 'admin' || role === 'manager' || roleId === 1 || roleId === 2;

  // Load backlog
  const { data: backlogItems = [], isLoading } = useBacklog(projectId);
  const { data: sprints = [] } = useSprints(projectId);
  const { data: topics = [] } = useTopics(projectId);
  const plannedSprints = sprints.filter((s) => s.status === 'Planned');

  // Mutations
  const createMutation = useCreateBacklogItem();
  const updateMutation = useUpdateBacklogItem();
  const deleteMutation = useDeleteBacklogItem();
  const convertMutation = useConvertBacklogToTask();
  const createTopicMutation = useCreateTopic();

  // Form State
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState('Medium');
  const [storyPoints, setStoryPoints] = React.useState<number | ''>('');
  const [sprintId, setSprintId] = React.useState<number | ''>('');
  const [topicId, setTopicId] = React.useState<number | ''>('');
  const [epicTitle, setEpicTitle] = React.useState('');

  const handleCreateEpic = async () => {
    const normalizedTitle = epicTitle.trim();
    if (!normalizedTitle) return;
    try {
      const epic = await createTopicMutation.mutateAsync({
        project_id: projectId,
        title: normalizedTitle,
        content: `Epic của dự án: ${normalizedTitle}`,
        status: 'Open',
      });
      setTopicId(epic.id);
      setEpicTitle('');
      toast.success('Đã tạo Epic', 'Epic mới đã được liên kết với đúng dự án.');
    } catch (err: any) {
      toast.error('Lỗi tạo Epic', err.response?.data?.detail || 'Không thể tạo Epic cho dự án.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast.error('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề cho hạng mục backlog.');
      return;
    }
    const normalizedPriority = priority?.trim() || 'Medium';
    const normalizedStoryPoints = storyPoints === '' ? 0 : Number(storyPoints);
    const normalizedPayload = {
      project_id: projectId,
      title: normalizedTitle,
      description: description.trim() || null,
      priority: normalizedPriority,
      story_points: Number.isFinite(normalizedStoryPoints) && normalizedStoryPoints >= 0 ? normalizedStoryPoints : 0,
      sprint_id: sprintId ? Number(sprintId) : null,
      topic_id: topicId ? Number(topicId) : null,
    };
    try {
      await createMutation.mutateAsync(normalizedPayload);
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStoryPoints('');
      setSprintId('');
      setTopicId('');
      toast.success('Thành công', 'Đã thêm một hạng mục mới vào Product Backlog.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((item: any) => item?.msg || item?.loc?.join('.')).filter(Boolean).join('\n')
          : err?.response?.data?.message || 'Không thể tạo backlog item.';
      toast.error('Lỗi tạo Backlog', message);
    }
  };

  const handleConvert = async (id: number) => {
    try {
      await convertMutation.mutateAsync({ id });
      toast.success('Chuyển đổi thành công', 'Hạng mục backlog đã được chuyển thành Task công việc.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : err?.response?.data?.message || 'Không thể chuyển đổi hạng mục.';
      toast.error('Lỗi chuyển đổi', message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xác nhận xóa hạng mục backlog này?')) return;
    try {
      await deleteMutation.mutateAsync({ id, projectId });
      toast.success('Đã xóa', 'Hạng mục backlog đã được loại bỏ.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : err?.response?.data?.message || 'Không thể xóa hạng mục này.';
      toast.error('Lỗi xóa', message);
    }
  };

  const handleUpdatePriority = async (id: number, currentPriority: string) => {
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    const nextIdx = (priorities.indexOf(currentPriority) + 1) % priorities.length;
    const newPriority = priorities[nextIdx];
    try {
      await updateMutation.mutateAsync({ id, payload: { priority: newPriority } });
      toast.success('Đã cập nhật độ ưu tiên');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : err?.response?.data?.message || 'Không thể cập nhật độ ưu tiên.';
      toast.error('Lỗi cập nhật', message);
    }
  };

  const handleUpdateStoryPoints = async (id: number, currentSp: number) => {
    const newSpStr = window.prompt('Nhập Story Points mới:', String(currentSp));
    if (newSpStr === null) return;
    const newSp = Number(newSpStr);
    if (isNaN(newSp) || newSp < 0) {
      toast.error('Lỗi nhập liệu', 'Vui lòng nhập một số dương.');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, payload: { story_points: newSp } });
      toast.success('Đã cập nhật Story Points');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : err?.response?.data?.message || 'Không thể cập nhật story points.';
      toast.error('Lỗi cập nhật', message);
    }
  };

  const handleQuickSprintAssign = async (id: number, targetSprintId: number | null) => {
    try {
      await updateMutation.mutateAsync({ id, payload: { sprint_id: targetSprintId } });
      toast.success('Thành công', 'Đã cập nhật Sprint cho hạng mục backlog.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : err?.response?.data?.message || 'Không thể cập nhật Sprint.';
      toast.error('Lỗi cập nhật Sprint', message);
    }
  };

  const handleQuickEpicAssign = async (id: number, targetEpicId: number | null) => {
    try {
      await updateMutation.mutateAsync({ id, payload: { topic_id: targetEpicId } });
      toast.success('Thành công', 'Đã cập nhật Epic cho hạng mục backlog.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : err?.response?.data?.message || 'Không thể cập nhật Epic.';
      toast.error('Lỗi cập nhật Epic', message);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-xs text-text-muted">Đang tải Product Backlog...</div>;
  }

  const priorityBadges: Record<string, 'primary' | 'warning' | 'danger' | 'success'> = {
    Low: 'primary',
    Medium: 'success',
    High: 'warning',
    Critical: 'danger',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      <div className="lg:col-span-3 rounded-xl border border-primary/20 bg-primary/4 px-4 py-3">
        <p className="text-xs font-bold text-text-primary">
          Project → Epic → User Story / Product Backlog → Task → Sprint
        </p>
        <p className="mt-1 text-[11px] text-text-muted">
          Epic là nhóm tính năng lớn của Project; mỗi hạng mục Backlog là một User Story.
          Khi đủ rõ, User Story được chuyển thành Task và Task được lập kế hoạch vào Sprint.
        </p>
      </div>
      {/* Add form (Only for Managers or Admins) */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase">
              Thêm Hạng mục Backlog
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isManagerOrAdmin ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  label="Tiêu đề *"
                  placeholder="Yêu cầu / Tính năng cần phát triển"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Textarea
                  label="Mô tả"
                  placeholder="Mô tả chi tiết / User Story..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Độ ưu tiên"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    options={[
                      { value: 'Low', label: 'Low' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'High', label: 'High' },
                      { value: 'Critical', label: 'Critical' },
                    ]}
                  />
                  <Input
                    label="Story Points"
                    type="number"
                    value={storyPoints}
                    onChange={(e) =>
                      setStoryPoints(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    min={0}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Gán vào Sprint"
                    value={String(sprintId)}
                    onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : '')}
                    options={[
                      { value: '', label: '-- Không gán --' },
                      ...plannedSprints.map((s) => ({ value: String(s.id), label: s.name })),
                    ]}
                  />
                  <Select
                    label="Thuộc Epic / Chủ đề"
                    value={String(topicId)}
                    onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : '')}
                    options={[
                      { value: '', label: '-- Không gán --' },
                      ...topics.map((t) => ({ value: String(t.id), label: t.title })),
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">
                    Tạo nhanh Epic cho dự án
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tên Epic mới"
                      value={epicTitle}
                      onChange={(e) => setEpicTitle(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={handleCreateEpic}
                      isLoading={createTopicMutation.isPending}
                      disabled={!epicTitle.trim()}
                    >
                      Tạo
                    </Button>
                  </div>
                  {topics.length === 0 && (
                    <p className="text-[10px] text-text-muted">
                      Dự án chưa có Epic. Tạo Epic ở đây để dùng ngay cho Backlog và Task.
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  isLoading={createMutation.isPending}
                >
                  Thêm vào Backlog
                </Button>
              </form>
            ) : (
              <div className="flex gap-2 p-3 bg-secondary/20 rounded-xl border border-border text-xs text-text-muted">
                <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                <span>Chỉ quản lý dự án (Project Manager) hoặc quản trị viên (Admin) mới có quyền chỉnh sửa Product Backlog.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backlog List */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
            <CardTitle className="text-sm font-bold uppercase">
              Danh sách Backlog ({backlogItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {backlogItems.length === 0 ? (
              <div className="text-center py-12 text-xs text-text-muted">
                Backlog trống. Hãy thêm các tính năng hoặc User Stories mới.
              </div>
            ) : (
              <div className="space-y-3.5">
                {backlogItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-3.5 text-xs transition-all hover:border-primary/30"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={priorityBadges[item.priority] || 'primary'} className="cursor-pointer select-none" onClick={() => isManagerOrAdmin && handleUpdatePriority(item.id, item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge variant="default" className="cursor-pointer select-none font-bold" onClick={() => isManagerOrAdmin && handleUpdateStoryPoints(item.id, item.story_points)}>
                          SP: {item.story_points}
                        </Badge>
                        {item.sprint_id ? (
                          <Badge variant="primary" showDot>
                            Sprint: {sprints.find((s) => s.id === item.sprint_id)?.name || `#${item.sprint_id}`}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-text-muted border-dashed">
                            Chưa gán Sprint
                          </Badge>
                        )}
                        {item.topic_id ? (
                          <Badge variant="warning">
                            Epic: {topics.find((t) => t.id === item.topic_id)?.title || `#${item.topic_id}`}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-text-muted border-dashed">
                            Chưa gán Epic
                          </Badge>
                        )}
                        {item.status === 'Converted' && (
                          <Badge variant="success" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Đã chuyển thành Task
                          </Badge>
                        )}
                        {item.status === 'Planned' && (
                          <Badge variant="warning">
                            Đã lên lịch Sprint
                          </Badge>
                        )}
                      </div>
                      <h4 className="break-words text-sm font-bold text-text-primary">{item.title}</h4>
                      {item.description && (
                        <p className="text-text-muted line-clamp-2 leading-relaxed">{item.description}</p>
                      )}
                    </div>

                    {isManagerOrAdmin && (
                      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <select
                          value={item.sprint_id || ''}
                          onChange={(e) => handleQuickSprintAssign(item.id, e.target.value ? Number(e.target.value) : null)}
                          className="w-full min-w-0 max-w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary font-medium sm:w-44 sm:flex-none"
                          title="Gán nhanh Sprint"
                        >
                          <option value="">-- Gán Sprint --</option>
                          {plannedSprints.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                          {plannedSprints.length === 0 && (
                            <option value="" disabled>Chưa có Sprint Planned</option>
                          )}
                        </select>

                        <select
                          value={item.topic_id || ''}
                          onChange={(e) => handleQuickEpicAssign(item.id, e.target.value ? Number(e.target.value) : null)}
                          className="w-full min-w-0 max-w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary font-medium sm:w-56 sm:flex-1"
                          title="Gán nhanh Epic"
                        >
                          <option value="">-- Gán Epic --</option>
                          {topics.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                        </select>

                        {item.status === 'Backlog' && (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Play className="h-3.5 w-3.5" />}
                            onClick={() => handleConvert(item.id)}
                            isLoading={convertMutation.isPending}
                          >
                            Tạo Task
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg border border-border hover:border-rose-300 dark:hover:border-rose-950/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                          title="Xóa hạng mục"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

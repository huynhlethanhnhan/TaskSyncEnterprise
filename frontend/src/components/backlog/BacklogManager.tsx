import * as React from 'react';
import { useBacklog, useCreateBacklogItem, useUpdateBacklogItem, useDeleteBacklogItem, useConvertBacklogToTask, useSprints } from '../../hooks/useSprintBacklog';
import { useTopics } from '../../hooks/useTopics';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../common/Badge';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { AlertCircle, Play, Trash2, CheckCircle2 } from 'lucide-react';

interface BacklogManagerProps {
  projectId: number;
}

export const BacklogManager: React.FC<BacklogManagerProps> = ({ projectId }) => {
  const toast = useToast();
  const { user } = useAuth();

  const isManagerOrAdmin = user?.role_id === 1 || user?.role_id === 2;

  // Load backlog
  const { data: backlogItems = [], isLoading } = useBacklog(projectId);
  const { data: sprints = [] } = useSprints(projectId);
  const { data: topics = [] } = useTopics(projectId);

  // Mutations
  const createMutation = useCreateBacklogItem();
  const updateMutation = useUpdateBacklogItem();
  const deleteMutation = useDeleteBacklogItem();
  const convertMutation = useConvertBacklogToTask();

  // Form State
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState('Medium');
  const [storyPoints, setStoryPoints] = React.useState(0);
  const [sprintId, setSprintId] = React.useState<number | ''>('');
  const [topicId, setTopicId] = React.useState<number | ''>('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createMutation.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        story_points: Number(storyPoints),
        sprint_id: sprintId ? Number(sprintId) : null,
        topic_id: topicId ? Number(topicId) : null,
      });
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStoryPoints(0);
      setSprintId('');
      setTopicId('');
      toast.success('Thành công', 'Đã thêm một hạng mục mới vào Product Backlog.');
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.detail || 'Không thể tạo backlog item.');
    }
  };

  const handleConvert = async (id: number) => {
    try {
      await convertMutation.mutateAsync({ id });
      toast.success('Chuyển đổi thành công', 'Hạng mục backlog đã được chuyển thành Task công việc.');
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.detail || 'Không thể chuyển đổi hạng mục.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xác nhận xóa hạng mục backlog này?')) return;
    try {
      await deleteMutation.mutateAsync({ id, projectId });
      toast.success('Đã xóa', 'Hạng mục backlog đã được loại bỏ.');
    } catch {
      toast.error('Lỗi', 'Không thể xóa hạng mục này.');
    }
  };

  const handleUpdatePriority = async (id: number, currentPriority: string) => {
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    const nextIdx = (priorities.indexOf(currentPriority) + 1) % priorities.length;
    const newPriority = priorities[nextIdx];
    try {
      await updateMutation.mutateAsync({ id, payload: { priority: newPriority } });
      toast.success('Đã cập nhật độ ưu tiên');
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật độ ưu tiên.');
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
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật story points.');
    }
  };

  const handleQuickSprintAssign = async (id: number, targetSprintId: number | null) => {
    try {
      await updateMutation.mutateAsync({ id, payload: { sprint_id: targetSprintId } });
      toast.success('Thành công', 'Đã cập nhật Sprint cho hạng mục backlog.');
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật Sprint.');
    }
  };

  const handleQuickEpicAssign = async (id: number, targetEpicId: number | null) => {
    try {
      await updateMutation.mutateAsync({ id, payload: { topic_id: targetEpicId } });
      toast.success('Thành công', 'Đã cập nhật Epic cho hạng mục backlog.');
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật Epic.');
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
                    onChange={(e) => setStoryPoints(Number(e.target.value))}
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
                      ...sprints.map((s) => ({ value: String(s.id), label: s.name })),
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
                    className="p-3.5 rounded-xl border border-border bg-surface hover:border-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
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
                      <h4 className="font-bold text-text-primary text-sm truncate">{item.title}</h4>
                      {item.description && (
                        <p className="text-text-muted line-clamp-2 leading-relaxed">{item.description}</p>
                      )}
                    </div>

                    {isManagerOrAdmin && (
                      <div className="flex items-center gap-2 flex-wrap shrink-0 self-end md:self-center">
                        <select
                          value={item.sprint_id || ''}
                          onChange={(e) => handleQuickSprintAssign(item.id, e.target.value ? Number(e.target.value) : null)}
                          className="text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                          title="Gán nhanh Sprint"
                        >
                          <option value="">-- Gán Sprint --</option>
                          {sprints.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={item.topic_id || ''}
                          onChange={(e) => handleQuickEpicAssign(item.id, e.target.value ? Number(e.target.value) : null)}
                          className="text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary font-medium"
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

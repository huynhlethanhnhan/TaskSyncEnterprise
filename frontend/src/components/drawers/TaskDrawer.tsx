import * as React from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Drawer } from '../common/Drawer';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import api from '../../api/axios';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useProjectMembers } from '../../hooks/useProjects';
import { useSprints } from '../../hooks/useSprintBacklog';
import { useTopics } from '../../hooks/useTopics';
import {
  type TaskItem,
  type ProjectItem,
  type EmployeeItem,
  checklistsApi,
  commentsApi,
  type TaskChecklistResponse,
  type TaskCommentResponse,
} from '../../api/services';
import {
  Paperclip,
  Trash2,
  Upload,
  MessageSquare,
  CheckSquare,
  Plus,
  Briefcase,
  Clock,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { getDeadlineDisplay } from '../../utils/deadline';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskItem | null;
  projects?: ProjectItem[];
  employees?: EmployeeItem[];
  onSave: (data: Partial<TaskItem>) => Promise<void>;
  isLoading?: boolean;
  canEdit?: boolean;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  task,
  projects = [],
  onSave,
  isLoading = false,
  canEdit = true,
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { user: currentUser } = useAuth();

  // Queries for Details, Checklists, and Comments
  const { data: fullTask, refetch: refetchDetail } = useQuery<TaskItem, Error>({
    queryKey: ['tasks', task?.id],
    queryFn: async () => {
      const res = await api.get(`/tasks/${task!.id}`);
      return res.data?.data || res.data;
    },
    enabled: Boolean(task?.id && isOpen),
  });

  const activeTask = task?.id ? fullTask || task : null;

  const { data: checklists = [], refetch: refetchChecklists } = useQuery<TaskChecklistResponse[]>({
    queryKey: ['task-checklist', task?.id],
    queryFn: () => checklistsApi.getByTaskId(task!.id),
    enabled: Boolean(task?.id && isOpen),
  });

  const { data: comments = [], refetch: refetchComments } = useQuery<TaskCommentResponse[]>({
    queryKey: ['task-comments', task?.id],
    queryFn: () => commentsApi.getByTaskId(task!.id),
    enabled: Boolean(task?.id && isOpen),
  });

  // State for Add inputs
  const [newChecklistTitle, setNewChecklistTitle] = React.useState('');
  const [commentContent, setCommentContent] = React.useState('');

  const handleAddChecklist = async () => {
    if (!task || !newChecklistTitle.trim()) return;
    try {
      await checklistsApi.create(task.id, { title: newChecklistTitle.trim() });
      setNewChecklistTitle('');
      refetchChecklists();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      toast.error('Lỗi khi thêm checklist');
    }
  };

  const handleToggleChecklist = async (itemId: number, isCompleted: boolean) => {
    if (!task) return;
    try {
      await checklistsApi.update(task.id, itemId, { is_completed: !isCompleted });
      refetchChecklists();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      toast.error('Lỗi khi cập nhật checklist');
    }
  };

  const handleDeleteChecklist = async (itemId: number) => {
    if (!task) return;
    try {
      await checklistsApi.delete(task.id, itemId);
      refetchChecklists();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      toast.error('Lỗi khi xóa checklist');
    }
  };

  const handleAddComment = async () => {
    if (!task || !commentContent.trim()) return;
    try {
      await commentsApi.create(task.id, { content: commentContent.trim() });
      setCommentContent('');
      refetchComments();
    } catch {
      toast.error('Lỗi khi gửi bình luận');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!task) return;
    try {
      await commentsApi.delete(task.id, commentId);
      refetchComments();
    } catch {
      toast.error('Lỗi khi xóa bình luận');
    }
  };

  // Form Fields State
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState('To Do');
  const [priority, setPriority] = React.useState('Medium');
  const [projectId, setProjectId] = React.useState<number | ''>('');
  const [assignedTo, setAssignedTo] = React.useState<number | ''>('');
  const [sprintId, setSprintId] = React.useState<number | ''>('');
  const [topicId, setTopicId] = React.useState<number | ''>('');
  const [deadline, setDeadline] = React.useState('');
  const [storyPoints, setStoryPoints] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);

  const {
    data: projectMembers = [],
    isFetching: isLoadingAssignees,
    refetch: refetchProjectMembers,
  } = useProjectMembers(projectId ? Number(projectId) : null);
  const { data: projectSprints = [] } = useSprints(projectId ? Number(projectId) : undefined);
  const { data: projectTopics = [] } = useTopics(projectId ? Number(projectId) : undefined);

  const handleProjectChange = (newProjectId: number | '') => {
    setProjectId(newProjectId);
    setAssignedTo('');
    setSprintId('');
    setTopicId('');
  };

  const assigneeOptions = React.useMemo(() => {
    return projectMembers.map((emp) => {
      const codeStr = emp.employee_code ? ` (${emp.employee_code})` : '';
      const pos = (emp as any).position || emp.job_title;
      const posStr = pos ? ` - ${pos}` : '';
      return {
        value: String(emp.id),
        label: `${emp.full_name}${codeStr}${posStr}`,
      };
    });
  }, [projectMembers]);

  const assigneePlaceholder = !projectId
    ? '-- Chọn Dự án trước --'
    : isLoadingAssignees
      ? '-- Đang tải Người thực hiện --'
      : projectMembers.length === 0
        ? '-- Không có Người thực hiện phù hợp --'
        : '-- Chọn Người thực hiện --';

  const isAssigneeDisabled = !canEdit || !projectId || isLoadingAssignees;

  React.useEffect(() => {
    if (!isOpen) return;
    if (task) {
      setTitle(task.title || task.name || '');
      setDescription(task.description || '');
      setStatus(task.status || 'To Do');
      setPriority(task.priority || 'Medium');
      setProjectId(task.project_id || '');
      setAssignedTo(task.assigned_to || '');
      setSprintId(task.sprint_id || '');
      setTopicId(task.topic_id || '');
      setDeadline(task.deadline ? task.deadline.substring(0, 10) : '');
      setStoryPoints(task.story_points || 0);
    } else {
      setTitle('');
      setDescription('');
      setStatus('To Do');
      setPriority('Medium');
      setProjectId(projects[0]?.id || '');
      setAssignedTo('');
      setSprintId('');
      setTopicId('');
      setDeadline('');
      setStoryPoints(0);
    }
  }, [task, isOpen, projects]);

  const isAssignedToCurrentUser = Boolean(
    task && (Number(task.assigned_to) === Number(currentUser?.id) || task.assigned_to === currentUser?.id)
  );
  const canUpdateStatus = canEdit || isAssignedToCurrentUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit && !isAssignedToCurrentUser) return;
    if (canEdit && !title.trim()) return;

    if (canEdit) {
      if (assignedTo) {
        const { data: latestMembers } = await refetchProjectMembers();
        const memberList = latestMembers || projectMembers;
        const isValid = memberList.some((m) => Number(m.id) === Number(assignedTo));
        if (!isValid) {
          toast.error('Lỗi phân công', 'Nhân viên được chọn chưa phải thành viên của dự án.');
          return;
        }
      }

      await onSave({
        title: title.trim(),
        name: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        project_id: projectId ? Number(projectId) : null,
        assigned_to: assignedTo ? Number(assignedTo) : null,
        sprint_id: sprintId ? Number(sprintId) : null,
        topic_id: topicId ? Number(topicId) : null,
        deadline: deadline || null,
        story_points: storyPoints === 0 ? null : storyPoints,
      });
    } else if (isAssignedToCurrentUser && task) {
      await onSave({
        status,
        progress_percent: status === 'Done' ? 100 : task.progress_percent || 0,
      });
    }
  };

  // Attachment Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const response = await api.post(`/tasks/${task.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newAttachment = response.data?.data;
      if (newAttachment) {
        queryClient.setQueryData<TaskItem>(['tasks', task.id], (current) => ({
          ...(current || task),
          attachments: [...(current?.attachments || task.attachments || []), newAttachment],
        }));
      }
      toast.success('Tải tài liệu lên thành công', `Đã đính kèm tệp "${file.name}" vào công việc.`);
      await refetchDetail();
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể tải tệp lên.';
      toast.error('Lỗi tải tệp lên', errMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Attachment Delete Handler
  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!task) return;
    if (!window.confirm('Xác nhận xóa tài liệu đính kèm này?')) return;

    try {
      await api.delete(`/tasks/${task.id}/attachments/${attachmentId}`);
      queryClient.setQueryData<TaskItem>(['tasks', task.id], (current) => ({
        ...(current || task),
        attachments: (current?.attachments || task.attachments || []).filter(
          (attachment) => attachment.id !== attachmentId
        ),
      }));
      toast.success('Xóa tài liệu thành công');
      await refetchDetail();
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      toast.error('Lỗi khi xóa tài liệu');
    }
  };

  const isEditMode = Boolean(task);
  const deadlineInfo = getDeadlineDisplay(deadline, status);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Chi tiết & Cập nhật Công việc' : 'Tạo Công việc Mới'}
      description="Quản lý thông tin công việc, checklist, bình luận và đính kèm tài liệu."
      position="right"
      size={isEditMode ? 'lg' : 'md'}
      footer={
        <div className="flex items-center justify-end gap-3 w-full border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Hủy bỏ
          </Button>
          {(canEdit || (isEditMode && isAssignedToCurrentUser)) && (
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
              {isEditMode ? 'Lưu thay đổi' : 'Tạo Mới'}
            </Button>
          )}
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {isEditMode ? (
          /* Dual-Column Layout for Editing/Details Mode */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Main Content Areas */}
            <div className="lg:col-span-2 space-y-6">
              {/* Form Input fields */}
              <div className="space-y-4">
                <Input
                  label="Tên Công việc *"
                  placeholder="Ví dụ: Triển khai API Authentication Redis"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!canEdit}
                  required
                />

                <Textarea
                  label="Mô tả Chi tiết"
                  placeholder="Yêu cầu công việc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  rows={4}
                />
              </div>

              {/* Checklist Section */}
              <div className="border border-border rounded-xl p-4 bg-surface space-y-3">
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Checklist ({checklists.filter(c => c.is_completed).length}/{checklists.length})
                </h4>
                
                <div className="space-y-2">
                  {checklists.map((item) => (
                    <div key={item.id} className="flex items-center justify-between group p-2 rounded-lg hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/30">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-text-primary flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer shrink-0"
                        />
                        <span className={item.is_completed ? "line-through text-text-muted truncate" : "font-medium truncate"}>
                          {item.title}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklist(item.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
                    <Input
                      placeholder="Thêm mục checklist mới..."
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="primary" size="sm" className="px-3 shrink-0" onClick={handleAddChecklist}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="border border-border rounded-xl p-4 bg-surface space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wide">
                    <Paperclip className="h-4 w-4 text-primary" />
                    Tài liệu đính kèm ({activeTask?.attachments?.length || 0})
                  </h4>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="drawer-file-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      leftIcon={<Upload className="h-3.5 w-3.5" />}
                      onClick={() => fileInputRef.current?.click()}
                      isLoading={isUploading}
                    >
                      Tải tệp lên
                    </Button>
                  </div>
                </div>

                {activeTask?.attachments && activeTask.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeTask.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-text-primary truncate">{att.file_name}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {(att.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <a
                            href={`${api.defaults.baseURL || ''}/files/download/${att.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg hover:bg-secondary text-primary"
                            title="Tải về"
                          >
                            <Upload className="h-3.5 w-3.5 rotate-180" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted text-center py-6">
                    Chưa đính kèm tài liệu nào cho công việc này.
                  </p>
                )}
              </div>

              {/* Task Comments Section */}
              <div className="border border-border rounded-xl p-4 bg-surface space-y-4">
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wide">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Bình luận & Thảo luận ({comments.length})
                </h4>

                <div className="space-y-4">
                  <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3.5">
                    {comments.length > 0 ? (
                      comments.map((comment) => {
                        const isOwner = currentUser?.id === comment.employee_id;
                        const isMod = currentUser?.role_id === 1 || currentUser?.role_id === 2;
                        return (
                          <div key={comment.id} className="flex items-start gap-3 text-xs border-b border-border/20 pb-3 last:border-b-0 last:pb-0">
                            <Avatar
                              src={comment.author?.avatar_url}
                              name={comment.author?.full_name}
                              size="sm"
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-text-primary">
                                  {comment.author?.full_name}
                                </span>
                                <span className="text-[10px] text-text-muted shrink-0">
                                  {new Date(comment.created_at).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-[10px] text-text-muted mt-0.5 italic">
                                {comment.author?.job_title || 'Thành viên'}
                              </p>
                              <div className="text-text-secondary mt-1 bg-secondary/20 p-2.5 rounded-lg border border-border/10 leading-relaxed break-words">
                                {comment.content}
                              </div>
                            </div>
                            {(isOwner || isMod) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 shrink-0 self-start cursor-pointer"
                                title="Xóa bình luận"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-text-muted text-center py-6">
                        Chưa có bình luận nào cho công việc này.
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    <Input
                      placeholder="Viết bình luận mới..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <Button type="button" variant="primary" size="sm" className="shrink-0" onClick={handleAddComment}>
                      Gửi
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Metadata Sidebar */}
            <div className="space-y-4">
              <div className="border border-border rounded-xl p-4 bg-surface space-y-4">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border pb-2">
                  Thuộc tính & Metadata
                </h3>

                <Select
                  label="Trạng thái"
                  value={status}
                  disabled={!canUpdateStatus}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'To Do', label: 'To Do' },
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Done', label: 'Done' },
                  ]}
                />

                <Select
                  label="Độ ưu tiên"
                  value={priority}
                  disabled={!canEdit}
                  onChange={(e) => setPriority(e.target.value)}
                  options={[
                    { value: 'High', label: 'Cao (High)' },
                    { value: 'Medium', label: 'Trung bình (Medium)' },
                    { value: 'Low', label: 'Thấp (Low)' },
                  ]}
                />

                <Select
                  data-testid="task-project-select"
                  label="Thuộc Dự án"
                  value={String(projectId)}
                  disabled={!canEdit}
                  onChange={(e) => handleProjectChange(e.target.value ? Number(e.target.value) : '')}
                  options={[
                    { value: '', label: '-- Chọn Dự án --' },
                    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
                  ]}
                />

                <Select
                  data-testid="task-assignee-select"
                  label="Người Thực hiện"
                  value={String(assignedTo)}
                  disabled={isAssigneeDisabled}
                  onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
                  options={[
                    { value: '', label: assigneePlaceholder },
                    ...assigneeOptions,
                  ]}
                />

                <Select
                  data-testid="task-sprint-select"
                  label="Gán vào Sprint"
                  value={String(sprintId)}
                  disabled={!canEdit}
                  onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : '')}
                  options={[
                    { value: '', label: '-- Không thuộc Sprint --' },
                    ...projectSprints.map((s) => ({ value: String(s.id), label: `${s.name} (${s.status})` })),
                  ]}
                />

                <Select
                  label="Thuộc Epic / Chủ đề"
                  value={String(topicId)}
                  disabled={!canEdit}
                  onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : '')}
                  options={[
                    { value: '', label: '-- Không thuộc Epic --' },
                    ...projectTopics.map((t) => ({ value: String(t.id), label: t.title })),
                  ]}
                />

                {canEdit ? (
                  <>
                    <Input
                      label="Thời hạn (Deadline)"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />

                    <Input
                      label="Story Points (Jira Estimation)"
                      type="number"
                      value={String(storyPoints)}
                      onChange={(e) => setStoryPoints(Number(e.target.value))}
                    />
                  </>
                ) : (
                  <div className="space-y-3 pt-3 border-t border-border/40">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">Story Points</span>
                      <div className="text-xs font-bold text-text-primary bg-secondary/30 px-3 py-2 rounded-lg border border-border/40">
                        {storyPoints > 0 ? `Story Point: ${storyPoints}` : 'Not estimated'}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">Thời hạn (Deadline)</span>
                      <div className="flex items-center justify-between gap-2 bg-secondary/30 px-3 py-2 rounded-lg border border-border/40">
                        <span className="text-xs font-bold text-text-primary">
                          {deadlineInfo.formattedDeadline}
                        </span>
                        {deadlineInfo.badge && (
                          <Badge variant={deadlineInfo.badge.variant}>
                            {deadlineInfo.badge.text}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Info summary */}
              <div className="text-[10px] text-text-muted space-y-1 p-3 border border-border/60 rounded-xl bg-accent/20">
                <div className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> <span>ID Công việc: #{task.id}</span></div>
                <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> <span>Tạo lúc: {new Date(task.created_at || '').toLocaleString('vi-VN')}</span></div>
              </div>
            </div>
          </div>
        ) : (
          /* Simplified Layout for Creating Mode */
          <div className="space-y-4">
            <Input
              label="Tên Công việc *"
              placeholder="Ví dụ: Triển khai API Authentication Redis"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Textarea
              label="Mô tả Chi tiết"
              placeholder="Yêu cầu công việc..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Trạng thái"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'To Do', label: 'Cần làm (To Do)' },
                  { value: 'In Progress', label: 'Đang làm (In Progress)' },
                  { value: 'Done', label: 'Hoàn thành (Done)' },
                ]}
              />

              <Select
                label="Độ ưu tiên"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { value: 'High', label: 'Cao (High)' },
                  { value: 'Medium', label: 'Trung bình (Medium)' },
                  { value: 'Low', label: 'Thấp (Low)' },
                ]}
              />
            </div>

            <Select
              data-testid="task-project-select"
              label="Thuộc Dự án"
              value={String(projectId)}
              onChange={(e) => handleProjectChange(e.target.value ? Number(e.target.value) : '')}
              options={[
                { value: '', label: '-- Chọn Dự án --' },
                ...projects.map((p) => ({ value: String(p.id), label: p.name })),
              ]}
            />

            <Select
              data-testid="task-assignee-select"
              label="Người Thực hiện"
              value={String(assignedTo)}
              disabled={isAssigneeDisabled}
              onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
              options={[
                { value: '', label: assigneePlaceholder },
                ...assigneeOptions,
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
            <Select
              data-testid="task-sprint-select"
              label="Gán vào Sprint"
                value={String(sprintId)}
                onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : '')}
                options={[
                  { value: '', label: '-- Không thuộc Sprint --' },
                  ...projectSprints.map((s) => ({ value: String(s.id), label: `${s.name} (${s.status})` })),
                ]}
              />

              <Select
                label="Thuộc Epic / Chủ đề"
                value={String(topicId)}
                onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : '')}
                options={[
                  { value: '', label: '-- Không thuộc Epic --' },
                  ...projectTopics.map((t) => ({ value: String(t.id), label: t.title })),
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Thời hạn (Deadline)"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <Input
                label="Story Points"
                type="number"
                value={String(storyPoints)}
                onChange={(e) => setStoryPoints(Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </form>
    </Drawer>
  );
};

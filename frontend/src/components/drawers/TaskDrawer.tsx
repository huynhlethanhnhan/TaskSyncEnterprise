import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Drawer } from '../common/Drawer';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import api from '../../api/axios';
import { useToast } from '../../providers/ToastProvider';
import {
  type TaskItem,
  type ProjectItem,
  type EmployeeItem,
} from '../../api/services';
import {
  Paperclip,
  Trash2,
  Upload,
  MessageSquare,
  CheckSquare,
  AlertCircle,
  Clock,
  Briefcase,
} from 'lucide-react';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskItem | null;
  projects?: ProjectItem[];
  employees?: EmployeeItem[];
  onSave: (data: Partial<TaskItem>) => Promise<void>;
  isLoading?: boolean;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  task,
  projects = [],
  employees = [],
  onSave,
  isLoading = false,
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form Fields State
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState('To Do');
  const [priority, setPriority] = React.useState('Medium');
  const [projectId, setProjectId] = React.useState<number | ''>('');
  const [assignedTo, setAssignedTo] = React.useState<number | ''>('');
  const [deadline, setDeadline] = React.useState('');
  const [storyPoints, setStoryPoints] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    if (task) {
      setTitle(task.title || task.name || '');
      setDescription(task.description || '');
      setStatus(task.status || 'To Do');
      setPriority(task.priority || 'Medium');
      setProjectId(task.project_id || '');
      setAssignedTo(task.assigned_to || '');
      setDeadline(task.deadline ? task.deadline.substring(0, 10) : '');
      setStoryPoints(task.story_points || 0);
    } else {
      setTitle('');
      setDescription('');
      setStatus('To Do');
      setPriority('Medium');
      setProjectId(projects[0]?.id || '');
      setAssignedTo('');
      setDeadline('');
      setStoryPoints(0);
    }
  }, [task, isOpen, projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onSave({
      title: title.trim(),
      name: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      project_id: projectId ? Number(projectId) : null,
      assigned_to: assignedTo ? Number(assignedTo) : null,
      deadline: deadline || null,
      story_points: Number(storyPoints),
    });
  };

  // Attachment Upload Handler (Vật lý - kết nối API thực tế)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      await api.post(`/tasks/${task.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Tải tài liệu lên thành công', `Đã đính kèm tệp "${file.name}" vào công việc.`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể tải tệp lên.';
      toast.error('Lỗi tải tệp lên', errMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Attachment Delete Handler (Vật lý - kết nối API thực tế)
  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!task) return;
    if (!window.confirm('Xác nhận xóa tài liệu đính kèm này?')) return;

    try {
      await api.delete(`/tasks/${task.id}/attachments/${attachmentId}`);
      toast.success('Xóa tài liệu thành công');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      toast.error('Lỗi khi xóa tài liệu');
    }
  };

  const isEditMode = Boolean(task);

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
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
            {isEditMode ? 'Lưu thay đổi' : 'Tạo Mới'}
          </Button>
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
                  required
                />

                <Textarea
                  label="Mô tả Chi tiết"
                  placeholder="Yêu cầu công việc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Checklist Section (Backend Gap) */}
              <div className="border border-border rounded-xl p-4 bg-surface space-y-3">
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Checklists
                </h4>
                <div className="p-3 rounded-lg border border-rose-200/40 bg-rose-500/[0.02] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-500 font-semibold text-[11px]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Backend Gap: Chưa hỗ trợ API Checklist</span>
                  </div>
                  <p className="text-[10px] text-text-muted">
                    Bảng cơ sở dữ liệu <code className="px-1 rounded bg-secondary font-mono">dbo.task_checklists</code> đã tồn tại nhưng backend chưa triển khai API router.
                  </p>
                </div>
              </div>

              {/* Attachments Section (Vật lý - kết nối API thực tế) */}
              <div className="border border-border rounded-xl p-4 bg-surface space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wide">
                    <Paperclip className="h-4 w-4 text-primary" />
                    Tài liệu đính kèm ({task?.attachments?.length || 0})
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

                {task?.attachments && task.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {task.attachments.map((att) => (
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
                            href={att.file_path}
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

              {/* Task Comments Section (Backend Gap) */}
              <div className="border border-border rounded-xl p-4 bg-surface space-y-4">
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wide">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Bình luận & Thảo luận
                </h4>

                <div className="p-3 rounded-lg border border-rose-200/40 bg-rose-500/[0.02] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-500 font-semibold text-[11px]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Backend Gap: Thiếu API Router Bình luận Task</span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    Model cơ sở dữ liệu <code className="px-1 rounded bg-secondary font-mono">TaskComment</code> đã định cấu hình trường khóa ngoại liên kết nhưng chưa mở API endpoints để thực hiện CRUD bình luận.
                  </p>
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
                  onChange={(e) => setPriority(e.target.value)}
                  options={[
                    { value: 'High', label: 'Cao (High)' },
                    { value: 'Medium', label: 'Trung bình (Medium)' },
                    { value: 'Low', label: 'Thấp (Low)' },
                  ]}
                />

                <Select
                  label="Thuộc Dự án"
                  value={String(projectId)}
                  onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                  options={[
                    { value: '', label: '-- Chọn Dự án --' },
                    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
                  ]}
                />

                <Select
                  label="Người Thực hiện"
                  value={String(assignedTo)}
                  onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
                  options={[
                    { value: '', label: '-- Chọn Người thực hiện --' },
                    ...employees.map((emp) => ({ value: String(emp.id), label: emp.full_name })),
                  ]}
                />

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
              label="Thuộc Dự án"
              value={String(projectId)}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
              options={[
                { value: '', label: '-- Chọn Dự án --' },
                ...projects.map((p) => ({ value: String(p.id), label: p.name })),
              ]}
            />

            <Select
              label="Người Thực hiện"
              value={String(assignedTo)}
              onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
              options={[
                { value: '', label: '-- Chọn Người thực hiện --' },
                ...employees.map((emp) => ({ value: String(emp.id), label: emp.full_name })),
              ]}
            />

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

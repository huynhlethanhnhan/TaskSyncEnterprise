import * as React from 'react';
import { Drawer } from '../common/Drawer';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { type TaskItem, type ProjectItem, type EmployeeItem } from '../../api/services';

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
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState('To Do');
  const [priority, setPriority] = React.useState('Medium');
  const [projectId, setProjectId] = React.useState<number | ''>('');
  const [assignedTo, setAssignedTo] = React.useState<number | ''>('');
  const [deadline, setDeadline] = React.useState('');

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
    } else {
      setTitle('');
      setDescription('');
      setStatus('To Do');
      setPriority('Medium');
      setProjectId(projects[0]?.id || '');
      setAssignedTo('');
      setDeadline('');
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
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Chỉnh sửa Công việc' : 'Tạo Công việc Mới'}
      description="Gán nhiệm vụ, độ ưu tiên và thời hạn hoàn thành."
      position="right"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Hủy bỏ
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
            {task ? 'Cập nhật Task' : 'Tạo Mới'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tên Công việc *"
          placeholder="Ví dụ: Triển khai API Authentication Redis"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Textarea
          label="Mô tả Chi tiết"
          placeholder="Yêu cầu công việc và checklist..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          label="Người Thực hiện (Assignee)"
          value={String(assignedTo)}
          onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
          options={[
            { value: '', label: '-- Chọn Người thực hiện --' },
            ...employees.map((emp) => ({ value: String(emp.id), label: emp.full_name })),
          ]}
        />

        <Input
          label="Thời hạn Hoàn thành (Deadline)"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </form>
    </Drawer>
  );
};

import * as React from 'react';
import { Drawer } from '../common/Drawer';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { type ProjectItem } from '../../api/services';

interface ProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectItem | null;
  onSave: (data: Partial<ProjectItem>) => Promise<void>;
  isLoading?: boolean;
}

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  isLoading = false,
}) => {
  const [name, setName] = React.useState('');
  const [projectCode, setProjectCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState('Active');

  React.useEffect(() => {
    if (!isOpen) return;
    setName(project?.name || '');
    setProjectCode(project?.project_code || '');
    setDescription(project?.description || '');
    setStatus(project?.status || 'Active');
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!project && !projectCode.trim())) return;
    await onSave({
      ...(!project ? { project_code: projectCode.trim().toUpperCase() } : {}),
      name: name.trim(),
      description: description.trim() || null,
      status,
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={project ? 'Chỉnh sửa Dự án' : 'Tạo Dự án Mới'}
      description="Nhập thông tin chi tiết dự án để theo dõi tiến độ và công việc."
      position="right"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Hủy bỏ
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
            {project ? 'Cập nhật Dự án' : 'Tạo Mới'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Mã Dự án *"
          placeholder="Ví dụ: PRJ-PHASE4"
          value={projectCode}
          onChange={(e) => setProjectCode(e.target.value)}
          disabled={Boolean(project)}
          helperText={project ? 'Mã dự án không thay đổi sau khi tạo.' : 'Dùng chữ cái, số và dấu gạch ngang.'}
          required={!project}
        />

        <Input
          label="Tên Dự án *"
          placeholder="Ví dụ: TaskSync Mobile App Phase 1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Textarea
          label="Mô tả Dự án"
          placeholder="Nhập mục tiêu và mô tả chi tiết..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

        <Select
          label="Trạng thái Dự án"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'Active', label: 'Hoạt động (Active)' },
            { value: 'Planning', label: 'Lập kế hoạch (Planning)' },
            { value: 'Completed', label: 'Hoàn thành (Completed)' },
            { value: 'Archived', label: 'Lưu trữ (Archived)' },
          ]}
        />
      </form>
    </Drawer>
  );
};

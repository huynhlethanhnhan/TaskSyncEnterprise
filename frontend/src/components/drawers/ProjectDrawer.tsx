import * as React from 'react';
import { Drawer } from '../common/Drawer';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { type ProjectItem } from '../../api/services';
import { useDepartments } from '../../hooks/useDepartments';
import { useTeams } from '../../hooks/useTeams';

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
  const { data: departments = [] } = useDepartments();
  const { data: teams = [] } = useTeams();

  const [name, setName] = React.useState('');
  const [projectCode, setProjectCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState('Active');
  const [departmentId, setDepartmentId] = React.useState<number | null>(null);
  const [teamId, setTeamId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setName(project?.name || '');
    setProjectCode(project?.project_code || '');
    setDescription(project?.description || '');
    setStatus(project?.status || 'Active');
    setDepartmentId(project?.department_id ?? null);
    setTeamId(project?.team_id ?? null);
  }, [project, isOpen]);

  const availableTeams = React.useMemo(() => {
    if (!departmentId) return [];
    return teams.filter((t) => Number(t.department_id) === Number(departmentId));
  }, [teams, departmentId]);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : null;
    setDepartmentId(val);
    setTeamId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!project && !projectCode.trim())) return;
    await onSave({
      ...(!project ? { project_code: projectCode.trim().toUpperCase() } : {}),
      name: name.trim(),
      description: description.trim() || null,
      status,
      department_id: departmentId ? Number(departmentId) : null,
      team_id: teamId ? Number(teamId) : null,
    });
  };

  const departmentOptions = [
    { value: '', label: '-- Chọn Phòng ban phụ trách --' },
    ...departments.map((d) => ({
      value: String(d.id),
      label: d.name,
    })),
  ];

  const teamOptions = [
    { value: '', label: departmentId ? '-- Chọn Team phụ trách (Tùy chọn) --' : '-- Hãy chọn Phòng ban trước --' },
    ...availableTeams.map((t) => ({
      value: String(t.id),
      label: t.name,
    })),
  ];

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

        <Select
          label="Phòng ban phụ trách *"
          value={departmentId ? String(departmentId) : ''}
          onChange={handleDepartmentChange}
          options={departmentOptions}
          required
        />

        <Select
          label="Team phụ trách (Primary Team)"
          value={teamId ? String(teamId) : ''}
          onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : null)}
          options={teamOptions}
          disabled={!departmentId}
          helperText={!departmentId ? 'Vui lòng chọn Phòng ban trước khi chọn Team.' : 'Chỉ các Team thuộc Phòng ban đã chọn mới hiển thị.'}
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


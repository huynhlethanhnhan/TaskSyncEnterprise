import * as React from 'react';
import { Drawer } from '../common/Drawer';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { type DepartmentItem, type EmployeeItem } from '../../api/services';

interface DepartmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  department?: DepartmentItem | null;
  employees?: EmployeeItem[];
  onSave: (data: Partial<DepartmentItem>) => Promise<void>;
  isLoading?: boolean;
}

export const DepartmentDrawer: React.FC<DepartmentDrawerProps> = ({
  isOpen,
  onClose,
  department,
  employees = [],
  onSave,
  isLoading = false,
}) => {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [managerId, setManagerId] = React.useState<number | ''>('');

  React.useEffect(() => {
    if (!isOpen) return;
    if (department) {
      setName(department.name || '');
      setCode(department.department_code || '');
      setDescription(department.description || '');
      setManagerId(department.manager_id || '');
    } else {
      setName('');
      setCode('');
      setDescription('');
      setManagerId('');
    }
  }, [department, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSave({
      name: name.trim(),
      department_code: code.trim() || undefined,
      description: description.trim() || null,
      manager_id: managerId ? Number(managerId) : null,
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={department ? 'Chỉnh sửa Phòng ban' : 'Tạo Phòng ban Mới'}
      description="Cấu hình thông tin tổ chức phòng ban và chỉ định Trưởng phòng."
      position="right"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Hủy bỏ
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
            {department ? 'Cập nhật Phòng ban' : 'Tạo Mới'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tên Phòng ban *"
          placeholder="Ví dụ: Information Technology (IT)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Mã Phòng ban (Department Code)"
          placeholder="Ví dụ: IT, HR, FIN"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <Textarea
          label="Mô tả Chức năng"
          placeholder="Nhiệm vụ chính của phòng ban..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <Select
          label="Trưởng phòng (Department Manager)"
          value={String(managerId)}
          onChange={(e) => setManagerId(e.target.value ? Number(e.target.value) : '')}
          options={[
            { value: '', label: '-- Chưa chọn Trưởng phòng --' },
            ...employees.map((emp) => ({ value: String(emp.id), label: emp.full_name })),
          ]}
        />
      </form>
    </Drawer>
  );
};

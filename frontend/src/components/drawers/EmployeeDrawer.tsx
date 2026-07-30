import * as React from 'react';
import { Drawer } from '../common/Drawer';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { useTeams } from '../../hooks/useTeams';
import { type EmployeeItem, type DepartmentItem } from '../../api/services';

interface EmployeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: EmployeeItem | null;
  departments?: DepartmentItem[];
  roles?: { id: number; role_name?: string; name?: string }[];
  onSave: (data: Partial<EmployeeItem>) => Promise<void>;
  isLoading?: boolean;
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({
  isOpen,
  onClose,
  employee,
  departments = [],
  onSave,
  isLoading = false,
}) => {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [jobTitle, setJobTitle] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState<number | ''>('');
  const [teamId, setTeamId] = React.useState<number | ''>('');
  const [roleId, setRoleId] = React.useState<number | ''>('');
  const [isActive, setIsActive] = React.useState(true);

  // Fetch all teams; filter client-side by selected department to avoid extra requests
  const { data: allTeams = [] } = useTeams();

  const availableTeams = React.useMemo(() => {
    if (!departmentId) return allTeams;
    return allTeams.filter((t) => t.department_id === Number(departmentId));
  }, [allTeams, departmentId]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (employee) {
      setFullName(employee.full_name || '');
      setEmail(employee.email || '');
      setPassword('');
      setJobTitle(employee.job_title || '');
      setDepartmentId(employee.department_id || '');
      setTeamId(employee.team_id || '');
      setRoleId(employee.role_id || '');
      setIsActive(employee.is_active ?? true);
    } else {
      setFullName('');
      setEmail('');
      setPassword('123456');
      setJobTitle('');
      setDepartmentId(departments[0]?.id || '');
      setTeamId('');
      setRoleId(3);
      setIsActive(true);
    }
  }, [employee, isOpen, departments]);

  // When department changes, clear team selection if the current team is not in the new department
  const handleDepartmentChange = (value: string) => {
    const newDeptId = value ? Number(value) : '';
    setDepartmentId(newDeptId);

    if (teamId !== '') {
      const currentTeamStillValid = allTeams.some(
        (t) => t.id === Number(teamId) && t.department_id === Number(newDeptId),
      );
      if (!currentTeamStillValid) {
        setTeamId('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    const payload: Partial<EmployeeItem> & { password?: string } = {
      full_name: fullName.trim(),
      email: email.trim(),
      job_title: jobTitle.trim() || null,
      department_id: departmentId ? Number(departmentId) : null,
      team_id: teamId ? Number(teamId) : null,
      role_id: roleId ? Number(roleId) : null,
      is_active: isActive,
    };

    if (!employee && password) {
      payload.password = password;
    }

    await onSave(payload);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? 'Chỉnh sửa Nhân viên' : 'Thêm Nhân viên Mới'}
      description="Quản lý thông tin cá nhân, chức danh và phân quyền phòng ban."
      position="right"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Hủy bỏ
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
            {employee ? 'Cập nhật Nhân viên' : 'Thêm Mới'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Họ và Tên *"
          placeholder="Ví dụ: Nguyễn Văn A"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          label="Email Doanh nghiệp *"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {!employee && (
          <Input
            label="Mật khẩu Khởi tạo *"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}

        <Input
          label="Chức danh / Vị trí"
          placeholder="Ví dụ: Senior Frontend Engineer"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Phòng ban"
            value={String(departmentId)}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            options={[
              { value: '', label: '-- Chọn Phòng ban --' },
              ...departments.map((d) => ({ value: String(d.id), label: d.name })),
            ]}
          />

          <Select
            label="Nhóm (Team)"
            value={String(teamId)}
            onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : '')}
            options={[
              { value: '', label: availableTeams.length === 0 ? '-- Chưa có nhóm --' : '-- Chọn Nhóm --' },
              ...availableTeams.map((t) => ({ value: String(t.id), label: t.name })),
            ]}
          />
        </div>

        <Select
          label="Vai trò Quản trị"
          value={String(roleId)}
          onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
          options={[
            { value: '1', label: '1 - Administrator' },
            { value: '2', label: '2 - Manager' },
            { value: '3', label: '3 - Staff Member' },
          ]}
        />

        <div className="pt-2">
          <Switch
            label="Trạng thái Hoạt động (Is Active)"
            checked={isActive}
            onChange={setIsActive}
          />
        </div>
      </form>
    </Drawer>
  );
};

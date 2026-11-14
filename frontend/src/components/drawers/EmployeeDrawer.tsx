import * as React from 'react';
import { Drawer } from '../common/Drawer';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { useTeams } from '../../hooks/useTeams';
import { type EmployeeItem, type DepartmentItem } from '../../api/services';
import { useSettings } from '../../providers/SettingsProvider';

interface EmployeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: EmployeeItem | null;
  departments?: DepartmentItem[];
  roles?: { id: number; role_name?: string; name?: string }[];
  onSave: (data: Partial<EmployeeItem>) => Promise<void>;
  isLoading?: boolean;
  contactOnly?: boolean;
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({
  isOpen,
  onClose,
  employee,
  departments = [],
  onSave,
  isLoading = false,
  contactOnly = false,
}) => {
  const { t } = useSettings();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [gender, setGender] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [dateOfBirth, setDateOfBirth] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
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
      setPhone(employee.phone || '');
      setGender(employee.gender || '');
      setAddress(employee.address || '');
      setDateOfBirth(employee.date_of_birth ? String(employee.date_of_birth).slice(0, 10) : '');
      setStartDate(employee.start_date ? String(employee.start_date).slice(0, 10) : '');
      setJobTitle(employee.job_title || '');
      setDepartmentId(employee.department_id || '');
      setTeamId(employee.team_id || '');
      setRoleId(employee.role_id || '');
      setIsActive(employee.is_active ?? true);
    } else {
      setFullName('');
      setEmail('');
      setPassword('Admin@Task2026!');
      setPhone('');
      setGender('');
      setAddress('');
      setDateOfBirth('');
      setStartDate('');
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

    if (contactOnly && employee) {
      await onSave({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        gender: gender || null,
        address: address.trim() || null,
        date_of_birth: dateOfBirth || null,
        job_title: jobTitle.trim() || null,
      });
      return;
    }

    const payload: Partial<EmployeeItem> & { password?: string } = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      gender: gender || null,
      address: address.trim() || null,
      date_of_birth: dateOfBirth || null,
      start_date: startDate || null,
      job_title: jobTitle.trim() || null,
      department_id: departmentId ? Number(departmentId) : null,
      team_id: teamId ? Number(teamId) : null,
      role_id: roleId ? Number(roleId) : 3,
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
      title={employee ? t('Chỉnh sửa Nhân viên', 'Edit Employee') : t('Thêm Nhân viên Mới', 'Add New Employee')}
      description={t('Quản lý thông tin cá nhân, chức danh và phân quyền phòng ban.', 'Manage personal details, job title, and department permissions.')}
      position="right"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            {t('Hủy bỏ', 'Cancel')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
            {employee ? t('Cập nhật Nhân viên', 'Update Employee') : t('Thêm Mới', 'Add Employee')}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('Họ và Tên *', 'Full Name *')}
          placeholder={t('Ví dụ: Nguyễn Văn A', 'e.g. Nguyen Van A')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          label={t('Email Doanh nghiệp *', 'Work Email *')}
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {!employee && (
          <Input
            label={t('Mật khẩu Khởi tạo *', 'Initial Password *')}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('Số điện thoại liên hệ', 'Phone Number')}
            placeholder="0912 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Select
            label={t('Giới tính', 'Gender')}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            options={[
              { value: '', label: t('-- Chọn Giới tính --', '-- Select Gender --') },
              { value: 'Male', label: t('Nam', 'Male') },
              { value: 'Female', label: t('Nữ', 'Female') },
              { value: 'Other', label: t('Khác', 'Other') },
            ]}
          />
        </div>

        <Input
          label={t('Địa chỉ liên hệ', 'Contact Address')}
          placeholder={t('Số nhà, đường, quận/huyện, tỉnh/thành phố...', 'Street, district, city...')}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('Ngày sinh', 'Date of Birth')}
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          <Input
            label={t('Ngày gia nhập', 'Start Date')}
            type="date"
            value={startDate}
            disabled={contactOnly && Boolean(employee)}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <Input
          label={t('Chức danh / Vị trí', 'Job Title / Position')}
          placeholder={t('Ví dụ: Senior Frontend Engineer', 'e.g. Senior Frontend Engineer')}
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('Phòng ban', 'Department')}
            value={String(departmentId)}
            disabled={contactOnly && Boolean(employee)}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            options={[
              { value: '', label: t('-- Chọn Phòng ban --', '-- Select Department --') },
              ...departments.map((d) => ({ value: String(d.id), label: d.name })),
            ]}
          />

          <Select
            label={t('Nhóm (Team)', 'Team')}
            value={String(teamId)}
            disabled={contactOnly && Boolean(employee)}
            onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : '')}
            options={[
              {
                value: '',
                label:
                  availableTeams.length === 0
                    ? t('-- Chưa có nhóm --', '-- No teams --')
                    : t('-- Chọn Nhóm --', '-- Select Team --'),
              },
              ...availableTeams.map((t) => ({ value: String(t.id), label: t.name })),
            ]}
          />
        </div>

        <div>
          <Select
            label={t('Vai trò Quản trị', 'Access Role')}
            value={String(roleId)}
            disabled={contactOnly && Boolean(employee)}
            onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : 3)}
            options={[
              { value: '1', label: t('1 - Administrator (Admin)', '1 - Administrator (Admin)') },
              { value: '2', label: t('2 - Manager (Quản lý)', '2 - Manager') },
              { value: '3', label: t('3 - Employee (Nhân viên)', '3 - Employee') },
            ]}
          />
          <p className="mt-1 text-xs text-text-muted">
            {contactOnly && employee
              ? t(
                  'Quản lý có thể cập nhật thông tin liên hệ và chức danh; vai trò và phòng ban do Quản trị viên quản lý.',
                  'Managers can update contact details and job titles; role and department are managed by Administrators.'
                )
              : t(
                  'Lưu ý: Vai trò Trưởng nhóm tạm thời (Team Leader) được chỉ định theo từng Nhóm tại trang Quản lý Nhóm.',
                  'Note: Team Leader role is assigned per team on the Teams Management page.'
                )}
          </p>
        </div>

        {!(contactOnly && employee) && (
          <div className="pt-2">
            <Switch
              label={t('Trạng thái Hoạt động (Is Active)', 'Active Status')}
              checked={isActive}
              onChange={setIsActive}
            />
          </div>
        )}
      </form>
    </Drawer>
  );
};

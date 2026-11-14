import * as React from 'react';
import { useParams, useNavigate } from 'react-router';
import { AxiosError } from 'axios';
import { ArrowLeft, ArrowRightLeft, Briefcase, Building2, CircleCheckBig, RefreshCw, UserMinus, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/common/Modal';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import {
  useAddDepartmentMember,
  useDepartmentDetail,
  useDepartmentMemberCandidates,
  useDepartmentTransferTargets,
  useRemoveDepartmentMember,
  useTransferDepartmentMember,
  useUpdateDepartment,
} from '../../hooks/useDepartments';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import type { DepartmentMemberItem } from '../../api/services';

const DepartmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useSettings();
  const deptId = Number(id);
  const [addOpen, setAddOpen] = React.useState(false);
  const [selectedCandidate, setSelectedCandidate] = React.useState('');
  const [transferMember, setTransferMember] = React.useState<DepartmentMemberItem | null>(null);
  const [targetDepartmentId, setTargetDepartmentId] = React.useState('');
  const [changeManagerOpen, setChangeManagerOpen] = React.useState(false);
  const [selectedManager, setSelectedManager] = React.useState('');

  const { data: department, isLoading, isError, refetch } = useDepartmentDetail(deptId);
  const { data: candidates = [], isLoading: candidatesLoading } =
    useDepartmentMemberCandidates(deptId, addOpen);
  const { data: transferTargets = [] } =
    useDepartmentTransferTargets(deptId, Boolean(transferMember));
  const addMember = useAddDepartmentMember();
  const removeMember = useRemoveDepartmentMember();
  const transferDepartmentMember = useTransferDepartmentMember();
  const updateDepartment = useUpdateDepartment();

  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || Number(user?.role_id) === 1;
  const isManager = role === 'manager' || Number(user?.role_id) === 2;

  const handleChangeManager = async () => {
    if (!selectedManager) return;
    try {
      await updateDepartment.mutateAsync({
        id: deptId,
        payload: { manager_id: Number(selectedManager) },
      });
      toast.success(t('Đã cập nhật Trưởng phòng', 'Department manager updated'), t('Phòng ban đã có Trưởng phòng mới.', 'A new department manager has been assigned.'));
      setChangeManagerOpen(false);
      refetch();
    } catch (error) {
      toast.error(t('Không thể cập nhật Trưởng phòng', 'Failed to update manager'), errorMessage(error));
    }
  };
  const canManageMembers = isAdmin || isManager;
  const canManageMember = (member: DepartmentMemberItem) =>
    canManageMembers &&
    (isAdmin || (member.role_id === 3 && Number(member.id) !== Number(user?.id)));

  const errorMessage = (error: unknown) =>
    error instanceof AxiosError
      ? error.response?.data?.detail || t('Không thể thực hiện thao tác thành viên.', 'Unable to complete member action.')
      : t('Không thể thực hiện thao tác thành viên.', 'Unable to complete member action.');

  const handleAddMember = async () => {
    if (!selectedCandidate) return;
    try {
      await addMember.mutateAsync({ id: deptId, employeeId: Number(selectedCandidate) });
      toast.success(t('Đã thêm thành viên', 'Member added'), t('Nhân viên đã được thêm vào phòng ban.', 'Employee has been added to this department.'));
      setSelectedCandidate('');
      setAddOpen(false);
    } catch (error) {
      toast.error(t('Không thể thêm thành viên', 'Failed to add member'), errorMessage(error));
    }
  };

  const handleRemoveMember = async (member: DepartmentMemberItem) => {
    if (!window.confirm(t(
      `Đưa "${member.full_name}" ra khỏi phòng ban? Thành viên cũng sẽ được gỡ khỏi team hiện tại.`,
      `Remove "${member.full_name}" from this department? They will also be removed from their current team.`,
    ))) return;
    try {
      await removeMember.mutateAsync({ id: deptId, employeeId: member.id });
      toast.success(t('Đã gỡ thành viên', 'Member removed'), t('Nhân viên không còn thuộc phòng ban này.', 'Employee is no longer in this department.'));
    } catch (error) {
      toast.error(t('Không thể gỡ thành viên', 'Failed to remove member'), errorMessage(error));
    }
  };

  const handleTransferMember = async () => {
    if (!transferMember || !targetDepartmentId) return;
    try {
      await transferDepartmentMember.mutateAsync({
        id: deptId,
        employeeId: transferMember.id,
        targetDepartmentId: Number(targetDepartmentId),
      });
      toast.success(t('Đã chuyển phòng ban', 'Department transferred'), `${transferMember.full_name} ${t('đã được chuyển sang phòng ban mới.', 'has been transferred to the new department.')}`);
      setTransferMember(null);
      setTargetDepartmentId('');
    } catch (error) {
      toast.error(t('Không thể chuyển phòng ban', 'Failed to transfer member'), errorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title={t('Chi tiết Phòng ban', 'Department Details')} description={t('Đang tải sơ đồ phòng ban...', 'Loading department hierarchy...')} />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !department) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title={t('Chi tiết Phòng ban', 'Department Details')} description={t('Cơ cấu tổ chức', 'Organization structure')} />
        <ErrorState
          title={t('Không tìm thấy phòng ban', 'Department not found')}
          message={t('Phòng ban không tồn tại hoặc đã bị xóa khỏi hệ thống.', 'The department does not exist or has been removed.')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const deptEmployees = department.members ?? [];
  const departmentTeams = department.teams ?? [];

  return (
    <div className="space-y-6 font-sans pb-12">
      <PageHeader
        title={department.name}
        description={department.description || t('Chi tiết thành viên và nhiệm vụ phòng ban.', 'Department members, teams, and initiatives.')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Phòng ban', 'Departments'), href: '/departments' },
              { label: department.name },
            ]}
          />
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/departments')}
          >
            {t('Quay lại', 'Back')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-primary" />
                <span>{t('Thông tin Phòng ban', 'Department Information')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-text-muted">{t('Mã Phòng ban:', 'Department Code:')}</span>
                <span className="font-mono font-bold text-text-primary">
                  {department.department_code || `DEPT-${department.id}`}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-text-muted">{t('Trưởng phòng:', 'Manager:')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary">{department.manager_name || t('Chưa chỉ định', 'Unassigned')}</span>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => {
                        setSelectedManager(department.manager_id ? String(department.manager_id) : '');
                        setChangeManagerOpen(true);
                      }}
                    >
                      {t('Đổi', 'Change')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-text-muted">{t('Tổng Số Nhân sự:', 'Total Staff:')}</span>
                <Badge variant="primary">{department.employee_count ?? deptEmployees.length} {t('thành viên', 'members')}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary/5 p-2 text-center transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => navigate(`/projects?department_id=${department.id}`)}
                  title={t('Mở các dự án của phòng ban', 'Open department projects')}
                >
                  <Briefcase className="mx-auto h-4 w-4 text-primary" />
                  <div className="mt-1 font-bold">{department.project_count ?? 0}</div>
                  <div className="text-[10px] text-text-muted">{t('Dự án', 'Projects')}</div>
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-500/5 p-2 text-center transition-colors hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => navigate(`/projects?department_id=${department.id}&status=Completed`)}
                  title={t('Mở các dự án đã hoàn thành của phòng ban', 'Open completed department projects')}
                >
                  <CircleCheckBig className="mx-auto h-4 w-4 text-emerald-500" />
                  <div className="mt-1 font-bold">{department.completed_project_count ?? 0}</div>
                  <div className="text-[10px] text-text-muted">{t('Đã xong', 'Completed')}</div>
                </button>
                <div className="rounded-lg bg-amber-500/5 p-2 text-center">
                  <RefreshCw className="mx-auto h-4 w-4 text-amber-500" />
                  <div className="mt-1 font-bold">{department.sprint_count ?? 0}</div>
                  <div className="text-[10px] text-text-muted">{t('Sprint', 'Sprints')}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-primary" />
                <span>
                  {t('Team trực thuộc', 'Teams')} ({departmentTeams.length})
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              {departmentTeams.length === 0 ? (
                <p className="text-xs text-text-muted">
                  {t('Phòng ban chưa có team trực thuộc.', 'No teams in this department yet.')}
                </p>
              ) : (
                departmentTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => navigate(`/teams/${team.id}`)}
                    className="w-full rounded-lg border border-border/50 p-3 text-left hover:bg-secondary/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary">
                        {team.name}
                      </span>

                      <Badge variant="default">
                        {team.member_count} {t('thành viên', 'members')}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-text-muted">
                      {t('Trưởng nhóm:', 'Team Leader:')} {team.leader_name || t('Chưa chỉ định', 'Unassigned')}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="space-y-4">
            <CardHeader className="flex flex-col items-start justify-between gap-3 border-b border-border/40 pb-3 sm:flex-row sm:items-center">
              <CardTitle>{t('Danh sách Thành viên Trực thuộc', 'Department Members')} ({deptEmployees.length})</CardTitle>
              {canManageMembers && (
                <Button
                  size="sm"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  onClick={() => setAddOpen(true)}
                >
                  {t('Thêm thành viên', 'Add Member')}
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {deptEmployees.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">{t('Chưa có nhân sự trực thuộc phòng ban này.', 'No employees assigned to this department yet.')}</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {deptEmployees.map((emp) => (
                    <div key={emp.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.full_name} src={emp.avatar_url || undefined} size="md" />
                        <div>
                          <div className="text-xs font-bold text-text-primary flex items-center gap-2">
                            {emp.full_name}
                            {emp.id === department.manager_id && (
                              <Badge variant="primary" size="sm">{t('Trưởng phòng', 'Manager')}</Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-text-muted">{emp.job_title || emp.email}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge isActive={Boolean(emp.is_active)} size="sm" />
                        {canManageMember(emp) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                              onClick={() => setTransferMember(emp)}
                            >
                              {t('Chuyển', 'Transfer')}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              leftIcon={<UserMinus className="h-3.5 w-3.5" />}
                              onClick={() => handleRemoveMember(emp)}
                              isLoading={removeMember.isPending}
                            >
                              {t('Gỡ', 'Remove')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('Thêm thành viên vào phòng ban', 'Add Member to Department')}
        description={t('Chỉ hiển thị nhân viên đang chưa thuộc phòng ban nào.', 'Only shows employees not yet assigned to any department.')}
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t('Hủy', 'Cancel')}</Button>
            <Button
              onClick={handleAddMember}
              disabled={!selectedCandidate}
              isLoading={addMember.isPending}
            >
              {t('Thêm thành viên', 'Add Member')}
            </Button>
          </>
        }
      >
        <Select
          label={t('Nhân viên', 'Employee')}
          value={selectedCandidate}
          onChange={(event) => setSelectedCandidate(event.target.value)}
          disabled={candidatesLoading}
          options={[
            {
              value: '',
              label: candidatesLoading
                ? t('Đang tải danh sách...', 'Loading candidates...')
                : candidates.length
                  ? t('Chọn nhân viên', 'Select employee')
                  : t('Không có nhân viên phù hợp', 'No eligible employees'),
            },
            ...candidates.map((candidate) => ({
              value: String(candidate.id),
              label: `${candidate.full_name} (${candidate.employee_code || candidate.email})`,
            })),
          ]}
        />
      </Modal>

      <Modal
        isOpen={Boolean(transferMember)}
        onClose={() => setTransferMember(null)}
        title={t('Chuyển thành viên sang phòng ban khác', 'Transfer Member to Another Department')}
        description={transferMember ? t(
          `Nhân viên: ${transferMember.full_name}. Team hiện tại sẽ được gỡ tự động.`,
          `Employee: ${transferMember.full_name}. Current team assignment will be cleared automatically.`,
        ) : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setTransferMember(null)}>{t('Hủy', 'Cancel')}</Button>
            <Button
              onClick={handleTransferMember}
              disabled={!targetDepartmentId}
              isLoading={transferDepartmentMember.isPending}
            >
              {t('Xác nhận chuyển', 'Confirm Transfer')}
            </Button>
          </>
        }
      >
        <Select
          label={t('Phòng ban đích', 'Target Department')}
          value={targetDepartmentId}
          onChange={(event) => setTargetDepartmentId(event.target.value)}
          options={[
            { value: '', label: t('Chọn phòng ban đích', 'Select target department') },
            ...transferTargets.map((item) => ({
              value: String(item.id),
              label: item.name,
            })),
          ]}
        />
      </Modal>

      <Modal
        isOpen={changeManagerOpen}
        onClose={() => setChangeManagerOpen(false)}
        title={t('Chỉ định Trưởng phòng mới', 'Assign New Department Manager')}
        description={t('Chọn nhân viên đảm nhận vị trí Trưởng phòng ban.', 'Select an employee to serve as department manager.')}
        footer={
          <>
            <Button variant="outline" onClick={() => setChangeManagerOpen(false)}>{t('Hủy', 'Cancel')}</Button>
            <Button
              onClick={handleChangeManager}
              disabled={!selectedManager}
              isLoading={updateDepartment.isPending}
            >
              {t('Lưu thay đổi', 'Save Changes')}
            </Button>
          </>
        }
      >
        <Select
          label={t('Trưởng phòng mới', 'New Manager')}
          value={selectedManager}
          onChange={(event) => setSelectedManager(event.target.value)}
          options={[
            { value: '', label: t('-- Chọn Trưởng phòng --', '-- Select Manager --') },
            ...deptEmployees.map((emp) => ({
              value: String(emp.id),
              label: `${emp.full_name} (${emp.employee_code || emp.email})`,
            })),
          ]}
        />
      </Modal>
    </div>
  );
};

export default DepartmentDetailPage;

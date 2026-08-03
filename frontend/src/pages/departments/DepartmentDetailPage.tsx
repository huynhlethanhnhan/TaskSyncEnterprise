import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { ArrowLeft, ArrowRightLeft, Briefcase, Building2, CircleCheckBig, RefreshCw, UserMinus, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
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
import type { DepartmentMemberItem } from '../../api/services';

const DepartmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
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
      toast.success('Đã cập nhật Trưởng phòng', 'Phòng ban đã có Trưởng phòng mới.');
      setChangeManagerOpen(false);
      refetch();
    } catch (error) {
      toast.error('Không thể cập nhật Trưởng phòng', errorMessage(error));
    }
  };
  const canManageMembers = isAdmin || isManager;
  const canManageMember = (member: DepartmentMemberItem) =>
    canManageMembers &&
    (isAdmin || (member.role_id === 3 && Number(member.id) !== Number(user?.id)));

  const errorMessage = (error: unknown) =>
    error instanceof AxiosError
      ? error.response?.data?.detail || 'Không thể thực hiện thao tác thành viên.'
      : 'Không thể thực hiện thao tác thành viên.';

  const handleAddMember = async () => {
    if (!selectedCandidate) return;
    try {
      await addMember.mutateAsync({ id: deptId, employeeId: Number(selectedCandidate) });
      toast.success('Đã thêm thành viên', 'Nhân viên đã được thêm vào phòng ban.');
      setSelectedCandidate('');
      setAddOpen(false);
    } catch (error) {
      toast.error('Không thể thêm thành viên', errorMessage(error));
    }
  };

  const handleRemoveMember = async (member: DepartmentMemberItem) => {
    if (!window.confirm(`Đưa "${member.full_name}" ra khỏi phòng ban? Thành viên cũng sẽ được gỡ khỏi team hiện tại.`)) return;
    try {
      await removeMember.mutateAsync({ id: deptId, employeeId: member.id });
      toast.success('Đã gỡ thành viên', 'Nhân viên không còn thuộc phòng ban này.');
    } catch (error) {
      toast.error('Không thể gỡ thành viên', errorMessage(error));
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
      toast.success('Đã chuyển phòng ban', `${transferMember.full_name} đã được chuyển sang phòng ban mới.`);
      setTransferMember(null);
      setTargetDepartmentId('');
    } catch (error) {
      toast.error('Không thể chuyển phòng ban', errorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Chi tiết Phòng ban" description="Đang tải sơ đồ phòng ban..." />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !department) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Chi tiết Phòng ban" description="Cơ cấu tổ chức" />
        <ErrorState
          title="Không tìm thấy phòng ban"
          message="Phòng ban không tồn tại hoặc đã bị xóa khỏi hệ thống."
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
        description={department.description || 'Chi tiết thành viên và nhiệm vụ phòng ban.'}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Phòng ban', href: '/departments' },
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
            Quay lại
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-primary" />
                <span>Thông tin Phòng ban</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-text-muted">Mã Phòng ban:</span>
                <span className="font-mono font-bold text-text-primary">
                  {department.department_code || `DEPT-${department.id}`}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-text-muted">Trưởng phòng:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary">{department.manager_name || 'Chưa chỉ định'}</span>
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
                      Đổi
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-text-muted">Tổng Số Nhân sự:</span>
                <Badge variant="primary">{department.employee_count ?? deptEmployees.length} thành viên</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="rounded-lg bg-primary/5 p-2 text-center">
                  <Briefcase className="mx-auto h-4 w-4 text-primary" />
                  <div className="mt-1 font-bold">{department.project_count ?? 0}</div>
                  <div className="text-[10px] text-text-muted">Dự án</div>
                </div>
                <div className="rounded-lg bg-emerald-500/5 p-2 text-center">
                  <CircleCheckBig className="mx-auto h-4 w-4 text-emerald-500" />
                  <div className="mt-1 font-bold">{department.completed_project_count ?? 0}</div>
                  <div className="text-[10px] text-text-muted">Đã xong</div>
                </div>
                <div className="rounded-lg bg-amber-500/5 p-2 text-center">
                  <RefreshCw className="mx-auto h-4 w-4 text-amber-500" />
                  <div className="mt-1 font-bold">{department.sprint_count ?? 0}</div>
                  <div className="text-[10px] text-text-muted">Sprint</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-primary" />
                <span>
                  Team trực thuộc ({departmentTeams.length})
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              {departmentTeams.length === 0 ? (
                <p className="text-xs text-text-muted">
                  Phòng ban chưa có team trực thuộc.
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
                        {team.member_count} thành viên
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-text-muted">
                      Leader: {team.leader_name || 'Chưa chỉ định'}
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
              <CardTitle>Danh sách Thành viên Trực thuộc ({deptEmployees.length})</CardTitle>
              {canManageMembers && (
                <Button
                  size="sm"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  onClick={() => setAddOpen(true)}
                >
                  Thêm thành viên
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {deptEmployees.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">Chưa có nhân sự trực thuộc phòng ban này.</p>
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
                              <Badge variant="primary" size="sm">Trưởng phòng</Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-text-muted">{emp.job_title || emp.email}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={emp.is_active ? 'success' : 'danger'} showDot>
                          {emp.is_active ? 'Hoạt động' : 'Tạm khóa'}
                        </Badge>
                        {canManageMember(emp) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                              onClick={() => setTransferMember(emp)}
                            >
                              Chuyển
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              leftIcon={<UserMinus className="h-3.5 w-3.5" />}
                              onClick={() => handleRemoveMember(emp)}
                              isLoading={removeMember.isPending}
                            >
                              Gỡ
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
        title="Thêm thành viên vào phòng ban"
        description="Chỉ hiển thị nhân viên đang chưa thuộc phòng ban nào."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
            <Button
              onClick={handleAddMember}
              disabled={!selectedCandidate}
              isLoading={addMember.isPending}
            >
              Thêm thành viên
            </Button>
          </>
        }
      >
        <Select
          label="Nhân viên"
          value={selectedCandidate}
          onChange={(event) => setSelectedCandidate(event.target.value)}
          disabled={candidatesLoading}
          options={[
            {
              value: '',
              label: candidatesLoading
                ? 'Đang tải danh sách...'
                : candidates.length
                  ? 'Chọn nhân viên'
                  : 'Không có nhân viên phù hợp',
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
        title="Chuyển thành viên sang phòng ban khác"
        description={transferMember ? `Nhân viên: ${transferMember.full_name}. Team hiện tại sẽ được gỡ tự động.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setTransferMember(null)}>Hủy</Button>
            <Button
              onClick={handleTransferMember}
              disabled={!targetDepartmentId}
              isLoading={transferDepartmentMember.isPending}
            >
              Xác nhận chuyển
            </Button>
          </>
        }
      >
        <Select
          label="Phòng ban đích"
          value={targetDepartmentId}
          onChange={(event) => setTargetDepartmentId(event.target.value)}
          options={[
            { value: '', label: 'Chọn phòng ban đích' },
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
        title="Chỉ định Trưởng phòng mới"
        description="Chọn nhân viên đảm nhận vị trí Trưởng phòng ban."
        footer={
          <>
            <Button variant="outline" onClick={() => setChangeManagerOpen(false)}>Hủy</Button>
            <Button
              onClick={handleChangeManager}
              disabled={!selectedManager}
              isLoading={updateDepartment.isPending}
            >
              Lưu thay đổi
            </Button>
          </>
        }
      >
        <Select
          label="Trưởng phòng mới"
          value={selectedManager}
          onChange={(event) => setSelectedManager(event.target.value)}
          options={[
            { value: '', label: '-- Chọn Trưởng phòng --' },
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

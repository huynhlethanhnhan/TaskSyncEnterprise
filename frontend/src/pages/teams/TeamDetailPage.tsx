import * as React from 'react';
import { useNavigate, useParams } from 'react-router';
import { AxiosError } from 'axios';
import {
  ArrowLeft,
  ArrowRightLeft,
  Briefcase,
  Building2,
  Tag,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/common/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Avatar } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';

import {
  useAddTeamMember,
  useRemoveTeamMember,
  useTeamDetail,
  useTeamMemberCandidates,
  useTeamTransferTargets,
  useTransferTeamMember,
  useUpdateTeam,
} from '../../hooks/useTeams';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import type { TeamMemberItem } from '../../api/services';

const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useSettings();

  const teamId = Number(id);
  const [addOpen, setAddOpen] = React.useState(false);
  const [selectedCandidate, setSelectedCandidate] = React.useState('');
  const [transferMember, setTransferMember] = React.useState<TeamMemberItem | null>(null);
  const [targetTeamId, setTargetTeamId] = React.useState('');
  const [changeLeaderOpen, setChangeLeaderOpen] = React.useState(false);
  const [selectedLeader, setSelectedLeader] = React.useState('');

  const {
    data: team,
    isLoading,
    isError,
    refetch,
  } = useTeamDetail(teamId);
  const { data: candidates = [], isLoading: candidatesLoading } =
    useTeamMemberCandidates(teamId, addOpen);
  const { data: transferTargets = [] } =
    useTeamTransferTargets(teamId, Boolean(transferMember));
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();
  const transferTeamMember = useTransferTeamMember();
  const updateTeam = useUpdateTeam();

  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || Number(user?.role_id) === 1;
  const isManager = role === 'manager' || Number(user?.role_id) === 2;
  const isLeader = Number(user?.id) === Number(team?.leader_id);
  const canManageMembers = isAdmin || isManager || isLeader;

  const handleChangeLeader = async () => {
    if (!selectedLeader) return;
    try {
      await updateTeam.mutateAsync({
        id: teamId,
        payload: { leader_id: Number(selectedLeader) },
      });
      toast.success(t('Đã cập nhật Trưởng nhóm', 'Team leader updated'), t('Team đã có Trưởng nhóm mới.', 'Team has been assigned a new leader.'));
      setChangeLeaderOpen(false);
      refetch();
    } catch (error) {
      toast.error(t('Không thể cập nhật Trưởng nhóm', 'Failed to update leader'), errorMessage(error));
    }
  };
  const canManageMember = (member: TeamMemberItem) =>
    canManageMembers &&
    (isAdmin || (member.role_id === 3 && Number(member.id) !== Number(user?.id)));

  const errorMessage = (error: unknown) =>
    error instanceof AxiosError
      ? error.response?.data?.detail || t('Không thể thực hiện thao tác thành viên.', 'Unable to complete member action.')
      : t('Không thể thực hiện thao tác thành viên.', 'Unable to complete member action.');

  const handleAddMember = async () => {
    if (!selectedCandidate) return;
    try {
      await addMember.mutateAsync({ id: teamId, employeeId: Number(selectedCandidate) });
      toast.success(t('Đã thêm thành viên', 'Member added'), t('Nhân viên đã được thêm vào team.', 'Employee has been added to this team.'));
      setSelectedCandidate('');
      setAddOpen(false);
    } catch (error) {
      toast.error(t('Không thể thêm thành viên', 'Failed to add member'), errorMessage(error));
    }
  };

  const handleRemoveMember = async (member: TeamMemberItem) => {
    if (!window.confirm(t(
      `Đưa "${member.full_name}" ra khỏi team? Nhân viên vẫn thuộc phòng ban hiện tại.`,
      `Remove "${member.full_name}" from this team? They will remain in their current department.`,
    ))) return;
    try {
      await removeMember.mutateAsync({ id: teamId, employeeId: member.id });
      toast.success(t('Đã gỡ thành viên', 'Member removed'), t('Nhân viên không còn thuộc team này.', 'Employee is no longer a member of this team.'));
    } catch (error) {
      toast.error(t('Không thể gỡ thành viên', 'Failed to remove member'), errorMessage(error));
    }
  };

  const handleTransferMember = async () => {
    if (!transferMember || !targetTeamId) return;
    try {
      await transferTeamMember.mutateAsync({
        id: teamId,
        employeeId: transferMember.id,
        targetTeamId: Number(targetTeamId),
      });
      toast.success(t('Đã chuyển team', 'Team transferred'), `${transferMember.full_name} ${t('đã được chuyển sang team mới.', 'has been transferred to the new team.')}`);
      setTransferMember(null);
      setTargetTeamId('');
    } catch (error) {
      toast.error(t('Không thể chuyển team', 'Failed to transfer member'), errorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader
          title={t('Chi tiết Nhóm', 'Team Details')}
          description={t('Đang tải thông tin nhóm...', 'Loading team details...')}
        />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader
          title={t('Chi tiết Nhóm', 'Team Details')}
          description={t('Thông tin cơ cấu và thành viên nhóm', 'Team structure and member details')}
        />

        <ErrorState
          title={t('Không tìm thấy nhóm', 'Team not found')}
          message={t('Nhóm không tồn tại hoặc bạn không có quyền truy cập.', 'The team does not exist or you do not have access.')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const members = team.members ?? [];

  return (
    <div className="space-y-6 font-sans pb-12">
      <PageHeader
        title={team.name}
        description={
          team.description ||
          t('Thông tin chi tiết trưởng nhóm và thành viên.', 'Team leader and member overview.')
        }
        breadcrumb={
          <Breadcrumb
            items={[
              {
                label: t('Nhóm', 'Teams'),
                href: '/teams',
              },
              {
                label: team.name,
              },
            ]}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Briefcase className="h-4 w-4" />}
              onClick={() => navigate(`/projects?team_id=${team.id}`)}
            >
              {t('Dự án của nhóm', 'Team Projects')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/teams')}
            >
              {t('Quay lại', 'Back')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {t('Thông tin Nhóm', 'Team Information')}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 py-2">
                <span className="text-text-muted">
                  {t('Mã nhóm:', 'Team Code:')}
                </span>

                <span className="flex items-center gap-1 font-mono font-bold text-text-primary">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  {team.team_code}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 py-2">
                <span className="text-text-muted">
                  {t('Phòng ban:', 'Department:')}
                </span>

                <span className="font-bold text-text-primary">
                  {team.department_name || t('Không xác định', 'Unassigned')}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 py-2">
                <span className="text-text-muted">
                  {t('Trưởng nhóm:', 'Team Leader:')}
                </span>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary">
                    {team.leader_name || t('Chưa chỉ định', 'Unassigned')}
                  </span>
                  {(isAdmin || isManager) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => {
                        setSelectedLeader(team.leader_id ? String(team.leader_id) : '');
                        setChangeLeaderOpen(true);
                      }}
                    >
                      {t('Đổi', 'Change')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-text-muted">
                  {t('Tổng thành viên:', 'Total Members:')}
                </span>

                <Badge variant="primary">
                  {team.member_count ?? members.length} {t('thành viên', 'members')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                {t('Trưởng nhóm', 'Team Leader')}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {team.leader_name ? (
                <div className="flex items-center gap-3">
                  <Avatar
                    name={team.leader_name}
                    src={team.leader_avatar_url}
                    size="md"
                  />

                  <div>
                    <p className="text-sm font-bold text-text-primary">
                      {team.leader_name}
                    </p>

                    <p className="text-xs text-text-muted">
                      {t('Trưởng nhóm', 'Team Leader')}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-text-muted">
                  {t('Nhóm chưa được chỉ định trưởng nhóm.', 'No team leader assigned yet.')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {t('Danh sách Thành viên', 'Members')} ({members.length})
            </CardTitle>
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

          <CardContent className="space-y-3">
            {members.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-xs text-text-muted">
                  {t('Chưa có thành viên trực thuộc nhóm này.', 'No members assigned to this team yet.')}
                </p>
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={member.full_name}
                      src={member.avatar_url}
                      size="md"
                    />

                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        {member.full_name}
                      </p>

                      <p className="text-xs text-text-muted">
                        {member.job_title || t('Thành viên', 'Member')}
                      </p>

                      <p className="text-[11px] text-text-muted">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {member.id === team.leader_id && (
                      <Badge variant="success">
                        {t('Trưởng nhóm', 'Team Leader')}
                      </Badge>
                    )}

                    <StatusBadge isActive={Boolean(member.is_active)} size="sm" />
                    {canManageMember(member) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                          onClick={() => setTransferMember(member)}
                        >
                          {t('Chuyển', 'Transfer')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<UserMinus className="h-3.5 w-3.5" />}
                          onClick={() => handleRemoveMember(member)}
                          isLoading={removeMember.isPending}
                        >
                          {t('Gỡ', 'Remove')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('Thêm thành viên vào team', 'Add Member to Team')}
        description={t('Chỉ hiển thị nhân viên cùng phòng ban và đang chưa thuộc team nào.', 'Only shows employees in the same department who are not in any team yet.')}
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
        title={t('Chuyển thành viên sang team khác', 'Transfer Member to Another Team')}
        description={transferMember ? t(
          `Nhân viên: ${transferMember.full_name}. Chỉ chuyển trong cùng phòng ban.`,
          `Employee: ${transferMember.full_name}. Transfers apply within the same department.`,
        ) : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setTransferMember(null)}>{t('Hủy', 'Cancel')}</Button>
            <Button
              onClick={handleTransferMember}
              disabled={!targetTeamId}
              isLoading={transferTeamMember.isPending}
            >
              {t('Xác nhận chuyển', 'Confirm Transfer')}
            </Button>
          </>
        }
      >
        <Select
          label={t('Team đích', 'Target Team')}
          value={targetTeamId}
          onChange={(event) => setTargetTeamId(event.target.value)}
          options={[
            { value: '', label: t('Chọn team đích', 'Select target team') },
            ...transferTargets.map((item) => ({
              value: String(item.id),
              label: item.name,
            })),
          ]}
        />
      </Modal>

      <Modal
        isOpen={changeLeaderOpen}
        onClose={() => setChangeLeaderOpen(false)}
        title={t('Chỉ định Trưởng nhóm mới', 'Assign New Team Leader')}
        description={t('Chọn thành viên đảm nhận vị trí Team Leader.', 'Select a team member to serve as Team Leader.')}
        footer={
          <>
            <Button variant="outline" onClick={() => setChangeLeaderOpen(false)}>{t('Hủy', 'Cancel')}</Button>
            <Button
              onClick={handleChangeLeader}
              disabled={!selectedLeader}
              isLoading={updateTeam.isPending}
            >
              {t('Lưu thay đổi', 'Save Changes')}
            </Button>
          </>
        }
      >
        <Select
          label={t('Trưởng nhóm mới', 'New Team Leader')}
          value={selectedLeader}
          onChange={(event) => setSelectedLeader(event.target.value)}
          options={[
            { value: '', label: t('-- Chọn Trưởng nhóm --', '-- Select Team Leader --') },
            ...members.map((member) => ({
              value: String(member.id),
              label: `${member.full_name} (${member.employee_code || member.email})`,
            })),
          ]}
        />
      </Modal>
    </div>
  );
};

export default TeamDetailPage;

import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import {
  ArrowLeft,
  ArrowRightLeft,
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
} from '../../hooks/useTeams';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import type { TeamMemberItem } from '../../api/services';

const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const teamId = Number(id);
  const [addOpen, setAddOpen] = React.useState(false);
  const [selectedCandidate, setSelectedCandidate] = React.useState('');
  const [transferMember, setTransferMember] = React.useState<TeamMemberItem | null>(null);
  const [targetTeamId, setTargetTeamId] = React.useState('');

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

  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || Number(user?.role_id) === 1;
  const isManager = role === 'manager' || Number(user?.role_id) === 2;
  const isLeader = Number(user?.id) === Number(team?.leader_id);
  const canManageMembers = isAdmin || isManager || isLeader;
  const canManageMember = (member: TeamMemberItem) =>
    canManageMembers &&
    (isAdmin || (member.role_id === 3 && Number(member.id) !== Number(user?.id)));

  const errorMessage = (error: unknown) =>
    error instanceof AxiosError
      ? error.response?.data?.detail || 'Không thể thực hiện thao tác thành viên.'
      : 'Không thể thực hiện thao tác thành viên.';

  const handleAddMember = async () => {
    if (!selectedCandidate) return;
    try {
      await addMember.mutateAsync({ id: teamId, employeeId: Number(selectedCandidate) });
      toast.success('Đã thêm thành viên', 'Nhân viên đã được thêm vào team.');
      setSelectedCandidate('');
      setAddOpen(false);
    } catch (error) {
      toast.error('Không thể thêm thành viên', errorMessage(error));
    }
  };

  const handleRemoveMember = async (member: TeamMemberItem) => {
    if (!window.confirm(`Đưa "${member.full_name}" ra khỏi team? Nhân viên vẫn thuộc phòng ban hiện tại.`)) return;
    try {
      await removeMember.mutateAsync({ id: teamId, employeeId: member.id });
      toast.success('Đã gỡ thành viên', 'Nhân viên không còn thuộc team này.');
    } catch (error) {
      toast.error('Không thể gỡ thành viên', errorMessage(error));
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
      toast.success('Đã chuyển team', `${transferMember.full_name} đã được chuyển sang team mới.`);
      setTransferMember(null);
      setTargetTeamId('');
    } catch (error) {
      toast.error('Không thể chuyển team', errorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader
          title="Chi tiết Nhóm"
          description="Đang tải thông tin nhóm..."
        />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader
          title="Chi tiết Nhóm"
          description="Thông tin cơ cấu và thành viên nhóm"
        />

        <ErrorState
          title="Không tìm thấy nhóm"
          message="Nhóm không tồn tại hoặc bạn không có quyền truy cập."
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
          'Thông tin chi tiết trưởng nhóm và thành viên.'
        }
        breadcrumb={
          <Breadcrumb
            items={[
              {
                label: 'Teams',
                href: '/teams',
              },
              {
                label: team.name,
              },
            ]}
          />
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/teams')}
          >
            Quay lại
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Thông tin Nhóm
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 py-2">
                <span className="text-text-muted">
                  Mã nhóm:
                </span>

                <span className="flex items-center gap-1 font-mono font-bold text-text-primary">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  {team.team_code}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 py-2">
                <span className="text-text-muted">
                  Phòng ban:
                </span>

                <span className="font-bold text-text-primary">
                  {team.department_name || 'Không xác định'}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 py-2">
                <span className="text-text-muted">
                  Trưởng nhóm:
                </span>

                <span className="font-bold text-text-primary">
                  {team.leader_name || 'Chưa chỉ định'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-text-muted">
                  Tổng thành viên:
                </span>

                <Badge variant="primary">
                  {team.member_count ?? members.length} thành viên
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Trưởng nhóm
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
                      Team Leader
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-text-muted">
                  Nhóm chưa được chỉ định trưởng nhóm.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Danh sách Thành viên ({members.length})
            </CardTitle>
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

          <CardContent className="space-y-3">
            {members.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-xs text-text-muted">
                  Chưa có thành viên trực thuộc nhóm này.
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
                        {member.job_title || 'Thành viên'}
                      </p>

                      <p className="text-[11px] text-text-muted">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {member.id === team.leader_id && (
                      <Badge variant="success">
                        Trưởng nhóm
                      </Badge>
                    )}

                    <Badge
                      variant={
                        member.is_active
                          ? 'success'
                          : 'default'
                      }
                    >
                      {member.is_active
                        ? 'Hoạt động'
                        : 'Ngừng hoạt động'}
                    </Badge>
                    {canManageMember(member) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                          onClick={() => setTransferMember(member)}
                        >
                          Chuyển
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<UserMinus className="h-3.5 w-3.5" />}
                          onClick={() => handleRemoveMember(member)}
                          isLoading={removeMember.isPending}
                        >
                          Gỡ
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
        title="Thêm thành viên vào team"
        description="Chỉ hiển thị nhân viên cùng phòng ban và đang chưa thuộc team nào."
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
        title="Chuyển thành viên sang team khác"
        description={transferMember ? `Nhân viên: ${transferMember.full_name}. Chỉ chuyển trong cùng phòng ban.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setTransferMember(null)}>Hủy</Button>
            <Button
              onClick={handleTransferMember}
              disabled={!targetTeamId}
              isLoading={transferTeamMember.isPending}
            >
              Xác nhận chuyển
            </Button>
          </>
        }
      >
        <Select
          label="Team đích"
          value={targetTeamId}
          onChange={(event) => setTargetTeamId(event.target.value)}
          options={[
            { value: '', label: 'Chọn team đích' },
            ...transferTargets.map((item) => ({
              value: String(item.id),
              label: item.name,
            })),
          ]}
        />
      </Modal>
    </div>
  );
};

export default TeamDetailPage;

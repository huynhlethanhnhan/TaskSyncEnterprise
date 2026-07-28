import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Tag,
  UserCheck,
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
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';

import { useTeamDetail } from '../../hooks/useTeams';

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const teamId = Number(id);

  const {
    data: team,
    isLoading,
    isError,
    refetch,
  } = useTeamDetail(teamId);

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Danh sách Thành viên ({members.length})
            </CardTitle>
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

                  <div className="flex items-center gap-2">
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
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDetailPage;
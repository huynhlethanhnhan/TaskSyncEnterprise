import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Building2, CircleCheckBig, RefreshCw, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useDepartmentDetail } from '../../hooks/useDepartments';

const DepartmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deptId = Number(id);

  const { data: department, isLoading, isError, refetch } = useDepartmentDetail(deptId);

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
                <span className="font-bold text-text-primary">{department.manager_name || 'Chưa chỉ định'}</span>
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
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
              <CardTitle>Danh sách Thành viên Trực thuộc ({deptEmployees.length})</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {deptEmployees.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">Chưa có nhân sự trực thuộc phòng ban này.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {deptEmployees.map((emp) => (
                    <div key={emp.id} className="py-3 flex items-center justify-between">
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

                      <div className="flex items-center gap-2">
                        <Badge variant={emp.is_active ? 'success' : 'danger'} showDot>
                          {emp.is_active ? 'Hoạt động' : 'Tạm khóa'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetailPage;

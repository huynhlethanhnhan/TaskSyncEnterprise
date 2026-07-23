import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useDepartmentDetail } from '../../hooks/useDepartments';
import { useEmployees } from '../../hooks/useEmployees';

export const DepartmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deptId = Number(id);

  const { data: department, isLoading, isError, refetch } = useDepartmentDetail(deptId);
  const { data: employees = [] } = useEmployees();

  const deptEmployees = React.useMemo(() => {
    return employees.filter((e) => Number(e.department_id) === deptId);
  }, [employees, deptId]);

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

  const manager = employees.find((e) => e.id === department.manager_id);

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
        {/* Left 1 Column: Summary Card */}
        <Card className="lg:col-span-1">
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
              <span className="font-bold text-text-primary">{manager ? manager.full_name : 'Chưa chỉ định'}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted">Tổng Số Nhân sự:</span>
              <Badge variant="primary">{deptEmployees.length} Thành viên</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Right 2 Columns: Employee List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Danh sách Thành viên Trực thuộc ({deptEmployees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {deptEmployees.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-6">Chưa có nhân sự trực thuộc phòng ban này.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {deptEmployees.map((emp) => (
                  <div key={emp.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.full_name} src={emp.avatar_url || undefined} size="md" />
                      <div>
                        <p className="text-xs font-bold text-text-primary">{emp.full_name}</p>
                        <span className="text-[11px] text-text-muted">{emp.job_title || emp.email}</span>
                      </div>
                    </div>

                    <Badge variant={emp.is_active ? 'success' : 'danger'} showDot>
                      {emp.is_active ? 'Hoạt động' : 'Tạm khóa'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DepartmentDetailPage;

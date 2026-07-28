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
import { useEmployees, useUpdateEmployee } from '../../hooks/useEmployees';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useSprints } from '../../hooks/useSprintBacklog';
import { useTopics } from '../../hooks/useTopics';
import { useToast } from '../../providers/ToastProvider';
import { UserCheck, Layers, Plus } from 'lucide-react';

export const DepartmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const deptId = Number(id);

  const { data: department, isLoading, isError, refetch } = useDepartmentDetail(deptId);
  const { data: employees = [] } = useEmployees();
  const updateEmployee = useUpdateEmployee();

  const deptEmployees = React.useMemo(() => {
    return employees.filter((e) => Number(e.department_id) === deptId);
  }, [employees, deptId]);

  const otherEmployees = React.useMemo(() => {
    return employees.filter((e) => Number(e.department_id) !== deptId);
  }, [employees, deptId]);

  const { data: tasks = [] } = useTasks();
  const { data: allSprints = [] } = useSprints();
  const { data: allTopics = [] } = useTopics();

  const deptEmployeeIds = React.useMemo(() => new Set(deptEmployees.map((e) => e.id)), [deptEmployees]);
  
  const deptTasks = React.useMemo(() => {
    return tasks.filter((t) => t.assigned_to && deptEmployeeIds.has(t.assigned_to));
  }, [tasks, deptEmployeeIds]);

  const activeSprints = React.useMemo(() => {
    const sprintIds = new Set(deptTasks.map((t) => t.sprint_id).filter(Boolean));
    return allSprints.filter((s) => sprintIds.has(s.id));
  }, [deptTasks, allSprints]);

  const activeTopics = React.useMemo(() => {
    const topicIds = new Set(deptTasks.map((t) => t.topic_id).filter(Boolean));
    return allTopics.filter((t) => topicIds.has(t.id));
  }, [deptTasks, allTopics]);

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
        {/* Left 1 Column: Summary & Active Items */}
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
                <span className="font-bold text-text-primary">{manager ? manager.full_name : 'Chưa chỉ định'}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-text-muted">Tổng Số Nhân sự:</span>
                <Badge variant="primary">{deptEmployees.length} Thành viên</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Sprint & Epic Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                <Layers className="h-4.5 w-4.5 text-primary" />
                <span>Sprint & Epic Đang thực hiện</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <h5 className="font-bold text-text-primary mb-2">Sprints ({activeSprints.length})</h5>
                {activeSprints.length === 0 ? (
                  <p className="text-text-muted text-[11px]">Không có Sprint nào đang thực hiện.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activeSprints.map((sprint) => (
                      <div key={sprint.id} className="flex items-center justify-between p-2 rounded bg-accent/20 border border-border/40">
                        <span className="font-medium text-text-primary">{sprint.name}</span>
                        <Badge variant={sprint.status === 'Active' ? 'success' : 'default'} size="sm">
                          {sprint.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border/40">
                <h5 className="font-bold text-text-primary mb-2">Epics / Chủ đề ({activeTopics.length})</h5>
                {activeTopics.length === 0 ? (
                  <p className="text-text-muted text-[11px]">Không có Epic nào được gán.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activeTopics.map((topic) => (
                      <div key={topic.id} className="p-2 rounded bg-accent/20 border border-border/40 text-[11px]">
                        <span className="font-medium text-text-primary block truncate">{topic.title}</span>
                        <span className="text-[10px] text-text-muted">Mã Epic: #{topic.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Employee List & Member Assignment */}
        <div className="lg:col-span-2">
          <Card className="space-y-4">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
            <CardTitle>Danh sách Thành viên Trực thuộc ({deptEmployees.length})</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Add Employee to Department Picker */}
            <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg border border-border/40">
              <span className="text-xs font-bold text-text-secondary shrink-0 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5 text-primary" /> Thêm Nhân sự vào Phòng ban:
              </span>
              <select
                onChange={async (e) => {
                  if (e.target.value) {
                    try {
                      await updateEmployee.mutateAsync({ id: Number(e.target.value), payload: { department_id: deptId } });
                      toast.success('Đã phân công nhân sự vào phòng ban');
                      e.target.value = '';
                    } catch {
                      toast.error('Lỗi phân công nhân sự');
                    }
                  }
                }}
                className="flex-1 h-8 rounded border border-input bg-surface px-2 text-xs text-text-primary focus:outline-none cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>-- Chọn Nhân sự để thêm vào {department.name} --</option>
                {otherEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.job_title || emp.email})
                  </option>
                ))}
              </select>
            </div>

            {deptEmployees.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-6">Chưa có nhân sự trực thuộc phòng ban này.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {deptEmployees.map((emp) => (
                  <div key={emp.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.full_name} src={emp.avatar_url || undefined} size="md" />
                      <div>
                        <p className="text-xs font-bold text-text-primary flex items-center gap-2">
                          {emp.full_name}
                          {emp.id === department.manager_id && (
                            <Badge variant="primary" size="sm">Trưởng phòng</Badge>
                          )}
                        </p>
                        <span className="text-[11px] text-text-muted">{emp.job_title || emp.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={emp.is_active ? 'success' : 'danger'} showDot>
                        {emp.is_active ? 'Hoạt động' : 'Tạm khóa'}
                      </Badge>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Gỡ ${emp.full_name} khỏi phòng ban ${department.name}?`)) {
                            try {
                              await updateEmployee.mutateAsync({ id: emp.id, payload: { department_id: null } });
                              toast.success('Đã gỡ nhân sự khỏi phòng ban');
                            } catch {
                              toast.error('Lỗi khi gỡ nhân sự');
                            }
                          }
                        }}
                        className="text-[11px] text-rose-500 hover:underline px-2 py-1 cursor-pointer"
                      >
                        Gỡ bỏ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div> {/* Right Column Wrapper */}
      </div>
    </div>
  );
};

export default DepartmentDetailPage;

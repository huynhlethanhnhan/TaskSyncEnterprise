import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Building,
  ShieldCheck,
  Smartphone,
  MapPin,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  UserCheck,
  TrendingUp,
  Activity,
  Award,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';

import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { useEmployeeDetail } from '../../hooks/useEmployees';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import api from '../../api/axios';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const empId = Number(id);

  const [activeTab, setActiveTab] = React.useState<'overview' | 'tasks' | 'projects' | 'leaves' | 'performance' | 'audit'>('overview');
  const [employeeLeaves, setEmployeeLeaves] = React.useState<any[]>([]);
  const [employeeAuditLogs, setEmployeeAuditLogs] = React.useState<any[]>([]);

  const { data: employee, isLoading, isError, refetch } = useEmployeeDetail(empId);
  const { data: allTasks = [] } = useTasks();
  const { data: allProjects = [] } = useProjects();

  const assignedTasks = React.useMemo(() => {
    return allTasks.filter((t) => Number(t.assigned_to) === empId);
  }, [allTasks, empId]);

  const completedTasks = React.useMemo(() => {
    return assignedTasks.filter((t) => t.status === 'Done');
  }, [assignedTasks]);

  const overdueTasks = React.useMemo(() => {
    const now = new Date();
    return assignedTasks.filter((t) => t.status !== 'Done' && t.deadline && new Date(t.deadline) < now);
  }, [assignedTasks]);

  const assignedProjects = React.useMemo(() => {
    return allProjects.filter((p) => (p as any).members?.some((m: any) => Number(m.employee_id) === empId) || p.department_id === employee?.department_id);
  }, [allProjects, empId, employee?.department_id]);

  // Load Leave History and Audit Log for this employee
  React.useEffect(() => {
    if (!empId) return;
    api.get('/vacations')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setEmployeeLeaves(list.filter((v: any) => Number(v.requested_by) === empId));
      })
      .catch(() => setEmployeeLeaves([]));

    api.get(`/audit?employee_id=${empId}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setEmployeeAuditLogs(list);
      })
      .catch(() => setEmployeeAuditLogs([]));
  }, [empId]);

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title="Chi tiết Nhân viên" description="Đang tải hồ sơ 360°..." />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title="Chi tiết Nhân viên" description="Thông tin cá nhân" />
        <ErrorState
          title="Không tìm thấy nhân viên"
          message="Nhân viên không tồn tại hoặc đã bị xóa khỏi hệ thống."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const completionRate = assignedTasks.length > 0 ? Math.round((completedTasks.length / assignedTasks.length) * 100) : 100;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={employee.full_name}
        description={employee.job_title || 'Hồ sơ 360° nhân sự và theo dõi hiệu suất làm việc'}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Nhân sự', href: '/employees' },
              { label: employee.full_name },
            ]}
          />
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/employees')}
          >
            Quay lại
          </Button>
        }
      />

      {/* Top Profile Header Banner */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar name={employee.full_name} src={employee.avatar_url || undefined} size="xl" className="h-20 w-20 border-2 border-primary/20" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">{employee.full_name}</h2>
                  <Badge variant={employee.is_active ? 'success' : 'danger'} showDot>
                    {employee.is_active ? 'Đang Hoạt động' : 'Tạm Khóa'}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {employee.job_title || 'Chưa gán vị trí'} · Phòng ban: <strong className="text-text-primary">{employee.department_name || 'Chưa gán'}</strong>
                </p>
                <div className="flex items-center gap-4 text-[11px] text-text-secondary mt-2">
                  <span>Mã NV: <strong className="font-mono text-text-primary">{employee.employee_code || `EMP-${employee.id}`}</strong></span>
                  <span>Email: <strong className="text-text-primary">{employee.email}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick KPI Stat Pills */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent/40 border border-border/60 text-center min-w-24">
                <p className="text-xs font-semibold text-text-muted">Tổng Task</p>
                <p className="text-lg font-bold text-text-primary">{assignedTasks.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-24">
                <p className="text-xs font-semibold text-emerald-600">Hoàn thành</p>
                <p className="text-lg font-bold text-emerald-600">{completedTasks.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center min-w-24">
                <p className="text-xs font-semibold text-primary">Tỉ lệ</p>
                <p className="text-lg font-bold text-primary">{completionRate}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Tabs */}
        <div className="lg:col-span-1 space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'overview' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Thông tin Tổng quan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'tasks' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Nhiệm vụ Được gán ({assignedTasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'projects' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Dự án Thâm nhập ({assignedProjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaves')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'leaves' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Lịch sử Nghỉ phép ({employeeLeaves.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'performance' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Đánh giá Hiệu suất (KPI)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'audit' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Nhật ký Hoạt động (Audit)</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="lg:col-span-3">
          {/* TAB 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sơ yếu Lý lịch & Liên hệ</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Mail className="h-4 w-4 text-text-muted shrink-0" />
                      <span>Email Doanh nghiệp: <strong className="text-text-primary">{employee.email}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Smartphone className="h-4 w-4 text-text-muted shrink-0" />
                      <span>Số điện thoại: <strong className="text-text-primary">{employee.phone || 'Chưa cập nhật'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <MapPin className="h-4 w-4 text-text-muted shrink-0" />
                      <span>Địa chỉ liên lạc: <strong className="text-text-primary">{employee.address || 'Chưa cập nhật'}</strong></span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Building className="h-4 w-4 text-text-muted shrink-0" />
                      <span>Phòng ban: <strong className="text-text-primary">{employee.department_name || 'Chưa gán'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <UserCheck className="h-4 w-4 text-text-muted shrink-0" />
                      <span>Nhóm (Team): <strong className="text-text-primary">{employee.team_name || (employee.team_id ? `Team #${employee.team_id}` : 'Chưa gán')}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <ShieldCheck className="h-4 w-4 text-text-muted shrink-0" />
                      <span>Mã Nhân viên: <strong className="font-mono text-text-primary">{employee.employee_code}</strong></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: Tasks */}
          {activeTab === 'tasks' && (
            <Card>
              <CardHeader>
                <CardTitle>Danh sách Nhiệm vụ Được gán ({assignedTasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignedTasks.length === 0 ? (
                  <EmptyState type="no-data" description="Nhân viên này chưa được giao nhiệm vụ nào." />
                ) : (
                  assignedTasks.map((t) => (
                    <div key={t.id} className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">{t.title || t.name}</h4>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Deadline: {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : 'Không có'} · Ưu tiên: {t.priority || 'Normal'}
                        </p>
                      </div>
                      <Badge variant={t.status === 'Done' ? 'success' : 'primary'} showDot>
                        {t.status || 'To Do'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Projects */}
          {activeTab === 'projects' && (
            <Card>
              <CardHeader>
                <CardTitle>Dự án Tham gia ({assignedProjects.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignedProjects.length === 0 ? (
                  <EmptyState type="no-data" description="Chưa thuộc thành viên dự án nào." />
                ) : (
                  assignedProjects.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">{p.name}</h4>
                        <p className="text-[11px] text-text-muted mt-0.5">{p.description || 'Chưa có mô tả chi tiết'}</p>
                      </div>
                      <Badge variant="primary">{p.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 4: Leaves */}
          {activeTab === 'leaves' && (
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử Đơn Nghỉ phép ({employeeLeaves.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {employeeLeaves.length === 0 ? (
                  <EmptyState type="no-data" description="Nhân viên chưa gửi đơn xin nghỉ phép nào." />
                ) : (
                  employeeLeaves.map((l) => (
                    <div key={l.id} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">{l.type}</h4>
                        <p className="text-[11px] text-text-muted">Từ {l.start_date} đến {l.end_date}</p>
                      </div>
                      <Badge variant={l.status === 'Approved' || l.status === 'HR Approved' ? 'success' : 'warning'}>
                        {l.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 5: Performance */}
          {activeTab === 'performance' && (
            <Card>
              <CardHeader>
                <CardTitle>Báo cáo & Đánh giá Hiệu suất (KPI Summary)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Award className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-emerald-600">Tỉ lệ Hoàn thành Task</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{completionRate}%</p>
                  </div>

                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                    <CheckCircle2 className="h-6 w-6 text-sky-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-sky-600">Task Hoàn thành</p>
                    <p className="text-2xl font-bold text-sky-600 mt-1">{completedTasks.length} / {assignedTasks.length}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <AlertCircle className="h-6 w-6 text-rose-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-rose-600">Task Quá hạn</p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">{overdueTasks.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 6: Audit Log */}
          {activeTab === 'audit' && (
            <Card>
              <CardHeader>
                <CardTitle>Nhật ký Hoạt động (Audit Log)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {employeeAuditLogs.length === 0 ? (
                  <EmptyState type="no-data" description="Chưa ghi nhận hoạt động nhật ký gần đây." />
                ) : (
                  employeeAuditLogs.map((log, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/60 bg-surface/50 text-xs flex items-center justify-between">
                      <span className="font-semibold text-text-primary">{log.action || 'Hành động'}</span>
                      <span className="text-text-muted text-[11px]">{log.created_at || 'Vừa xong'}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailPage;

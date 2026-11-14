import * as React from 'react';
import { useParams, useNavigate } from 'react-router';
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
  DollarSign,
  FileSignature,
  Pencil,
  Plus,
  ShieldAlert,
  User,
  KeyRound,
} from 'lucide-react';
import { EmployeeHrmTabPanel } from '../../components/hrm/EmployeeHrmTabPanel';
import {
  ContractDetailModal,
  ContractFormModal,
  formatVndCurrency,
  getContractTypeLabel,
} from '../../components/hrm/HrmModals';
import { ResetPasswordModal } from '../../components/modals/ResetPasswordModal';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { EmployeeDrawer } from '../../components/drawers/EmployeeDrawer';
import {
  useDismissPasswordResetRequest,
  useEmployeeDetail,
  usePasswordResetRequests,
  useUpdateEmployee,
} from '../../hooks/useEmployees';
import { useDepartments } from '../../hooks/useDepartments';
import { useCreateContract, useHrmContracts, useUpdateContract } from '../../hooks/useHRM';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { extractApiError } from '../../utils/errorHelpers';
import {
  type EmployeeItem,
  type EmploymentContractCreatePayload,
  type EmploymentContractItem,
  type EmploymentContractUpdatePayload,
} from '../../api/services';
import api from '../../api/axios';

const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { t, statusLabel, formatDate, isEnglish } = useSettings();
  const empId = Number(id);

  const isAdmin = Number(user?.role_id) === 1 || (user?.role || '').toLowerCase() === 'admin';
  const isManager = Number(user?.role_id) === 2 || (user?.role || '').toLowerCase() === 'manager';

  const [activeTab, setActiveTab] = React.useState<'overview' | 'tasks' | 'projects' | 'leaves' | 'performance' | 'hrm' | 'audit'>('overview');
  const [employeeLeaves, setEmployeeLeaves] = React.useState<any[]>([]);
  const [employeeAuditLogs, setEmployeeAuditLogs] = React.useState<any[]>([]);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = React.useState(false);
  const [selectedContract, setSelectedContract] = React.useState<EmploymentContractItem | null>(null);
  const [editingContract, setEditingContract] = React.useState<EmploymentContractItem | null>(null);
  const [isContractFormOpen, setIsContractFormOpen] = React.useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = React.useState(false);

  const { data: employee, isLoading, isError, refetch } = useEmployeeDetail(empId);
  const { data: departments = [] } = useDepartments(isAdmin || isManager);
  const { data: passwordResetRequests = [] } = usePasswordResetRequests(isAdmin);
  const dismissResetRequest = useDismissPasswordResetRequest();
  const updateEmployee = useUpdateEmployee();
  const createContractMutation = useCreateContract();
  const updateContractMutation = useUpdateContract();
  const { data: allTasks = [] } = useTasks();
  const { data: allProjects = [] } = useProjects();

  const isSameDepartment = Boolean(user?.department_id) && Boolean(employee?.department_id) && Number(user?.department_id) === Number(employee?.department_id);
  const isSelf = Number(user?.id) === empId;
  const canViewContracts = Boolean(employee) && (isAdmin || (isManager && isSameDepartment) || isSelf);
  const canManageContracts = Boolean(employee) && (isAdmin || (isManager && isSameDepartment && !isSelf));
  const { data: contracts = [], isLoading: contractsLoading } = useHrmContracts(
    { employee_id: empId },
    canViewContracts,
  );
  const primaryContract = React.useMemo(
    () => contracts.find((c) => c.status === 'Active') || contracts[0] || null,
    [contracts],
  );

  const assignedTasks = React.useMemo(() => {
    return allTasks.filter((taskItem) => Number(taskItem.assigned_to) === empId);
  }, [allTasks, empId]);

  const completedTasks = React.useMemo(() => {
    return assignedTasks.filter((taskItem) => taskItem.status === 'Done');
  }, [assignedTasks]);

  const overdueTasks = React.useMemo(() => {
    const now = new Date();
    return assignedTasks.filter((taskItem) => taskItem.status !== 'Done' && taskItem.deadline && new Date(taskItem.deadline) < now);
  }, [assignedTasks]);

  const assignedProjects = React.useMemo(() => {
    return allProjects.filter((p) => (p as any).members?.some((m: any) => Number(m.employee_id) === empId) || p.department_id === employee?.department_id);
  }, [allProjects, empId, employee]);

  // Load Leave History and Audit Log for this employee
  React.useEffect(() => {
    if (!empId) return;
    api.get('/vacations')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setEmployeeLeaves(list.filter((v: any) => Number(v.requested_by) === empId));
      })
      .catch(() => setEmployeeLeaves([]));

    api.get(`/audit-logs?employee_id=${empId}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setEmployeeAuditLogs(list);
      })
      .catch(() => setEmployeeAuditLogs([]));
  }, [empId]);

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader
          title={t('Chi tiết Nhân viên', 'Employee Details')}
          description={t('Đang tải hồ sơ 360°...', 'Loading 360° profile...')}
        />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title={t('Chi tiết Nhân viên', 'Employee Details')} description={t('Thông tin cá nhân', 'Personal profile')} />
        <ErrorState
          title={t('Không tìm thấy nhân viên', 'Employee not found')}
          message={t('Nhân viên không tồn tại hoặc đã bị xóa khỏi hệ thống.', 'Employee does not exist or has been removed.')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const completionRate = assignedTasks.length > 0 ? Math.round((completedTasks.length / assignedTasks.length) * 100) : 100;

  const canEditContactDetails =
    isAdmin ||
    (isManager && Boolean(user?.department_id) && Number(user?.department_id) === Number(employee.department_id)) ||
    Number(user?.id) === Number(employee.id);

  const formatGenderLabel = (gender?: string | null) => {
    if (!gender) return t('Chưa cập nhật', 'Not updated');
    const normalized = gender.trim().toLowerCase();
    if (normalized === 'male' || normalized === 'nam') return t('Nam', 'Male');
    if (normalized === 'female' || normalized === 'nữ' || normalized === 'nu') return t('Nữ', 'Female');
    if (normalized === 'other' || normalized === 'khác') return t('Khác', 'Other');
    return gender;
  };

  const handleSaveEmployee = async (payload: Partial<EmployeeItem>) => {
    try {
      await updateEmployee.mutateAsync({ id: employee.id, payload });
      await refetch();
      setIsEditDrawerOpen(false);
      toast.success(
        t('Cập nhật hồ sơ thành công', 'Profile Updated'),
        t('Thông tin nhân sự và liên hệ đã được lưu.', 'Employee and contact details have been saved.')
      );
    } catch (err) {
      const apiError = extractApiError(err, t('Không thể cập nhật thông tin nhân viên.', 'Unable to update employee details.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiError.status}]`, apiError.message);
    }
  };

  const handleSaveContractCreate = async (payload: EmploymentContractCreatePayload) => {
    try {
      await createContractMutation.mutateAsync(payload);
      toast.success(
        t('Phát hành hợp đồng thành công', 'Contract Issued'),
        t(`Hợp đồng ${payload.contract_code} đã được lưu.`, `Contract ${payload.contract_code} saved.`),
      );
      setIsContractFormOpen(false);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể phát hành hợp đồng.', 'Failed to create contract.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleSaveContractUpdate = async (contractId: number, payload: EmploymentContractUpdatePayload) => {
    try {
      await updateContractMutation.mutateAsync({ contractId, payload });
      toast.success(
        t('Cập nhật hợp đồng thành công', 'Contract Updated'),
        t('Thông tin hợp đồng lao động đã được cập nhật.', 'Employment contract details updated.'),
      );
      setIsContractFormOpen(false);
      setEditingContract(null);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể cập nhật hợp đồng.', 'Failed to update contract.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const presenceStatus =
    employee.employment_status === 'Terminated' || employee.employment_status === 'Pending_Offboard'
      ? employee.employment_status
      : !employee.is_active
        ? 'Disabled'
        : employee.is_online
          ? 'Online'
          : 'Offline';

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={employee.full_name}
        description={employee.job_title || t('Hồ sơ 360° nhân sự và theo dõi hiệu suất làm việc', '360° employee profile and performance tracking')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Nhân sự', 'Employees'), href: '/employees' },
              { label: employee.full_name },
            ]}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<KeyRound className="h-3.5 w-3.5 text-amber-500" />}
                onClick={() => setIsResetPasswordModalOpen(true)}
              >
                {t('Đặt lại mật khẩu', 'Reset Password')}
              </Button>
            )}
            {canEditContactDetails && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => setIsEditDrawerOpen(true)}
              >
                {t('Chỉnh sửa thông tin', 'Edit Profile')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/employees')}
            >
              {t('Quay lại', 'Back')}
            </Button>
          </div>
        }
      />

      {/* Pending Password Reset Alert Banner for this Employee */}
      {isAdmin &&
        (() => {
          const pendingReq = passwordResetRequests.find((r) => Number(r.employee_id) === empId);
          if (!pendingReq) return null;
          return (
            <Card className="border-amber-300/80 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-xs">
                  <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">
                      {t('Nhân viên này vừa gửi yêu cầu quên / đặt lại mật khẩu', 'This employee submitted a password reset request')}
                    </p>
                    {pendingReq.note && (
                      <p className="text-amber-700 dark:text-amber-300">
                        {t('Ghi chú:', 'Note:')} {pendingReq.note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismissResetRequest.mutate(empId)}
                    isLoading={dismissResetRequest.isPending}
                  >
                    {t('Bỏ qua', 'Dismiss')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                    onClick={() => setIsResetPasswordModalOpen(true)}
                  >
                    {t('Cấp lại mật khẩu ngay', 'Reset Password Now')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {/* Top Profile Header Banner */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar
                name={employee.full_name}
                src={employee.avatar_url || undefined}
                size="xl"
                status={employee.is_active && employee.is_online ? 'online' : 'offline'}
                className="h-20 w-20 border-2 border-primary/20"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">{employee.full_name}</h2>
                  <StatusBadge status={presenceStatus} size="sm" />
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {employee.job_title || t('Chưa gán vị trí', 'No position assigned')} · {t('Phòng ban:', 'Department:')}{' '}
                  <strong className="text-text-primary">{employee.department_name || t('Chưa gán', 'Unassigned')}</strong>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-secondary mt-2">
                  <span>{t('Mã NV:', 'ID:')} <strong className="font-mono text-text-primary">{employee.employee_code || `EMP-${employee.id}`}</strong></span>
                  <span className="break-all">Email: <strong className="text-text-primary">{employee.email}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick KPI Stat Pills */}
            <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 rounded-xl bg-accent/40 border border-border/60 text-center sm:min-w-24">
                <p className="text-xs font-semibold text-text-muted">{t('Tổng Task', 'Total Tasks')}</p>
                <p className="text-lg font-bold text-text-primary">{assignedTasks.length}</p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center sm:min-w-24">
                <p className="text-xs font-semibold text-emerald-600">{t('Hoàn thành', 'Completed')}</p>
                <p className="text-lg font-bold text-emerald-600">{completedTasks.length}</p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 border border-primary/20 text-center sm:min-w-24">
                <p className="text-xs font-semibold text-primary">{t('Tỉ lệ', 'Rate')}</p>
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
            <span>{t('Thông tin Tổng quan', 'Overview')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'tasks' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{t('Nhiệm vụ Được gán', 'Assigned Tasks')} ({assignedTasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'projects' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>{t('Dự án Tham gia', 'Assigned Projects')} ({assignedProjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaves')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'leaves' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            <span>{t('Lịch sử Nghỉ phép', 'Leave History')} ({employeeLeaves.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'performance' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>{t('Đánh giá Hiệu suất (KPI)', 'KPI Performance')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hrm')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'hrm' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>{t('Hồ sơ HRM & Lương', 'HRM & Payroll')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'audit' ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>{t('Nhật ký Hoạt động (Audit)', 'Activity Audit Log')}</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="lg:col-span-3">
          {/* TAB 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle>{t('Sơ yếu Lý lịch & Liên hệ', 'Profile & Contact Details')}</CardTitle>
                  {canEditContactDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Pencil className="h-3.5 w-3.5 text-sky-600" />}
                      onClick={() => setIsEditDrawerOpen(true)}
                    >
                      {t('Cập nhật liên hệ', 'Update Contact')}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Mail className="h-4 w-4 text-text-muted shrink-0" />
                      <span>{t('Email Doanh nghiệp:', 'Work Email:')} <strong className="text-text-primary break-all">{employee.email}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Smartphone className="h-4 w-4 text-text-muted shrink-0" />
                      <span>{t('Số điện thoại:', 'Phone:')} <strong className="text-text-primary">{employee.phone || t('Chưa cập nhật', 'Not updated')}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <User className="h-4 w-4 text-text-muted shrink-0" />
                      <span>{t('Giới tính:', 'Gender:')} <strong className="text-text-primary">{formatGenderLabel(employee.gender)}</strong></span>
                    </div>
                    <div className="flex items-start gap-2 text-text-secondary">
                      <MapPin className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                      <span>{t('Địa chỉ liên lạc:', 'Address:')} <strong className="text-text-primary">{employee.address || t('Chưa cập nhật', 'Not updated')}</strong></span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <CalendarIcon className="h-4 w-4 text-text-muted shrink-0" />
                      <span>{t('Ngày sinh:', 'Date of Birth:')} <strong className="text-text-primary">{employee.date_of_birth ? formatDate(employee.date_of_birth) : t('Chưa cập nhật', 'Not updated')}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Briefcase className="h-4 w-4 text-text-muted shrink-0" />
                      <span>{t('Ngày gia nhập:', 'Start Date:')} <strong className="text-text-primary">{employee.start_date ? formatDate(employee.start_date) : t('Chưa cập nhật', 'Not updated')}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Building className="h-4 w-4 text-text-muted shrink-0" />
                      <span>{t('Phòng ban:', 'Department:')} <strong className="text-text-primary">{employee.department_name || t('Chưa gán', 'Unassigned')}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <UserCheck className="h-4 w-4 text-text-muted shrink-0" />
                      <span>{t('Nhóm (Team):', 'Team:')} <strong className="text-text-primary">{employee.team_name || (employee.team_id ? `Team #${employee.team_id}` : t('Chưa gán', 'Unassigned'))}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <ShieldCheck className="h-4 w-4 text-text-muted shrink-0" />
                      <span>{t('Mã Nhân viên:', 'Employee ID:')} <strong className="font-mono text-text-primary">{employee.employee_code}</strong></span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employment Contract Summary Card on Overview */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-primary" />
                    <CardTitle>{t('Hợp đồng Lao động', 'Employment Contract')}</CardTitle>
                  </div>
                  {canViewContracts && (
                    <div className="flex flex-wrap items-center gap-2">
                      {canManageContracts && (
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Plus className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setEditingContract(null);
                            setIsContractFormOpen(true);
                          }}
                        >
                          {t('Phát hành hợp đồng', 'Issue Contract')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('hrm')}
                      >
                        {t('Quản lý HRM & Lương', 'Open HRM & Payroll')} ({contracts.length})
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {!canViewContracts ? (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-accent/30 border border-border text-xs text-text-muted">
                      <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>
                        {t(
                          'Thông tin hợp đồng lao động và lương thưởng được bảo mật, chỉ hiển thị với Quản trị viên, Quản lý phòng ban trực tiếp hoặc chính nhân sự.',
                          'Employment contract and compensation details are restricted to Admin, direct Department Manager, or the employee.',
                        )}
                      </span>
                    </div>
                  ) : contractsLoading ? (
                    <p className="text-xs text-text-muted py-2">{t('Đang tải hợp đồng...', 'Loading contracts...')}</p>
                  ) : !primaryContract ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-dashed border-border bg-accent/20 text-xs">
                      <span className="text-text-muted">
                        {t('Nhân sự này chưa có hợp đồng lao động nào được ghi nhận.', 'No employment contract has been recorded for this employee yet.')}
                      </span>
                      {canManageContracts && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Plus className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setEditingContract(null);
                            setIsContractFormOpen(true);
                          }}
                        >
                          {t('Tạo hợp đồng ngay', 'Create Contract')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-border bg-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" size="sm" className="font-mono font-bold text-primary">
                            {primaryContract.contract_code}
                          </Badge>
                          <span className="font-bold text-text-primary">
                            {getContractTypeLabel(primaryContract.contract_type, isEnglish)}
                          </span>
                          <StatusBadge status={primaryContract.status} size="sm" />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-text-secondary">
                          <span>
                            {t('Hiệu lực:', 'Effective:')}{' '}
                            <strong className="text-text-primary">
                              {formatDate(primaryContract.start_date)} →{' '}
                              {primaryContract.end_date ? formatDate(primaryContract.end_date) : t('Vô thời hạn', 'Indefinite')}
                            </strong>
                          </span>
                          <span>
                            {t('Lương cơ bản:', 'Base Salary:')}{' '}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {formatVndCurrency(primaryContract.base_salary, primaryContract.currency)}
                            </strong>
                          </span>
                          {Number(primaryContract.allowance || 0) > 0 && (
                            <span>
                              {t('Phụ cấp:', 'Allowance:')}{' '}
                              <strong className="text-primary">
                                {formatVndCurrency(primaryContract.allowance, primaryContract.currency)}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedContract(primaryContract)}
                        >
                          {t('Xem chi tiết', 'View Contract')}
                        </Button>
                        {canManageContracts && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Pencil className="h-3.5 w-3.5 text-sky-600" />}
                            onClick={() => {
                              setEditingContract(primaryContract);
                              setIsContractFormOpen(true);
                            }}
                          >
                            {t('Chỉnh sửa', 'Edit')}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: Tasks */}
          {activeTab === 'tasks' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Danh sách Nhiệm vụ Được gán', 'Assigned Tasks')} ({assignedTasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignedTasks.length === 0 ? (
                  <EmptyState type="no-data" description={t('Nhân viên này chưa được giao nhiệm vụ nào.', 'No tasks assigned to this employee.')} />
                ) : (
                  assignedTasks.map((taskItem) => (
                    <div key={taskItem.id} className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">{taskItem.title || taskItem.name}</h4>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {t('Hạn:', 'Deadline:')} {taskItem.deadline ? formatDate(taskItem.deadline) : t('Không có', 'None')} · {t('Ưu tiên:', 'Priority:')} {statusLabel(taskItem.priority || 'Medium')}
                        </p>
                      </div>
                      <StatusBadge status={taskItem.status || 'To Do'} size="sm" />
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
                <CardTitle>{t('Dự án Tham gia', 'Assigned Projects')} ({assignedProjects.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignedProjects.length === 0 ? (
                  <EmptyState type="no-data" description={t('Chưa thuộc thành viên dự án nào.', 'Not a member of any projects yet.')} />
                ) : (
                  assignedProjects.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">{p.name}</h4>
                        <p className="text-[11px] text-text-muted mt-0.5">{p.description || t('Chưa có mô tả chi tiết', 'No description provided')}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={p.status} size="sm" />
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Briefcase className="h-3.5 w-3.5" />}
                          onClick={() => navigate(`/projects/${p.id}`)}
                        >
                          {t('Mở dự án', 'Open Project')}
                        </Button>
                      </div>
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
                <CardTitle>{t('Lịch sử Đơn Nghỉ phép', 'Leave History')} ({employeeLeaves.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {employeeLeaves.length === 0 ? (
                  <EmptyState type="no-data" description={t('Nhân viên chưa gửi đơn xin nghỉ phép nào.', 'No leave requests submitted by this employee.')} />
                ) : (
                  employeeLeaves.map((l) => (
                    <div key={l.id} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">{statusLabel(l.type)}</h4>
                        <p className="text-[11px] text-text-muted">{t('Từ', 'From')} {formatDate(l.start_date)} {t('đến', 'to')} {formatDate(l.end_date)}</p>
                      </div>
                      <StatusBadge status={l.status} size="sm" />
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
                <CardTitle>{t('Báo cáo & Đánh giá Hiệu suất (KPI)', 'Performance Evaluation (KPI Summary)')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Award className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-emerald-600">{t('Tỉ lệ Hoàn thành Task', 'Task Completion Rate')}</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{completionRate}%</p>
                  </div>

                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                    <CheckCircle2 className="h-6 w-6 text-sky-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-sky-600">{t('Task Hoàn thành', 'Completed Tasks')}</p>
                    <p className="text-2xl font-bold text-sky-600 mt-1">{completedTasks.length} / {assignedTasks.length}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <AlertCircle className="h-6 w-6 text-rose-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-rose-600">{t('Task Quá hạn', 'Overdue Tasks')}</p>
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
                <CardTitle>{t('Nhật ký Hoạt động (Audit Log)', 'Activity Audit Log')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {employeeAuditLogs.length === 0 ? (
                  <EmptyState type="no-data" description={t('Chưa ghi nhận hoạt động nhật ký gần đây.', 'No recent activity recorded.')} />
                ) : (
                  employeeAuditLogs.map((log, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/60 bg-surface/50 text-xs flex items-center justify-between">
                      <span className="font-semibold text-text-primary">{log.action || t('Hành động', 'Action')}</span>
                      <span className="text-text-muted text-[11px]">{log.created_at ? formatDate(log.created_at) : t('Vừa xong', 'Just now')}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'hrm' && (
            <EmployeeHrmTabPanel
              employeeId={empId}
              employeeName={employee.full_name}
              canManageOverride={canManageContracts}
            />
          )}
        </div>
      </div>
      {canEditContactDetails && (
        <EmployeeDrawer
          isOpen={isEditDrawerOpen}
          onClose={() => setIsEditDrawerOpen(false)}
          employee={employee}
          departments={departments}
          onSave={handleSaveEmployee}
          isLoading={updateEmployee.isPending}
          contactOnly={!isAdmin}
        />
      )}

      <ContractDetailModal
        isOpen={Boolean(selectedContract)}
        onClose={() => setSelectedContract(null)}
        contract={selectedContract}
        employeeName={employee.full_name}
        canEdit={canManageContracts}
        onEditClick={(contract) => {
          setEditingContract(contract);
          setIsContractFormOpen(true);
        }}
      />

      {canManageContracts && (
        <ContractFormModal
          isOpen={isContractFormOpen}
          onClose={() => {
            setIsContractFormOpen(false);
            setEditingContract(null);
          }}
          contract={editingContract}
          fixedEmployee={{ id: empId, name: employee.full_name }}
          isSubmitting={createContractMutation.isPending || updateContractMutation.isPending}
          onCreate={handleSaveContractCreate}
          onUpdate={handleSaveContractUpdate}
        />
      )}

      {isAdmin && (
        <ResetPasswordModal
          isOpen={isResetPasswordModalOpen}
          onClose={() => setIsResetPasswordModalOpen(false)}
          employee={{
            id: employee.id,
            full_name: employee.full_name,
            email: employee.email,
            employee_code: employee.employee_code,
          }}
        />
      )}
    </div>
  );
};

export default EmployeeDetailPage;

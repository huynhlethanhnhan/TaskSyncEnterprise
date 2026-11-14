import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  UserCheck,
  Undo2,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import api from '../../api/axios';
import VacationFormModal, { type VacationFormData } from './VacationFormModal';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EntityActions, IconActionButton } from '../../components/common/EntityActions';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EmptyState } from '../../components/common/EmptyState';
import { useSettings } from '../../providers/SettingsProvider';
import { useToast } from '../../providers/ToastProvider';
import { useHrmLeaveBalanceMe, useHrmLeaveTaskConflicts } from '../../hooks/useHRM';
import { extractApiError } from '../../utils/errorHelpers';

interface VacationItem {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: string;
  requested_by: number;
  requested_by_name?: string;
}

interface EmployeeSummary {
  id: number;
  full_name: string;
}

export default function VacationPage(): React.ReactElement {
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const toast = useToast();
  const navigate = useNavigate();
  const { t, formatDate, statusLabel } = useSettings();
  const [searchParams] = useSearchParams();

  const [vacations, setVacations] = useState<VacationItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved'>('all');
  const [loading, setLoading] = useState(true);
  const { data: myLeaveBalance, refetch: refetchLeaveBalance } = useHrmLeaveBalanceMe();
  const { data: leaveTaskConflicts = [] } = useHrmLeaveTaskConflicts();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const isManager = currentUser.role === 'manager' || Number(currentUser.role_id) === 2;
  const isAdmin = currentUser.role === 'admin' || Number(currentUser.role_id) === 1;
  const canManagerAction = isManager || isAdmin;

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [vacRes, empRes] = await Promise.all([
        api.get('/vacations').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
      ]);
      setVacations(Array.isArray(vacRes.data) ? vacRes.data : vacRes.data?.data || []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || []);
    } catch {
      toast.error(t('Lỗi kết nối', 'Connection Error'), t('Không thể tải danh sách nghỉ phép.', 'Unable to load leave requests.'));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const refreshVacations = (event: Event) => {
      const customEvent = event as CustomEvent<{ event?: string }>;
      if (["vacation.changed", "employee.changed"].includes(customEvent.detail?.event || "")) {
        loadData();
      }
    };
    window.addEventListener("tasksync:domain-event", refreshVacations);
    return () => window.removeEventListener("tasksync:domain-event", refreshVacations);
  }, [loadData]);

  const handleSave = async (data: VacationFormData) => {
    try {
      await api.post('/vacations', {
        type: data.type,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
        status: 'Pending',
      });
      toast.success(
        t('Gửi đơn nghỉ phép thành công', 'Leave Request Submitted'),
        t('Đơn xin nghỉ đã được gửi tới quản lý.', 'Your leave request has been sent to management.'),
      );
      setIsModalOpen(false);
      loadData();
      refetchLeaveBalance();
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể tạo đơn nghỉ phép.', 'Failed to create leave request.'));
      toast.error(`${t('Gửi đơn thất bại', 'Submission Failed')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    vacationId: number;
    newStatus: string;
    title: string;
    message: string;
  } | null>(null);
  const [vacationToDelete, setVacationToDelete] = useState<VacationItem | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeletingVacation, setIsDeletingVacation] = useState(false);

  const handleUpdateStatus = async (vacationId: number, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/vacations/${vacationId}`, { status: newStatus });
      toast.success(
        t('Cập nhật trạng thái thành công', 'Status Updated'),
        t(
          `Đơn nghỉ phép đã được chuyển sang "${statusLabel(newStatus)}".`,
          `Leave request has been updated to "${statusLabel(newStatus)}".`,
        ),
      );
      loadData();
      refetchLeaveBalance();
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể thay đổi trạng thái đơn nghỉ.', 'Failed to update leave status.'));
      toast.error(`${t('Cập nhật thất bại', 'Update Failed')} [${apiErr.status}]`, apiErr.message);
    } finally {
      setIsUpdatingStatus(false);
      setConfirmModal(null);
    }
  };

  const handleDeleteVacation = async () => {
    if (!vacationToDelete) return;
    setIsDeletingVacation(true);
    try {
      await api.delete(`/vacations/${vacationToDelete.id}`);
      toast.success(
        t('Xóa đơn thành công', 'Leave Request Deleted'),
        t('Đã xóa đơn nghỉ phép khỏi hệ thống.', 'The leave request has been deleted.'),
      );
      loadData();
    } catch (err: any) {
      toast.error(
        t('Xóa thất bại', 'Delete Failed'),
        err?.response?.data?.detail || t('Không thể xóa đơn nghỉ phép.', 'Unable to delete leave request.'),
      );
    } finally {
      setIsDeletingVacation(false);
      setVacationToDelete(null);
    }
  };

  const filteredVacations = useMemo(() => {
    if (filterTab === 'pending') return vacations.filter((v) => v.status === 'Pending' || v.status === 'Manager Approved');
    if (filterTab === 'approved') return vacations.filter((v) => v.status === 'Approved' || v.status === 'HR Approved');
    return vacations;
  }, [vacations, filterTab]);

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('Quản lý Nghỉ phép Doanh nghiệp', 'Leave Management')}
        description={t(
          'Quy trình phê duyệt nghỉ phép đa cấp dành cho Nhân viên, Quản lý và HR',
          'Multi-step leave approval workflow for Staff, Managers, and HR',
        )}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Dashboard', 'Dashboard'), href: '/dashboard' },
              { label: t('Quản lý Nghỉ phép', 'Leave Management') },
            ]}
          />
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            {t('Tạo Yêu cầu Nghỉ', 'New Leave Request')}
          </Button>
        }
      />

      {/* Leave Balance & Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted">{t('Tổng Đơn Nghỉ phép', 'Total Leave Requests')}</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{vacations.length}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{t('Tất cả hồ sơ', 'All submissions')}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-accent text-primary">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted">{t('Đơn Chờ Phê duyệt', 'Pending Requests')}</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {vacations.filter((v) => v.status === 'Pending' || v.status === 'Manager Approved').length}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">{t('Cần xử lý ngay', 'Awaiting review')}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted">{t('Đã Duyệt Chính thức', 'Approved Requests')}</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">
                {vacations.filter((v) => v.status === 'Approved' || v.status === 'HR Approved').length}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">{t('HR / Admin đã duyệt', 'Finalized by HR / Admin')}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted">{t('Đơn Bị Từ Chối', 'Rejected Requests')}</p>
              <p className="text-2xl font-bold text-rose-500 mt-1">
                {vacations.filter((v) => v.status === 'Rejected').length}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">{t('Dữ liệu từ quy trình phê duyệt', 'From approval workflow')}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balance & Leave-Task Conflict Alert (HRM Integration) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card data-testid="vacation-leave-balance-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted">
                {t(
                  `Quỹ phép năm ${myLeaveBalance?.leave_year ?? new Date().getFullYear()} của bạn`,
                  `Your ${myLeaveBalance?.leave_year ?? new Date().getFullYear()} Leave Balance`,
                )}
              </p>
              <p className="text-2xl font-bold text-primary mt-1">
                {myLeaveBalance ? `${myLeaveBalance.remaining_days} ${t('ngày', 'days')}` : '—'}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {t(
                  `Hạn mức ${myLeaveBalance?.annual_entitlement ?? 12} · Đã dùng ${myLeaveBalance?.used_days ?? 0} · Đang giữ chỗ ${myLeaveBalance?.pending_days ?? 0}`,
                  `Quota ${myLeaveBalance?.annual_entitlement ?? 12} · Used ${myLeaveBalance?.used_days ?? 0} · Pending ${myLeaveBalance?.pending_days ?? 0}`,
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  leaveTaskConflicts.length > 0
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-emerald-500/10 text-emerald-500'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary">
                  {leaveTaskConflicts.length > 0
                    ? t(
                        `Cảnh báo ${leaveTaskConflicts.length} xung đột Nghỉ phép & Deadline Task`,
                        `Warning: ${leaveTaskConflicts.length} Leave & Task Deadline Conflicts`,
                      )
                    : t(
                        'Không có xung đột lịch nghỉ phép với deadline công việc',
                        'No leave conflicts with task deadlines',
                      )}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {leaveTaskConflicts.length > 0
                    ? t(
                        `${leaveTaskConflicts[0].employee_name} có task "${leaveTaskConflicts[0].task_title}" trùng kỳ nghỉ.`,
                        `${leaveTaskConflicts[0].employee_name} has task "${leaveTaskConflicts[0].task_title}" overlapping leave.`,
                      )
                    : t(
                        'Hệ thống tự động kiểm tra giao thoa giữa đơn nghỉ phép và Task chưa hoàn thành.',
                        'Automatically checks overlaps between leave requests and open tasks.',
                      )}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/hrm')}>
              {t('Mở Trung tâm HRM', 'Open HRM Hub')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('Danh sách Yêu cầu & Tiến trình Phê duyệt', 'Leave Requests & Approval Workflow')}</CardTitle>
              <CardDescription>{t('Quy trình: Đã gửi ➔ Quản lý Duyệt ➔ HR Duyệt ➔ Hoàn thành', 'Workflow: Submitted ➔ Manager Approved ➔ HR Approved ➔ Completed')}</CardDescription>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-accent/40 border border-border/60">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterTab === 'all' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t(`Tất cả (${vacations.length})`, `All (${vacations.length})`)}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterTab === 'pending' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t('Chờ Duyệt', 'Pending')}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterTab === 'approved' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t('Đã Duyệt', 'Approved')}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-xs text-text-muted">{t('Đang tải dữ liệu nghỉ phép...', 'Loading leave requests...')}</div>
          ) : filteredVacations.length === 0 ? (
            <EmptyState type="no-data" description={t('Chưa có đơn nghỉ phép nào trong danh mục này.', 'No leave requests in this category.')} />
          ) : (
            <div className="space-y-4">
              {filteredVacations.map((vacation) => {
                const requester = employees.find((emp) => Number(emp.id) === Number(vacation.requested_by));
                const requesterName = vacation.requested_by_name || requester?.full_name || t('Nhân sự', 'Employee');
                const isOwner = Number(currentUser.id) === Number(vacation.requested_by);
                const canDeleteVacation =
                  isAdmin || (isOwner && ['Pending', 'Withdrawn', 'Rejected'].includes(vacation.status));

                return (
                  <div key={vacation.id} className="p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors space-y-4">
                    {/* Header & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <h4 className="text-sm font-bold text-text-primary shrink-0">{statusLabel(vacation.type)}</h4>
                          <span className="text-xs text-text-muted truncate max-w-[260px]" title={requesterName}>
                            · {t('Người xin:', 'Requester:')} <strong className="text-text-primary">{requesterName}</strong>
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>
                            {t('Từ', 'From')} <strong>{formatDate(vacation.start_date)}</strong> {t('đến', 'to')} <strong>{formatDate(vacation.end_date)}</strong>
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={vacation.status} />
                        <EntityActions
                          onView={() => navigate(`/vacations/${vacation.id}`)}
                          onDelete={canDeleteVacation ? () => setVacationToDelete(vacation) : undefined}
                        />
                      </div>
                    </div>

                    {/* Step Approval Timeline Bar */}
                    <div className="p-3 rounded-lg bg-secondary/40 dark:bg-slate-900/60 border border-border/60">
                      <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {t('1. Đã Gửi đơn', '1. Submitted')}
                        </span>
                        <span className={`flex items-center gap-1 ${vacation.status === 'Manager Approved' || vacation.status === 'HR Approved' || vacation.status === 'Approved' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          <UserCheck className="h-3.5 w-3.5" /> {t('2. Manager Phê duyệt', '2. Manager Approval')}
                        </span>
                        <span className={`flex items-center gap-1 ${vacation.status === 'HR Approved' || vacation.status === 'Approved' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          <FileCheck className="h-3.5 w-3.5" /> {t('3. HR Hoàn tất', '3. HR Finalized')}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons based on Role */}
                    <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-3 gap-2">
                      <p
                        className="text-xs text-text-secondary italic truncate min-w-0 flex-1"
                        title={vacation.reason || t('Không có lý do chi tiết', 'No detailed reason')}
                      >
                        {t('Lý do:', 'Reason:')} "{vacation.reason || t('Không có lý do chi tiết', 'No detailed reason')}"
                      </p>

                      <div className="flex items-center gap-1.5">
                        {/* Employee withdraw action */}
                        {isOwner && (vacation.status === 'Pending' || vacation.status === 'Info Requested' || vacation.status === 'Manager Approved') && (
                          <IconActionButton
                            tone="outline"
                            icon={<Undo2 className="h-3.5 w-3.5" aria-hidden="true" />}
                            label={t('Rút Đơn', 'Withdraw')}
                            onClick={() =>
                              setConfirmModal({
                                vacationId: vacation.id,
                                newStatus: 'Withdrawn',
                                title: t('Rút lại đơn nghỉ phép', 'Withdraw Leave Request'),
                                message: t(
                                  'Bạn có chắc chắn muốn rút lại đơn nghỉ phép này? Quá trình phê duyệt sẽ được hủy bỏ.',
                                  'Are you sure you want to withdraw this leave request? The approval flow will be cancelled.',
                                ),
                              })
                            }
                          />
                        )}

                        {/* Manager approval actions (blocked for self-approval to mirror backend RBAC) */}
                        {canManagerAction && !isOwner && vacation.status === 'Pending' && (
                          <>
                            <IconActionButton
                              tone="warning"
                              icon={<HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('Yêu cầu bổ sung TT', 'Request Info')}
                              onClick={() => handleUpdateStatus(vacation.id, 'Info Requested')}
                            />
                            <IconActionButton
                              tone="primary"
                              icon={<UserCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('Manager Duyệt', 'Manager Approve')}
                              onClick={() => handleUpdateStatus(vacation.id, 'Manager Approved')}
                            />
                          </>
                        )}

                        {/* Manager revoke approval action */}
                        {canManagerAction && vacation.status === 'Manager Approved' && (
                          <IconActionButton
                            tone="warning"
                            icon={<Undo2 className="h-3.5 w-3.5" aria-hidden="true" />}
                            label={t('Thu hồi duyệt', 'Revoke Approval')}
                            onClick={() =>
                              setConfirmModal({
                                vacationId: vacation.id,
                                newStatus: 'Pending',
                                title: t('Thu hồi phê duyệt Manager', 'Revoke Manager Approval'),
                                message: t(
                                  'Bạn có chắc muốn thu hồi phê duyệt cho đơn này? Đơn sẽ quay trở lại trạng thái Chờ duyệt (Pending) để xem xét lại.',
                                  'Are you sure you want to revoke your approval? The request will return to Pending.',
                                ),
                              })
                            }
                          />
                        )}

                        {/* HR/Admin final approval actions */}
                        {isAdmin && (vacation.status === 'Pending' || vacation.status === 'Manager Approved') && (
                          <>
                            <IconActionButton
                              tone="danger"
                              icon={<XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('Từ chối', 'Reject')}
                              onClick={() =>
                                setConfirmModal({
                                  vacationId: vacation.id,
                                  newStatus: 'Rejected',
                                  title: t('Từ chối đơn nghỉ phép', 'Reject Leave Request'),
                                  message: t('Bạn có chắc chắn muốn từ chối đơn nghỉ phép này?', 'Are you sure you want to reject this leave request?'),
                                })
                              }
                            />
                            <IconActionButton
                              tone="success"
                              icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                              label={t('HR Duyệt Cuối', 'HR Approve')}
                              onClick={() => handleUpdateStatus(vacation.id, 'HR Approved')}
                            />
                          </>
                        )}

                        {/* HR/Admin revoke actions */}
                        {isAdmin && (vacation.status === 'HR Approved' || vacation.status === 'Rejected') && (
                          <IconActionButton
                            tone="warning"
                            icon={<Undo2 className="h-3.5 w-3.5" aria-hidden="true" />}
                            label={t('Thu hồi duyệt', 'Revoke Decision')}
                            onClick={() =>
                              setConfirmModal({
                                vacationId: vacation.id,
                                newStatus: 'Pending',
                                title: t('Thu hồi quyết định HR', 'Revoke HR Decision'),
                                message: t(
                                  'Bạn có chắc muốn thu hồi quyết định này? Đơn sẽ quay trở về trạng thái Chờ duyệt (Pending).',
                                  'Are you sure you want to revoke this HR decision? The request will return to Pending.',
                                ),
                              })
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <VacationFormModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} initialData={null} />

      {/* Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(confirmModal)}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.title || t('Xác nhận', 'Confirm')}
        message={confirmModal?.message || ''}
        confirmText={t('Xác nhận', 'Confirm')}
        onConfirm={() => {
          if (confirmModal) {
            handleUpdateStatus(confirmModal.vacationId, confirmModal.newStatus);
          }
        }}
        isLoading={isUpdatingStatus}
      />

      {/* Delete Vacation Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(vacationToDelete)}
        onClose={() => setVacationToDelete(null)}
        title={t('Xóa đơn nghỉ phép', 'Delete Leave Request')}
        message={t(
          `Bạn có chắc chắn muốn xóa vĩnh viễn đơn nghỉ phép (${vacationToDelete?.type}) của ${vacationToDelete?.requested_by_name || 'nhân viên'}?`,
          `Are you sure you want to permanently delete ${vacationToDelete?.requested_by_name || 'the employee'}'s leave request (${vacationToDelete?.type})?`,
        )}
        confirmText={t('Xóa', 'Delete')}
        onConfirm={handleDeleteVacation}
        isLoading={isDeletingVacation}
      />
    </div>
  );
}

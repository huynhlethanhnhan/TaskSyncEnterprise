import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  UserCheck,
  XCircle,
  HelpCircle,
  Undo2,
  FileCheck,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import api from '../../api/axios';
import VacationFormModal, { type VacationFormData } from './VacationFormModal';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../providers/ToastProvider';

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

const STATUS_BADGES: Record<
  string,
  { variant: 'warning' | 'primary' | 'success' | 'danger' | 'outline' | 'default'; label: string; icon: React.ReactNode }
> = {
  Pending: { variant: 'warning', label: 'Chờ duyệt', icon: <Clock className="h-3 w-3" /> },
  'Manager Approved': { variant: 'primary', label: 'Manager Đã Duyệt', icon: <UserCheck className="h-3 w-3" /> },
  'HR Approved': { variant: 'success', label: 'HR Đã Duyệt', icon: <CheckCircle2 className="h-3 w-3" /> },
  Approved: { variant: 'success', label: 'Đã Duyệt', icon: <CheckCircle2 className="h-3 w-3" /> },
  Rejected: { variant: 'danger', label: 'Từ chối', icon: <XCircle className="h-3 w-3" /> },
  InfoRequested: { variant: 'outline', label: 'Cần bổ sung TT', icon: <HelpCircle className="h-3 w-3" /> },
  'Info Requested': { variant: 'outline', label: 'Cần bổ sung TT', icon: <HelpCircle className="h-3 w-3" /> },
  Withdrawn: { variant: 'default', label: 'Đã rút đơn', icon: <Undo2 className="h-3 w-3" /> },
  Cancelled: { variant: 'default', label: 'Hủy đơn', icon: <Undo2 className="h-3 w-3" /> },
};

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
  const [searchParams] = useSearchParams();

  const [vacations, setVacations] = useState<VacationItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved'>('all');
  const [loading, setLoading] = useState(true);

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
      toast.error('Lỗi kết nối', 'Không thể tải danh sách nghỉ phép.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      toast.success('Gửi đơn nghỉ phép thành công', 'Đơn xin nghỉ đã được gửi tới quản lý.');
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error('Gửi đơn thất bại', 'Không thể tạo đơn nghỉ phép.');
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
      toast.success('Cập nhật trạng thái thành công', `Đơn nghỉ phép đã được chuyển sang "${newStatus}".`);
      loadData();
    } catch {
      toast.error('Cập nhật thất bại', 'Không thể thay đổi trạng thái đơn nghỉ.');
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
      toast.success('Xóa đơn thành công', 'Đã xóa đơn nghỉ phép khỏi hệ thống.');
      loadData();
    } catch (err: any) {
      toast.error('Xóa thất bại', err?.response?.data?.detail || 'Không thể xóa đơn nghỉ phép.');
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
        title="Quản lý Nghỉ phép Doanh nghiệp (Leave Management)"
        description="Quy trình phê duyệt nghỉ phép đa cấp dành cho Nhân viên, Quản lý và HR"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Quản lý Nghỉ phép' },
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
            Tạo Yêu cầu Nghỉ
          </Button>
        }
      />

      {/* Leave Balance & Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted">Tổng Đơn Nghỉ phép</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{vacations.length}</p>
              <p className="text-[10px] text-text-muted mt-0.5">Tất cả hồ sơ</p>
            </div>
            <div className="p-2.5 rounded-xl bg-accent text-primary">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted">Đơn Chờ Phê duyệt</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {vacations.filter((v) => v.status === 'Pending' || v.status === 'Manager Approved').length}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">Cần xử lý ngay</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted">Đã Duyệt Chính thức</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">
                {vacations.filter((v) => v.status === 'Approved' || v.status === 'HR Approved').length}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">HR / Admin đã duyệt</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted">Đơn Bị Từ Chối</p>
              <p className="text-2xl font-bold text-rose-500 mt-1">
                {vacations.filter((v) => v.status === 'Rejected').length}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">Dữ liệu từ quy trình phê duyệt</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Danh sách Yêu cầu & Tiến trình Phê duyệt</CardTitle>
              <CardDescription>Quy trình: Đã gửi ➔ Quản lý Duyệt ➔ HR Duyệt ➔ Hoàn thành</CardDescription>
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
                Tất cả ({vacations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterTab === 'pending' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Chờ Duyệt
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterTab === 'approved' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Đã Duyệt
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-xs text-text-muted">Đang tải dữ liệu nghỉ phép...</div>
          ) : filteredVacations.length === 0 ? (
            <EmptyState type="no-data" description="Chưa có đơn nghỉ phép nào trong danh mục này." />
          ) : (
            <div className="space-y-4">
              {filteredVacations.map((vacation) => {
                const requester = employees.find((emp) => Number(emp.id) === Number(vacation.requested_by));
                const requesterName = vacation.requested_by_name || requester?.full_name || 'Nhân sự';
                const statusInfo = STATUS_BADGES[vacation.status] || { variant: 'default', label: vacation.status, icon: null };
                const isOwner = Number(currentUser.id) === Number(vacation.requested_by);

                return (
                  <div key={vacation.id} className="p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors space-y-4">
                    {/* Header & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-text-primary">{vacation.type}</h4>
                          <span className="text-xs text-text-muted">· Người xin: <strong className="text-text-primary">{requesterName}</strong></span>
                        </div>
                        <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>Từ <strong>{vacation.start_date}</strong> đến <strong>{vacation.end_date}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={statusInfo.variant} showDot>
                          <span className="flex items-center gap-1">{statusInfo.icon} {statusInfo.label}</span>
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/vacations/${vacation.id}`)}>
                          Chi tiết
                        </Button>
                      </div>
                    </div>

                    {/* Step Approval Timeline Bar */}
                    <div className="p-3 rounded-lg bg-accent/20 border border-border/60">
                      <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> 1. Đã Gửi đơn
                        </span>
                        <span className={`flex items-center gap-1 ${vacation.status === 'Manager Approved' || vacation.status === 'HR Approved' || vacation.status === 'Approved' ? 'text-emerald-600 font-semibold' : ''}`}>
                          <UserCheck className="h-3.5 w-3.5" /> 2. Manager Phê duyệt
                        </span>
                        <span className={`flex items-center gap-1 ${vacation.status === 'HR Approved' || vacation.status === 'Approved' ? 'text-emerald-600 font-semibold' : ''}`}>
                          <FileCheck className="h-3.5 w-3.5" /> 3. HR Hoàn tất
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons based on Role */}
                    <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-3 gap-2">
                      <p className="text-xs text-text-secondary italic truncate max-w-lg">
                        Lý do: "{vacation.reason || 'Không có lý do chi tiết'}"
                      </p>

                      <div className="flex items-center gap-2">
                        {/* Employee withdraw action */}
                        {isOwner && (vacation.status === 'Pending' || vacation.status === 'Info Requested' || vacation.status === 'Manager Approved') && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                            onClick={() =>
                              setConfirmModal({
                                vacationId: vacation.id,
                                newStatus: 'Withdrawn',
                                title: 'Rút lại đơn nghỉ phép',
                                message: 'Bạn có chắc chắn muốn rút lại đơn nghỉ phép này? Quá trình phê duyệt sẽ được hủy bỏ.',
                              })
                            }
                          >
                            Rút Đơn
                          </Button>
                        )}

                        {/* Manager approval actions */}
                        {canManagerAction && vacation.status === 'Pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(vacation.id, 'Info Requested')}
                            >
                              Yêu cầu bổ sung TT
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleUpdateStatus(vacation.id, 'Manager Approved')}
                            >
                              Manager Duyệt
                            </Button>
                          </>
                        )}

                        {/* Manager revoke approval action */}
                        {canManagerAction && vacation.status === 'Manager Approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                            className="border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                            onClick={() =>
                              setConfirmModal({
                                vacationId: vacation.id,
                                newStatus: 'Pending',
                                title: 'Thu hồi phê duyệt Manager',
                                message: 'Bạn có chắc muốn thu hồi phê duyệt cho đơn này? Đơn sẽ quay trở lại trạng thái Chờ duyệt (Pending) để xem xét lại.',
                              })
                            }
                          >
                            Thu hồi duyệt
                          </Button>
                        )}

                        {/* HR/Admin final approval actions */}
                        {isAdmin && (vacation.status === 'Pending' || vacation.status === 'Manager Approved') && (
                          <>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                setConfirmModal({
                                  vacationId: vacation.id,
                                  newStatus: 'Rejected',
                                  title: 'Từ chối đơn nghỉ phép',
                                  message: 'Bạn có chắc chắn muốn từ chối đơn nghỉ phép này?',
                                })
                              }
                            >
                              Từ chối
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                              onClick={() => handleUpdateStatus(vacation.id, 'HR Approved')}
                            >
                              HR Duyệt Cuối
                            </Button>
                          </>
                        )}

                        {/* HR/Admin revoke actions */}
                        {isAdmin && (vacation.status === 'HR Approved' || vacation.status === 'Rejected') && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                            className="border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                            onClick={() =>
                              setConfirmModal({
                                vacationId: vacation.id,
                                newStatus: 'Pending',
                                title: 'Thu hồi quyết định HR',
                                message: 'Bạn có chắc muốn thu hồi quyết định này? Đơn sẽ quay trở về trạng thái Chờ duyệt (Pending).',
                              })
                            }
                          >
                            Thu hồi duyệt
                          </Button>
                        )}

                        {/* Delete Vacation button (Admin or Owner if Pending/Withdrawn/Rejected) */}
                        {(isAdmin || (isOwner && ['Pending', 'Withdrawn', 'Rejected'].includes(vacation.status))) && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            className="border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 dark:border-rose-950/20"
                            onClick={() => setVacationToDelete(vacation)}
                            title="Xóa đơn nghỉ phép"
                          >
                            Xóa đơn
                          </Button>
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
        title={confirmModal?.title || 'Xác nhận'}
        message={confirmModal?.message || ''}
        confirmText="Xác nhận"
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
        title="Xóa đơn nghỉ phép"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn đơn nghỉ phép (${vacationToDelete?.type}) của ${vacationToDelete?.requested_by_name || 'nhân viên'}?`}
        confirmText="Xóa đơn"
        onConfirm={handleDeleteVacation}
        isLoading={isDeletingVacation}
      />
    </div>
  );
}

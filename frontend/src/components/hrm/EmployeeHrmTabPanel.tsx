import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DollarSign, FileSignature, FileText, Plus, ShieldAlert, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { EntityActions } from '../common/EntityActions';
import { Button } from '../ui/Button';
import { DataTableWrapper } from '../data-display/DataTableWrapper';
import {
  ContractDetailModal,
  ContractFormModal,
  formatTimeHHMM,
  formatVndCurrency,
  getContractTypeLabel,
  PayrollDetailModal,
} from './HrmModals';
import {
  useCreateContract,
  useHrmAttendance,
  useHrmContracts,
  useHrmLeaveBalances,
  useHrmPayrolls,
  useUpdateContract,
  useUpdatePayroll,
  useUpdatePayrollStatus,
} from '../../hooks/useHRM';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { useToast } from '../../providers/ToastProvider';
import { extractApiError } from '../../utils/errorHelpers';
import { GLOBAL_ACTION_TEXT } from '../../utils/globalLabels';
import {
  type AttendanceLogItem,
  type EmploymentContractCreatePayload,
  type EmploymentContractItem,
  type EmploymentContractUpdatePayload,
  type PayrollItem,
  type PayrollUpdatePayload,
} from '../../api/services';

export interface EmployeeHrmTabPanelProps {
  employeeId: number;
  employeeName: string;
  canManageOverride?: boolean;
}

const AuthorizedEmployeeHrmContent: React.FC<{
  employeeId: number;
  employeeName: string;
  isAdmin: boolean;
  canManage: boolean;
  canManageContracts: boolean;
  isSelf: boolean;
}> = ({ employeeId, employeeName, isAdmin, canManage, canManageContracts, isSelf }) => {
  const { formatDate, t, statusLabel, isEnglish } = useSettings();
  const toast = useToast();

  const { data: contracts = [], isLoading: contractsLoading } = useHrmContracts({ employee_id: employeeId });
  const { data: leaveBalances = [] } = useHrmLeaveBalances({ employee_id: employeeId });
  const { data: attendance = [], isLoading: attendanceLoading } = useHrmAttendance({
    employee_id: employeeId,
    limit: 15,
  });
  const { data: payrolls = [], isLoading: payrollsLoading } = useHrmPayrolls({ employee_id: employeeId });

  const createContractMutation = useCreateContract();
  const updateContractMutation = useUpdateContract();
  const updatePayrollMutation = useUpdatePayroll();
  const updatePayrollStatusMutation = useUpdatePayrollStatus();

  const [selectedContract, setSelectedContract] = React.useState<EmploymentContractItem | null>(null);
  const [editingContract, setEditingContract] = React.useState<EmploymentContractItem | null>(null);
  const [isContractFormOpen, setIsContractFormOpen] = React.useState(false);
  const [selectedPayroll, setSelectedPayroll] = React.useState<PayrollItem | null>(null);

  const activeBalance = leaveBalances[0];

  const contractColumns = React.useMemo<ColumnDef<EmploymentContractItem, unknown>[]>(
    () => [
      {
        accessorKey: 'contract_code',
        header: t('Mã HĐ', 'Code'),
        cell: ({ row }) => <span className="font-mono font-semibold text-primary">{row.original.contract_code}</span>,
      },
      {
        accessorKey: 'contract_type',
        header: t('Loại hợp đồng', 'Type'),
        cell: ({ row }) => <span>{getContractTypeLabel(row.original.contract_type, isEnglish)}</span>,
      },
      {
        id: 'salary',
        header: t('Lương cơ bản', 'Base Salary'),
        cell: ({ row }) => <span className="font-semibold">{formatVndCurrency(row.original.base_salary, row.original.currency)}</span>,
      },
      {
        id: 'dates',
        header: t('Hiệu lực', 'Effective'),
        cell: ({ row }) => (
          <span>
            {formatDate(row.original.start_date)} → {row.original.end_date ? formatDate(row.original.end_date) : t('Vô thời hạn', 'Indefinite')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('Trạng thái', 'Status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: t(GLOBAL_ACTION_TEXT.actionsHeader.vi, GLOBAL_ACTION_TEXT.actionsHeader.en),
        cell: ({ row }) => (
          <EntityActions
            align="center"
            onView={() => setSelectedContract(row.original)}
            onEdit={
              canManageContracts
                ? () => {
                    setEditingContract(row.original);
                    setIsContractFormOpen(true);
                  }
                : undefined
            }
          />
        ),
      },
    ],
    [canManageContracts, formatDate, isEnglish, t],
  );

  const payrollColumns = React.useMemo<ColumnDef<PayrollItem, unknown>[]>(
    () => [
      {
        accessorKey: 'pay_period',
        header: t('Kỳ lương', 'Period'),
        cell: ({ row }) => <span className="font-mono font-semibold">{row.original.pay_period}</span>,
      },
      {
        id: 'work_days',
        header: t('Công / OT', 'Work / OT'),
        cell: ({ row }) => (
          <span>
            {row.original.actual_work_days}/{row.original.standard_work_days} {t('ngày', 'd')} · {row.original.overtime_hours}h OT
          </span>
        ),
      },
      {
        accessorKey: 'net_salary',
        header: t('Thực lĩnh (Net)', 'Net Salary'),
        cell: ({ row }) => <span className="font-bold text-primary">{formatVndCurrency(row.original.net_salary, row.original.currency)}</span>,
      },
      {
        accessorKey: 'status',
        header: t('Trạng thái', 'Status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: t(GLOBAL_ACTION_TEXT.actionsHeader.vi, GLOBAL_ACTION_TEXT.actionsHeader.en),
        cell: ({ row }) => (
          <Button variant="outline" size="sm" leftIcon={<FileText className="h-3.5 w-3.5" />} onClick={() => setSelectedPayroll(row.original)}>
            {t('Phiếu lương', 'Payslip')}
          </Button>
        ),
      },
    ],
    [t],
  );

  const attendanceColumns = React.useMemo<ColumnDef<AttendanceLogItem, unknown>[]>(
    () => [
      {
        accessorKey: 'work_date',
        header: t('Ngày', 'Date'),
        cell: ({ row }) => <span className="font-mono">{formatDate(row.original.work_date)}</span>,
      },
      {
        accessorKey: 'status',
        header: t('Trạng thái', 'Status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'in_out',
        header: 'In / Out',
        cell: ({ row }) => (
          <span className="font-mono text-text-muted">
            {formatTimeHHMM(row.original.check_in) || '—'} → {formatTimeHHMM(row.original.check_out) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'work_hours',
        header: t('Giờ làm / OT', 'Work / OT'),
        cell: ({ row }) => (
          <span>
            {Number(row.original.work_hours || 0).toFixed(2)}h / {Number(row.original.overtime_hours || 0).toFixed(2)}h OT
          </span>
        ),
      },
    ],
    [formatDate, t],
  );

  const handleUpdatePayroll = async (payrollId: number, payload: PayrollUpdatePayload) => {
    try {
      const updated = await updatePayrollMutation.mutateAsync({ payrollId, payload });
      setSelectedPayroll(updated);
      toast.success(t('Đã cập nhật phiếu lương', 'Payslip Updated'), t('Số liệu thực lĩnh đã được tính lại.', 'Net salary recalculated.'));
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể điều chỉnh phiếu lương.', 'Unable to update payslip.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleSaveContractCreate = async (payload: EmploymentContractCreatePayload) => {
    try {
      await createContractMutation.mutateAsync(payload);
      toast.success(
        t('Phát hành hợp đồng thành công', 'Contract Issued'),
        t(`Hợp đồng ${payload.contract_code} đã được lưu cho ${employeeName}.`, `Contract ${payload.contract_code} saved for ${employeeName}.`),
      );
      setIsContractFormOpen(false);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể phát hành hợp đồng lao động.', 'Failed to create contract.'));
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
      const apiErr = extractApiError(err, t('Không thể cập nhật hợp đồng lao động.', 'Failed to update contract.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleUpdatePayrollStatus = async (payrollId: number, status: 'Confirmed' | 'Paid') => {
    try {
      const updated = await updatePayrollStatusMutation.mutateAsync({ payrollId, status });
      setSelectedPayroll(updated);
      toast.success(
        t('Cập nhật trạng thái', 'Status Updated'),
        t(`Phiếu lương đã chuyển sang ${statusLabel(status)}.`, `Payslip status updated to ${statusLabel(status)}.`),
      );
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể chuyển trạng thái.', 'Unable to update status.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-text-muted">{t('Quỹ phép còn lại', 'Remaining Leave')}</p>
              <p className="text-xl font-bold text-primary mt-1">{activeBalance ? `${activeBalance.remaining_days} ${t('ngày', 'days')}` : '—'}</p>
            </div>
            <Wallet className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-text-muted">{t('Hợp đồng đang hiệu lực', 'Contracts Count')}</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {contracts.filter((c) => c.status === 'Active').length}
              </p>
            </div>
            <FileSignature className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-text-muted">{t('Số kỳ lương đã ghi nhận', 'Payroll Records')}</p>
              <p className="text-xl font-bold text-text-primary mt-1">{payrolls.length}</p>
            </div>
            <DollarSign className="h-5 w-5 text-indigo-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>{t('Hợp đồng Lao động', 'Employment Contracts')}</CardTitle>
            <CardDescription>{t('Danh sách hợp đồng ký kết với nhân sự', 'Recorded contracts for this employee')}</CardDescription>
          </div>
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
              {t('Phát hành hợp đồng', 'Issue Contract')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <DataTableWrapper
            columns={contractColumns}
            data={contracts}
            isLoading={contractsLoading}
            emptyDescription={t('Nhân sự này chưa có hợp đồng lao động.', 'No employment contracts recorded for this employee.')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Lịch sử Bảng lương (Payslips)', 'Payroll History')}</CardTitle>
          <CardDescription>{t('Nhấp "Phiếu lương" để xem chi tiết từng khoản thu nhập & khấu trừ', 'Inspect full breakdown per pay period')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTableWrapper
            columns={payrollColumns}
            data={payrolls}
            isLoading={payrollsLoading}
            emptyDescription={t('Chưa có phiếu lương nào được tính cho nhân sự này.', 'No payslips calculated for this employee yet.')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Chấm công gần đây', 'Recent Attendance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTableWrapper
            columns={attendanceColumns}
            data={attendance}
            isLoading={attendanceLoading}
            emptyDescription={t('Chưa có dữ liệu chấm công gần đây.', 'No recent attendance records found.')}
          />
        </CardContent>
      </Card>

      <ContractDetailModal
        isOpen={Boolean(selectedContract)}
        onClose={() => setSelectedContract(null)}
        contract={selectedContract}
        employeeName={employeeName}
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
          fixedEmployee={{ id: employeeId, name: employeeName }}
          isSubmitting={createContractMutation.isPending || updateContractMutation.isPending}
          onCreate={handleSaveContractCreate}
          onUpdate={handleSaveContractUpdate}
        />
      )}

      <PayrollDetailModal
        isOpen={Boolean(selectedPayroll)}
        onClose={() => setSelectedPayroll(null)}
        payroll={selectedPayroll}
        employeeName={employeeName}
        canManage={canManage}
        canMarkPaid={isAdmin}
        isSelf={isSelf}
        isSubmitting={updatePayrollMutation.isPending || updatePayrollStatusMutation.isPending}
        onUpdate={handleUpdatePayroll}
        onUpdateStatus={handleUpdatePayrollStatus}
      />
    </div>
  );
};

export const EmployeeHrmTabPanel: React.FC<EmployeeHrmTabPanelProps> = ({
  employeeId,
  employeeName,
  canManageOverride,
}) => {
  const { user } = useAuth();
  const { t } = useSettings();
  const roleStr = (user?.role || '').toLowerCase();
  const roleId = Number(user?.role_id);
  const isAdmin = roleStr === 'admin' || roleId === 1;
  const isManager = roleStr === 'manager' || roleId === 2;
  const isSelf = Number(user?.id) === employeeId;
  const canViewHrm = isAdmin || isManager || isSelf;
  const canManageContracts =
    canManageOverride !== undefined ? canManageOverride : isAdmin || (isManager && !isSelf);

  if (!canViewHrm) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-sm font-semibold text-text-primary">
            {t('Dữ liệu Hợp đồng & Lương được bảo mật', 'Protected HRM & Compensation Data')}
          </p>
          <p className="text-xs text-text-muted">
            {t(
              'Chỉ Quản trị viên, Quản lý trực tiếp hoặc chính nhân sự này mới có quyền xem thông tin Hợp đồng và Bảng lương.',
              'Only Admin, authorized Managers, or the employee themselves can access Contract and Payroll records.',
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AuthorizedEmployeeHrmContent
      employeeId={employeeId}
      employeeName={employeeName}
      isAdmin={isAdmin}
      canManage={isAdmin || isManager}
      canManageContracts={canManageContracts}
      isSelf={isSelf}
    />
  );
};

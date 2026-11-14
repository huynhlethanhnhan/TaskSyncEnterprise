import * as React from 'react';
import {
  BadgeCheck,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSignature,
  Pencil,
  UserPlus,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MonthYearSelect } from '../ui/MonthYearSelect';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import {
  type AttendanceLogItem,
  type AttendanceUpdatePayload,
  type CandidateCreatePayload,
  type CandidateItem,
  type CandidateOnboardPayload,
  type EmploymentContractCreatePayload,
  type EmploymentContractItem,
  type EmploymentContractUpdatePayload,
  type OvertimeRequestItem,
  type PayrollItem,
  type PayrollUpdatePayload,
} from '../../api/services';
import { useSettings } from '../../providers/SettingsProvider';

export const formatVndCurrency = (val: number | string | null | undefined, currency = 'VND'): string => {
  const numeric = Number(val || 0);
  if (!Number.isFinite(numeric)) return `0 ${currency}`;
  return `${numeric.toLocaleString('vi-VN')} ${currency}`;
};

export const formatTimeHHMMSS = (val?: string | null): string => {
  if (!val) return '';
  if (val.includes('T')) {
    return val.split('T')[1]?.slice(0, 8) || '';
  }
  const timeMatch = val.match(/\d{2}:\d{2}(?::\d{2})?/);
  if (!timeMatch) return '';
  return timeMatch[0].length === 5 ? `${timeMatch[0]}:00` : timeMatch[0];
};

export const formatTimeHHMM = (val?: string | null): string => {
  const full = formatTimeHHMMSS(val);
  return full ? full.slice(0, 5) : '';
};

const normalizeTimePayload = (hhmm: string): string | null => {
  const cleanTime = hhmm.trim();
  if (!cleanTime) return null;
  return cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime.slice(0, 8);
};

/* -------------------------------------------------------------------------- */
/* 1. ATTENDANCE DETAIL & EDIT MODAL                                          */
/* -------------------------------------------------------------------------- */
export interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: AttendanceLogItem | null;
  employeeName: string;
  canEdit: boolean;
  initialEditMode?: boolean;
  isSubmitting: boolean;
  onSave: (_attendanceId: number, _payload: AttendanceUpdatePayload) => Promise<void>;
}

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  attendance,
  employeeName,
  canEdit,
  initialEditMode = false,
  isSubmitting,
  onSave,
}) => {
  const { formatDate, t } = useSettings();
  const [editMode, setEditMode] = React.useState(false);
  const [status, setStatus] = React.useState<NonNullable<AttendanceUpdatePayload['status']>>('Present');
  const [checkInTime, setCheckInTime] = React.useState('');
  const [checkOutTime, setCheckOutTime] = React.useState('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (attendance) {
      setStatus((attendance.status as NonNullable<AttendanceUpdatePayload['status']>) || 'Present');
      setCheckInTime(formatTimeHHMM(attendance.check_in));
      setCheckOutTime(formatTimeHHMM(attendance.check_out));
      setNote(attendance.note || '');
      setEditMode(Boolean(initialEditMode && canEdit));
    }
  }, [attendance, isOpen, initialEditMode, canEdit]);

  if (!attendance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(attendance.id, {
      status,
      check_in: normalizeTimePayload(checkInTime),
      check_out: normalizeTimePayload(checkOutTime),
      note: note.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(`Chi tiết Chấm công #${attendance.id}`, `Attendance Detail #${attendance.id}`)}
      description={`${employeeName} · ${formatDate(attendance.work_date)}`}
    >
      {!editMode ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Nhân sự', 'Employee')}</span>
              <span className="font-bold text-text-primary mt-0.5 block">{employeeName}</span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Trạng thái', 'Status')}</span>
              <div className="mt-1">
                <StatusBadge status={attendance.status} />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">Check-in</span>
              <span className="font-mono font-semibold text-text-primary mt-0.5 block">
                {formatTimeHHMMSS(attendance.check_in) || '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">Check-out</span>
              <span className="font-mono font-semibold text-text-primary mt-0.5 block">
                {formatTimeHHMMSS(attendance.check_out) || '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Giờ làm ghi nhận', 'Work Hours')}</span>
              <span className="font-bold text-primary mt-0.5 block">{Number(attendance.work_hours || 0).toFixed(2)}h</span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Giờ tăng ca (OT)', 'Overtime Hours')}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                {Number(attendance.overtime_hours || 0).toFixed(2)}h
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-accent/20 border border-border text-xs">
            <span className="text-text-muted block font-medium">{t('Ghi chú chấm công', 'Attendance Note')}</span>
            <p className="text-text-primary mt-1">{attendance.note || t('Không có ghi chú', 'No note recorded')}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Đóng', 'Close')}
            </Button>
            {canEdit && (
              <Button type="button" variant="primary" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditMode(true)}>
                {t('Chỉnh sửa giờ công', 'Adjust Working Time')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('Trạng thái chấm công', 'Attendance Status')}
            value={status}
            onChange={(e) => setStatus(e.target.value as NonNullable<AttendanceUpdatePayload['status']>)}
            options={[
              { value: 'Present', label: t('Tại văn phòng (Present)', 'Present') },
              { value: 'Remote', label: t('Làm từ xa (Remote)', 'Remote') },
              { value: 'Late', label: t('Đi muộn (Late)', 'Late') },
              { value: 'Half-Day', label: t('Nửa ngày (Half-Day)', 'Half-Day') },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('Giờ Check-in (HH:mm)', 'Check-in Time')}
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              required
            />
            <div className="space-y-1.5">
              <Input
                label={t('Giờ Check-out (HH:mm)', 'Check-out Time')}
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
              {checkOutTime && (
                <button
                  type="button"
                  onClick={() => setCheckOutTime('')}
                  className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {t('Xóa giờ Check-out (hoàn tác nếu bấm nhầm)', 'Clear Check-out (undo accidental click)')}
                </button>
              )}
            </div>
          </div>
          <Textarea
            label={t('Lý do điều chỉnh giờ công', 'Adjustment Reason / Note')}
            placeholder={t('Ví dụ: Quên check-out, xác nhận lại giờ tan ca thực tế...', 'Reason for time adjustment...')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
              {t('Quay lại', 'Back')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {t('Lưu & Tính lại giờ', 'Save & Recompute')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. OVERTIME DETAIL & EDIT MODAL                                            */
/* -------------------------------------------------------------------------- */
export interface OvertimeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  overtime: OvertimeRequestItem | null;
  employeeName: string;
  projectOptions: { value: string; label: string }[];
  canEdit: boolean;
  isSubmitting: boolean;
  onSave: (_overtimeId: number, _payload: { project_id?: number | null; work_date?: string; hours?: number; reason?: string }) => Promise<void>;
}

export const OvertimeDetailModal: React.FC<OvertimeDetailModalProps> = ({
  isOpen,
  onClose,
  overtime,
  employeeName,
  projectOptions,
  canEdit,
  isSubmitting,
  onSave,
}) => {
  const { formatDate, t } = useSettings();
  const [editMode, setEditMode] = React.useState(false);
  const [projectId, setProjectId] = React.useState('');
  const [workDate, setWorkDate] = React.useState('');
  const [hours, setHours] = React.useState('2');
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (overtime) {
      setProjectId(overtime.project_id ? String(overtime.project_id) : '');
      setWorkDate(overtime.work_date);
      setHours(String(overtime.hours));
      setReason(overtime.reason || '');
      setEditMode(false);
    }
  }, [overtime, isOpen]);

  if (!overtime) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(overtime.id, {
      project_id: projectId ? Number(projectId) : null,
      work_date: workDate,
      hours: Number(hours),
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(`Chi tiết Phiếu Tăng ca #${overtime.id}`, `Overtime Detail #${overtime.id}`)}
      description={`${employeeName} · ${formatDate(overtime.work_date)}`}
    >
      {!editMode ? (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Nhân sự', 'Employee')}</span>
              <span className="font-bold text-text-primary mt-0.5 block">{employeeName}</span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Trạng thái duyệt', 'Approval Status')}</span>
              <div className="mt-1">
                <StatusBadge status={overtime.status} />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Ngày làm thêm', 'Work Date')}</span>
              <span className="font-semibold text-text-primary mt-0.5 block">{formatDate(overtime.work_date)}</span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Số giờ OT', 'OT Hours')}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{overtime.hours}h</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-accent/20 border border-border space-y-2">
            <div>
              <span className="text-text-muted font-medium">{t('Lý do / Hạng mục thực hiện:', 'Reason:')}</span>
              <p className="text-text-primary mt-0.5">{overtime.reason || '—'}</p>
            </div>
            {overtime.team_leader_note && (
              <div className="pt-2 border-t border-border/60">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{t('Xác nhận Trưởng nhóm:', 'Leader Note:')}</span>
                <p className="text-text-primary mt-0.5">{overtime.team_leader_note}</p>
              </div>
            )}
            {overtime.approved_at && (
              <div className="pt-2 border-t border-border/60">
                <span className="text-primary font-semibold">{t('Thời điểm phê duyệt:', 'Approved At:')}</span>
                <p className="text-text-primary mt-0.5">{formatDate(overtime.approved_at)}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Đóng', 'Close')}
            </Button>
            {canEdit && (
              <Button type="button" variant="primary" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditMode(true)}>
                {t('Sửa phiếu OT', 'Edit Request')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('Dự án liên quan', 'Project')}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={projectOptions}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('Ngày tăng ca', 'Work Date')}
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              required
            />
            <Input
              label={t('Số giờ OT', 'OT Hours')}
              type="number"
              step="0.5"
              min="0.5"
              max="16"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </div>
          <Textarea
            label={t('Lý do tăng ca', 'Reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
              {t('Quay lại', 'Back')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {t('Lưu thay đổi', 'Save Changes')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. CONTRACT DETAIL MODAL                                                   */
/* -------------------------------------------------------------------------- */
export interface ContractDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: EmploymentContractItem | null;
  employeeName: string;
  canEdit: boolean;
  onEditClick: (_contract: EmploymentContractItem) => void;
}

export const ContractDetailModal: React.FC<ContractDetailModalProps> = ({
  isOpen,
  onClose,
  contract,
  employeeName,
  canEdit,
  onEditClick,
}) => {
  const { formatDate, t } = useSettings();
  if (!contract) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(`Hồ sơ Hợp đồng ${contract.contract_code}`, `Contract ${contract.contract_code}`)}
      description={`${employeeName} · ${contract.contract_type}`}
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-accent/30 border border-border">
            <span className="text-text-muted block">{t('Nhân sự ký kết', 'Employee')}</span>
            <span className="font-bold text-text-primary mt-0.5 block">{employeeName}</span>
          </div>
          <div className="p-3 rounded-xl bg-accent/30 border border-border">
            <span className="text-text-muted block">{t('Loại hợp đồng', 'Contract Type')}</span>
            <span className="font-semibold text-text-primary mt-0.5 block">{contract.contract_type}</span>
          </div>
          <div className="p-3 rounded-xl bg-accent/30 border border-border">
            <span className="text-text-muted block">{t('Lương cơ bản', 'Base Salary')}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {formatVndCurrency(contract.base_salary, contract.currency)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-accent/30 border border-border">
            <span className="text-text-muted block">{t('Phụ cấp cố định', 'Allowance')}</span>
            <span className="font-bold text-primary mt-0.5 block">
              {formatVndCurrency(contract.allowance, contract.currency)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-accent/30 border border-border">
            <span className="text-text-muted block">{t('Ngày hiệu lực', 'Start Date')}</span>
            <span className="font-semibold text-text-primary mt-0.5 block">{formatDate(contract.start_date)}</span>
          </div>
          <div className="p-3 rounded-xl bg-accent/30 border border-border">
            <span className="text-text-muted block">{t('Ngày kết thúc', 'End Date')}</span>
            <span className="font-semibold text-text-primary mt-0.5 block">
              {contract.end_date ? formatDate(contract.end_date) : t('Không xác định', 'Indefinite')}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-accent/20 border border-border">
          <span className="text-text-muted font-medium flex items-center gap-1.5">
            <FileSignature className="h-4 w-4 text-primary" />
            {t('Trạng thái hợp đồng', 'Contract Status')}
          </span>
          <StatusBadge status={contract.status} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Đóng', 'Close')}
          </Button>
          {canEdit && (
            <Button
              type="button"
              variant="primary"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => {
                onClose();
                onEditClick(contract);
              }}
            >
              {t('Sửa hợp đồng', 'Edit Contract')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. PAYROLL CALCULATE MODAL                                                 */
/* -------------------------------------------------------------------------- */
export interface PayrollCalculateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPeriod: string;
  employeeOptions: { value: string; label: string }[];
  isSubmitting: boolean;
  onCalculate: (_payload: {
    pay_period: string;
    employee_id?: number;
    standard_work_days?: number;
    overtime_multiplier?: number;
  }) => Promise<void>;
}

export const PayrollCalculateModal: React.FC<PayrollCalculateModalProps> = ({
  isOpen,
  onClose,
  defaultPeriod,
  employeeOptions,
  isSubmitting,
  onCalculate,
}) => {
  const { t } = useSettings();
  const [period, setPeriod] = React.useState(defaultPeriod);
  const [empId, setEmpId] = React.useState('');
  const [standardDays, setStandardDays] = React.useState('22');
  const [otMultiplier, setOtMultiplier] = React.useState('1.5');

  React.useEffect(() => {
    setPeriod(defaultPeriod);
  }, [defaultPeriod, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCalculate({
      pay_period: period,
      employee_id: empId ? Number(empId) : undefined,
      standard_work_days: Number(standardDays || 22),
      overtime_multiplier: Number(otMultiplier || 1.5),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('Tính bảng lương tự động (Payroll Engine)', 'Calculate Monthly Payroll')}
      description={t(
        'Tổng hợp ngày công, ngày phép hưởng lương, giờ OT đã duyệt và hợp đồng hiệu lực',
        'Aggregates attendance days, paid leaves, approved OT and active contract salaries',
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MonthYearSelect
            label={t('Kỳ lương', 'Pay Period')}
            value={period}
            onChange={setPeriod}
            required
          />
          <Select
            label={t('Phạm vi nhân sự', 'Target Scope')}
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            options={employeeOptions}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('Ngày công chuẩn / tháng', 'Standard Work Days')}
            type="number"
            step="0.5"
            min="1"
            max="31"
            value={standardDays}
            onChange={(e) => setStandardDays(e.target.value)}
            required
          />
          <Input
            label={t('Hệ số lương OT', 'OT Multiplier')}
            type="number"
            step="0.1"
            min="1"
            max="5"
            value={otMultiplier}
            onChange={(e) => setOtMultiplier(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Hủy', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" leftIcon={<DollarSign className="h-4 w-4" />} isLoading={isSubmitting}>
            {t('Chạy tính lương', 'Run Payroll')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. PAYROLL DETAIL / PAYSLIP & EDIT MODAL                                   */
/* -------------------------------------------------------------------------- */
export interface PayrollDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: PayrollItem | null;
  employeeName: string;
  canManage: boolean;
  canMarkPaid: boolean;
  isSelf: boolean;
  isSubmitting: boolean;
  onUpdate: (_payrollId: number, _payload: PayrollUpdatePayload) => Promise<void>;
  onUpdateStatus: (_payrollId: number, _status: 'Confirmed' | 'Paid') => Promise<void>;
}

export const PayrollDetailModal: React.FC<PayrollDetailModalProps> = ({
  isOpen,
  onClose,
  payroll,
  employeeName,
  canManage,
  canMarkPaid,
  isSelf,
  isSubmitting,
  onUpdate,
  onUpdateStatus,
}) => {
  const { t } = useSettings();
  const [editMode, setEditMode] = React.useState(false);
  const [actualWorkDays, setActualWorkDays] = React.useState('0');
  const [overtimeHours, setOvertimeHours] = React.useState('0');
  const [bonus, setBonus] = React.useState('0');
  const [deduction, setDeduction] = React.useState('0');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (payroll) {
      setActualWorkDays(String(payroll.actual_work_days));
      setOvertimeHours(String(payroll.overtime_hours));
      setBonus(String(payroll.bonus));
      setDeduction(String(payroll.deduction));
      setNote(payroll.note || '');
      setEditMode(false);
    }
  }, [payroll, isOpen]);

  if (!payroll) return null;

  const canModifyThisRow = canManage && !isSelf && payroll.status !== 'Paid';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(payroll.id, {
      actual_work_days: Number(actualWorkDays),
      overtime_hours: Number(overtimeHours),
      bonus: Number(bonus || 0),
      deduction: Number(deduction || 0),
      note: note.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={t(`Phiếu lương kỳ ${payroll.pay_period}`, `Payslip ${payroll.pay_period}`)}
      description={`${employeeName} · #PR-${payroll.id}`}
    >
      {!editMode ? (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-text-muted">{t('Thực lĩnh (Net Salary)', 'Net Salary')}</span>
              <p className="text-2xl font-black text-primary mt-0.5">
                {formatVndCurrency(payroll.net_salary, payroll.currency)}
              </p>
            </div>
            <StatusBadge status={payroll.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Lương hợp đồng', 'Base Salary')}</span>
              <span className="font-bold text-text-primary mt-0.5 block">
                {formatVndCurrency(payroll.base_salary, payroll.currency)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Phụ cấp', 'Allowance')}</span>
              <span className="font-bold text-text-primary mt-0.5 block">
                {formatVndCurrency(payroll.allowance, payroll.currency)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Ngày công / Chuẩn', 'Work / Std Days')}</span>
              <span className="font-bold text-text-primary mt-0.5 block">
                {payroll.actual_work_days} + {payroll.paid_leave_days} phép / {payroll.standard_work_days}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Lương tăng ca (OT)', 'Overtime Pay')}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                {formatVndCurrency(payroll.overtime_pay, payroll.currency)} ({payroll.overtime_hours}h)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Thưởng / Bonus', 'Bonus')}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                +{formatVndCurrency(payroll.bonus, payroll.currency)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Khấu trừ', 'Deduction')}</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
                -{formatVndCurrency(payroll.deduction, payroll.currency)}
              </span>
            </div>
          </div>

          {payroll.note && (
            <div className="p-3 rounded-xl bg-accent/20 border border-border">
              <span className="text-text-muted font-medium">{t('Ghi chú kế toán / HR:', 'Note:')}</span>
              <p className="text-text-primary mt-1">{payroll.note}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Đóng', 'Close')}
            </Button>
            {canModifyThisRow && (
              <Button type="button" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditMode(true)}>
                {t('Điều chỉnh thưởng / công', 'Edit Bonus & Hours')}
              </Button>
            )}
            {canModifyThisRow && payroll.status === 'Draft' && (
              <Button
                type="button"
                variant="primary"
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                isLoading={isSubmitting}
                onClick={() => onUpdateStatus(payroll.id, 'Confirmed')}
              >
                {t('Chốt phiếu lương', 'Confirm Payslip')}
              </Button>
            )}
            {canMarkPaid && payroll.status !== 'Paid' && (
              <Button
                type="button"
                variant="primary"
                leftIcon={<BadgeCheck className="h-3.5 w-3.5" />}
                isLoading={isSubmitting}
                onClick={() => onUpdateStatus(payroll.id, 'Paid')}
              >
                {t('Xác nhận Đã chi trả', 'Mark as Paid')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('Số ngày công thực tế', 'Actual Work Days')}
              type="number"
              step="0.5"
              min="0"
              max="31"
              value={actualWorkDays}
              onChange={(e) => setActualWorkDays(e.target.value)}
            />
            <Input
              label={t('Số giờ OT tính lương', 'Overtime Hours')}
              type="number"
              step="0.5"
              min="0"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
            />
            <Input
              label={t('Thưởng / Phụ cấp thêm', 'Bonus')}
              type="number"
              min="0"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
            />
            <Input
              label={t('Khấu trừ (BHXH / Phạt)', 'Deduction')}
              type="number"
              min="0"
              value={deduction}
              onChange={(e) => setDeduction(e.target.value)}
            />
          </div>
          <Textarea
            label={t('Ghi chú điều chỉnh', 'Adjustment Note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
              {t('Quay lại', 'Back')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {t('Lưu & Tính lại Net', 'Save & Recompute')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* 6. CANDIDATE DETAIL / CREATE / EDIT MODAL                                  */
/* -------------------------------------------------------------------------- */
export interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateItem | null;
  initialMode: 'create' | 'edit' | 'view';
  departmentOptions: { value: string; label: string }[];
  canEdit: boolean;
  isSubmitting: boolean;
  onCreate: (_payload: CandidateCreatePayload) => Promise<void>;
  onUpdate: (_candidateId: number, _payload: Partial<CandidateCreatePayload>) => Promise<void>;
  onOpenOnboard?: (_candidate: CandidateItem) => void;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  isOpen,
  onClose,
  candidate,
  initialMode,
  departmentOptions,
  canEdit,
  isSubmitting,
  onCreate,
  onUpdate,
  onOpenOnboard,
}) => {
  const { formatDate, t } = useSettings();
  const [mode, setMode] = React.useState<'create' | 'edit' | 'view'>(initialMode);
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [appliedPosition, setAppliedPosition] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState('');
  const [stage, setStage] = React.useState('Applied');
  const [expectedSalary, setExpectedSalary] = React.useState('');
  const [interviewDate, setInterviewDate] = React.useState('');
  const [source, setSource] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    setMode(initialMode);
    if (candidate) {
      setFullName(candidate.full_name || '');
      setEmail(candidate.email || '');
      setPhone(candidate.phone || '');
      setAppliedPosition(candidate.applied_position || '');
      setDepartmentId(candidate.department_id ? String(candidate.department_id) : '');
      setStage(candidate.stage || 'Applied');
      setExpectedSalary(candidate.expected_salary ? String(candidate.expected_salary) : '');
      setInterviewDate(candidate.interview_date || '');
      setSource(candidate.source || '');
      setNotes(candidate.notes || '');
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setAppliedPosition('');
      setDepartmentId(departmentOptions.find((d) => d.value !== '')?.value || '');
      setStage('Applied');
      setExpectedSalary('');
      setInterviewDate('');
      setSource('');
      setNotes('');
    }
  }, [candidate, initialMode, isOpen, departmentOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CandidateCreatePayload = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      applied_position: appliedPosition.trim(),
      department_id: departmentId ? Number(departmentId) : null,
      stage,
      expected_salary: expectedSalary ? Number(expectedSalary) : null,
      interview_date: interviewDate || null,
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (candidate && mode === 'edit') {
      await onUpdate(candidate.id, payload);
    } else {
      await onCreate(payload);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        mode === 'create'
          ? t('Thêm Hồ sơ Ứng viên', 'Add Recruitment Candidate')
          : mode === 'edit'
            ? t(`Cập nhật Ứng viên #${candidate?.id ?? ''}`, `Update Candidate #${candidate?.id ?? ''}`)
            : t(`Hồ sơ Ứng viên · ${candidate?.full_name ?? ''}`, `Candidate Profile · ${candidate?.full_name ?? ''}`)
      }
      description={
        candidate
          ? `${candidate.applied_position} · ${candidate.email}`
          : t('Quản lý ứng viên từ tiếp nhận CV tới Onboard thành nhân viên chính thức', 'Track recruitment stages until employee onboarding')
      }
    >
      {mode === 'view' && candidate ? (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Ứng viên', 'Full Name')}</span>
              <span className="font-bold text-text-primary mt-0.5 block">{candidate.full_name}</span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Giai đoạn tuyển dụng', 'Pipeline Stage')}</span>
              <div className="mt-1">
                <StatusBadge status={candidate.stage} />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">Email & SĐT</span>
              <span className="font-semibold text-text-primary mt-0.5 block">
                {candidate.email} {candidate.phone ? `· ${candidate.phone}` : ''}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Mức lương kỳ vọng', 'Expected Salary')}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {candidate.expected_salary ? formatVndCurrency(candidate.expected_salary) : '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Ngày phỏng vấn', 'Interview Date')}</span>
              <span className="font-semibold text-text-primary mt-0.5 block">
                {candidate.interview_date ? formatDate(candidate.interview_date) : '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-accent/30 border border-border">
              <span className="text-text-muted block">{t('Nguồn ứng tuyển', 'Recruitment Source')}</span>
              <span className="font-semibold text-text-primary mt-0.5 block">{candidate.source || '—'}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-accent/20 border border-border">
            <span className="text-text-muted font-medium">{t('Ghi chú đánh giá:', 'Interview Notes:')}</span>
            <p className="text-text-primary mt-1">{candidate.notes || '—'}</p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Đóng', 'Close')}
            </Button>
            {canEdit && (
              <Button type="button" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setMode('edit')}>
                {t('Chỉnh sửa', 'Edit')}
              </Button>
            )}
            {onOpenOnboard && !candidate.converted_employee_id && candidate.stage !== 'Rejected' && (
              <Button
                type="button"
                variant="primary"
                leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                onClick={() => {
                  onClose();
                  onOpenOnboard(candidate);
                }}
              >
                {t('Onboard thành Nhân viên', 'Onboard to Employee')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('Họ và tên ứng viên', 'Full Name')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label={t('Số điện thoại', 'Phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label={t('Vị trí ứng tuyển', 'Position Applied')}
              value={appliedPosition}
              onChange={(e) => setAppliedPosition(e.target.value)}
              required
            />
            <Select
              label={t('Phòng ban tuyển dụng', 'Department')}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={departmentOptions}
            />
            <Select
              label={t('Giai đoạn (Stage)', 'Stage')}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              options={[
                { value: 'Applied', label: t('Ứng tuyển (Applied)', 'Applied') },
                { value: 'Screening', label: t('Sàng lọc CV (Screening)', 'Screening') },
                { value: 'Interview', label: t('Phỏng vấn (Interview)', 'Interview') },
                { value: 'Offer', label: t('Đề nghị (Offer)', 'Offer') },
                { value: 'Hired', label: t('Đã tuyển (Hired)', 'Hired') },
                { value: 'Rejected', label: t('Từ chối (Rejected)', 'Rejected') },
              ]}
            />
            <Input
              label={t('Mức lương kỳ vọng (VND)', 'Expected Salary')}
              type="number"
              min="0"
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(e.target.value)}
            />
            <Input
              label={t('Ngày phỏng vấn', 'Interview Date')}
              type="date"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
            />
          </div>
          <Input
            label={t('Nguồn ứng tuyển (LinkedIn / Referral / Website)', 'Recruitment Source')}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <Textarea
            label={t('Ghi chú đánh giá', 'Evaluation Notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Hủy', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {candidate ? t('Cập nhật hồ sơ', 'Save Candidate') : t('Tạo hồ sơ ứng viên', 'Create Candidate')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* 7. CANDIDATE ONBOARD MODAL (ADMIN ONLY)                                    */
/* -------------------------------------------------------------------------- */
export interface CandidateOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateItem | null;
  departmentOptions: { value: string; label: string }[];
  isSubmitting: boolean;
  onOnboard: (_candidateId: number, _payload: CandidateOnboardPayload) => Promise<void>;
}

export const CandidateOnboardModal: React.FC<CandidateOnboardModalProps> = ({
  isOpen,
  onClose,
  candidate,
  departmentOptions,
  isSubmitting,
  onOnboard,
}) => {
  const { t } = useSettings();
  const [jobTitle, setJobTitle] = React.useState('');
  const [password, setPassword] = React.useState('Welcome@Task2026!');
  const [departmentId, setDepartmentId] = React.useState('');
  const [contractType, setContractType] = React.useState<NonNullable<CandidateOnboardPayload['contract_type']>>('Probation');
  const [baseSalary, setBaseSalary] = React.useState('18000000');
  const [allowance, setAllowance] = React.useState('1500000');
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));

  React.useEffect(() => {
    if (candidate) {
      setJobTitle(candidate.applied_position || '');
      setDepartmentId(candidate.department_id ? String(candidate.department_id) : '');
      setBaseSalary(candidate.expected_salary ? String(candidate.expected_salary) : '18000000');
    }
  }, [candidate, isOpen]);

  if (!candidate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onOnboard(candidate.id, {
      job_title: jobTitle.trim() || candidate.applied_position,
      password,
      department_id: departmentId ? Number(departmentId) : null,
      create_contract: true,
      contract_type: contractType,
      base_salary: Number(baseSalary),
      allowance: Number(allowance || 0),
      currency: 'VND',
      start_date: startDate,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={t(`Onboard Ứng viên: ${candidate.full_name}`, `Onboard Candidate: ${candidate.full_name}`)}
      description={t(
        'Tạo đồng thời tài khoản Nhân viên, Hợp đồng lao động và Quỹ phép năm',
        'Creates Employee account, Employment Contract, and Annual Leave Balance in one transaction',
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('Chức danh / Vị trí chính thức', 'Official Job Title')}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
          />
          <Input
            label={t('Mật khẩu khởi tạo', 'Initial Password')}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Select
            label={t('Phòng ban trực thuộc', 'Department')}
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            options={departmentOptions}
          />
          <Select
            label={t('Loại hợp đồng', 'Contract Type')}
            value={contractType}
            onChange={(e) => setContractType(e.target.value as NonNullable<CandidateOnboardPayload['contract_type']>)}
            options={[
              { value: 'Probation', label: t('Thử việc (Probation)', 'Probation') },
              { value: 'Fixed-Term', label: t('Xác định thời hạn', 'Fixed-Term') },
              { value: 'Indefinite', label: t('Không xác định thời hạn', 'Indefinite') },
              { value: 'Part-Time', label: t('Bán thời gian', 'Part-Time') },
              { value: 'Contractor', label: t('Cộng tác viên / Khoán', 'Contractor') },
            ]}
          />
          <Input
            label={t('Lương hợp đồng (VND)', 'Base Salary')}
            type="number"
            min="0"
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
            required
          />
          <Input
            label={t('Phụ cấp (VND)', 'Allowance')}
            type="number"
            min="0"
            value={allowance}
            onChange={(e) => setAllowance(e.target.value)}
          />
        </div>
        <Input
          label={t('Ngày bắt đầu làm việc', 'Start Date')}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Hủy', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" leftIcon={<Briefcase className="h-4 w-4" />} isLoading={isSubmitting}>
            {t('Xác nhận Onboard Nhân sự', 'Confirm Onboarding')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* 7. CONTRACT TYPE FORMATTER & CREATE / EDIT MODAL                           */
/* -------------------------------------------------------------------------- */
export const getContractTypeLabel = (contractType: string, isEnglish = false): string => {
  const key = (contractType || '').trim().toLowerCase();
  const map: Record<string, { vi: string; en: string }> = {
    indefinite: { vi: 'Không xác định thời hạn', en: 'Indefinite Term' },
    'fixed-term': { vi: 'Xác định thời hạn', en: 'Fixed-Term' },
    probation: { vi: 'Thử việc', en: 'Probation' },
    'part-time': { vi: 'Bán thời gian', en: 'Part-Time' },
    contractor: { vi: 'Cộng tác viên / Khoán', en: 'Contractor' },
  };
  if (map[key]) return isEnglish ? map[key].en : map[key].vi;
  return contractType || '—';
};

export interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: EmploymentContractItem | null;
  fixedEmployee?: { id: number; name: string } | null;
  employeeOptions?: { value: string; label: string }[];
  isSubmitting: boolean;
  onCreate: (_payload: EmploymentContractCreatePayload) => Promise<void>;
  onUpdate: (_contractId: number, _payload: EmploymentContractUpdatePayload) => Promise<void>;
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  isOpen,
  onClose,
  contract,
  fixedEmployee,
  employeeOptions = [],
  isSubmitting,
  onCreate,
  onUpdate,
}) => {
  const { t, statusLabel } = useSettings();
  const [employeeId, setEmployeeId] = React.useState('');
  const [contractCode, setContractCode] = React.useState('');
  const [contractType, setContractType] = React.useState('Indefinite');
  const [baseSalary, setBaseSalary] = React.useState('20000000');
  const [allowance, setAllowance] = React.useState('2000000');
  const [currency, setCurrency] = React.useState('VND');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [status, setStatus] = React.useState('Active');
  const [dateError, setDateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setDateError(null);
    if (contract) {
      setEmployeeId(String(contract.employee_id));
      setContractCode(contract.contract_code);
      setContractType(contract.contract_type || 'Indefinite');
      setBaseSalary(String(contract.base_salary ?? '20000000'));
      setAllowance(String(contract.allowance ?? '0'));
      setCurrency(contract.currency || 'VND');
      setStartDate(contract.start_date || '');
      setEndDate(contract.end_date || '');
      setStatus(contract.status || 'Active');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setEmployeeId(fixedEmployee ? String(fixedEmployee.id) : employeeOptions[0]?.value || '');
      setContractCode(`HD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
      setContractType('Indefinite');
      setBaseSalary('20000000');
      setAllowance('2000000');
      setCurrency('VND');
      setStartDate(today);
      setEndDate('');
      setStatus('Active');
    }
  }, [contract, isOpen, fixedEmployee, employeeOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endDate && startDate && endDate < startDate) {
      setDateError(t('Ngày kết thúc không thể nhỏ hơn ngày hiệu lực.', 'End date cannot precede start date.'));
      return;
    }
    setDateError(null);
    if (contract) {
      await onUpdate(contract.id, {
        contract_type: contractType,
        base_salary: Number(baseSalary),
        allowance: Number(allowance || 0),
        currency: currency.trim() || 'VND',
        start_date: startDate,
        end_date: endDate || null,
        status,
      });
    } else {
      const targetEmpId = fixedEmployee ? fixedEmployee.id : Number(employeeId);
      if (!targetEmpId) return;
      await onCreate({
        employee_id: targetEmpId,
        contract_code: contractCode.trim(),
        contract_type: contractType,
        base_salary: Number(baseSalary),
        allowance: Number(allowance || 0),
        currency: currency.trim() || 'VND',
        start_date: startDate,
        end_date: endDate || null,
        status,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        contract
          ? t(`Cập nhật Hợp đồng ${contract.contract_code}`, `Update Contract ${contract.contract_code}`)
          : t('Phát hành Hợp đồng Lao động mới', 'Issue New Employment Contract')
      }
      description={fixedEmployee ? `${t('Nhân sự:', 'Employee:')} ${fixedEmployee.name}` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!contract && !fixedEmployee && (
          <Select
            label={t('Nhân sự', 'Employee')}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            options={employeeOptions}
            required
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('Mã hợp đồng', 'Contract Code')}
            value={contractCode}
            onChange={(e) => setContractCode(e.target.value)}
            disabled={Boolean(contract)}
            required
          />
          <Select
            label={t('Loại hợp đồng', 'Contract Type')}
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            options={[
              { value: 'Indefinite', label: t('Không xác định thời hạn', 'Indefinite Term') },
              { value: 'Fixed-Term', label: t('Xác định thời hạn', 'Fixed-Term') },
              { value: 'Probation', label: t('Thử việc', 'Probation') },
              { value: 'Part-Time', label: t('Bán thời gian', 'Part-Time') },
              { value: 'Contractor', label: t('Cộng tác viên / Khoán', 'Contractor') },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label={t('Lương cơ bản', 'Base Salary')}
            type="number"
            min="0"
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
            required
          />
          <Input
            label={t('Phụ cấp', 'Allowance')}
            type="number"
            min="0"
            value={allowance}
            onChange={(e) => setAllowance(e.target.value)}
          />
          <Input
            label={t('Tiền tệ', 'Currency')}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label={t('Ngày hiệu lực', 'Effective Date')}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label={t('Ngày kết thúc', 'End Date')}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Select
            label={t('Trạng thái', 'Status')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'Active', label: statusLabel('Active') },
              { value: 'Draft', label: statusLabel('Draft') },
              { value: 'Expired', label: statusLabel('Expired') },
              { value: 'Terminated', label: statusLabel('Terminated') },
            ]}
          />
        </div>
        {dateError && <p className="text-xs font-medium text-rose-500">{dateError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Hủy', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" leftIcon={<FileSignature className="h-4 w-4" />} isLoading={isSubmitting}>
            {t('Lưu hợp đồng', 'Save Contract')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Re-export icons used as props checks cleanly
export { CalendarClock, Clock };

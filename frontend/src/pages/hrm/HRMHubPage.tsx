import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  DatabaseBackup,
  DollarSign,
  FileSignature,
  FileText,
  HardDriveDownload,
  LogIn,
  LogOut,
  MessageSquarePlus,
  Pencil,
  Plus,
  ShieldCheck,
  Undo2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Tabs } from '../../components/navigation/Tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EntityActions, IconActionButton, type EntityActionsExtraItem } from '../../components/common/EntityActions';
import { GLOBAL_ACTION_TEXT } from '../../utils/globalLabels';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { DataTableWrapper } from '../../components/data-display/DataTableWrapper';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MonthYearSelect } from '../../components/ui/MonthYearSelect';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  AttendanceDetailModal,
  CandidateModal,
  CandidateOnboardModal,
  ContractDetailModal,
  formatTimeHHMM,
  formatTimeHHMMSS,
  formatVndCurrency,
  OvertimeDetailModal,
  PayrollCalculateModal,
  PayrollDetailModal,
} from '../../components/hrm/HrmModals';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { useEmployees } from '../../hooks/useEmployees';
import { useDepartments } from '../../hooks/useDepartments';
import { useProjects } from '../../hooks/useProjects';
import {
  useAddOvertimeLeaderNote,
  useAdjustLeaveBalance,
  useCalculatePayrolls,
  useCheckInAttendance,
  useCheckOutAttendance,
  useCreateBackupLog,
  useCreateCandidate,
  useCreateContract,
  useCreateOvertime,
  useDeleteCandidate,
  useDeleteContract,
  useDeleteOvertime,
  useHrmAttendance,
  useHrmBackups,
  useHrmCandidates,
  useHrmContracts,
  useHrmLeaveBalances,
  useHrmLeaveTaskConflicts,
  useHrmOverview,
  useHrmOvertime,
  useHrmPayrolls,
  useOnboardCandidate,
  useUpdateAttendance,
  useUpdateCandidate,
  useUpdateContract,
  useUpdateOvertime,
  useUpdateOvertimeStatus,
  useUpdatePayroll,
  useUpdatePayrollStatus,
} from '../../hooks/useHRM';
import { extractApiError } from '../../utils/errorHelpers';
import {
  type AttendanceLogItem,
  type AttendanceUpdatePayload,
  type BackupHistoryCreatePayload,
  type BackupHistoryItem,
  type CandidateCreatePayload,
  type CandidateItem,
  type CandidateOnboardPayload,
  type EmploymentContractItem,
  type LeaveBalanceItem,
  type LeaveTaskConflictItem,
  type OvertimeRequestItem,
  type PayrollItem,
  type PayrollUpdatePayload,
} from '../../api/services';

type HrmTabId = 'attendance' | 'payroll' | 'overtime' | 'contracts' | 'recruitment' | 'governance';

const getTodayIso = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getCurrentMonthIso = (): string => getTodayIso().slice(0, 7);

const HRMHubPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { formatDate, defaultPageSize, t, statusLabel } = useSettings();
  const permissions = usePermissions();

  const roleStr = (user?.role || '').toLowerCase();
  const roleId = Number(user?.role_id);
  const isAdmin = roleStr === 'admin' || roleId === 1;
  const isManager = roleStr === 'manager' || roleId === 2;
  const canManageHrm = isAdmin || isManager;
  const isTeamLeader = Boolean(user?.is_team_leader) || permissions.isTeamLeader;

  const [activeTab, setActiveTab] = React.useState<HrmTabId>('attendance');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = React.useState<string>('');
  const [payPeriodFilter, setPayPeriodFilter] = React.useState<string>(getCurrentMonthIso);
  const [candidateStageFilter, setCandidateStageFilter] = React.useState<string>('');

  const [checkInStatus, setCheckInStatus] = React.useState<'Present' | 'Remote'>('Present');
  const [attendanceNote, setAttendanceNote] = React.useState('');

  // Queries via @tanstack/react-query
  const { data: overview, isLoading: overviewLoading } = useHrmOverview();
  const { data: employees = [] } = useEmployees(canManageHrm);
  const { data: departments = [] } = useDepartments();
  const { data: projects = [] } = useProjects();

  const employeeFilterId = selectedEmployeeFilter ? Number(selectedEmployeeFilter) : undefined;
  const { data: attendanceLogs = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useHrmAttendance({
    employee_id: employeeFilterId,
    limit: Math.max(50, defaultPageSize * 2),
  });
  const { data: overtimeRequests = [], isLoading: overtimeLoading, refetch: refetchOvertime } = useHrmOvertime({
    employee_id: employeeFilterId,
  });
  const { data: contracts = [], isLoading: contractsLoading, refetch: refetchContracts } = useHrmContracts({
    employee_id: employeeFilterId,
  });
  const { data: leaveBalances = [], isLoading: leaveBalancesLoading, refetch: refetchLeaveBalances } = useHrmLeaveBalances({
    employee_id: employeeFilterId,
  });
  const { data: payrolls = [], isLoading: payrollsLoading, refetch: refetchPayrolls } = useHrmPayrolls({
    pay_period: payPeriodFilter || undefined,
    employee_id: employeeFilterId,
  });
  const { data: candidates = [], isLoading: candidatesLoading, refetch: refetchCandidates } = useHrmCandidates(
    { stage: candidateStageFilter || undefined },
    canManageHrm,
  );
  const { data: conflicts = [] } = useHrmLeaveTaskConflicts({
    employee_id: employeeFilterId,
  });
  const { data: backups = [], isLoading: backupsLoading, refetch: refetchBackups } = useHrmBackups(isAdmin, 30);

  // Mutations
  const checkInMutation = useCheckInAttendance();
  const checkOutMutation = useCheckOutAttendance();
  const updateAttendanceMutation = useUpdateAttendance();
  const createOvertimeMutation = useCreateOvertime();
  const updateOvertimeMutation = useUpdateOvertime();
  const leaderNoteMutation = useAddOvertimeLeaderNote();
  const updateOvertimeStatusMutation = useUpdateOvertimeStatus();
  const deleteOvertimeMutation = useDeleteOvertime();
  const createContractMutation = useCreateContract();
  const updateContractMutation = useUpdateContract();
  const deleteContractMutation = useDeleteContract();
  const adjustLeaveBalanceMutation = useAdjustLeaveBalance();
  const calculatePayrollsMutation = useCalculatePayrolls();
  const updatePayrollMutation = useUpdatePayroll();
  const updatePayrollStatusMutation = useUpdatePayrollStatus();
  const createCandidateMutation = useCreateCandidate();
  const updateCandidateMutation = useUpdateCandidate();
  const deleteCandidateMutation = useDeleteCandidate();
  const onboardCandidateMutation = useOnboardCandidate();
  const createBackupMutation = useCreateBackupLog();

  // Detail / Edit Popup States
  const [selectedAttendance, setSelectedAttendance] = React.useState<AttendanceLogItem | null>(null);
  const [attendanceInitialEditMode, setAttendanceInitialEditMode] = React.useState(false);
  const [selectedOvertime, setSelectedOvertime] = React.useState<OvertimeRequestItem | null>(null);
  const [selectedContractDetail, setSelectedContractDetail] = React.useState<EmploymentContractItem | null>(null);
  const [isPayrollCalcOpen, setIsPayrollCalcOpen] = React.useState(false);
  const [selectedPayroll, setSelectedPayroll] = React.useState<PayrollItem | null>(null);
  const [candidateModalState, setCandidateModalState] = React.useState<{
    isOpen: boolean;
    candidate: CandidateItem | null;
    mode: 'create' | 'edit' | 'view';
  }>({ isOpen: false, candidate: null, mode: 'view' });
  const [candidateToDelete, setCandidateToDelete] = React.useState<CandidateItem | null>(null);
  const [candidateToOnboard, setCandidateToOnboard] = React.useState<CandidateItem | null>(null);

  // Create Overtime modal & leader note state
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = React.useState(false);
  const [otProjectId, setOtProjectId] = React.useState<string>('');
  const [otWorkDate, setOtWorkDate] = React.useState<string>(getTodayIso);
  const [otHours, setOtHours] = React.useState<string>('2');
  const [otReason, setOtReason] = React.useState<string>('');

  const [leaderNoteTarget, setLeaderNoteTarget] = React.useState<OvertimeRequestItem | null>(null);
  const [leaderNoteText, setLeaderNoteText] = React.useState<string>('');
  const [overtimeToDelete, setOvertimeToDelete] = React.useState<OvertimeRequestItem | null>(null);

  // Contract modal state
  const [isContractModalOpen, setIsContractModalOpen] = React.useState(false);
  const [editingContract, setEditingContract] = React.useState<EmploymentContractItem | null>(null);
  const [contractEmpId, setContractEmpId] = React.useState<string>('');
  const [contractCode, setContractCode] = React.useState<string>('');
  const [contractType, setContractType] = React.useState<string>('Indefinite');
  const [contractSalary, setContractSalary] = React.useState<string>('20000000');
  const [contractAllowance, setContractAllowance] = React.useState<string>('2000000');
  const [contractCurrency, setContractCurrency] = React.useState<string>('VND');
  const [contractStartDate, setContractStartDate] = React.useState<string>(getTodayIso);
  const [contractEndDate, setContractEndDate] = React.useState<string>('');
  const [contractStatus, setContractStatus] = React.useState<string>('Active');
  const [contractToDelete, setContractToDelete] = React.useState<EmploymentContractItem | null>(null);

  // Leave balance adjustment modal
  const [isBalanceModalOpen, setIsBalanceModalOpen] = React.useState(false);
  const [balanceEmpId, setBalanceEmpId] = React.useState<string>('');
  const [balanceYear, setBalanceYear] = React.useState<string>(String(new Date().getFullYear()));
  const [balanceEntitlement, setBalanceEntitlement] = React.useState<string>('12');
  const [balanceCarriedOver, setBalanceCarriedOver] = React.useState<string>('0');

  // Backup log modal (Admin only)
  const [isBackupModalOpen, setIsBackupModalOpen] = React.useState(false);
  const [backupType, setBackupType] = React.useState<BackupHistoryCreatePayload['backup_type']>('FULL');
  const [backupDbName, setBackupDbName] = React.useState<string>('TaskSyncEnterprise');
  const [backupPath, setBackupPath] = React.useState<string>('');
  const [backupStatus, setBackupStatus] = React.useState<BackupHistoryCreatePayload['status']>('VERIFIED');
  const [backupNotes, setBackupNotes] = React.useState<string>('');

  const employeeNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    if (user?.id) {
      map.set(Number(user.id), user.full_name || user.name || 'Tôi');
    }
    employees.forEach((emp) => map.set(emp.id, emp.full_name));
    return map;
  }, [employees, user]);

  const departmentNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const projectNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((proj) => map.set(proj.id, `${proj.project_code || `#${proj.id}`} · ${proj.name}`));
    return map;
  }, [projects]);

  const todayAttendance = React.useMemo(() => {
    const today = getTodayIso();
    return attendanceLogs.find(
      (log) => Number(log.employee_id) === Number(user?.id) && log.work_date === today,
    );
  }, [attendanceLogs, user?.id]);

  const employeeOptions = React.useMemo(
    () => [
      { value: '', label: t('Tất cả nhân sự trong phạm vi', 'All Accessible Employees') },
      ...employees.map((e) => ({
        value: String(e.id),
        label: `${e.employee_code ? `${e.employee_code} · ` : ''}${e.full_name}`,
      })),
    ],
    [employees, t],
  );

  const projectOptions = React.useMemo(
    () => [
      { value: '', label: t('Không gắn dự án cụ thể', 'No Specific Project') },
      ...projects.map((p) => ({ value: String(p.id), label: `${p.project_code || `#${p.id}`} · ${p.name}` })),
    ],
    [projects, t],
  );

  const departmentOptions = React.useMemo(
    () => [
      { value: '', label: t('Chưa gán phòng ban', 'Unassigned') },
      ...departments.map((d) => ({ value: String(d.id), label: `${d.department_code} · ${d.name}` })),
    ],
    [departments, t],
  );

  // Bounded lists respecting configured System/User page_size
  const visibleAttendance = React.useMemo(() => attendanceLogs.slice(0, defaultPageSize), [attendanceLogs, defaultPageSize]);
  const visiblePayrolls = React.useMemo(() => payrolls.slice(0, defaultPageSize), [payrolls, defaultPageSize]);

  // Handlers
  const handleCheckIn = async () => {
    try {
      await checkInMutation.mutateAsync({
        work_date: getTodayIso(),
        status: checkInStatus,
        note: attendanceNote.trim() || undefined,
      });
      setAttendanceNote('');
      toast.success(
        t('Check-in thành công', 'Checked in'),
        t(`Đã ghi nhận chấm công (${statusLabel(checkInStatus)}).`, `Recorded attendance (${statusLabel(checkInStatus)}).`),
      );
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể thực hiện Check-in.', 'Check-in failed.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOutMutation.mutateAsync({
        work_date: getTodayIso(),
        note: attendanceNote.trim() || undefined,
      });
      setAttendanceNote('');
      toast.success(t('Check-out thành công', 'Checked out'), t('Đã cập nhật tổng giờ làm và tăng ca.', 'Work hours updated.'));
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể thực hiện Check-out.', 'Check-out failed.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleSaveAttendanceUpdate = async (attendanceId: number, payload: AttendanceUpdatePayload) => {
    try {
      await updateAttendanceMutation.mutateAsync({ attendanceId, payload });
      toast.success(t('Cập nhật giờ công thành công', 'Attendance updated'), t('Đã tính lại giờ làm và giờ tăng ca.', 'Work and overtime hours recomputed.'));
      setSelectedAttendance(null);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể chỉnh sửa chấm công.', 'Failed to update attendance.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleCreateOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = Number(otHours);
    if (!otWorkDate || !Number.isFinite(hoursNum) || hoursNum <= 0 || hoursNum > 16) {
      toast.error(t('Dữ liệu không hợp lệ', 'Invalid Data'), t('Số giờ tăng ca phải lớn hơn 0 và tối đa 16 giờ.', 'Overtime hours must be between 0 and 16.'));
      return;
    }
    try {
      await createOvertimeMutation.mutateAsync({
        project_id: otProjectId ? Number(otProjectId) : null,
        work_date: otWorkDate,
        hours: hoursNum,
        reason: otReason.trim() || undefined,
      });
      toast.success(t('Gửi phiếu tăng ca thành công', 'Overtime Submitted'), t('Phiếu tăng ca đã chuyển vào hàng đợi duyệt.', 'Overtime request has entered the approval queue.'));
      setIsOvertimeModalOpen(false);
      setOtReason('');
      setOtProjectId('');
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể tạo phiếu tăng ca.', 'Failed to submit overtime request.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleSaveOvertimeUpdate = async (
    overtimeId: number,
    payload: { project_id?: number | null; work_date?: string; hours?: number; reason?: string },
  ) => {
    try {
      await updateOvertimeMutation.mutateAsync({ overtimeId, payload });
      toast.success(t('Cập nhật phiếu tăng ca thành công', 'Overtime Updated'), t(`Đã cập nhật phiếu OT #${overtimeId}.`, `Updated OT #${overtimeId}.`));
      setSelectedOvertime(null);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể cập nhật phiếu tăng ca.', 'Failed to update overtime request.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleSubmitLeaderNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderNoteTarget || !leaderNoteText.trim()) return;
    try {
      await leaderNoteMutation.mutateAsync({
        overtimeId: leaderNoteTarget.id,
        note: leaderNoteText.trim(),
      });
      toast.success(t('Đã lưu ghi chú Trưởng nhóm', 'Leader Note Saved'), t('Nhận xét xác minh tăng ca đã được cập nhật.', 'Overtime verification note updated.'));
      setLeaderNoteTarget(null);
      setLeaderNoteText('');
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể cập nhật ghi chú Trưởng nhóm.', 'Failed to save leader note.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleUpdateOvertimeStatus = React.useCallback(async (overtimeId: number, status: string) => {
    try {
      await updateOvertimeStatusMutation.mutateAsync({ overtimeId, status });
      toast.success(
        t('Cập nhật trạng thái tăng ca', 'Overtime Status Updated'),
        t(`Phiếu #${overtimeId} đã chuyển sang "${statusLabel(status)}".`, `OT #${overtimeId} transitioned to "${statusLabel(status)}".`),
      );
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể cập nhật trạng thái phiếu tăng ca.', 'Failed to update overtime status.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  }, [statusLabel, t, toast, updateOvertimeStatusMutation]);

  const handleConfirmDeleteOvertime = async () => {
    if (!overtimeToDelete) return;
    try {
      await deleteOvertimeMutation.mutateAsync(overtimeToDelete.id);
      toast.success(t('Đã lưu trữ phiếu tăng ca', 'Overtime Archived'), t('Phiếu tăng ca đã được xóa mềm khỏi danh sách.', 'Overtime request removed.'));
      setOvertimeToDelete(null);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể xóa phiếu tăng ca.', 'Failed to delete overtime request.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const openCreateContractModal = () => {
    setEditingContract(null);
    setContractEmpId(employees[0]?.id ? String(employees[0].id) : '');
    setContractCode(`HD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
    setContractType('Indefinite');
    setContractSalary('20000000');
    setContractAllowance('2000000');
    setContractCurrency('VND');
    setContractStartDate(getTodayIso());
    setContractEndDate('');
    setContractStatus('Active');
    setIsContractModalOpen(true);
  };

  const openEditContractModal = (contract: EmploymentContractItem) => {
    setEditingContract(contract);
    setContractEmpId(String(contract.employee_id));
    setContractCode(contract.contract_code);
    setContractType(contract.contract_type);
    setContractSalary(String(contract.base_salary));
    setContractAllowance(String(contract.allowance));
    setContractCurrency(contract.currency || 'VND');
    setContractStartDate(contract.start_date);
    setContractEndDate(contract.end_date || '');
    setContractStatus(contract.status);
    setIsContractModalOpen(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contractEndDate && contractEndDate < contractStartDate) {
      toast.error(t('Ngày không hợp lệ', 'Invalid Dates'), t('Ngày kết thúc hợp đồng không thể nhỏ hơn ngày bắt đầu.', 'Contract end date cannot precede start date.'));
      return;
    }
    try {
      if (editingContract) {
        await updateContractMutation.mutateAsync({
          contractId: editingContract.id,
          payload: {
            contract_type: contractType,
            base_salary: Number(contractSalary),
            allowance: Number(contractAllowance || 0),
            currency: contractCurrency.trim() || 'VND',
            start_date: contractStartDate,
            end_date: contractEndDate || null,
            status: contractStatus,
          },
        });
        toast.success(t('Cập nhật hợp đồng thành công', 'Contract Updated'), t(`Đã cập nhật ${editingContract.contract_code}.`, `Updated ${editingContract.contract_code}.`));
      } else {
        if (!contractEmpId) {
          toast.error(t('Thiếu nhân sự', 'Missing Employee'), t('Vui lòng chọn nhân viên để gán hợp đồng.', 'Please select an employee for the contract.'));
          return;
        }
        await createContractMutation.mutateAsync({
          employee_id: Number(contractEmpId),
          contract_code: contractCode.trim(),
          contract_type: contractType,
          base_salary: Number(contractSalary),
          allowance: Number(contractAllowance || 0),
          currency: contractCurrency.trim() || 'VND',
          start_date: contractStartDate,
          end_date: contractEndDate || null,
          status: contractStatus,
        });
        toast.success(t('Tạo hợp đồng thành công', 'Contract Created'), t(`Hợp đồng ${contractCode.trim()} đã được phát hành.`, `Contract ${contractCode.trim()} issued.`));
      }
      setIsContractModalOpen(false);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể lưu hợp đồng lao động.', 'Failed to save contract.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleConfirmDeleteContract = async () => {
    if (!contractToDelete) return;
    try {
      await deleteContractMutation.mutateAsync(contractToDelete.id);
      toast.success(t('Đã lưu trữ hợp đồng', 'Contract Archived'), t(`Hợp đồng ${contractToDelete.contract_code} đã được xóa mềm.`, `Contract ${contractToDelete.contract_code} archived.`));
      setContractToDelete(null);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể xóa hợp đồng.', 'Failed to delete contract.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const openAdjustLeaveBalance = React.useCallback((lb?: LeaveBalanceItem) => {
    setBalanceEmpId(String(lb?.employee_id || employees[0]?.id || ''));
    setBalanceYear(String(lb?.leave_year || new Date().getFullYear()));
    setBalanceEntitlement(String(lb?.annual_entitlement ?? 12));
    setBalanceCarriedOver(String(lb?.carried_over_days ?? 0));
    setIsBalanceModalOpen(true);
  }, [employees]);

  const handleSaveLeaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = Number(balanceEmpId || user?.id);
    if (!targetId) {
      toast.error(t('Thiếu nhân sự', 'Missing Employee'), t('Vui lòng chọn nhân viên cần điều chỉnh quỹ phép.', 'Please select an employee.'));
      return;
    }
    try {
      await adjustLeaveBalanceMutation.mutateAsync({
        employeeId: targetId,
        payload: {
          leave_year: Number(balanceYear),
          annual_entitlement: Number(balanceEntitlement),
          carried_over_days: Number(balanceCarriedOver || 0),
        },
      });
      toast.success(t('Điều chỉnh quỹ phép thành công', 'Leave Balance Adjusted'), t('Đã cập nhật hạn mức phép năm và ghi Audit Log.', 'Annual quota updated and audited.'));
      setIsBalanceModalOpen(false);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể điều chỉnh quỹ phép năm.', 'Failed to adjust leave balance.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleCalculatePayrolls = async (payload: {
    pay_period: string;
    employee_id?: number;
    standard_work_days?: number;
    overtime_multiplier?: number;
  }) => {
    try {
      const res = await calculatePayrollsMutation.mutateAsync(payload);
      setPayPeriodFilter(payload.pay_period);
      toast.success(
        t('Tính bảng lương thành công', 'Payroll Calculated'),
        t(`Đã tổng hợp ${res.length} phiếu lương cho kỳ ${payload.pay_period}.`, `Generated ${res.length} payslips for ${payload.pay_period}.`),
      );
      setIsPayrollCalcOpen(false);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể tính bảng lương.', 'Failed to calculate payroll.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleUpdatePayroll = async (payrollId: number, payload: PayrollUpdatePayload) => {
    try {
      const updated = await updatePayrollMutation.mutateAsync({ payrollId, payload });
      setSelectedPayroll(updated);
      toast.success(t('Đã điều chỉnh phiếu lương', 'Payslip Updated'), t('Lương thực lĩnh đã được tính lại theo số liệu mới.', 'Net salary recalculated.'));
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể điều chỉnh phiếu lương.', 'Failed to update payslip.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleUpdatePayrollStatus = async (payrollId: number, status: 'Confirmed' | 'Paid') => {
    try {
      const updated = await updatePayrollStatusMutation.mutateAsync({ payrollId, status });
      setSelectedPayroll(updated);
      toast.success(
        t('Cập nhật trạng thái bảng lương', 'Payroll Status Updated'),
        t(`Phiếu lương #${payrollId} đã chuyển sang ${statusLabel(status)}.`, `Payslip #${payrollId} marked as ${statusLabel(status)}.`),
      );
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể chuyển trạng thái bảng lương.', 'Failed to update payroll status.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleCreateCandidate = async (payload: CandidateCreatePayload) => {
    try {
      await createCandidateMutation.mutateAsync(payload);
      toast.success(t('Đã thêm ứng viên', 'Candidate Added'), t(`${payload.full_name} đã được lưu vào phễu tuyển dụng.`, `${payload.full_name} saved to recruitment pipeline.`));
      setCandidateModalState({ isOpen: false, candidate: null, mode: 'view' });
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể tạo hồ sơ ứng viên.', 'Failed to create candidate.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleUpdateCandidate = async (candidateId: number, payload: Partial<CandidateCreatePayload>) => {
    try {
      await updateCandidateMutation.mutateAsync({ candidateId, payload });
      toast.success(t('Đã cập nhật hồ sơ ứng viên', 'Candidate Updated'), t(`Ứng viên #${candidateId} đã được cập nhật.`, `Candidate #${candidateId} updated.`));
      setCandidateModalState({ isOpen: false, candidate: null, mode: 'view' });
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể cập nhật ứng viên.', 'Failed to update candidate.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleConfirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    try {
      await deleteCandidateMutation.mutateAsync(candidateToDelete.id);
      toast.success(t('Đã lưu trữ ứng viên', 'Candidate Archived'), t(`Hồ sơ ${candidateToDelete.full_name} đã được xóa mềm.`, `${candidateToDelete.full_name} archived.`));
      setCandidateToDelete(null);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể xóa ứng viên.', 'Failed to delete candidate.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleOnboardCandidate = async (candidateId: number, payload: CandidateOnboardPayload) => {
    try {
      const res = await onboardCandidateMutation.mutateAsync({ candidateId, payload });
      toast.success(
        t('Onboard nhân sự thành công', 'Onboarding Complete'),
        t(
          `Đã tạo NV #${res.converted_employee_id ?? ''} và khởi tạo hồ sơ hợp đồng / phép năm.`,
          `Created Employee #${res.converted_employee_id ?? ''} along with contract & leave quota.`,
        ),
      );
      setCandidateToOnboard(null);
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể thực hiện Onboard ứng viên.', 'Onboarding failed.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  const handleCreateBackupLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBackupMutation.mutateAsync({
        backup_type: backupType,
        database_name: backupDbName.trim() || 'TaskSyncEnterprise',
        backup_path: backupPath.trim() || undefined,
        status: backupStatus,
        notes: backupNotes.trim() || undefined,
      });
      toast.success(t('Đã ghi nhật ký sao lưu', 'Backup Logged'), t('Bản ghi Backup Governance đã được lưu vào CSDL.', 'Backup governance record saved.'));
      setIsBackupModalOpen(false);
      setBackupPath('');
      setBackupNotes('');
    } catch (err) {
      const apiErr = extractApiError(err, t('Không thể ghi nhật ký Backup.', 'Failed to log backup.'));
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  // Standardized Column Definitions for DataTableWrapper
  const attendanceColumns = React.useMemo<ColumnDef<AttendanceLogItem, unknown>[]>(
    () => [
      {
        accessorKey: 'work_date',
        header: t('Ngày', 'Date'),
        cell: ({ row }) => <span className="font-mono font-medium">{formatDate(row.original.work_date)}</span>,
      },
      {
        id: 'employee',
        header: t('Nhân sự', 'Employee'),
        cell: ({ row }) => (
          <span className="font-semibold text-text-primary">
            {employeeNameMap.get(row.original.employee_id) || `NV #${row.original.employee_id}`}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('Trạng thái', 'Status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'check_in',
        header: 'Check-in',
        cell: ({ row }) => (
          <span className="font-mono text-text-muted">
            {formatTimeHHMMSS(row.original.check_in)}
          </span>
        ),
      },
      {
        id: 'check_out',
        header: 'Check-out',
        cell: ({ row }) => (
          <span className="font-mono text-text-muted">
            {formatTimeHHMMSS(row.original.check_out)}
          </span>
        ),
      },
      {
        accessorKey: 'work_hours',
        header: t('Giờ làm', 'Work Hrs'),
        cell: ({ row }) => <span className="font-semibold">{Number(row.original.work_hours || 0).toFixed(2)}h</span>,
      },
      {
        accessorKey: 'overtime_hours',
        header: 'OT',
        cell: ({ row }) => (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {Number(row.original.overtime_hours || 0).toFixed(2)}h
          </span>
        ),
      },
      {
        id: 'actions',
        header: t(GLOBAL_ACTION_TEXT.actionsHeader.vi, GLOBAL_ACTION_TEXT.actionsHeader.en),
        cell: ({ row }) => {
          const isSelf = Number(row.original.employee_id) === Number(user?.id);
          const canEditRow = isAdmin || (isManager && !isSelf);
          return (
            <EntityActions
              layout="menu"
              align="center"
              onView={() => {
                setAttendanceInitialEditMode(false);
                setSelectedAttendance(row.original);
              }}
              onEdit={
                canEditRow
                  ? () => {
                      setAttendanceInitialEditMode(true);
                      setSelectedAttendance(row.original);
                    }
                  : undefined
              }
            />
          );
        },
      },
    ],
    [employeeNameMap, formatDate, isAdmin, isManager, t, user?.id],
  );

  const payrollColumns = React.useMemo<ColumnDef<PayrollItem, unknown>[]>(
    () => [
      {
        id: 'employee',
        header: t('Nhân sự', 'Employee'),
        cell: ({ row }) => (
          <span className="font-semibold text-text-primary">
            {employeeNameMap.get(row.original.employee_id) || `NV #${row.original.employee_id}`}
          </span>
        ),
      },
      {
        accessorKey: 'pay_period',
        header: t('Kỳ lương', 'Period'),
        cell: ({ row }) => <span className="font-mono font-semibold">{row.original.pay_period}</span>,
      },
      {
        id: 'days',
        header: t('Công / Chuẩn', 'Work / Std'),
        cell: ({ row }) => (
          <span>
            <strong>{row.original.actual_work_days}</strong> (+{row.original.paid_leave_days}P) / {row.original.standard_work_days}
          </span>
        ),
      },
      {
        id: 'overtime',
        header: t('Giờ / Lương OT', 'OT Pay'),
        cell: ({ row }) => (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            {row.original.overtime_hours}h · {formatVndCurrency(row.original.overtime_pay, row.original.currency)}
          </span>
        ),
      },
      {
        id: 'adjustments',
        header: t('Thưởng / Trừ', 'Bonus / Ded'),
        cell: ({ row }) => (
          <span>
            <span className="text-emerald-600 dark:text-emerald-400">+{Number(row.original.bonus).toLocaleString('vi-VN')}</span>
            {' / '}
            <span className="text-rose-600 dark:text-rose-400">-{Number(row.original.deduction).toLocaleString('vi-VN')}</span>
          </span>
        ),
      },
      {
        accessorKey: 'net_salary',
        header: t('Thực lĩnh (Net)', 'Net Salary'),
        cell: ({ row }) => (
          <span className="font-bold text-primary">
            {formatVndCurrency(row.original.net_salary, row.original.currency)}
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
          <div className="flex justify-center">
            <IconActionButton
              tone="outline"
              icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
              label={t('Xem phiếu lương', 'View Payslip')}
              onClick={() => setSelectedPayroll(row.original)}
            />
          </div>
        ),
      },
    ],
    [employeeNameMap, t],
  );

  const overtimeColumns = React.useMemo<ColumnDef<OvertimeRequestItem, unknown>[]>(
    () => [
      {
        id: 'employee',
        header: t('Nhân sự', 'Employee'),
        cell: ({ row }) => (
          <span className="font-semibold text-text-primary">
            {employeeNameMap.get(row.original.employee_id) || `NV #${row.original.employee_id}`}
          </span>
        ),
      },
      {
        accessorKey: 'work_date',
        header: t('Ngày OT', 'OT Date'),
        cell: ({ row }) => <span className="font-mono">{formatDate(row.original.work_date)}</span>,
      },
      {
        accessorKey: 'hours',
        header: t('Số giờ', 'Hours'),
        cell: ({ row }) => <span className="font-bold text-primary">{row.original.hours}h</span>,
      },
      {
        id: 'project',
        header: t('Dự án / Lý do', 'Project / Reason'),
        cell: ({ row }) => (
          <div className="max-w-xs truncate">
            {row.original.project_id && (
              <span className="text-primary font-semibold mr-1.5">
                {projectNameMap.get(row.original.project_id) || `#${row.original.project_id}`}
              </span>
            )}
            <span className="text-text-muted">{row.original.reason || '—'}</span>
          </div>
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
        cell: ({ row }) => {
          const ot = row.original;
          const isOwner = Number(ot.employee_id) === Number(user?.id);
          const canApproveManager = canManageHrm && !isOwner && ot.status === 'Pending';
          const canApproveHr = isAdmin && (ot.status === 'Pending' || ot.status === 'Manager Approved');
          const canReject = canManageHrm && !isOwner && (ot.status === 'Pending' || ot.status === 'Manager Approved');
          const canDeleteOt = isAdmin || (isOwner && ot.status === 'Pending');
          const otExtraMenuItems: EntityActionsExtraItem[] = [];
          if ((isTeamLeader || canManageHrm) && ot.status === 'Pending') {
            otExtraMenuItems.push({
              key: 'leader-note',
              label: t('Ghi chú Trưởng nhóm', 'Leader Note'),
              icon: <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />,
              onClick: () => {
                setLeaderNoteTarget(ot);
                setLeaderNoteText(ot.team_leader_note || '');
              },
            });
          }
          if (canApproveManager) {
            otExtraMenuItems.push({
              key: 'manager-approve',
              label: t('Manager Duyệt', 'Manager Approve'),
              icon: <UserCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />,
              onClick: () => handleUpdateOvertimeStatus(ot.id, 'Manager Approved'),
            });
          }
          if (canApproveHr) {
            otExtraMenuItems.push({
              key: 'hr-approve',
              label: t('HR Duyệt', 'HR Approve'),
              icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />,
              onClick: () => handleUpdateOvertimeStatus(ot.id, 'HR Approved'),
            });
          }
          if (canReject) {
            otExtraMenuItems.push({
              key: 'reject',
              label: t('Từ chối', 'Reject'),
              icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
              destructive: true,
              onClick: () => handleUpdateOvertimeStatus(ot.id, 'Rejected'),
            });
          }
          if (isOwner && ot.status === 'Pending') {
            otExtraMenuItems.push({
              key: 'withdraw',
              label: t('Rút đơn', 'Withdraw'),
              icon: <Undo2 className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />,
              onClick: () => handleUpdateOvertimeStatus(ot.id, 'Withdrawn'),
            });
          }
          return (
            <EntityActions
              layout="menu"
              align="center"
              onView={() => setSelectedOvertime(ot)}
              onDelete={canDeleteOt ? () => setOvertimeToDelete(ot) : undefined}
              extraMenuItems={otExtraMenuItems}
            />
          );
        },
      },
    ],
    [canManageHrm, employeeNameMap, formatDate, handleUpdateOvertimeStatus, isAdmin, isTeamLeader, projectNameMap, t, user?.id],
  );

  const contractColumns = React.useMemo<ColumnDef<EmploymentContractItem, unknown>[]>(
    () => [
      {
        accessorKey: 'contract_code',
        header: t('Mã HĐ', 'Code'),
        cell: ({ row }) => <span className="font-mono font-semibold text-primary">{row.original.contract_code}</span>,
      },
      {
        id: 'employee',
        header: t('Nhân sự', 'Employee'),
        cell: ({ row }) => (
          <span className="font-semibold text-text-primary">
            {employeeNameMap.get(row.original.employee_id) || `NV #${row.original.employee_id}`}
          </span>
        ),
      },
      {
        accessorKey: 'contract_type',
        header: t('Loại hợp đồng', 'Type'),
      },
      {
        id: 'compensation',
        header: t('Lương / Phụ cấp', 'Salary / Allow'),
        cell: ({ row }) => (
          <div>
            <span className="font-semibold text-text-primary block">
              {formatVndCurrency(row.original.base_salary, row.original.currency)}
            </span>
            <span className="text-[11px] text-text-muted">
              {t('PC:', 'Allow:')} {formatVndCurrency(row.original.allowance, row.original.currency)}
            </span>
          </div>
        ),
      },
      {
        id: 'duration',
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
            layout="menu"
            align="center"
            onView={() => setSelectedContractDetail(row.original)}
            onEdit={canManageHrm ? () => openEditContractModal(row.original) : undefined}
            onDelete={isAdmin ? () => setContractToDelete(row.original) : undefined}
          />
        ),
      },
    ],
    [canManageHrm, employeeNameMap, formatDate, isAdmin, t],
  );

  const leaveBalanceColumns = React.useMemo<ColumnDef<LeaveBalanceItem, unknown>[]>(
    () => [
      {
        id: 'employee',
        header: t('Nhân sự', 'Employee'),
        cell: ({ row }) => (
          <span className="font-semibold text-text-primary">
            {employeeNameMap.get(row.original.employee_id) || `NV #${row.original.employee_id}`}
          </span>
        ),
      },
      { accessorKey: 'leave_year', header: t('Năm', 'Year') },
      { accessorKey: 'annual_entitlement', header: t('Phép năm', 'Annual') },
      { accessorKey: 'carried_over_days', header: t('Tồn', 'Carried') },
      { accessorKey: 'used_days', header: t('Đã dùng', 'Used') },
      { accessorKey: 'pending_days', header: t('Giữ chỗ', 'Pending') },
      {
        accessorKey: 'remaining_days',
        header: t('Còn lại', 'Remaining'),
        cell: ({ row }) => <span className="font-bold text-primary">{row.original.remaining_days} {t('ngày', 'd')}</span>,
      },
      ...(canManageHrm
        ? [
            {
              id: 'actions',
              header: t(GLOBAL_ACTION_TEXT.actionsHeader.vi, GLOBAL_ACTION_TEXT.actionsHeader.en),
              cell: ({ row }: { row: { original: LeaveBalanceItem } }) => (
                <div className="flex justify-center">
                  <IconActionButton
                    tone="outline"
                    icon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                    label={t('Điều chỉnh', 'Adjust')}
                    onClick={() => openAdjustLeaveBalance(row.original)}
                  />
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManageHrm, employeeNameMap, openAdjustLeaveBalance, t],
  );

  const candidateColumns = React.useMemo<ColumnDef<CandidateItem, unknown>[]>(
    () => [
      {
        id: 'name',
        header: t('Ứng viên', 'Candidate'),
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-text-primary block">{row.original.full_name}</span>
            <span className="text-[11px] text-text-muted">{row.original.email}</span>
          </div>
        ),
      },
      { accessorKey: 'applied_position', header: t('Vị trí ứng tuyển', 'Position') },
      {
        id: 'department',
        header: t('Phòng ban', 'Department'),
        cell: ({ row }) => (
          <span>{row.original.department_id ? departmentNameMap.get(row.original.department_id) || `#${row.original.department_id}` : '—'}</span>
        ),
      },
      {
        accessorKey: 'stage',
        header: t('Giai đoạn', 'Stage'),
        cell: ({ row }) => <StatusBadge status={row.original.stage} />,
      },
      {
        id: 'salary',
        header: t('Kỳ vọng', 'Expected'),
        cell: ({ row }) => (
          <span>{row.original.expected_salary ? formatVndCurrency(row.original.expected_salary) : '—'}</span>
        ),
      },
      {
        id: 'interview',
        header: t('Ngày PV', 'Interview'),
        cell: ({ row }) => <span>{row.original.interview_date ? formatDate(row.original.interview_date) : '—'}</span>,
      },
      {
        id: 'actions',
        header: t(GLOBAL_ACTION_TEXT.actionsHeader.vi, GLOBAL_ACTION_TEXT.actionsHeader.en),
        cell: ({ row }) => {
          const candidateExtraItems: EntityActionsExtraItem[] =
            isAdmin && !row.original.converted_employee_id && row.original.stage !== 'Rejected'
              ? [
                  {
                    key: 'onboard',
                    label: t('Onboard Nhân sự', 'Onboard Employee'),
                    icon: <UserPlus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />,
                    onClick: () => setCandidateToOnboard(row.original),
                  },
                ]
              : [];

          return (
            <EntityActions
              layout="menu"
              align="center"
              onView={() => setCandidateModalState({ isOpen: true, candidate: row.original, mode: 'view' })}
              onEdit={() => setCandidateModalState({ isOpen: true, candidate: row.original, mode: 'edit' })}
              onDelete={isAdmin ? () => setCandidateToDelete(row.original) : undefined}
              extraMenuItems={candidateExtraItems}
            />
          );
        },
      },
    ],
    [departmentNameMap, formatDate, isAdmin, t],
  );

  const conflictColumns = React.useMemo<ColumnDef<LeaveTaskConflictItem, unknown>[]>(
    () => [
      { accessorKey: 'employee_name', header: t('Nhân sự', 'Employee') },
      {
        id: 'task',
        header: 'Task',
        cell: ({ row }) => (
          <span>
            <span className="font-mono text-primary mr-1.5">#{row.original.task_id}</span>
            {row.original.task_title}
          </span>
        ),
      },
      {
        id: 'deadline',
        header: t('Deadline Task', 'Task Deadline'),
        cell: ({ row }) => (
          <span className="font-medium text-amber-600 dark:text-amber-400">{formatDate(row.original.task_deadline)}</span>
        ),
      },
      {
        id: 'leave_range',
        header: t('Kỳ nghỉ phép', 'Leave Period'),
        cell: ({ row }) => <span>{formatDate(row.original.leave_start_date)} → {formatDate(row.original.leave_end_date)}</span>,
      },
      {
        accessorKey: 'vacation_status',
        header: t('Trạng thái', 'Status'),
        cell: ({ row }) => <StatusBadge status={row.original.vacation_status} />,
      },
    ],
    [formatDate, t],
  );

  const backupColumns = React.useMemo<ColumnDef<BackupHistoryItem, unknown>[]>(
    () => [
      { accessorKey: 'backup_type', header: t('Loại Backup', 'Type') },
      {
        accessorKey: 'database_name',
        header: 'Database',
        cell: ({ row }) => <span className="font-mono">{row.original.database_name}</span>,
      },
      {
        id: 'path',
        header: t('Đường dẫn', 'Path'),
        cell: ({ row }) => <span className="text-text-muted max-w-xs truncate block">{row.original.backup_path || '—'}</span>,
      },
      {
        accessorKey: 'status',
        header: t('Trạng thái', 'Status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'created_at',
        header: t('Thời gian', 'Timestamp'),
        cell: ({ row }) => <span>{formatDate(row.original.created_at)}</span>,
      },
    ],
    [formatDate, t],
  );

  const totalPayrollNet = React.useMemo(
    () => payrolls.reduce((sum, p) => sum + Number(p.net_salary || 0), 0),
    [payrolls],
  );

  const tabs = [
    { id: 'attendance', label: t('Chấm công', 'Attendance'), icon: <CalendarClock className="h-4 w-4" /> },
    {
      id: 'payroll',
      label: t('Tính lương (Payroll)', 'Payroll'),
      icon: <DollarSign className="h-4 w-4" />,
      badge: payrolls.length || undefined,
    },
    {
      id: 'overtime',
      label: t('Tăng ca (OT)', 'Overtime'),
      icon: <Clock className="h-4 w-4" />,
      badge: overtimeRequests.filter((ot) => ot.status === 'Pending' || ot.status === 'Manager Approved').length || undefined,
    },
    { id: 'contracts', label: t('Hợp đồng & Quỹ phép', 'Contracts & Leave'), icon: <FileSignature className="h-4 w-4" /> },
    ...(canManageHrm
      ? [
          {
            id: 'recruitment',
            label: t('Tuyển dụng & Onboarding', 'Recruitment'),
            icon: <Users className="h-4 w-4" />,
            badge: candidates.length || undefined,
          },
        ]
      : []),
    {
      id: 'governance',
      label: isAdmin ? t('Xung đột & Backup', 'Conflicts & Backup') : t('Xung đột Lịch', 'Schedule Conflicts'),
      icon: <ShieldCheck className="h-4 w-4" />,
      badge: conflicts.length || undefined,
    },
  ];

  return (
    <div className="space-y-6 font-sans pb-12">
      <PageHeader
        title={t('Trung tâm Nhân sự (HRM, Chấm công & Lương)', 'HRM, Attendance & Payroll Hub')}
        description={t(
          'Quản trị Chấm công, Tính lương tháng, Duyệt Tăng ca 3 cấp, Hợp đồng, Quỹ phép & Tuyển dụng Onboarding',
          'Manage Attendance, Monthly Payroll, 3-Tier Overtime, Contracts, Leave Balances & Recruitment',
        )}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'HRM Hub' },
            ]}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
            {canManageHrm && (
              <div className="w-full sm:w-64">
                <Select
                  aria-label="Lọc theo nhân viên"
                  value={selectedEmployeeFilter}
                  onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                  options={employeeOptions}
                />
              </div>
            )}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsOvertimeModalOpen(true)}
            >
              {t('Đăng ký Tăng ca', 'Request OT')}
            </Button>
          </div>
        }
      />

      {/* 360 HRM Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="hrm-overview-grid">
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-muted">{t('Quỹ phép năm còn lại', 'Remaining Leave')}</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {overviewLoading ? '—' : `${overview?.leave_balance?.remaining_days ?? 0} ${t('ngày', 'days')}`}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {t(
                  `Đã dùng ${overview?.leave_balance?.used_days ?? 0} · Giữ chỗ ${overview?.leave_balance?.pending_days ?? 0}`,
                  `Used ${overview?.leave_balance?.used_days ?? 0} · Pending ${overview?.leave_balance?.pending_days ?? 0}`,
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-muted">{t('Chấm công tháng này', 'Monthly Attendance')}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {overviewLoading ? '—' : `${overview?.attendance_days_this_month ?? 0} ${t('ngày', 'days')}`}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {overview?.total_work_hours_this_month ?? 0}h {t('làm', 'work')} · {overview?.total_overtime_hours_this_month ?? 0}h OT
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <CalendarClock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-muted">{t('Hợp đồng hiện tại', 'Active Contract')}</p>
              <p className="text-lg font-bold text-text-primary mt-1 break-words">
                {overview?.active_contract ? overview.active_contract.contract_code : t('Chưa có hợp đồng', 'None')}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {overview?.active_contract
                  ? `${overview.active_contract.contract_type} · ${statusLabel(overview.active_contract.status)}`
                  : t('Liên hệ HR / Admin để cập nhật', 'Contact HR / Admin')}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
              <FileSignature className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-muted">{t('Xung đột Phép & Deadline', 'Leave Conflicts')}</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {overview?.leave_task_conflicts?.length ?? conflicts.length}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {overview?.pending_leave_requests ?? 0} {t('đơn nghỉ', 'leaves')} · {overview?.pending_overtime_requests ?? 0} {t('phiếu OT chờ', 'pending OT')}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as HrmTabId)} />

      {/* TAB 1: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t(`Chấm công hôm nay (${formatDate(getTodayIso())})`, `Today Attendance (${formatDate(getTodayIso())})`)}</CardTitle>
              <CardDescription>
                {t('Ghi nhận Check-in / Check-out hằng ngày và tự động tính số giờ làm việc / tăng ca (> 8h)', 'Daily Check-in / Check-out with automated work & overtime calculation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="min-w-0">
                  <Select
                    label={t('Hình thức làm việc', 'Work Mode')}
                    value={checkInStatus}
                    onChange={(e) => setCheckInStatus(e.target.value as 'Present' | 'Remote')}
                    options={[
                      { value: 'Present', label: t('Tại văn phòng (Present)', 'On-site (Present)') },
                      { value: 'Remote', label: t('Làm việc từ xa (Remote)', 'Remote') },
                    ]}
                  />
                </div>
                <div className="min-w-0">
                  <Input
                    label={t('Ghi chú chấm công', 'Attendance Note')}
                    placeholder={t('Ví dụ: Họp Sprint Planning sáng', 'e.g., Morning Sprint Planning...')}
                    value={attendanceNote}
                    onChange={(e) => setAttendanceNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  variant="primary"
                  leftIcon={<LogIn className="h-4 w-4" />}
                  onClick={handleCheckIn}
                  isLoading={checkInMutation.isPending}
                  disabled={Boolean(todayAttendance?.check_in)}
                  className="min-w-[140px] shrink-0"
                >
                  {todayAttendance?.check_in
                    ? `${t('Đã Check-in', 'Checked in')} (${formatTimeHHMM(todayAttendance.check_in)})`
                    : 'Check-in'}
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<LogOut className="h-4 w-4" />}
                  onClick={handleCheckOut}
                  isLoading={checkOutMutation.isPending}
                  disabled={!todayAttendance?.check_in || Boolean(todayAttendance?.check_out)}
                  className="min-w-[140px] shrink-0"
                >
                  {todayAttendance?.check_out
                    ? `${t('Đã Check-out', 'Checked out')} (${formatTimeHHMM(todayAttendance.check_out)})`
                    : 'Check-out'}
                </Button>
                {todayAttendance && isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil className="h-4 w-4" />}
                    onClick={() => {
                      setAttendanceInitialEditMode(true);
                      setSelectedAttendance(todayAttendance);
                    }}
                    className="shrink-0"
                  >
                    {t('Chỉnh sửa giờ hôm nay', 'Edit Today')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t(`Lịch sử Chấm công (${attendanceLogs.length})`, `Attendance History (${attendanceLogs.length})`)}</CardTitle>
              <CardDescription>
                {t(`Hiển thị tối đa ${defaultPageSize} dòng theo cấu hình Hệ thống.`, `Showing up to ${defaultPageSize} rows per System Settings.`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTableWrapper
                columns={attendanceColumns}
                data={visibleAttendance}
                isLoading={attendanceLoading}
                emptyDescription={t('Chưa có dữ liệu chấm công nào trong phạm vi lọc.', 'No attendance logs found in filter range.')}
                emptyActionLabel={t('Làm mới dữ liệu', 'Refresh')}
                onEmptyAction={() => {
                  void refetchAttendance();
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-text-muted">{t('Số phiếu lương kỳ', 'Payslips in Period')} {payPeriodFilter}</p>
                <p className="text-2xl font-bold text-text-primary mt-1">{payrolls.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-text-muted">{t('Tổng quỹ lương thực lĩnh', 'Total Net Payroll')}</p>
                <p className="text-2xl font-bold text-primary mt-1">{formatVndCurrency(totalPayrollNet)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-text-muted">{t('Đã chi trả (Paid)', 'Paid Count')}</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {payrolls.filter((p) => p.status === 'Paid').length} / {payrolls.length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>{t('Bảng lương Nhân sự (Payroll Engine)', 'Employee Payroll Records')}</CardTitle>
                <CardDescription>
                  {t('Tổng hợp từ Hợp đồng hiệu lực, Chấm công, Nghỉ phép & Giờ OT đã duyệt', 'Computed from active Contracts, Attendance, Leaves & Approved OT')}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-[228px]">
                  <MonthYearSelect
                    aria-label={t('Kỳ lương', 'Pay Period')}
                    size="sm"
                    value={payPeriodFilter}
                    onChange={setPayPeriodFilter}
                  />
                </div>
                {canManageHrm && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<DollarSign className="h-4 w-4" />}
                    onClick={() => setIsPayrollCalcOpen(true)}
                  >
                    {t('Tính lương kỳ này', 'Calculate Payroll')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DataTableWrapper
                columns={payrollColumns}
                data={visiblePayrolls}
                isLoading={payrollsLoading}
                emptyDescription={t(
                  `Chưa có bảng lương nào cho kỳ ${payPeriodFilter}. Nhấn "Tính lương kỳ này" để khởi tạo.`,
                  `No payroll records for ${payPeriodFilter}. Click "Calculate Payroll" to generate.`,
                )}
                emptyActionLabel={t('Làm mới dữ liệu', 'Refresh')}
                onEmptyAction={() => {
                  void refetchPayrolls();
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: OVERTIME */}
      {activeTab === 'overtime' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>{t('Phiếu Yêu cầu Làm thêm giờ (Overtime 3 cấp)', '3-Tier Overtime Requests')}</CardTitle>
              <CardDescription>
                {t(
                  'Nhân viên gửi phiếu → Trưởng nhóm xác nhận → Manager duyệt phòng ban → HR/Admin phê duyệt cuối',
                  'Employee Submits → Leader Verifies → Manager Approves → HR/Admin Final Approval',
                )}
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsOvertimeModalOpen(true)}
            >
              {t('Tạo phiếu Tăng ca', 'New Overtime')}
            </Button>
          </CardHeader>
          <CardContent>
            <DataTableWrapper
              columns={overtimeColumns}
              data={overtimeRequests}
              isLoading={overtimeLoading}
              emptyDescription={t('Chưa có phiếu yêu cầu làm thêm giờ nào.', 'No overtime requests found.')}
              emptyActionLabel={t('Làm mới dữ liệu', 'Refresh')}
              onEmptyAction={() => {
                void refetchOvertime();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* TAB 4: CONTRACTS & LEAVE BALANCES */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>{t('Quản lý Hợp đồng Lao động', 'Employment Contracts')}</CardTitle>
                <CardDescription>
                  {t('Nhân viên chỉ xem hợp đồng của bản thân; Manager/Admin quản trị hợp đồng trong phạm vi quyền', 'View contracts and salary compensation terms')}
                </CardDescription>
              </div>
              {canManageHrm && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Wallet className="h-4 w-4" />}
                    onClick={() => openAdjustLeaveBalance()}
                  >
                    {t('Điều chỉnh Quỹ phép', 'Adjust Leave')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={openCreateContractModal}
                  >
                    {t('Tạo Hợp đồng', 'New Contract')}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <DataTableWrapper
                columns={contractColumns}
                data={contracts}
                isLoading={contractsLoading}
                emptyDescription={t('Chưa có hợp đồng lao động nào trong phạm vi truy cập.', 'No employment contracts found.')}
                emptyActionLabel={t('Làm mới dữ liệu', 'Refresh')}
                onEmptyAction={() => {
                  void refetchContracts();
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Quỹ phép năm Nhân sự (Leave Balances)', 'Annual Leave Balances')}</CardTitle>
              <CardDescription>
                {t('Theo dõi hạn mức, ngày phép đã nghỉ, giữ chỗ và số ngày còn lại trong năm', 'Track annual entitlement, used, pending & remaining days')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTableWrapper
                columns={leaveBalanceColumns}
                data={leaveBalances}
                isLoading={leaveBalancesLoading}
                emptyDescription={t('Chưa có bản ghi quỹ phép năm nào.', 'No leave balance records found.')}
                emptyActionLabel={t('Làm mới dữ liệu', 'Refresh')}
                onEmptyAction={() => {
                  void refetchLeaveBalances();
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: RECRUITMENT & ONBOARDING (ADMIN / MANAGER) */}
      {activeTab === 'recruitment' && canManageHrm && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>{t('Tuyển dụng & Onboarding Nhân sự', 'Recruitment Pipeline & Onboarding')}</CardTitle>
              <CardDescription>
                {t(
                  'Theo dõi hồ sơ từ Tiếp nhận → Phỏng vấn → Offer. Admin có thể bấm Onboard để tạo tài khoản + hợp đồng ngay.',
                  'Track candidates across stages. Admins can one-click Onboard hired candidates into employees.',
                )}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-44">
                <Select
                  aria-label={t('Lọc giai đoạn', 'Filter Stage')}
                  value={candidateStageFilter}
                  onChange={(e) => setCandidateStageFilter(e.target.value)}
                  options={[
                    { value: '', label: t('Tất cả giai đoạn', 'All Stages') },
                    { value: 'Applied', label: statusLabel('Applied') },
                    { value: 'Screening', label: statusLabel('Screening') },
                    { value: 'Interview', label: statusLabel('Interview') },
                    { value: 'Offer', label: statusLabel('Offer') },
                    { value: 'Hired', label: statusLabel('Hired') },
                    { value: 'Rejected', label: statusLabel('Rejected') },
                  ]}
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => setCandidateModalState({ isOpen: true, candidate: null, mode: 'create' })}
              >
                {t('Thêm Ứng viên', 'Add Candidate')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTableWrapper
              columns={candidateColumns}
              data={candidates}
              isLoading={candidatesLoading}
              emptyDescription={t('Chưa có hồ sơ ứng viên nào trong phễu tuyển dụng.', 'No candidates in pipeline yet.')}
              emptyActionLabel={t('Làm mới dữ liệu', 'Refresh')}
              onEmptyAction={() => {
                void refetchCandidates();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* TAB 6: CONFLICTS & ADMIN BACKUP */}
      {activeTab === 'governance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t(`Xung đột Nghỉ phép & Deadline Công việc (${conflicts.length})`, `Leave vs Task Deadline Conflicts (${conflicts.length})`)}</CardTitle>
              <CardDescription>
                {t(
                  'Cảnh báo tự động khi nhân sự được phân công Task chưa hoàn thành có deadline nằm trong khoảng ngày nghỉ phép',
                  'Automatic alert when an assigned open task deadline falls inside an approved or pending leave period',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <EmptyState type="no-data" description={t('Không phát hiện xung đột lịch nghỉ phép và deadline công việc nào.', 'No schedule conflicts detected.')} />
              ) : (
                <DataTableWrapper columns={conflictColumns} data={conflicts} />
              )}
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>{t('Nhật ký Sao lưu & Rollback CSDL (Admin Governance)', 'Database Backup & Rollback Logs')}</CardTitle>
                  <CardDescription>
                    {t(
                      'Theo dõi và ghi nhận trạng thái Backup FULL / DIFFERENTIAL / LOGICAL_ROLLBACK trên SQL Server',
                      'Monitor and record SQL Server FULL / DIFFERENTIAL / LOGICAL_ROLLBACK backup logs',
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<DatabaseBackup className="h-4 w-4" />}
                  onClick={() => setIsBackupModalOpen(true)}
                >
                  {t('Ghi nhận Backup Log', 'Log Backup')}
                </Button>
              </CardHeader>
              <CardContent>
                <DataTableWrapper
                  columns={backupColumns}
                  data={backups}
                  isLoading={backupsLoading}
                  emptyDescription={t('Chưa có bản ghi backup nào được ghi nhận qua hệ thống.', 'No backup history logs recorded yet.')}
                  emptyActionLabel={t('Làm mới dữ liệu', 'Refresh')}
                  onEmptyAction={() => {
                    void refetchBackups();
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* POPUP MODALS FOR DETAILS & EDITS */}
      <AttendanceDetailModal
        isOpen={Boolean(selectedAttendance)}
        onClose={() => {
          setSelectedAttendance(null);
          setAttendanceInitialEditMode(false);
        }}
        attendance={selectedAttendance}
        employeeName={
          selectedAttendance
            ? employeeNameMap.get(selectedAttendance.employee_id) || `NV #${selectedAttendance.employee_id}`
            : ''
        }
        canEdit={Boolean(
          selectedAttendance &&
            (isAdmin || (isManager && Number(selectedAttendance.employee_id) !== Number(user?.id))),
        )}
        initialEditMode={attendanceInitialEditMode}
        isSubmitting={updateAttendanceMutation.isPending}
        onSave={handleSaveAttendanceUpdate}
      />

      <OvertimeDetailModal
        isOpen={Boolean(selectedOvertime)}
        onClose={() => setSelectedOvertime(null)}
        overtime={selectedOvertime}
        employeeName={
          selectedOvertime
            ? employeeNameMap.get(selectedOvertime.employee_id) || `NV #${selectedOvertime.employee_id}`
            : ''
        }
        projectOptions={projectOptions}
        canEdit={Boolean(
          selectedOvertime &&
            (isAdmin || (Number(selectedOvertime.employee_id) === Number(user?.id) && selectedOvertime.status === 'Pending')),
        )}
        isSubmitting={updateOvertimeMutation.isPending}
        onSave={handleSaveOvertimeUpdate}
      />

      <ContractDetailModal
        isOpen={Boolean(selectedContractDetail)}
        onClose={() => setSelectedContractDetail(null)}
        contract={selectedContractDetail}
        employeeName={
          selectedContractDetail
            ? employeeNameMap.get(selectedContractDetail.employee_id) || `NV #${selectedContractDetail.employee_id}`
            : ''
        }
        canEdit={canManageHrm}
        onEditClick={openEditContractModal}
      />

      <PayrollCalculateModal
        isOpen={isPayrollCalcOpen}
        onClose={() => setIsPayrollCalcOpen(false)}
        defaultPeriod={payPeriodFilter}
        employeeOptions={employeeOptions}
        isSubmitting={calculatePayrollsMutation.isPending}
        onCalculate={handleCalculatePayrolls}
      />

      <PayrollDetailModal
        isOpen={Boolean(selectedPayroll)}
        onClose={() => setSelectedPayroll(null)}
        payroll={selectedPayroll}
        employeeName={
          selectedPayroll
            ? employeeNameMap.get(selectedPayroll.employee_id) || `NV #${selectedPayroll.employee_id}`
            : ''
        }
        canManage={canManageHrm}
        canMarkPaid={isAdmin}
        isSelf={Boolean(selectedPayroll && Number(selectedPayroll.employee_id) === Number(user?.id))}
        isSubmitting={updatePayrollMutation.isPending || updatePayrollStatusMutation.isPending}
        onUpdate={handleUpdatePayroll}
        onUpdateStatus={handleUpdatePayrollStatus}
      />

      <CandidateModal
        isOpen={candidateModalState.isOpen}
        onClose={() => setCandidateModalState({ isOpen: false, candidate: null, mode: 'view' })}
        candidate={candidateModalState.candidate}
        initialMode={candidateModalState.mode}
        departmentOptions={departmentOptions}
        canEdit={canManageHrm}
        isSubmitting={createCandidateMutation.isPending || updateCandidateMutation.isPending}
        onCreate={handleCreateCandidate}
        onUpdate={handleUpdateCandidate}
        onOpenOnboard={isAdmin ? (c) => setCandidateToOnboard(c) : undefined}
      />

      <CandidateOnboardModal
        isOpen={Boolean(candidateToOnboard)}
        onClose={() => setCandidateToOnboard(null)}
        candidate={candidateToOnboard}
        departmentOptions={departmentOptions}
        isSubmitting={onboardCandidateMutation.isPending}
        onOnboard={handleOnboardCandidate}
      />

      {/* MODAL: CREATE OVERTIME REQUEST */}
      <Modal
        isOpen={isOvertimeModalOpen}
        onClose={() => setIsOvertimeModalOpen(false)}
        title={t('Đăng ký Làm thêm giờ (Overtime)', 'Submit Overtime Request')}
        description={t(
          'Phiếu sẽ được gửi tới Trưởng nhóm / Quản lý phòng ban và HR xem xét',
          'Your request will be sent to Team Leader / Department Manager and HR for review'
        )}
      >
        <form onSubmit={handleCreateOvertime} className="space-y-4">
          <Select
            label={t('Dự án liên quan (tùy chọn)', 'Related Project (optional)')}
            value={otProjectId}
            onChange={(e) => setOtProjectId(e.target.value)}
            options={projectOptions}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('Ngày tăng ca', 'Overtime Date')}
              type="date"
              value={otWorkDate}
              onChange={(e) => setOtWorkDate(e.target.value)}
              required
            />
            <Input
              label={t('Số giờ (tối đa 16h)', 'Hours (max 16h)')}
              type="number"
              step="0.5"
              min="0.5"
              max="16"
              value={otHours}
              onChange={(e) => setOtHours(e.target.value)}
              required
            />
          </div>
          <Textarea
            label={t('Lý do & công việc thực hiện', 'Reason & Tasks Performed')}
            placeholder={t('Mô tả hạng mục cần xử lý ngoài giờ...', 'Describe work to be completed after hours...')}
            value={otReason}
            onChange={(e) => setOtReason(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOvertimeModalOpen(false)}>
              {t('Hủy', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={createOvertimeMutation.isPending}>
              {t('Gửi phiếu Tăng ca', 'Submit Overtime')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: TEAM LEADER NOTE */}
      <Modal
        isOpen={Boolean(leaderNoteTarget)}
        onClose={() => setLeaderNoteTarget(null)}
        title={t('Ghi chú xác minh của Trưởng nhóm', 'Team Leader Verification Note')}
        description={`${t('Phiếu tăng ca', 'Overtime Request')} #${leaderNoteTarget?.id ?? ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmitLeaderNote} className="space-y-4">
          <Textarea
            label={t('Nội dung xác nhận', 'Verification Note')}
            placeholder={t('Ví dụ: Đã kiểm tra log commit & tiến độ Sprint...', 'e.g. Verified commit logs & Sprint progress...')}
            value={leaderNoteText}
            onChange={(e) => setLeaderNoteText(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setLeaderNoteTarget(null)}>
              {t('Đóng', 'Close')}
            </Button>
            <Button type="submit" variant="primary" isLoading={leaderNoteMutation.isPending}>
              {t('Lưu ghi chú', 'Save Note')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE / EDIT CONTRACT */}
      <Modal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        title={
          editingContract
            ? t(`Cập nhật hợp đồng ${editingContract.contract_code}`, `Update Contract ${editingContract.contract_code}`)
            : t('Phát hành Hợp đồng Lao động mới', 'Issue New Employment Contract')
        }
      >
        <form onSubmit={handleSaveContract} className="space-y-4">
          {!editingContract && (
            <Select
              label={t('Nhân sự', 'Employee')}
              value={contractEmpId}
              onChange={(e) => setContractEmpId(e.target.value)}
              options={employees.map((emp) => ({
                value: String(emp.id),
                label: `${emp.employee_code ? `${emp.employee_code} · ` : ''}${emp.full_name}`,
              }))}
              required
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('Mã hợp đồng', 'Contract Code')}
              value={contractCode}
              onChange={(e) => setContractCode(e.target.value)}
              disabled={Boolean(editingContract)}
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
              value={contractSalary}
              onChange={(e) => setContractSalary(e.target.value)}
              required
            />
            <Input
              label={t('Phụ cấp', 'Allowance')}
              type="number"
              min="0"
              value={contractAllowance}
              onChange={(e) => setContractAllowance(e.target.value)}
            />
            <Input
              label={t('Tiền tệ', 'Currency')}
              value={contractCurrency}
              onChange={(e) => setContractCurrency(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label={t('Ngày hiệu lực', 'Effective Date')}
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
              required
            />
            <Input
              label={t('Ngày kết thúc', 'End Date')}
              type="date"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
            />
            <Select
              label={t('Trạng thái', 'Status')}
              value={contractStatus}
              onChange={(e) => setContractStatus(e.target.value)}
              options={[
                { value: 'Active', label: statusLabel('Active') },
                { value: 'Draft', label: statusLabel('Draft') },
                { value: 'Expired', label: statusLabel('Expired') },
                { value: 'Terminated', label: statusLabel('Terminated') },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsContractModalOpen(false)}>
              {t('Hủy', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createContractMutation.isPending || updateContractMutation.isPending}
            >
              {t('Lưu hợp đồng', 'Save Contract')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADJUST LEAVE BALANCE */}
      <Modal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        title={t('Điều chỉnh Quỹ phép năm', 'Adjust Annual Leave Balance')}
        size="sm"
      >
        <form onSubmit={handleSaveLeaveBalance} className="space-y-4">
          <Select
            label={t('Nhân sự', 'Employee')}
            value={balanceEmpId}
            onChange={(e) => setBalanceEmpId(e.target.value)}
            options={employees.map((emp) => ({
              value: String(emp.id),
              label: `${emp.employee_code ? `${emp.employee_code} · ` : ''}${emp.full_name}`,
            }))}
            required
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label={t('Năm', 'Year')}
              type="number"
              min="2020"
              max="2100"
              value={balanceYear}
              onChange={(e) => setBalanceYear(e.target.value)}
              required
            />
            <Input
              label={t('Phép năm', 'Annual Entitlement')}
              type="number"
              step="0.5"
              min="0"
              max="365"
              value={balanceEntitlement}
              onChange={(e) => setBalanceEntitlement(e.target.value)}
              required
            />
            <Input
              label={t('Phép tồn', 'Carried Over')}
              type="number"
              step="0.5"
              min="0"
              max="365"
              value={balanceCarriedOver}
              onChange={(e) => setBalanceCarriedOver(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsBalanceModalOpen(false)}>
              {t('Hủy', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={adjustLeaveBalanceMutation.isPending}>
              {t('Cập nhật Quỹ phép', 'Update Balance')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RECORD BACKUP LOG (ADMIN ONLY) */}
      <Modal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        title={t('Ghi nhận Nhật ký Sao lưu CSDL', 'Record Database Backup Log')}
        description={t(
          'Lưu hồ sơ kiểm chứng Backup / Rollback vào bảng backup_history_logs',
          'Store Backup / Rollback verification records in backup_history_logs'
        )}
      >
        <form onSubmit={handleCreateBackupLog} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={t('Loại sao lưu', 'Backup Type')}
              value={backupType}
              onChange={(e) => setBackupType(e.target.value as BackupHistoryCreatePayload['backup_type'])}
              options={[
                { value: 'FULL', label: 'FULL' },
                { value: 'DIFFERENTIAL', label: 'DIFFERENTIAL' },
                { value: 'LOG', label: 'LOG' },
                { value: 'SNAPSHOT', label: 'SNAPSHOT' },
                { value: 'LOGICAL_ROLLBACK', label: 'LOGICAL_ROLLBACK' },
              ]}
            />
            <Select
              label={t('Trạng thái', 'Status')}
              value={backupStatus}
              onChange={(e) => setBackupStatus(e.target.value as BackupHistoryCreatePayload['status'])}
              options={[
                { value: 'VERIFIED', label: statusLabel('VERIFIED') },
                { value: 'SUCCESS', label: statusLabel('SUCCESS') },
                { value: 'RESTORED', label: statusLabel('RESTORED') },
                { value: 'FAILED', label: statusLabel('FAILED') },
              ]}
            />
          </div>
          <Input
            label={t('Tên Database', 'Database Name')}
            value={backupDbName}
            onChange={(e) => setBackupDbName(e.target.value)}
            required
          />
          <Input
            label={t('Đường dẫn file .bak', '.bak File Path')}
            placeholder={t('Ví dụ: C:\\Backup\\TaskSyncEnterprise_Full.bak', 'e.g. C:\\Backup\\TaskSyncEnterprise_Full.bak')}
            value={backupPath}
            onChange={(e) => setBackupPath(e.target.value)}
            leftIcon={<HardDriveDownload className="h-4 w-4" />}
          />
          <Textarea
            label={t('Ghi chú kiểm thử', 'Verification Notes')}
            placeholder="RESTORE VERIFYONLY passed..."
            value={backupNotes}
            onChange={(e) => setBackupNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsBackupModalOpen(false)}>
              {t('Hủy', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={createBackupMutation.isPending}>
              {t('Lưu Backup Log', 'Save Backup Log')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION MODALS */}
      <ConfirmationModal
        isOpen={Boolean(overtimeToDelete)}
        onClose={() => setOvertimeToDelete(null)}
        onConfirm={handleConfirmDeleteOvertime}
        title={t('Lưu trữ phiếu tăng ca', 'Archive Overtime Request')}
        message={t(
          `Bạn có chắc chắn muốn xóa mềm phiếu tăng ca #${overtimeToDelete?.id ?? ''}?`,
          `Are you sure you want to archive overtime request #${overtimeToDelete?.id ?? ''}?`
        )}
        confirmText={t('Xác nhận xóa mềm', 'Confirm Archive')}
        isLoading={deleteOvertimeMutation.isPending}
      />

      <ConfirmationModal
        isOpen={Boolean(contractToDelete)}
        onClose={() => setContractToDelete(null)}
        onConfirm={handleConfirmDeleteContract}
        title={t('Lưu trữ hợp đồng lao động', 'Archive Employment Contract')}
        message={t(
          `Bạn có chắc muốn xóa mềm hợp đồng ${contractToDelete?.contract_code || ''}? Dữ liệu vẫn được giữ trong Audit Log.`,
          `Are you sure you want to archive contract ${contractToDelete?.contract_code || ''}? Records remain in the Audit Log.`
        )}
        confirmText={t('Xác nhận lưu trữ', 'Confirm Archive')}
        isLoading={deleteContractMutation.isPending}
      />

      <ConfirmationModal
        isOpen={Boolean(candidateToDelete)}
        onClose={() => setCandidateToDelete(null)}
        onConfirm={handleConfirmDeleteCandidate}
        title={t('Lưu trữ hồ sơ ứng viên', 'Archive Candidate Profile')}
        message={t(
          `Bạn có chắc muốn lưu trữ ứng viên ${candidateToDelete?.full_name || ''}?`,
          `Are you sure you want to archive candidate ${candidateToDelete?.full_name || ''}?`
        )}
        confirmText={t('Xác nhận xóa mềm', 'Confirm Archive')}
        isLoading={deleteCandidateMutation.isPending}
      />
    </div>
  );
};

export default HRMHubPage;

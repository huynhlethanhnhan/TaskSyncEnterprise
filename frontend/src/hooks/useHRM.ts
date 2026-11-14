import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  hrmApi,
  type AttendanceUpdatePayload,
  type BackupHistoryCreatePayload,
  type CandidateCreatePayload,
  type CandidateOnboardPayload,
  type EmploymentContractCreatePayload,
  type EmploymentContractUpdatePayload,
  type LeaveBalanceAdjustPayload,
  type OvertimeRequestCreatePayload,
  type PayrollCalculatePayload,
  type PayrollUpdatePayload,
} from '../api/services';

export const useHrmOverview = () => {
  return useQuery({
    queryKey: ['hrm', 'overview'],
    queryFn: hrmApi.getOverview,
  });
};

export const useHrmLeaveBalanceMe = (leaveYear?: number) => {
  return useQuery({
    queryKey: ['hrm', 'leave-balance', 'me', leaveYear ?? 'current'],
    queryFn: () => hrmApi.getMyLeaveBalance(leaveYear),
  });
};

export const useHrmLeaveBalances = (params?: { leave_year?: number; employee_id?: number }) => {
  return useQuery({
    queryKey: ['hrm', 'leave-balances', params ?? {}],
    queryFn: () => hrmApi.listLeaveBalances(params),
  });
};

export const useHrmLeaveTaskConflicts = (params?: { employee_id?: number; project_id?: number }) => {
  return useQuery({
    queryKey: ['hrm', 'leave-task-conflicts', params ?? {}],
    queryFn: () => hrmApi.getLeaveTaskConflicts(params),
  });
};

export const useHrmContracts = (
  params?: { employee_id?: number; status_filter?: string },
  enabled = true,
) => {
  return useQuery({
    queryKey: ['hrm', 'contracts', params ?? {}],
    queryFn: () => hrmApi.listContracts(params),
    enabled,
  });
};

export const useHrmAttendance = (params?: {
  employee_id?: number;
  work_date_from?: string;
  work_date_to?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['hrm', 'attendance', params ?? {}],
    queryFn: () => hrmApi.listAttendance(params),
  });
};

export const useHrmOvertime = (params?: { status_filter?: string; employee_id?: number }) => {
  return useQuery({
    queryKey: ['hrm', 'overtime', params ?? {}],
    queryFn: () => hrmApi.listOvertime(params),
  });
};

export const useHrmBackups = (enabled = true, limit = 50) => {
  return useQuery({
    queryKey: ['hrm', 'backups', limit],
    queryFn: () => hrmApi.listBackups(limit),
    enabled,
  });
};

export const useCheckInAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: {
      work_date?: string;
      check_in?: string;
      status?: 'Present' | 'Remote';
      note?: string;
    }) => hrmApi.checkIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useCheckOutAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { work_date?: string; check_out?: string; note?: string }) =>
      hrmApi.checkOut(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useCreateOvertime = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OvertimeRequestCreatePayload) => hrmApi.createOvertime(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useAddOvertimeLeaderNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ overtimeId, note }: { overtimeId: number; note: string }) =>
      hrmApi.addOvertimeLeaderNote(overtimeId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useUpdateOvertimeStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      overtimeId,
      status,
      note,
    }: {
      overtimeId: number;
      status: string;
      note?: string;
    }) => hrmApi.updateOvertimeStatus(overtimeId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useDeleteOvertime = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overtimeId: number) => hrmApi.deleteOvertime(overtimeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmploymentContractCreatePayload) => hrmApi.createContract(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useUpdateContract = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      payload,
    }: {
      contractId: number;
      payload: EmploymentContractUpdatePayload;
    }) => hrmApi.updateContract(contractId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useDeleteContract = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contractId: number) => hrmApi.deleteContract(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useAdjustLeaveBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      payload,
    }: {
      employeeId: number;
      payload: LeaveBalanceAdjustPayload;
    }) => hrmApi.adjustLeaveBalance(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
    },
  });
};

export const useCreateBackupLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BackupHistoryCreatePayload) => hrmApi.createBackup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'backups'] });
    },
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ attendanceId, payload }: { attendanceId: number; payload: AttendanceUpdatePayload }) =>
      hrmApi.updateAttendance(attendanceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useUpdateOvertime = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      overtimeId,
      payload,
    }: {
      overtimeId: number;
      payload: Partial<OvertimeRequestCreatePayload>;
    }) => hrmApi.updateOvertime(overtimeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useHrmPayrolls = (params?: { pay_period?: string; employee_id?: number }) => {
  return useQuery({
    queryKey: ['hrm', 'payrolls', params ?? {}],
    queryFn: () => hrmApi.listPayrolls(params),
  });
};

export const useCalculatePayrolls = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayrollCalculatePayload) => hrmApi.calculatePayrolls(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useUpdatePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payrollId, payload }: { payrollId: number; payload: PayrollUpdatePayload }) =>
      hrmApi.updatePayroll(payrollId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useUpdatePayrollStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payrollId, status, note }: { payrollId: number; status: string; note?: string }) =>
      hrmApi.updatePayrollStatus(payrollId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
    },
  });
};

export const useHrmCandidates = (params?: { stage?: string }, enabled = true) => {
  return useQuery({
    queryKey: ['hrm', 'candidates', params ?? {}],
    queryFn: () => hrmApi.listCandidates(params),
    enabled,
  });
};

export const useCreateCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CandidateCreatePayload) => hrmApi.createCandidate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'candidates'] });
    },
  });
};

export const useUpdateCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      payload,
    }: {
      candidateId: number;
      payload: Partial<CandidateCreatePayload>;
    }) => hrmApi.updateCandidate(candidateId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'candidates'] });
    },
  });
};

export const useDeleteCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: number) => hrmApi.deleteCandidate(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'candidates'] });
    },
  });
};

export const useOnboardCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      payload,
    }: {
      candidateId: number;
      payload: CandidateOnboardPayload;
    }) => hrmApi.onboardCandidate(candidateId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

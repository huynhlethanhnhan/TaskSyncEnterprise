import { type BadgeVariant } from '../components/common/Badge';

export interface StatusMeta {
  variant: BadgeVariant;
  vi: string;
  en: string;
  showDot?: boolean;
}

const normalizeKey = (raw?: string | null): string =>
  (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const STATUS_META_MAP: Record<string, StatusMeta> = {
  // Task Workflow Statuses
  'to do': { variant: 'warning', vi: 'Cần làm', en: 'To Do', showDot: true },
  todo: { variant: 'warning', vi: 'Cần làm', en: 'To Do', showDot: true },
  'in progress': { variant: 'primary', vi: 'Đang thực hiện', en: 'In Progress', showDot: true },
  'in pregress': { variant: 'primary', vi: 'Đang thực hiện', en: 'In Progress', showDot: true },
  'in review': { variant: 'primary', vi: 'Chờ duyệt', en: 'In Review', showDot: true },
  review: { variant: 'primary', vi: 'Chờ duyệt', en: 'Review', showDot: true },
  done: { variant: 'success', vi: 'Hoàn thành', en: 'Done', showDot: true },
  blocked: { variant: 'danger', vi: 'Bị chặn', en: 'Blocked', showDot: true },

  // Task Priorities
  low: { variant: 'primary', vi: 'Thấp', en: 'Low' },
  medium: { variant: 'warning', vi: 'Trung bình', en: 'Medium' },
  high: { variant: 'danger', vi: 'Cao', en: 'High' },
  urgent: { variant: 'danger', vi: 'Khẩn cấp', en: 'Urgent' },
  critical: { variant: 'danger', vi: 'Nghiêm trọng', en: 'Critical' },

  // Project / Sprint Lifecycle
  planning: { variant: 'warning', vi: 'Lập kế hoạch', en: 'Planning', showDot: true },
  planned: { variant: 'warning', vi: 'Dự kiến', en: 'Planned', showDot: true },
  active: { variant: 'primary', vi: 'Đang hoạt động', en: 'Active', showDot: true },
  completed: { variant: 'success', vi: 'Hoàn thành', en: 'Completed', showDot: true },
  closed: { variant: 'outline', vi: 'Đã đóng', en: 'Closed' },
  'on hold': { variant: 'warning', vi: 'Tạm hoãn', en: 'On Hold', showDot: true },
  suspended: { variant: 'outline', vi: 'Tạm dừng', en: 'Suspended', showDot: true },

  // Leave & Overtime Approval Flow
  pending: { variant: 'warning', vi: 'Chờ duyệt', en: 'Pending', showDot: true },
  'info requested': { variant: 'warning', vi: 'Cần bổ sung TT', en: 'Info Requested', showDot: true },
  'team leader reviewed': { variant: 'primary', vi: 'Trưởng nhóm đã duyệt', en: 'Leader Reviewed', showDot: true },
  'manager approved': { variant: 'primary', vi: 'Quản lý đã duyệt', en: 'Manager Approved', showDot: true },
  'hr approved': { variant: 'success', vi: 'HR đã duyệt', en: 'HR Approved', showDot: true },
  approved: { variant: 'success', vi: 'Đã duyệt', en: 'Approved', showDot: true },
  rejected: { variant: 'danger', vi: 'Từ chối', en: 'Rejected', showDot: true },
  withdrawn: { variant: 'outline', vi: 'Đã rút đơn', en: 'Withdrawn', showDot: true },
  cancelled: { variant: 'outline', vi: 'Đã hủy', en: 'Cancelled', showDot: true },

  // Payroll Statuses
  draft: { variant: 'outline', vi: 'Nháp', en: 'Draft' },
  confirmed: { variant: 'primary', vi: 'Đã chốt', en: 'Confirmed' },
  calculated: { variant: 'primary', vi: 'Đã tính lương', en: 'Calculated' },
  paid: { variant: 'success', vi: 'Đã chi trả', en: 'Paid' },

  // Attendance Modes
  present: { variant: 'success', vi: 'Tại văn phòng', en: 'Present' },
  remote: { variant: 'primary', vi: 'Làm từ xa', en: 'Remote' },
  late: { variant: 'warning', vi: 'Đi muộn', en: 'Late' },
  leave: { variant: 'warning', vi: 'Nghỉ phép', en: 'On Leave' },
  'half day': { variant: 'warning', vi: 'Nửa ngày', en: 'Half Day' },
  absent: { variant: 'danger', vi: 'Vắng mặt', en: 'Absent' },

  // Employment Contracts & Offboarding
  expired: { variant: 'warning', vi: 'Hết hạn', en: 'Expired' },
  terminated: { variant: 'danger', vi: 'Đã nghỉ việc', en: 'Terminated' },
  'pending offboard': { variant: 'warning', vi: 'Chờ duyệt nghỉ', en: 'Pending Offboard', showDot: true },

  // Recruitment Pipeline
  applied: { variant: 'default', vi: 'Ứng tuyển', en: 'Applied' },
  screening: { variant: 'primary', vi: 'Sàng lọc CV', en: 'Screening' },
  interview: { variant: 'warning', vi: 'Phỏng vấn', en: 'Interview' },
  offer: { variant: 'primary', vi: 'Đề nghị (Offer)', en: 'Offer' },
  hired: { variant: 'success', vi: 'Đã tuyển', en: 'Hired' },

  // Active Flags / System States
  online: { variant: 'success', vi: 'Trực tuyến', en: 'Online', showDot: true },
  offline: { variant: 'outline', vi: 'Ngoại tuyến', en: 'Offline', showDot: true },
  enabled: { variant: 'success', vi: 'Hoạt động', en: 'Active', showDot: true },
  disabled: { variant: 'outline', vi: 'Tạm dừng', en: 'Inactive', showDot: true },
  verified: { variant: 'success', vi: 'Đã xác thực', en: 'Verified' },
  restored: { variant: 'primary', vi: 'Đã khôi phục', en: 'Restored' },
  success: { variant: 'success', vi: 'Thành công', en: 'Success' },
  failed: { variant: 'danger', vi: 'Thất bại', en: 'Failed' },
};

export function getStatusMeta(status?: string | null): StatusMeta {
  const key = normalizeKey(status);
  if (key && STATUS_META_MAP[key]) {
    return STATUS_META_MAP[key];
  }
  const fallback = status?.trim() || '—';
  return {
    variant: 'default',
    vi: fallback,
    en: fallback,
  };
}

export function getStatusLabel(status?: string | null, isEnglish = false): string {
  const meta = getStatusMeta(status);
  return isEnglish ? meta.en : meta.vi;
}

const SELECT_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-secondary text-secondary-foreground border-border/80 hover:border-border',
  primary:
    'bg-blue-50 text-blue-700 border-blue-200/90 hover:border-blue-400 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70',
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70',
  warning:
    'bg-amber-50 text-amber-800 border-amber-200/90 hover:border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70',
  danger:
    'bg-rose-50 text-rose-700 border-rose-200/90 hover:border-rose-400 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70',
  outline: 'bg-surface text-text-primary border-border/80 hover:border-primary/50',
};

const DOT_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  primary: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  outline: 'bg-slate-400',
};

export function getStatusSelectClass(status?: string | null): string {
  const meta = getStatusMeta(status);
  return SELECT_VARIANT_CLASSES[meta.variant] || SELECT_VARIANT_CLASSES.default;
}

export function getStatusDotClass(status?: string | null): string {
  const meta = getStatusMeta(status);
  return DOT_VARIANT_CLASSES[meta.variant] || DOT_VARIANT_CLASSES.default;
}

export const GLOBAL_ACTION_TEXT = {
  view: { vi: 'Chi tiết', en: 'Details' },
  edit: { vi: 'Chỉnh sửa', en: 'Edit' },
  delete: { vi: 'Xóa', en: 'Delete' },
  requestDelete: { vi: 'Yêu cầu xóa', en: 'Request Delete' },
  actionsHeader: { vi: 'Thao tác', en: 'Actions' },
} as const;

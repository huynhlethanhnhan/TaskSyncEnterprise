import * as React from 'react';
import {
  FolderOpen,
  SearchX,
  ShieldAlert,
  WifiOff,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  type?: 'no-data' | 'no-results' | 'permission-denied' | 'offline' | 'error';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}) => {
  const config = {
    'no-data': {
      defaultTitle: 'Chưa có dữ liệu',
      defaultDesc: 'Hiện chưa có bản ghi nào trong danh sách. Hãy tạo mới để bắt đầu.',
      icon: <FolderOpen className="h-10 w-10 text-text-muted" />,
    },
    'no-results': {
      defaultTitle: 'Không tìm thấy kết quả',
      defaultDesc: 'Không tìm thấy thông tin phù hợp với từ khóa hoặc bộ lọc đã chọn.',
      icon: <SearchX className="h-10 w-10 text-text-muted" />,
    },
    'permission-denied': {
      defaultTitle: 'Quyền truy cập bị từ chối',
      defaultDesc: 'Tài khoản của bạn không được cấp quyền truy cập tài nguyên này.',
      icon: <ShieldAlert className="h-10 w-10 text-rose-500" />,
    },
    offline: {
      defaultTitle: 'Mất kết nối mạng',
      defaultDesc: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền internet.',
      icon: <WifiOff className="h-10 w-10 text-amber-500" />,
    },
    error: {
      defaultTitle: 'Đã xảy ra lỗi hệ thống',
      defaultDesc: 'Không thể tải dữ liệu. Vui lòng thử lại sau giây lát.',
      icon: <AlertCircle className="h-10 w-10 text-rose-500" />,
    },
  }[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-border/80 bg-surface/40 my-4 space-y-4 animate-in fade-in zoom-in-95 duration-200',
        className
      )}
    >
      <div className="p-4 rounded-full bg-accent/60 flex items-center justify-center shadow-xs">
        {icon || config.icon}
      </div>

      <div className="max-w-md space-y-1.5">
        <h3 className="text-base font-bold text-text-primary tracking-tight">
          {title || config.defaultTitle}
        </h3>
        <p className="text-xs text-text-muted leading-relaxed">
          {description || config.defaultDesc}
        </p>
      </div>

      {onAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          className="mt-2"
        >
          {actionLabel || 'Tải lại trang'}
        </Button>
      )}
    </div>
  );
};

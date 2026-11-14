import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useSettings } from '../../providers/SettingsProvider';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  className,
}) => {
  const { t } = useSettings();
  const displayTitle = title ?? t('Đã xảy ra lỗi', 'Something went wrong');
  const displayMessage =
    message ?? t('Không thể tải dữ liệu cho mục này. Vui lòng thử lại.', 'An unexpected error occurred while loading this section. Please try again.');

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 sm:p-10 text-center rounded-lg border border-destructive/30 bg-rose-50/50 dark:bg-rose-950/20 text-text-primary select-none',
        className
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-destructive mb-3">
        <AlertTriangle className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-text-primary">{displayTitle}</h3>
      <p className="text-xs text-text-secondary max-w-md mt-1 mb-4">{displayMessage}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          {t('Thử lại', 'Try Again')}
        </Button>
      )}
    </div>
  );
};

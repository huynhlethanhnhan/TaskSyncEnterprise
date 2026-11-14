import * as React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { useSettings } from '../../providers/SettingsProvider';

export interface ForbiddenStateProps {
  title?: string;
  message?: string;
  onBack?: () => void;
}

export const ForbiddenState: React.FC<ForbiddenStateProps> = ({
  title,
  message,
  onBack,
}) => {
  const { t } = useSettings();
  const displayTitle = title ?? t('Truy cập bị từ chối (403 Forbidden)', 'Access Denied (403 Forbidden)');
  const displayMessage =
    message ??
    t(
      'Tài khoản của bạn không có đủ quyền hạn để thực hiện thao tác hoặc truy cập trang này. Vui lòng liên hệ Quản trị viên (Admin) để được phân quyền.',
      'Your account does not have sufficient permissions to perform this action or view this page. Please contact an Administrator.'
    );

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 max-w-md mx-auto">
      <div className="p-4 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
        <ShieldAlert className="h-10 w-10" />
      </div>

      <h3 className="text-lg font-bold text-text-primary">{displayTitle}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{displayMessage}</p>

      {onBack && (
        <div className="pt-2">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            {t('Quay lại', 'Go Back')}
          </Button>
        </div>
      )}
    </div>
  );
};

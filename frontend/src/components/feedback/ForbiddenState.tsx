import * as React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ForbiddenStateProps {
  title?: string;
  message?: string;
  onBack?: () => void;
}

export const ForbiddenState: React.FC<ForbiddenStateProps> = ({
  title = 'Truy cập bị từ chối (403 Forbidden)',
  message = 'Tài khoản của bạn không có đủ quyền hạn để thực hiện thao tác hoặc truy cập trang này. Vui lòng liên hệ Quản trị viên (Admin) để được phân quyền.',
  onBack,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 max-w-md mx-auto">
      <div className="p-4 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
        <ShieldAlert className="h-10 w-10" />
      </div>

      <h3 className="text-lg font-bold text-text-primary">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{message}</p>

      {onBack && (
        <div className="pt-2">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Quay lại
          </Button>
        </div>
      )}
    </div>
  );
};

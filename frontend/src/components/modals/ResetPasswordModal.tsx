import * as React from 'react';
import { Check, Copy, KeyRound, Link2, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAdminResetPassword } from '../../hooks/useEmployees';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { extractApiError } from '../../utils/errorHelpers';
import { type AdminResetPasswordResponse } from '../../api/services';

export interface ResetPasswordModalTarget {
  id: number;
  full_name: string;
  email?: string;
  employee_code?: string;
}

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: ResetPasswordModalTarget | null;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const { t } = useSettings();
  const toast = useToast();
  const resetMutation = useAdminResetPassword();

  const [mode, setMode] = React.useState<'auto' | 'custom'>('auto');
  const [customPassword, setCustomPassword] = React.useState('');
  const [forceChangeOnLogin, setForceChangeOnLogin] = React.useState(true);
  const [notifyViaEmail, setNotifyViaEmail] = React.useState(false);
  const [result, setResult] = React.useState<AdminResetPasswordResponse | null>(null);
  const [copiedField, setCopiedField] = React.useState<'password' | 'link' | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode('auto');
      setCustomPassword('');
      setForceChangeOnLogin(true);
      setNotifyViaEmail(false);
      setResult(null);
      setCopiedField(null);
    }
  }, [isOpen, employee?.id]);

  const handleCopy = async (text: string, field: 'password' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(
        t('Đã sao chép', 'Copied'),
        field === 'password'
          ? t('Đã sao chép mật khẩu tạm thời.', 'Temporary password copied to clipboard.')
          : t('Đã sao chép liên kết đặt lại mật khẩu.', 'Password reset link copied to clipboard.'),
      );
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(t('Không thể sao chép tự động', 'Clipboard copy failed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    if (mode === 'custom' && customPassword.trim().length < 8) {
      toast.error(
        t('Mật khẩu chưa đạt chuẩn', 'Weak Password'),
        t(
          'Mật khẩu phải dài tối thiểu 8 ký tự gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
          'Password must be at least 8 characters with uppercase, lowercase, number, and symbol.',
        ),
      );
      return;
    }

    try {
      const response = await resetMutation.mutateAsync({
        id: employee.id,
        payload: {
          new_password: mode === 'custom' ? customPassword.trim() : null,
          force_change_on_login: forceChangeOnLogin,
          notify_via_email: notifyViaEmail,
        },
      });
      setResult(response);
      toast.success(
        t('Đặt lại mật khẩu thành công', 'Password Reset Complete'),
        response.message,
      );
    } catch (err) {
      const apiErr = extractApiError(
        err,
        t('Không thể đặt lại mật khẩu nhân viên.', 'Unable to reset employee password.'),
      );
      toast.error(`${t('Lỗi', 'Error')} [${apiErr.status}]`, apiErr.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('Cấp lại mật khẩu nhân viên', 'Reset Employee Password')}
      description={
        employee
          ? `${employee.full_name}${employee.employee_code ? ` (${employee.employee_code})` : ''}${employee.email ? ` · ${employee.email}` : ''}`
          : undefined
      }
      size="md"
    >
      {result ? (
        <div className="space-y-4 py-1">
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{t('Đã cấp mật khẩu mới & thu hồi các phiên cũ', 'New password issued & prior sessions revoked')}</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t(
                'Hãy gửi mật khẩu tạm thời hoặc liên kết đặt lại bên dưới cho nhân viên qua kênh nội bộ.',
                'Share the temporary password or single-use reset link below with the employee.',
              )}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary">
              {t('Mật khẩu tạm thời mới', 'New Temporary Password')}
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono font-bold text-text-primary select-all">
                {result.temporary_password}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCopy(result.temporary_password, 'password')}
                leftIcon={copiedField === 'password' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              >
                {t('Chép MK', 'Copy')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              {t('Hoặc liên kết để nhân viên tự đặt mật khẩu mới (30 phút)', 'Or self-service reset link (30 min)')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={result.reset_link}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-muted outline-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCopy(result.reset_link, 'link')}
                leftIcon={copiedField === 'link' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              >
                {t('Chép Link', 'Copy Link')}
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button type="button" variant="primary" size="sm" onClick={onClose}>
              {t('Hoàn tất', 'Done')}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-background/60 p-1 border border-border">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'auto'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('Tạo tự động an toàn', 'Auto-generate strong')}
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'custom'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('Tự nhập mật khẩu mới', 'Enter custom password')}
            </button>
          </div>

          {mode === 'custom' ? (
            <Input
              label={t('Mật khẩu mới', 'New Password')}
              type="password"
              placeholder="Vd: TempPass@2026!"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              required
              helperText={t(
                'Tối thiểu 8 ký tự gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
                'At least 8 characters with uppercase, lowercase, number, and symbol.',
              )}
            />
          ) : (
            <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 text-xs text-text-secondary leading-relaxed">
              {t(
                'Hệ thống sẽ tự sinh một mật khẩu ngẫu nhiên 12 ký tự đủ độ mạnh bảo mật và hiển thị ngay để Admin sao chép gửi cho nhân viên.',
                'A random 12-character strong temporary password will be generated and displayed for you to copy.',
              )}
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 text-xs text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={forceChangeOnLogin}
                onChange={(e) => setForceChangeOnLogin(e.target.checked)}
                className="mt-0.5 rounded border-input text-primary focus:ring-ring"
              />
              <span>
                {t(
                  'Bắt buộc nhân viên đổi mật khẩu ở lần đăng nhập tiếp theo',
                  'Require employee to change password on next sign-in',
                )}
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={notifyViaEmail}
                onChange={(e) => setNotifyViaEmail(e.target.checked)}
                className="mt-0.5 rounded border-input text-primary focus:ring-ring"
              />
              <span>
                {t(
                  'Thử gửi email thông báo qua SMTP (nếu máy chủ mail đã cấu hình)',
                  'Attempt SMTP email notification (if mail server is configured)',
                )}
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t('Hủy', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={resetMutation.isPending}
              leftIcon={<KeyRound className="h-3.5 w-3.5" />}
            >
              {t('Cấp lại mật khẩu', 'Reset Password')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

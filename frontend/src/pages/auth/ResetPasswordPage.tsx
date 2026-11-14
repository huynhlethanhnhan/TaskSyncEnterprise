import * as React from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authApi } from '../../api/services';
import { extractApiError } from '../../utils/errorHelpers';
import { useSettings } from '../../providers/SettingsProvider';
import { useToast } from '../../providers/ToastProvider';

export const ResetPasswordPage: React.FC = () => {
  const { t } = useSettings();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token') || '';

  const [token, setToken] = React.useState(tokenFromQuery);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);

  React.useEffect(() => {
    if (tokenFromQuery) {
      setToken(tokenFromQuery);
    }
  }, [tokenFromQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error(
        t('Thiếu mã đặt lại', 'Missing Reset Token'),
        t('Vui lòng mở liên kết đặt lại mật khẩu hoặc dán mã từ Admin.', 'Please open the reset link or paste your token.'),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(
        t('Mật khẩu không khớp', 'Password Mismatch'),
        t('Mật khẩu mới và xác nhận mật khẩu không trùng khớp.', 'New password and confirmation do not match.'),
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword({
        token: token.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setIsDone(true);
      toast.success(t('Đặt lại mật khẩu thành công', 'Password Reset Complete'), res.message);
    } catch (err) {
      const apiErr = extractApiError(
        err,
        t('Không thể đặt lại mật khẩu.', 'Unable to reset password.'),
      );
      toast.error(t('Đặt lại mật khẩu thất bại', 'Reset Failed'), apiErr.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-surface shadow-2xl text-text-primary">
        <div className="mb-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-accent text-accent-foreground flex items-center justify-center mb-3">
            <KeyRound className="h-6 w-6 stroke-[1.75]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{t('Thiết lập mật khẩu mới', 'Set a New Password')}</h2>
          <p className="text-xs text-text-muted mt-1">
            {t(
              'Mật khẩu tối thiểu 8 ký tự gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
              'At least 8 characters with uppercase, lowercase, number, and symbol.',
            )}
          </p>
        </div>

        {isDone ? (
          <div className="text-center py-4 space-y-4">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <p className="font-semibold">{t('Đổi mật khẩu thành công', 'Password Updated')}</p>
              <p className="text-[11px] text-text-muted">
                {t('Bạn có thể đăng nhập ngay bằng mật khẩu vừa thiết lập.', 'You can now sign in with your new password.')}
              </p>
            </div>
            <Link to="/login" className="block">
              <Button variant="primary" size="md" className="w-full">
                {t('Đăng nhập ngay', 'Sign In Now')}
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!tokenFromQuery && (
              <Input
                label={t('Mã đặt lại mật khẩu (Token)', 'Password Reset Token')}
                type="text"
                placeholder={t('Dán token từ liên kết Admin/Email cấp...', 'Paste reset token...')}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            )}

            <Input
              label={t('Mật khẩu mới', 'New Password')}
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              required
            />

            <Input
              label={t('Xác nhận mật khẩu mới', 'Confirm New Password')}
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              required
            />

            <Button type="submit" variant="primary" size="md" className="w-full" isLoading={isLoading}>
              {t('Xác nhận đặt lại mật khẩu', 'Confirm Password Reset')}
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary font-medium transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t('Quay lại Đăng nhập', 'Back to Sign In')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

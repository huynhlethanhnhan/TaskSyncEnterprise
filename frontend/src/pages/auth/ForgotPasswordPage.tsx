import * as React from 'react';
import { Link } from 'react-router';
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authApi } from '../../api/services';
import { extractApiError } from '../../utils/errorHelpers';
import { useSettings } from '../../providers/SettingsProvider';
import { useToast } from '../../providers/ToastProvider';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useSettings();
  const toast = useToast();
  const [email, setEmail] = React.useState('');
  const [note, setNote] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [submitMessage, setSubmitMessage] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword(trimmedEmail, note.trim() || undefined);
      setSubmitMessage(res.message);
      setIsSubmitted(true);
      toast.success(
        t('Đã gửi yêu cầu đặt lại mật khẩu', 'Reset request submitted'),
        t(
          `Quản trị viên hệ thống đã được thông báo cho tài khoản ${trimmedEmail}.`,
          `System administrators have been notified for ${trimmedEmail}.`,
        ),
      );
    } catch (err) {
      const apiErr = extractApiError(
        err,
        t('Không thể gửi yêu cầu đặt lại mật khẩu.', 'Unable to submit password reset request.'),
      );
      toast.error(t('Gửi yêu cầu thất bại', 'Request failed'), apiErr.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-surface shadow-2xl text-text-primary">
        <div className="mb-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-accent text-accent-foreground flex items-center justify-center mb-3">
            <Mail className="h-6 w-6 stroke-[1.75]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{t('Đặt lại mật khẩu', 'Reset Your Password')}</h2>
          <p className="text-xs text-text-muted mt-1">
            {t(
              'Nhập email tài khoản để thông báo trực tiếp cho Admin cấp lại mật khẩu hoặc nhận liên kết qua email.',
              'Enter your account email to notify an Admin or receive a reset link via email.',
            )}
          </p>
        </div>

        {isSubmitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <p className="font-semibold">{t('Yêu cầu đặt lại mật khẩu đã được tiếp nhận', 'Password Reset Request Submitted')}</p>
              <p className="text-[11px] text-text-muted leading-relaxed">
                {submitMessage ||
                  t(
                    `Quản trị viên hệ thống đã nhận thông báo cho tài khoản ${email}.`,
                    `System administrators have been notified for ${email}.`,
                  )}
              </p>
            </div>
            <div className="space-y-2">
              <Link to="/reset-password" className="block">
                <Button variant="primary" size="md" className="w-full" leftIcon={<KeyRound className="h-4 w-4" />}>
                  {t('Tôi đã có mã / liên kết đặt lại', 'I already have a reset link / token')}
                </Button>
              </Link>
              <Link to="/login" className="block">
                <Button variant="outline" size="md" className="w-full">
                  {t('Quay lại Đăng nhập', 'Return to Sign In')}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('Địa chỉ Email tài khoản', 'Account Email Address')}
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              required
            />

            <Input
              label={t('Ghi chú gửi Admin (không bắt buộc)', 'Note for Admin (optional)')}
              type="text"
              placeholder={t('VD: Cần cấp lại gấp để xử lý công việc hôm nay', 'e.g., Locked out, need urgent reset')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
            >
              {t('Gửi yêu cầu đặt lại mật khẩu', 'Submit Password Reset Request')}
            </Button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary font-medium transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t('Quay lại Đăng nhập', 'Back to Sign In')}
              </Link>
              <Link
                to="/reset-password"
                className="text-primary hover:underline font-medium"
              >
                {t('Nhập mã đặt lại?', 'Have a token?')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

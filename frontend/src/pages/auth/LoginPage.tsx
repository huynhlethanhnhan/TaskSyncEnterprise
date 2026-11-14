import * as React from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { useToast } from '../../providers/ToastProvider';
import api from '../../api/axios';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { t } = useSettings();
  const toast = useToast();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // If already authenticated, redirect to target or dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg(t('Vui lòng nhập đầy đủ email và mật khẩu.', 'Please enter both email address and password.'));
      return;
    }

    setIsLoading(true);

    try {
      // FastAPI OAuth2PasswordRequestForm expects form-urlencoded body (username & password)
      const formData = new URLSearchParams();
      formData.append('username', trimmedEmail);
      formData.append('password', password);

      const res = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokenData = res.data;
      if (!tokenData || !tokenData.access_token) {
        throw new Error(t('Phản hồi xác thực từ máy chủ không hợp lệ.', 'Invalid authentication response from server.'));
      }

      const userProfile = tokenData.user || {
        id: 0,
        name: trimmedEmail.split('@')[0] || 'User',
        email: trimmedEmail,
        role: 'employee',
      };

      // Set auth state only after valid API login
      login(tokenData.access_token, tokenData.refresh_token, userProfile);

      toast.success(
        t('Đăng nhập thành công', 'Sign In Successful'),
        t(
          `Chào mừng trở lại, ${userProfile.name || userProfile.full_name || 'Admin'}!`,
          `Welcome back, ${userProfile.name || userProfile.full_name || 'Admin'}!`
        )
      );

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const responseData = (err as { response?: { data?: { detail?: string | { msg: string }[]; message?: string } } })?.response?.data;
      let msg = t('Thông tin đăng nhập không chính xác. Vui lòng kiểm tra email và mật khẩu.', 'Invalid credentials. Please verify your email and password.');

      if (responseData) {
        if (typeof responseData.detail === 'string') {
          msg = responseData.detail;
        } else if (Array.isArray(responseData.detail) && responseData.detail.length > 0) {
          msg = responseData.detail[0]?.msg || msg;
        } else if (responseData.message) {
          msg = responseData.message;
        }
      }

      setErrorMsg(msg);
      toast.error(t('Xác thực thất bại', 'Authentication Failed'), msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Left Branding / Hero Panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-blue-600 to-blue-800 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl text-white">
                TS
              </div>
              <span className="font-display text-2xl font-bold tracking-tight">TaskSync Enterprise</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight mb-4">
              {t('Nền tảng Quản trị Nhân sự & Dự án Doanh nghiệp Hiện đại', 'Modern Enterprise HRM & Project Management Platform')}
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-md">
              {t(
                'Chuẩn hóa điều phối đội ngũ, đơn nghỉ phép, chấm công và thực thi dự án cùng tuân thủ nhật ký kiểm tra tích hợp.',
                'Streamline team coordination, leave requests, attendance tracking, and project execution with built-in audit compliance.'
              )}
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-xs font-medium text-blue-100 bg-white/10 p-3 rounded-lg backdrop-blur-xs">
              <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0" />
              <span>{t('Phân quyền RBAC & Xác thực JWT mã hóa', 'Role-Based Access Control & Encrypted JWT Authorization')}</span>
            </div>
            <p className="text-xs text-blue-200">{t('© 2026 TaskSync Enterprise. Đã đăng ký bản quyền.', '© 2026 TaskSync Enterprise. All rights reserved.')}</p>
          </div>

          {/* Decorative ambient background glows */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-indigo-500/20 blur-2xl" />
        </div>

        {/* Right Form Panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">{t('Đăng nhập tài khoản', 'Sign in to your account')}</h2>
            <p className="text-xs text-text-muted mt-1.5">{t('Nhập thông tin doanh nghiệp để truy cập cổng làm việc', 'Enter your enterprise credentials to access your workspace portal')}</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-lg border border-destructive/30 bg-rose-50 dark:bg-rose-950/40 text-destructive text-xs font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('Địa chỉ Email', 'Email Address')}
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              required
            />

            <Input
              label={t('Mật khẩu', 'Password')}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              required
            />

            <div className="flex items-center justify-between">
              <Checkbox
                label={t('Ghi nhớ trên thiết bị này', 'Remember me on this device')}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline underline-offset-4"
              >
                {t('Quên mật khẩu?', 'Forgot password?')}
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              {t('Đăng nhập vào Cổng hệ thống', 'Sign In to Portal')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

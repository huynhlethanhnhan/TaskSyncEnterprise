import * as React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import api from '../../api/axios';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
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
      setErrorMsg('Please enter both email address and password.');
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
        throw new Error('Invalid authentication response from server.');
      }

      const userProfile = tokenData.user || {
        id: 1,
        name: trimmedEmail.split('@')[0] || 'User',
        email: trimmedEmail,
        role: 'admin',
      };

      // Set auth state only after valid API login
      login(tokenData.access_token, tokenData.refresh_token, userProfile);

      toast.success('Sign In Successful', `Welcome back, ${userProfile.name || userProfile.full_name || 'Admin'}!`);

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const responseData = (err as { response?: { data?: { detail?: string | { msg: string }[]; message?: string } } })?.response?.data;
      let msg = 'Invalid credentials. Please verify your email and password.';

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
      toast.error('Authentication Failed', msg);
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
              Modern Enterprise HRM & Project Management Platform
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-md">
              Streamline team coordination, leave requests, attendance tracking, and project execution with built-in audit compliance.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-xs font-medium text-blue-100 bg-white/10 p-3 rounded-lg backdrop-blur-xs">
              <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0" />
              <span>Role-Based Access Control & Encrypted JWT Authorization</span>
            </div>
            <p className="text-xs text-blue-200">© 2026 TaskSync Enterprise. All rights reserved.</p>
          </div>

          {/* Decorative ambient background glows */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-indigo-500/20 blur-2xl" />
        </div>

        {/* Right Form Panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">Sign in to your account</h2>
            <p className="text-xs text-text-muted mt-1.5">Enter your enterprise credentials to access your workspace portal</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-lg border border-destructive/30 bg-rose-50 dark:bg-rose-950/40 text-destructive text-xs font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-text-muted hover:text-text-primary focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              required
            />

            <div className="flex items-center justify-between">
              <Checkbox
                label="Remember me on this device"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In to Portal
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

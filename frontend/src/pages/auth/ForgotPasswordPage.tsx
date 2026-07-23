import * as React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../providers/ToastProvider';

export const ForgotPasswordPage: React.FC = () => {
  const toast = useToast();
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      toast.success('Reset link dispatched', `Check your inbox at ${email}`);
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-surface shadow-2xl text-text-primary">
        <div className="mb-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-accent text-accent-foreground flex items-center justify-center mb-3">
            <Mail className="h-6 w-6 stroke-[1.75]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Reset Your Password</h2>
          <p className="text-xs text-text-muted mt-1">
            Enter your account email and we will send you password reset instructions.
          </p>
        </div>

        {isSubmitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <p className="font-semibold">Reset Link Sent Successfully</p>
              <p className="text-[11px] text-text-muted">
                We have emailed instructions to <strong>{email}</strong>.
              </p>
            </div>
            <Link to="/login">
              <Button variant="outline" size="md" className="w-full mt-2">
                Return to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Account Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
            >
              Send Password Reset Link
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary font-medium transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

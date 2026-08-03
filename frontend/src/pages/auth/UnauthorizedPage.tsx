import * as React from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 text-center font-sans">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface shadow-2xl text-text-primary flex flex-col items-center">
        <div className="h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 stroke-[1.75]" />
        </div>
        <span className="text-xs font-mono font-bold tracking-widest text-rose-500 uppercase">
          403 Access Denied
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary mt-1">
          Permission Restricted
        </h1>
        <p className="text-xs text-text-muted mt-2 mb-6 leading-relaxed">
          You do not have administrative privilege to view this route. If you believe this is an error, please contact your system administrator.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            variant="outline"
            size="md"
            className="flex-1"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            leftIcon={<LayoutDashboard className="h-4 w-4" />}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

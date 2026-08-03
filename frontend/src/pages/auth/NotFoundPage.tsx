import * as React from 'react';
import { useNavigate } from 'react-router';
import { FileQuestion, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 text-center font-sans">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface shadow-2xl text-text-primary flex flex-col items-center">
        <div className="h-16 w-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center mb-4">
          <FileQuestion className="h-8 w-8 stroke-[1.75]" />
        </div>
        <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
          404 Page Not Found
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary mt-1">
          Route Does Not Exist
        </h1>
        <p className="text-xs text-text-muted mt-2 mb-6 leading-relaxed">
          The page or resource you requested could not be located. It may have been moved, renamed, or deleted.
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

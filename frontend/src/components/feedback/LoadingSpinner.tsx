import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  fullScreen = false,
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 stroke-[2]',
    md: 'h-6 w-6 stroke-[2]',
    lg: 'h-9 w-9 stroke-[1.75]',
    xl: 'h-12 w-12 stroke-[1.5]',
  };

  const spinnerContent = (
    <div className={cn('inline-flex flex-col items-center justify-center gap-2 select-none', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} aria-hidden="true" />
      {label && <p className="text-xs font-medium text-text-muted">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-modal flex items-center justify-center bg-background/85 backdrop-blur-sm">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

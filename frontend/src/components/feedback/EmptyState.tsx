import * as React from 'react';
import { FolderOpen } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data found',
  description = 'There are no records matching your current filter criteria or view.',
  icon,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-border bg-surface/50 text-text-primary select-none',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground mb-4">
        {icon || <FolderOpen className="h-7 w-7 stroke-[1.5]" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && <p className="text-xs text-text-muted max-w-sm mt-1 mb-5">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};

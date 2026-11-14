import * as React from 'react';
import { cn } from '../../utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumb,
  actions,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2 pb-5 border-b border-border/60 mb-6', className)}>
      {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

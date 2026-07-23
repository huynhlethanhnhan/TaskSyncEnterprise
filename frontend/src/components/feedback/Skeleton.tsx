import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  circle = false,
  style,
  ...props
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted rounded-md shrink-0',
        circle && 'rounded-full',
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-5 rounded-xl border border-border bg-surface flex flex-col gap-3', className)}>
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <div className="flex gap-2 mt-2">
      <Skeleton className="h-8 w-20 rounded-md" />
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="w-full border border-border rounded-lg overflow-hidden bg-surface">
    <div className="flex bg-muted/60 p-3 border-b border-border gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={`th-${i}`} className="h-4 flex-1" />
      ))}
    </div>
    <div className="flex flex-col divide-y divide-border/60">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`tr-${r}`} className="flex p-3 gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`td-${r}-${c}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

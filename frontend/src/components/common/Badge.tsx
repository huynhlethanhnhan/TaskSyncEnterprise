import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        primary: 'bg-accent text-accent-foreground border border-blue-200/50 dark:border-blue-900/50',
        success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50',
        warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50',
        danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50',
        outline: 'border border-border text-text-primary bg-transparent',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px] gap-1',
        md: 'px-2.5 py-0.5 text-xs gap-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  size,
  showDot = false,
  children,
  ...props
}) => {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            variant === 'success' && 'bg-emerald-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'danger' && 'bg-rose-500',
            variant === 'primary' && 'bg-blue-500',
            (!variant || variant === 'default' || variant === 'outline') && 'bg-text-secondary'
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

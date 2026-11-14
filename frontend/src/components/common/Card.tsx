import * as React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'flat';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'min-w-0 overflow-hidden rounded-xl border border-border bg-surface text-text-primary transition-[transform,box-shadow,border-color] duration-200 ease-out',
        variant === 'default' && 'shadow-sm hover:shadow-md',
        variant === 'interactive' && 'shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer',
        variant === 'flat' && 'bg-slate-50/50 dark:bg-slate-900/50 shadow-none border-border/40',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-4 sm:p-6 pb-2 sm:pb-3', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight text-text-primary', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-text-muted', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const hasShorthandPadding = Boolean(className && /(?:^|\s)p-(?:\d[\d.]*|px)(?:\s|$)/.test(className));
    const hasVerticalPadding = Boolean(className && /(?:^|\s)py-(?:\d[\d.]*|px)(?:\s|$)/.test(className));
    const hasTopPadding = Boolean(className && /(?:^|\s)pt-(?:\d[\d.]*|px)(?:\s|$)/.test(className));
    const basePaddingClass = hasShorthandPadding
      ? ''
      : hasVerticalPadding
        ? 'px-4 sm:px-6'
        : hasTopPadding
          ? 'px-4 pb-4 sm:px-6 sm:pb-6'
          : 'p-4 pt-0 first:pt-4 sm:p-6 sm:pt-0 sm:first:pt-6';

    return (
      <div
        ref={ref}
        className={cn(basePaddingClass, className)}
        {...props}
      />
    );
  }
);
CardContent.displayName = 'CardContent';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover border border-primary/10 hover:border-primary/20',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary-hover border border-border/50',
        outline: 'border border-border bg-surface text-text-primary shadow-xs hover:bg-surface-hover hover:text-text-primary',
        ghost: 'text-text-secondary hover:bg-secondary hover:text-text-primary',
        danger: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover border border-destructive/10',
        link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
        md: 'h-10 px-4 py-2 text-sm rounded-md gap-2',
        lg: 'h-12 px-6 text-base rounded-lg gap-2',
        icon: 'h-10 w-10 p-0 justify-center',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" aria-hidden="true" />
        ) : leftIcon ? (
          <span className="mr-2 inline-flex items-center" aria-hidden="true">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon && (
          <span className="ml-2 inline-flex items-center" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

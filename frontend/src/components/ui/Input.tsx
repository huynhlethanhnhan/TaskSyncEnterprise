import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, helperText, error, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const [showPassword, setShowPassword] = React.useState(false);
    const isPasswordType = type === 'password';
    const resolvedType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-text-primary tracking-wide flex items-center justify-between"
          >
            <span>
              {label}
              {props.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
            </span>
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 text-text-muted pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={resolvedType}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 hover:border-slate-400 dark:hover:border-slate-600',
              leftIcon && 'pl-9',
              (rightIcon || isPasswordType) && 'pr-9',
              error && 'border-destructive focus-visible:ring-destructive hover:border-destructive dark:hover:border-destructive',
              className
            )}
            {...props}
          />
          {isPasswordType ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 text-text-muted hover:text-text-primary flex items-center justify-center cursor-pointer transition-colors p-1 rounded hover:bg-secondary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-3 text-text-muted flex items-center justify-center">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error ? (
          <p id={errorId} className="text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1 duration-150">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-text-muted">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

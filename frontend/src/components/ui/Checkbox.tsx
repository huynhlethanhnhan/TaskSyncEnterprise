import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  indeterminate?: boolean;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, indeterminate = false, checked, disabled, error, id, onChange, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;
    const innerRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <div className="inline-flex items-center gap-2 select-none">
        <div className="relative inline-flex items-center justify-center">
          <input
            type="checkbox"
            id={checkboxId}
            ref={innerRef}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            aria-invalid={Boolean(error)}
            className={cn(
              'peer h-4.5 w-4.5 shrink-0 appearance-none rounded-md border border-input bg-surface transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 checked:border-primary checked:bg-primary cursor-pointer hover:border-slate-400 dark:hover:border-slate-600',
              indeterminate && 'border-primary bg-primary',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            {...props}
          />
          <span className={cn(
            "pointer-events-none absolute text-primary-foreground flex items-center justify-center transition-opacity duration-150",
            (checked || indeterminate) ? "opacity-100" : "opacity-0"
          )}>
            {indeterminate ? (
              <Minus className="h-3 w-3 stroke-[3]" aria-hidden="true" />
            ) : (
              <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
            )}
          </span>
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className={cn(
              'text-sm font-medium text-text-primary leading-none cursor-pointer',
              disabled && 'cursor-not-allowed opacity-40'
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

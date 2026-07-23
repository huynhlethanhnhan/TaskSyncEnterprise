import * as React from 'react';
import { cn } from '../../utils/cn';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (val: string) => void;
  orientation?: 'vertical' | 'horizontal';
  label?: string;
  error?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  orientation = 'vertical',
  label,
  error,
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const selectedValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onChange?.(val);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)} role="radiogroup" aria-label={label}>
      {label && <span className="text-xs font-semibold text-text-primary">{label}</span>}
      <div
        className={cn(
          'flex gap-3',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
      >
        {options.map((option) => {
          const optionId = `${name}-${option.value}`;
          const isChecked = selectedValue === option.value;

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'inline-flex items-start gap-2.5 cursor-pointer select-none rounded-md p-1.5 transition-colors hover:bg-surface-hover',
                option.disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent'
              )}
            >
              <div className="relative inline-flex items-center justify-center mt-0.5">
                <input
                  type="radio"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={isChecked}
                  disabled={option.disabled}
                  onChange={() => handleChange(option.value)}
                  className="peer h-4.5 w-4.5 appearance-none rounded-full border border-input bg-surface transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 checked:border-primary checked:bg-primary cursor-pointer hover:border-slate-400 dark:hover:border-slate-600"
                />
                <span className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-medium text-text-primary">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-text-muted mt-1">{option.description}</span>
                )}
              </div>
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
};

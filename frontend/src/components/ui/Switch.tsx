import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  label,
  size = 'md',
  id,
  className,
}) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

  const generatedId = React.useId();
  const switchId = id || generatedId;

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (controlledChecked === undefined) {
      setInternalChecked(next);
    }
    onChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-2 select-none', className)}>
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40',
          size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
          isChecked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-surface shadow-sm ring-0 transition duration-200 ease-in-out transform',
            size === 'sm'
              ? 'h-3.5 w-3.5 translate-y-[3px] ' + (isChecked ? 'translate-x-[18px]' : 'translate-x-[3px]')
              : 'h-4.5 w-4.5 translate-y-[3px] ' + (isChecked ? 'translate-x-[22px]' : 'translate-x-[3px]')
          )}
        />
      </button>
      {label && (
        <label
          htmlFor={switchId}
          className={cn(
            'text-sm font-medium text-text-primary cursor-pointer',
            disabled && 'cursor-not-allowed opacity-40'
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};

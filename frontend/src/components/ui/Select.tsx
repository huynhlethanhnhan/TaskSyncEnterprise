import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  size?: 'sm' | 'md';
  containerClassName?: string;
}

interface PopoverCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  originY: 'top' | 'bottom';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      label,
      options,
      helperText,
      error,
      id,
      name,
      disabled,
      value,
      defaultValue,
      onChange,
      required,
      size = 'md',
      'aria-label': ariaLabel,
      ...restProps
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(() => {
      if (defaultValue !== undefined) return String(defaultValue);
      return options[0]?.value ?? '';
    });
    const currentValue = isControlled ? String(value ?? '') : uncontrolledValue;

    const [isOpen, setIsOpen] = React.useState(false);
    const [coords, setCoords] = React.useState<PopoverCoords | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const hiddenSelectRef = React.useRef<HTMLSelectElement | null>(null);

    const setMergedRef = React.useCallback(
      (node: HTMLSelectElement | null) => {
        hiddenSelectRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const selectedOption = React.useMemo(
      () => options.find((opt) => opt.value === currentValue) || options[0],
      [options, currentValue],
    );

    const computeCoords = React.useCallback(() => {
      const el = triggerRef.current;
      if (!el || typeof window === 'undefined') return null;

      const rect = el.getBoundingClientRect();
      const menuWidth = Math.max(rect.width, 132);
      const estimatedHeight = Math.min(280, Math.max(options.length, 1) * 36 + 12);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < estimatedHeight + 12 && rect.top > spaceBelow;
      const left = Math.min(
        Math.max(rect.left, 8),
        Math.max(8, window.innerWidth - menuWidth - 8),
      );

      if (openAbove) {
        return {
          bottom: window.innerHeight - rect.top + 6,
          left,
          width: menuWidth,
          originY: 'bottom' as const,
        };
      }
      return {
        top: rect.bottom + 6,
        left,
        width: menuWidth,
        originY: 'top' as const,
      };
    }, [options.length]);

    const handleToggleOpen = () => {
      if (disabled) return;
      setIsOpen((prev) => {
        if (!prev) {
          setCoords(computeCoords());
        }
        return !prev;
      });
    };

    const handleSelectOption = (opt: SelectOption) => {
      if (opt.disabled || disabled) return;
      if (!isControlled) {
        setUncontrolledValue(opt.value);
      }
      if (onChange) {
        const selectEl = hiddenSelectRef.current;
        if (selectEl) {
          selectEl.value = opt.value;
        }
        const syntheticEvent = {
          target: { value: opt.value, name: name || '' },
          currentTarget: { value: opt.value, name: name || '' },
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
      setIsOpen(false);
    };

    React.useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node | null;
        if (
          target &&
          !triggerRef.current?.contains(target) &&
          !menuRef.current?.contains(target)
        ) {
          setIsOpen(false);
        }
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      };

      const handleViewportChange = (event: Event) => {
        if (
          event.type === 'scroll' &&
          event.target instanceof Node &&
          menuRef.current?.contains(event.target)
        ) {
          return;
        }
        setIsOpen(false);
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleViewportChange, true);
      window.addEventListener('resize', handleViewportChange);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('scroll', handleViewportChange, true);
        window.removeEventListener('resize', handleViewportChange);
      };
    }, [isOpen]);

    return (
      <div className={cn('w-full flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-text-primary tracking-wide">
            {label}
            {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {/* Preserves native form required/association & Playwright selectOption compatibility */}
          <select
            id={selectId}
            ref={setMergedRef}
            name={name}
            value={currentValue}
            disabled={disabled}
            required={required}
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              if (!isControlled) setUncontrolledValue(e.target.value);
              onChange?.(e);
            }}
            className="absolute bottom-0 left-0 h-px w-px opacity-[0.001] pointer-events-none"
            {...restProps}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-label={ariaLabel || label}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            onClick={handleToggleOpen}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-surface text-left text-text-primary shadow-xs transition-all duration-150',
              size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-10 px-3 text-sm',
              'hover:border-slate-400 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary',
              isOpen && 'border-primary ring-2 ring-primary/20',
              disabled && 'cursor-not-allowed opacity-40',
              !disabled && 'cursor-pointer',
              error && 'border-destructive focus-visible:ring-destructive/30 hover:border-destructive dark:hover:border-destructive',
              className,
            )}
          >
            <span className="truncate flex-1">
              {selectedOption ? selectedOption.label : ''}
            </span>
            <ChevronDown
              className={cn(
                'shrink-0 text-text-muted transition-transform duration-150',
                size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
                isOpen && 'rotate-180 text-primary',
              )}
              aria-hidden="true"
            />
          </button>

          {typeof document !== 'undefined' &&
            createPortal(
              <AnimatePresence>
                {isOpen && coords && (
                  <motion.div
                    ref={menuRef}
                    role="listbox"
                    initial={{ opacity: 0, scale: 0.97, y: coords.originY === 'top' ? -4 : 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: coords.originY === 'top' ? -4 : 4 }}
                    transition={{ duration: 0.13, ease: 'easeOut' }}
                    style={{
                      position: 'fixed',
                      top: coords.top,
                      bottom: coords.bottom,
                      left: coords.left,
                      minWidth: coords.width,
                      maxWidth: Math.max(coords.width, 280),
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="z-[9999] max-h-68 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl text-text-primary focus:outline-none"
                  >
                    {options.map((opt) => {
                      const isSelected = opt.value === currentValue;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          disabled={opt.disabled}
                          onClick={() => handleSelectOption(opt)}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                            isSelected
                              ? 'bg-primary/10 font-semibold text-primary'
                              : 'text-text-primary hover:bg-accent',
                            opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                          )}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body,
            )}
        </div>
        {error ? (
          <p id={errorId} className="text-xs font-medium text-destructive">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-text-muted">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';

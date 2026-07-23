import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: (DropdownItem | 'separator')[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const toggle = () => setIsOpen((prev) => !prev);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={toggle} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute z-dropdown mt-1.5 w-56 rounded-lg border border-border bg-surface p-1 shadow-md text-text-primary focus:outline-none',
              align === 'right' ? 'right-0' : 'left-0',
              className
            )}
          >
            {items.map((item, index) => {
              if (item === 'separator') {
                return <div key={`sep-${index}`} className="my-1.5 h-px bg-border/60" aria-hidden="true" />;
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors select-none text-left cursor-pointer',
                    item.destructive
                      ? 'text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30'
                      : 'text-text-secondary hover:bg-secondary hover:text-text-primary',
                    item.disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {item.icon && <span className="text-text-muted group-hover:text-text-primary">{item.icon}</span>}
                    {item.label}
                  </span>
                  {item.shortcut && (
                    <span className="text-[10px] font-mono tracking-widest text-text-muted">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: (DropdownItem | 'separator')[];
  align?: 'left' | 'right';
  className?: string;
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  left: number;
  originY: 'top' | 'bottom';
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<MenuCoords | null>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const computeCoords = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === 'undefined') return null;

    const rect = el.getBoundingClientRect();
    const menuWidth = Math.min(224, window.innerWidth - 16);
    const estimatedHeight = Math.min(320, items.length * 36 + 12);

    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < estimatedHeight + 12 && rect.top > spaceBelow;

    const rawLeft = align === 'right' ? rect.right - menuWidth : rect.left;
    const left = Math.min(Math.max(rawLeft, 8), Math.max(8, window.innerWidth - menuWidth - 8));

    if (openAbove) {
      return {
        bottom: window.innerHeight - rect.top + 6,
        left,
        originY: 'bottom' as const,
      };
    }

    return {
      top: rect.bottom + 6,
      left,
      originY: 'top' as const,
    };
  }, [align, items.length]);

  const toggleOpen = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen((prev) => {
        if (!prev) {
          setCoords(computeCoords());
        }
        return !prev;
      });
    },
    [computeCoords],
  );

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
      }
    };

    const handleViewportChange = (event: Event) => {
      if (event.type === 'scroll' && event.target instanceof Node && menuRef.current?.contains(event.target)) {
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
    <div ref={triggerRef} className={cn('relative inline-block text-left', className)}>
      <div onClick={toggleOpen} className="cursor-pointer">
        {trigger}
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={menuRef}
                role="menu"
                aria-orientation="vertical"
                initial={{ opacity: 0, scale: 0.96, y: coords.originY === 'top' ? -4 : 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: coords.originY === 'top' ? -4 : 4 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  bottom: coords.bottom,
                  left: coords.left,
                }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'z-[9999] w-56 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl text-text-primary focus:outline-none',
                  align === 'right' ? 'origin-top-right' : 'origin-top-left',
                )}
              >
                {items.map((item, idx) => {
                  if (item === 'separator') {
                    return <div key={`sep-${idx}`} className="my-1 h-px bg-border/80" />;
                  }

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={item.disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!item.disabled) {
                          item.onClick?.();
                          setIsOpen(false);
                        }
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors text-left cursor-pointer',
                        item.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                        item.destructive
                          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300'
                          : 'text-text-primary hover:bg-secondary/80',
                      )}
                      role="menuitem"
                    >
                      {item.icon && <span className="h-4 w-4 shrink-0 flex items-center justify-center">{item.icon}</span>}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <span className="ml-auto pl-2 text-[10px] font-mono text-text-muted shrink-0">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

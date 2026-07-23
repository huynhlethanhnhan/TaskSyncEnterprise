import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  position?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  position = 'right',
  size = 'md',
  footer,
}) => {
  // Escape key handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    right: {
      sm: 'max-w-sm w-full inset-y-0 right-0',
      md: 'max-w-md w-full inset-y-0 right-0',
      lg: 'max-w-xl w-full inset-y-0 right-0',
    },
    left: {
      sm: 'max-w-sm w-full inset-y-0 left-0',
      md: 'max-w-md w-full inset-y-0 left-0',
      lg: 'max-w-xl w-full inset-y-0 left-0',
    },
    bottom: {
      sm: 'h-1/3 inset-x-0 bottom-0',
      md: 'h-1/2 inset-x-0 bottom-0',
      lg: 'h-3/4 inset-x-0 bottom-0',
    },
  };

  const motionVariants = {
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
    left: {
      initial: { x: '-100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-backdrop"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
            initial={motionVariants[position].initial}
            animate={motionVariants[position].animate}
            exit={motionVariants[position].exit}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'fixed z-modal bg-surface border-border shadow-2xl flex flex-col overflow-hidden text-text-primary',
              position === 'right' && 'border-l',
              position === 'left' && 'border-r',
              position === 'bottom' && 'border-t rounded-t-2xl',
              sizeClasses[position][size]
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <div>
                {title && (
                  <h2 id="drawer-title" className="text-lg font-semibold text-text-primary leading-tight">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs text-text-muted mt-0.5">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-text-muted hover:bg-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5 stroke-[1.75]" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 p-4 sm:px-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-border/60">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

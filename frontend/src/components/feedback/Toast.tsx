import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (_id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ToastContainer: React.FC<ToastProps> = ({
  toasts,
  onDismiss,
  position = 'top-right',
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4 items-end',
    'top-left': 'top-4 left-4 items-start',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-left': 'bottom-4 left-4 items-start',
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-sky-500 shrink-0" />,
  };

  return (
    <div
      className={cn(
        'fixed z-toast flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4',
        positionClasses[position]
      )}
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-start gap-3 w-full rounded-lg border border-border bg-surface p-3.5 shadow-lg text-text-primary overflow-hidden"
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-text-primary leading-tight">{toast.title}</h4>
              {toast.description && (
                <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-text-muted hover:text-text-primary rounded p-0.5 focus:outline-none"
              aria-label="Dismiss toast"
            >
              <X className="h-4 w-4 stroke-[1.75]" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

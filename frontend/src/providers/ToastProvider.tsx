import * as React from 'react';
import { ToastContainer, type ToastMessage, type ToastType } from '../components/feedback/Toast';

interface ToastContextType {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const addToast = React.useCallback((type: ToastType, title: string, description?: string) => {
    setToasts((prev) => {
      // Deduplicate: ignore identical toast titles added within active list
      const isDuplicate = prev.some((t) => t.title === title && t.description === description);
      if (isDuplicate) return prev;

      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, title, description };

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 4000);

      return [...prev, newToast];
    });
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastHelpers = React.useMemo(
    () => ({
      toast: {
        success: (title: string, description?: string) => addToast('success', title, description),
        error: (title: string, description?: string) => addToast('error', title, description),
        warning: (title: string, description?: string) => addToast('warning', title, description),
        info: (title: string, description?: string) => addToast('info', title, description),
      },
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toastHelpers}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} position="top-right" />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType['toast'] => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

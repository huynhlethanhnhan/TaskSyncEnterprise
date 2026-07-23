import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger',
  isLoading = false,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            {cancelText}
          </Button>
          <Button variant={variant === 'warning' ? 'secondary' : variant} size="sm" onClick={handleConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3 py-2">
        <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-xs text-text-secondary leading-relaxed pt-0.5">{message}</p>
      </div>
    </Modal>
  );
};

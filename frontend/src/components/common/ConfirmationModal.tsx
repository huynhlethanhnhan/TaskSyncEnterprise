import * as React from 'react';
import { Modal, type ModalProps } from './Modal';
import { Button } from '../ui/Button';
import { useSettings } from '../../providers/SettingsProvider';

export interface ConfirmationModalProps extends Omit<ModalProps, 'children' | 'footer'> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  isLoading,
  ...props
}) => {
  const { t } = useSettings();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t('Xác nhận hành động', 'Confirm Action')}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText || t('Hủy', 'Cancel')}
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} isLoading={isLoading}>
            {confirmText || t('Xác nhận', 'Confirm')}
          </Button>
        </>
      }
      {...props}
    >
      <div className="text-sm text-text-secondary leading-relaxed">
        {message}
      </div>
    </Modal>
  );
};

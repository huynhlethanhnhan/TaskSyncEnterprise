import * as React from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useUpdateSprint } from '../../hooks/useSprintBacklog';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { type SprintItem } from '../../api/services';

import { extractApiError } from '../../utils/errorHelpers';

interface EditSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint: SprintItem | null;
}

export const EditSprintModal: React.FC<EditSprintModalProps> = ({ isOpen, onClose, sprint }) => {
  const toast = useToast();
  const { t } = useSettings();
  const updateMutation = useUpdateSprint();

  const [name, setName] = React.useState('');
  const [goal, setGoal] = React.useState('');
  const [capacity, setCapacity] = React.useState(20);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  React.useEffect(() => {
    if (sprint) {
      setName(sprint.name || '');
      setGoal(sprint.goal || '');
      setCapacity(sprint.capacity || 20);
      setStartDate(sprint.start_date ? new Date(sprint.start_date).toISOString().slice(0, 10) : '');
      setEndDate(sprint.end_date ? new Date(sprint.end_date).toISOString().slice(0, 10) : '');
    }
  }, [sprint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprint || !name.trim()) return;

    try {
      await updateMutation.mutateAsync({
        id: sprint.id,
        payload: {
          name: name.trim(),
          goal: goal.trim() || null,
          capacity: Number(capacity),
          start_date: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null,
          end_date: endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null,
        },
      });
      toast.success(t('Cập nhật thành công', 'Update Succeeded'), t(`Đã cập nhật thông tin Sprint "${name}".`, `Updated Sprint "${name}".`));
      onClose();
    } catch (err: any) {
      const apiError = extractApiError(err, t('Không thể lưu thay đổi Sprint.', 'Unable to save Sprint changes.'));
      toast.error(t('Lỗi cập nhật', 'Update Error'), apiError.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('Chỉnh sửa Thông tin Sprint', 'Edit Sprint Details')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('Tên Sprint *', 'Sprint Name *')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('Tên Sprint...', 'Sprint name...')}
          required
        />

        <Textarea
          label={t('Mục tiêu Sprint (Sprint Goal)', 'Sprint Goal')}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={t('Mô tả mục tiêu chính của Sprint này...', 'Describe the primary objective of this Sprint...')}
          rows={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('Dung lượng Story Points (Capacity)', 'Story Points Capacity')}
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            min={1}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('Ngày Bắt đầu', 'Start Date')}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label={t('Ngày Kết thúc', 'End Date')}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t('Hủy', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={updateMutation.isPending}>
            {t('Lưu Thay Đổi', 'Save Changes')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

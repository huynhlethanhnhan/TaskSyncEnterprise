import * as React from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useUpdateSprint } from '../../hooks/useSprintBacklog';
import { useToast } from '../../providers/ToastProvider';
import { type SprintItem } from '../../api/services';

import { extractApiError } from '../../utils/errorHelpers';

interface EditSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint: SprintItem | null;
}

export const EditSprintModal: React.FC<EditSprintModalProps> = ({ isOpen, onClose, sprint }) => {
  const toast = useToast();
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
      toast.success('Cập nhật thành công', `Đã cập nhật thông tin Sprint "${name}".`);
      onClose();
    } catch (err: any) {
      const apiError = extractApiError(err, 'Không thể lưu thay đổi Sprint.');
      toast.error('Lỗi cập nhật', apiError.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chỉnh sửa Thông tin Sprint" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tên Sprint *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên Sprint..."
          required
        />

        <Textarea
          label="Mục tiêu Sprint (Sprint Goal)"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Mô tả mục tiêu chính của Sprint này..."
          rows={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Dung lượng Story Points (Capacity)"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            min={1}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Ngày Bắt đầu"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Ngày Kết thúc"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={updateMutation.isPending}>
            Lưu Thay Đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
};

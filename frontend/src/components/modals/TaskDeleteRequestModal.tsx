import * as React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { feedbackApi, type TaskItem } from '../../api/services';
import { useToast } from '../../providers/ToastProvider';

export interface TaskDeleteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  onSubmitted?: () => void;
}

export const TaskDeleteRequestModal: React.FC<TaskDeleteRequestModalProps> = ({
  isOpen,
  onClose,
  task,
  onSubmitted,
}) => {
  const toast = useToast();
  const [reason, setReason] = React.useState('');
  const [additionalInfo, setAdditionalInfo] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setAdditionalInfo('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    if (!reason.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập lý do yêu cầu xóa công việc.');
      return;
    }

    setIsSubmitting(true);
    try {
      await feedbackApi.submit({
        title: `[Yêu cầu xóa Task #${task.id}] ${task.title || task.name}`,
        category: 'Task Deletion Request',
        description: `Mã Task: #${task.id}\nTiêu đề: ${task.title || task.name}\nLý do: ${reason.trim()}\nThông tin bổ sung: ${additionalInfo.trim() || 'Không có'}`,
        impact_level: 'High',
        status: 'Pending',
        is_anonymous: false,
      });

      toast.success(
        'Đã gửi yêu cầu xóa thành công',
        'Yêu cầu của bạn đang ở trạng thái Chờ duyệt (Pending) và sẽ được Quản lý/Admin xem xét.'
      );
      onSubmitted?.();
      onClose();
    } catch {
      toast.error('Gửi yêu cầu thất bại', 'Không thể gửi yêu cầu xóa vào lúc này. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yêu cầu Xóa Công việc (Delete Request)"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Hủy bỏ
          </Button>
          <Button variant="danger" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            Gửi yêu cầu
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {task && (
          <div className="p-3 rounded-lg bg-accent/20 border border-border">
            <p className="font-semibold text-text-primary">
              Công việc: <span className="font-bold text-primary">{task.title || task.name}</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Trạng thái: {task.status} · Ưu tiên: {task.priority || 'Normal'}
            </p>
          </div>
        )}

        <div className="text-[11px] text-text-secondary leading-relaxed">
          Theo chính sách bảo toàn dữ liệu, Nhân viên không thể trực tiếp xóa công việc. Vui lòng cung cấp lý do để người quản trị hoặc trưởng nhóm phê duyệt.
        </div>

        <Textarea
          label="Lý do xóa (Reason) *"
          placeholder="Nêu rõ lý do cần xóa công việc này (ví dụ: tạo trùng lặp, hủy bỏ dự án, sai yêu cầu)..."
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <Textarea
          label="Thông tin bổ sung (Additional information)"
          placeholder="Ghi chú thêm tài liệu hoặc nhân sự liên quan nếu có..."
          rows={2}
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
        />
      </form>
    </Modal>
  );
};

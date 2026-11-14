import * as React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { feedbackApi, type TaskItem } from '../../api/services';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';

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
  const { t, statusLabel } = useSettings();
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
      toast.error(t('Thiếu thông tin', 'Missing Information'), t('Vui lòng nhập lý do yêu cầu xóa công việc.', 'Please enter a reason for the task deletion request.'));
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
        t('Đã gửi yêu cầu xóa thành công', 'Deletion Request Submitted'),
        t(
          'Yêu cầu của bạn đang ở trạng thái Chờ duyệt (Pending) và sẽ được Quản lý/Admin xem xét.',
          'Your request is now Pending approval and will be reviewed by a Manager/Admin.'
        )
      );
      onSubmitted?.();
      onClose();
    } catch {
      toast.error(t('Gửi yêu cầu thất bại', 'Submission Failed'), t('Không thể gửi yêu cầu xóa vào lúc này. Vui lòng thử lại sau.', 'Unable to submit deletion request right now. Please try again later.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('Yêu cầu Xóa Công việc (Delete Request)', 'Task Deletion Request')}
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            {t('Hủy bỏ', 'Cancel')}
          </Button>
          <Button variant="danger" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            {t('Gửi yêu cầu', 'Submit Request')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {task && (
          <div className="p-3 rounded-lg bg-accent/20 border border-border">
            <p className="font-semibold text-text-primary">
              {t('Công việc:', 'Task:')} <span className="font-bold text-primary">{task.title || task.name}</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {t('Trạng thái:', 'Status:')} {statusLabel(task.status)} · {t('Ưu tiên:', 'Priority:')} {statusLabel(task.priority || 'Normal')}
            </p>
          </div>
        )}

        <div className="text-[11px] text-text-secondary leading-relaxed">
          {t(
            'Theo chính sách bảo toàn dữ liệu, Nhân viên không thể trực tiếp xóa công việc. Vui lòng cung cấp lý do để người quản trị hoặc trưởng nhóm phê duyệt.',
            'Under our data integrity policy, employees cannot directly delete tasks. Please provide a reason for your administrator or team lead to review.'
          )}
        </div>

        <Textarea
          label={t('Lý do xóa (Reason) *', 'Reason for Deletion *')}
          placeholder={t('Nêu rõ lý do cần xóa công việc này (ví dụ: tạo trùng lặp, hủy bỏ dự án, sai yêu cầu)...', 'Describe why this task should be deleted (e.g. duplicate, canceled scope, wrong requirement)...')}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <Textarea
          label={t('Thông tin bổ sung (Additional information)', 'Additional Information')}
          placeholder={t('Ghi chú thêm tài liệu hoặc nhân sự liên quan nếu có...', 'Add supporting documents or related stakeholders if applicable...')}
          rows={2}
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
        />
      </form>
    </Modal>
  );
};

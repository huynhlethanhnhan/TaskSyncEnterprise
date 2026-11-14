import * as React from 'react';
import { useTopics, useTopicDetail, useCreateTopic, useDeleteTopic, useUpdateTopic, useCreateReply, useDeleteReply } from '../../hooks/useTopics';
import { useProjects } from '../../hooks/useProjects';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../common/Badge';
import { StatusBadge } from '../common/StatusBadge';
import { Avatar } from '../common/Avatar';
import { Dropdown } from '../common/Dropdown';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { MessageSquare, Trash2, Plus, MessageCircle, Send, MoreVertical } from 'lucide-react';
import { Drawer } from '../common/Drawer';

interface TopicsManagerProps {
  projectId?: number;
}

export const TopicsManager: React.FC<TopicsManagerProps> = ({ projectId }) => {
  const toast = useToast();
  const { user } = useAuth();
  const { t, formatDate } = useSettings();

  // Load topics
  const { data: topics = [], isLoading } = useTopics(projectId);
  const { data: projects = [] } = useProjects();

  const createTopicMutation = useCreateTopic();
  const updateTopicMutation = useUpdateTopic();
  const deleteTopicMutation = useDeleteTopic();

  // Dialog & Detail states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedTopicId, setSelectedTopicId] = React.useState<number | null>(null);
  const [editingTopicId, setEditingTopicId] = React.useState<number | null>(null);

  // Form states
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [topicProjectId, setTopicProjectId] = React.useState<string>(projectId ? String(projectId) : '');

  const handleCreateOrUpdateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProjId = projectId ? String(projectId) : topicProjectId;
    if (!title.trim() || !content.trim() || !targetProjId) {
      toast.error(t('Lỗi', 'Error'), t('Vui lòng chọn dự án liên kết cho chủ đề thảo luận.', 'Please select a project for this discussion topic.'));
      return;
    }
    try {
      if (editingTopicId) {
        await updateTopicMutation.mutateAsync({
          id: editingTopicId,
          payload: {
            title: title.trim(),
            content: content.trim(),
            project_id: Number(targetProjId),
          }
        });
        toast.success(t('Thành công', 'Success'), t('Đã cập nhật chủ đề thảo luận.', 'Updated discussion topic.'));
      } else {
        await createTopicMutation.mutateAsync({
          title: title.trim(),
          content: content.trim(),
          project_id: Number(targetProjId),
        });
        toast.success(t('Thành công', 'Success'), t('Đã mở một cuộc thảo luận mới.', 'Started a new discussion.'));
      }
      setTitle('');
      setContent('');
      setEditingTopicId(null);
      setIsCreateOpen(false);
    } catch {
      toast.error(t('Lỗi', 'Error'), t('Thao tác thất bại.', 'Operation failed.'));
    }
  };

  const handleDeleteTopic = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('Xác nhận xóa chủ đề thảo luận này? Tất cả phản hồi sẽ bị xóa theo.', 'Confirm deleting this discussion topic? All replies will also be deleted.'))) return;
    try {
      await deleteTopicMutation.mutateAsync(id);
      toast.success(t('Đã xóa chủ đề', 'Topic deleted'));
      if (selectedTopicId === id) setSelectedTopicId(null);
    } catch {
      toast.error(t('Lỗi', 'Error'), t('Không thể xóa chủ đề này.', 'Unable to delete this topic.'));
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Action */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase text-text-primary tracking-wide flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          {t('Kênh thảo luận chung', 'Discussion Forum')}
        </h3>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setIsCreateOpen(true)}
        >
          {t('Mở chủ đề mới', 'New Topic')}
        </Button>
      </div>

      {/* Grid layout for topics */}
      {isLoading ? (
        <div className="text-center py-8 text-xs text-text-muted">{t('Đang tải thảo luận...', 'Loading discussions...')}</div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface/50 text-xs text-text-muted">
          {t('Chưa có cuộc thảo luận nào được bắt đầu. Nhấp vào "Mở chủ đề mới" để khơi dậy đối thoại.', 'No discussions started yet. Click "New Topic" to start one.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic) => {
            const isOwner = user?.id === topic.created_by_id;
            const isMod = user?.role_id === 1 || user?.role_id === 2;
            const dateStr = formatDate(topic.created_at, 'full');
            return (
              <div
                key={topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className="p-4 rounded-xl border border-border bg-surface hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between gap-4 text-xs group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={topic.status} />
                      <div className="flex items-center gap-1">
                      {topic.project_id && (
                        <Badge variant="default">
                          {t('Dự án', 'Project')} #{topic.project_id}
                        </Badge>
                      )}
                      {(isOwner || isMod) && (
                        <Dropdown
                          trigger={
                            <div
                              className="p-1 rounded text-text-muted hover:bg-secondary hover:text-text-primary transition-colors cursor-pointer"
                              title={t('Hành động', 'Actions')}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </div>
                          }
                          items={[
                            {
                              key: 'toggle_status',
                              label: topic.status === 'Open' ? t('Đóng chủ đề', 'Close Topic') : t('Mở lại chủ đề', 'Reopen Topic'),
                              onClick: async () => {
                                if (!window.confirm(t('Xác nhận đổi trạng thái?', 'Confirm status change?'))) return;
                                try {
                                  await updateTopicMutation.mutateAsync({ id: topic.id, payload: { status: topic.status === 'Open' ? 'Closed' : 'Open' } });
                                  toast.success(t('Đã cập nhật trạng thái', 'Status updated'));
                                } catch {
                                  toast.error(t('Lỗi', 'Error'), t('Không thể cập nhật trạng thái.', 'Unable to update status.'));
                                }
                              }
                            },
                            {
                              key: 'edit',
                              label: t('Chỉnh sửa', 'Edit'),
                              onClick: () => {
                                setTitle(topic.title);
                                setContent(topic.content);
                                setTopicProjectId(topic.project_id ? String(topic.project_id) : '');
                                setEditingTopicId(topic.id);
                                setIsCreateOpen(true);
                              }
                            },
                            'separator',
                            {
                              key: 'delete',
                              label: t('Xóa', 'Delete'),
                              destructive: true,
                              onClick: () => handleDeleteTopic(topic.id, { stopPropagation: () => {} } as any)
                            }
                          ]}
                        />
                      )}
                    </div>
                  </div>
                  <h4 className="font-bold text-text-primary text-sm line-clamp-1">{topic.title}</h4>
                  <p className="text-text-secondary line-clamp-2 leading-relaxed">{topic.content}</p>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-text-muted">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={topic.creator?.avatar_url}
                      name={topic.creator?.full_name}
                      size="sm"
                    />
                    <div>
                      <p className="font-bold text-text-primary">{topic.creator?.full_name}</p>
                      <p className="text-[10px]">{dateStr}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {topic.reply_count || 0} {t('phản hồi', 'replies')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over Create Form Drawer */}
      <Drawer
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingTopicId(null);
          setTitle('');
          setContent('');
        }}
        title={editingTopicId ? t('Chỉnh sửa chủ đề thảo luận', 'Edit Discussion Topic') : t('Khởi tạo chủ đề thảo luận mới', 'Create New Discussion Topic')}
        description={t('Đăng tin tức, chia sẻ ý tưởng hoặc đặt câu hỏi kỹ thuật cho đồng nghiệp.', 'Share updates, ideas, or technical questions with teammates.')}
        footer={
          <div className="flex items-center justify-end gap-3 w-full border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => {
              setIsCreateOpen(false);
              setEditingTopicId(null);
              setTitle('');
              setContent('');
            }}>
              {t('Hủy bỏ', 'Cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateOrUpdateTopic}>
              {editingTopicId ? t('Lưu thay đổi', 'Save Changes') : t('Đăng thảo luận', 'Post Topic')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateOrUpdateTopic} className="space-y-4 text-xs">
          <Input
            label={t('Tiêu đề thảo luận *', 'Topic Title *')}
            placeholder={t('Nhập tiêu đề ngắn gọn...', 'Enter a concise title...')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {!projectId && (
            <Select
              label={t('Liên kết Dự án *', 'Linked Project *')}
              value={topicProjectId}
              onChange={(e) => setTopicProjectId(e.target.value)}
              options={[
                { value: '', label: t('-- Chọn Dự án liên kết --', '-- Select Project --') },
                ...projects.map((p) => ({ value: String(p.id), label: p.name })),
              ]}
              required
            />
          )}
          <Textarea
            label={t('Nội dung thảo luận *', 'Topic Content *')}
            placeholder={t('Chi tiết câu hỏi hoặc ý kiến...', 'Details of your question or thoughts...')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            required
          />
        </form>
      </Drawer>

      {/* Slide-over Detail & Replies Drawer */}
      {selectedTopicId !== null && (
        <TopicDetailDrawer
          topicId={selectedTopicId}
          onClose={() => setSelectedTopicId(null)}
        />
      )}
    </div>
  );
};

// Threaded replies drawer
const TopicDetailDrawer: React.FC<{ topicId: number; onClose: () => void }> = ({ topicId, onClose }) => {
  const toast = useToast();
  const { user } = useAuth();
  const { t, formatDate } = useSettings();
  const { data: topic, isLoading } = useTopicDetail(topicId);

  const createReplyMutation = useCreateReply();
  const deleteReplyMutation = useDeleteReply();

  const [replyText, setReplyText] = React.useState('');

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      await createReplyMutation.mutateAsync({
        topicId,
        payload: { content: replyText.trim() },
      });
      setReplyText('');
      toast.success(t('Đã gửi phản hồi', 'Reply posted'));
    } catch {
      toast.error(t('Lỗi', 'Error'), t('Không thể đăng phản hồi.', 'Unable to post reply.'));
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!window.confirm(t('Xác nhận xóa câu trả lời này?', 'Confirm deleting this reply?'))) return;
    try {
      await deleteReplyMutation.mutateAsync({ topicId, replyId });
      toast.success(t('Đã xóa phản hồi', 'Reply deleted'));
    } catch {
      toast.error(t('Lỗi', 'Error'), t('Không thể xóa phản hồi này.', 'Unable to delete reply.'));
    }
  };

  if (isLoading || !topic) {
    return (
      <Drawer isOpen={true} onClose={onClose} title={t('Đang tải thảo luận...', 'Loading discussion...')}>
        <div className="text-center py-8 text-xs text-text-muted">{t('Đang tải chi tiết chủ đề...', 'Loading topic details...')}</div>
      </Drawer>
    );
  }

  const dateStr = formatDate(topic.created_at, 'full');

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title={t('Chi tiết Cuộc thảo luận', 'Discussion Details')}
      description={t('Xem luồng hội thoại và bình luận phản hồi từ đồng nghiệp.', 'View conversation thread and teammate replies.')}
      size="lg"
    >
      <div className="space-y-6 font-sans text-xs pb-12">
        {/* Original Topic Post */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/[0.01] space-y-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={topic.creator?.avatar_url}
              name={topic.creator?.full_name}
              size="md"
            />
            <div>
              <p className="font-bold text-text-primary text-sm">{topic.creator?.full_name}</p>
              <p className="text-[10px] text-text-muted">{topic.creator?.job_title || t('Thành viên', 'Member')} • {dateStr}</p>
            </div>
          </div>
          <h3 className="font-bold text-text-primary text-base pt-1">{topic.title}</h3>
          <div className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap">
            {topic.content}
          </div>
        </div>

        {/* Replies List */}
        <div className="space-y-4">
          <h4 className="font-bold text-text-primary uppercase tracking-wide border-b border-border pb-2 flex items-center gap-1">
            <MessageSquare className="h-4 w-4 text-primary" />
            {t('Các phản hồi', 'Replies')} ({topic.replies?.length || 0})
          </h4>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {topic.replies && topic.replies.length > 0 ? (
              topic.replies.map((reply) => {
                const isOwner = user?.id === reply.created_by_id;
                const isMod = user?.role_id === 1 || user?.role_id === 2;
                return (
                  <div key={reply.id} className="flex gap-3 items-start border-b border-border/20 pb-3 last:border-b-0 group">
                    <Avatar
                      src={reply.creator?.avatar_url}
                      name={reply.creator?.full_name}
                      size="sm"
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-text-primary">
                          {reply.creator?.full_name}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {formatDate(reply.created_at, 'full')}
                        </span>
                      </div>
                      <p className="text-[9px] text-text-muted mt-0.5">
                        {reply.creator?.job_title || t('Thành viên', 'Member')}
                      </p>
                      <div className="mt-1 text-text-secondary bg-secondary/10 p-2.5 rounded-lg border border-border/10 leading-relaxed break-words">
                        {reply.content}
                      </div>
                    </div>
                    {(isOwner || isMod) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReply(reply.id)}
                        className="p-1 rounded text-text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                        title={t('Xóa phản hồi', 'Delete reply')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center py-6 text-text-muted text-[11px]">{t('Chưa có phản hồi nào. Hãy là người đầu tiên trả lời.', 'No replies yet. Be the first to respond.')}</p>
            )}
          </div>

          {/* Reply Form */}
          <form onSubmit={handlePostReply} className="flex gap-2 border-t border-border pt-3">
            <Input
              placeholder={t('Nhập nội dung phản hồi của bạn...', 'Write your reply...')}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Send className="h-3.5 w-3.5" />}
              isLoading={createReplyMutation.isPending}
            >
              {t('Gửi', 'Send')}
            </Button>
          </form>
        </div>
      </div>
    </Drawer>
  );
};

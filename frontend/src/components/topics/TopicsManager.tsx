import * as React from 'react';
import { useTopics, useTopicDetail, useCreateTopic, useDeleteTopic, useCreateReply, useDeleteReply } from '../../hooks/useTopics';
import { useProjects } from '../../hooks/useProjects';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { MessageSquare, Trash2, Plus, MessageCircle, Send } from 'lucide-react';
import { Drawer } from '../common/Drawer';

interface TopicsManagerProps {
  projectId?: number;
}

export const TopicsManager: React.FC<TopicsManagerProps> = ({ projectId }) => {
  const toast = useToast();
  const { user } = useAuth();

  // Load topics
  const { data: topics = [], isLoading } = useTopics(projectId);
  const { data: projects = [] } = useProjects();

  const createTopicMutation = useCreateTopic();
  const deleteTopicMutation = useDeleteTopic();

  // Dialog & Detail states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedTopicId, setSelectedTopicId] = React.useState<number | null>(null);

  // Form states
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [topicProjectId, setTopicProjectId] = React.useState<string>(projectId ? String(projectId) : '');

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      await createTopicMutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        project_id: topicProjectId ? Number(topicProjectId) : null,
      });
      setTitle('');
      setContent('');
      setIsCreateOpen(false);
      toast.success('Thành công', 'Đã mở một cuộc thảo luận mới.');
    } catch {
      toast.error('Lỗi', 'Không thể tạo chủ đề thảo luận.');
    }
  };

  const handleDeleteTopic = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Xác nhận xóa chủ đề thảo luận này? Tất cả phản hồi sẽ bị xóa theo.')) return;
    try {
      await deleteTopicMutation.mutateAsync(id);
      toast.success('Đã xóa chủ đề');
      if (selectedTopicId === id) setSelectedTopicId(null);
    } catch {
      toast.error('Lỗi', 'Không thể xóa chủ đề này.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Action */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase text-text-primary tracking-wide flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          Kênh thảo luận chung
        </h3>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Mở chủ đề mới
        </Button>
      </div>

      {/* Grid layout for topics */}
      {isLoading ? (
        <div className="text-center py-8 text-xs text-text-muted">Đang tải thảo luận...</div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface/50 text-xs text-text-muted">
          Chưa có cuộc thảo luận nào được bắt đầu. Nhấp vào "Mở chủ đề mới" để khơi dậy đối thoại.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic) => {
            const isOwner = user?.id === topic.created_by_id;
            const isMod = user?.role_id === 1 || user?.role_id === 2;
            const dateStr = new Date(topic.created_at).toLocaleDateString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className="p-4 rounded-xl border border-border bg-surface hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between gap-4 text-xs group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={topic.status === 'Open' ? 'success' : 'primary'}>
                      {topic.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {topic.project_id && (
                        <Badge variant="default">
                          Dự án #{topic.project_id}
                        </Badge>
                      )}
                      {(isOwner || isMod) && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTopic(topic.id, e)}
                          className="p-1 rounded text-text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                          title="Xóa chủ đề"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
                    {topic.reply_count || 0} phản hồi
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
        onClose={() => setIsCreateOpen(false)}
        title="Khởi tạo chủ đề thảo luận mới"
        description="Đăng tin tức, chia sẻ ý tưởng hoặc đặt câu hỏi kỹ thuật cho đồng nghiệp."
        footer={
          <div className="flex items-center justify-end gap-3 w-full border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Hủy bỏ
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateTopic}>
              Đăng thảo luận
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateTopic} className="space-y-4 text-xs">
          <Input
            label="Tiêu đề thảo luận *"
            placeholder="Nhập tiêu đề ngắn gọn..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {!projectId && (
            <Select
              label="Liên kết Dự án (Tùy chọn)"
              value={topicProjectId}
              onChange={(e) => setTopicProjectId(e.target.value)}
              options={[
                { value: '', label: '-- Thảo luận chung toàn công ty --' },
                ...projects.map((p) => ({ value: String(p.id), label: p.name })),
              ]}
            />
          )}
          <Textarea
            label="Nội dung thảo luận *"
            placeholder="Chi tiết câu hỏi hoặc ý kiến..."
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
      toast.success('Đã gửi phản hồi');
    } catch {
      toast.error('Lỗi', 'Không thể đăng phản hồi.');
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!window.confirm('Xác nhận xóa câu trả lời này?')) return;
    try {
      await deleteReplyMutation.mutateAsync({ topicId, replyId });
      toast.success('Đã xóa phản hồi');
    } catch {
      toast.error('Lỗi', 'Không thể xóa phản hồi này.');
    }
  };

  if (isLoading || !topic) {
    return (
      <Drawer isOpen={true} onClose={onClose} title="Đang tải thảo luận...">
        <div className="text-center py-8 text-xs text-text-muted">Đang tải chi tiết chủ đề...</div>
      </Drawer>
    );
  }

  const dateStr = new Date(topic.created_at).toLocaleString('vi-VN');

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title="Chi tiết Cuộc thảo luận"
      description="Xem luồng hội thoại và bình luận phản hồi từ đồng nghiệp."
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
              <p className="text-[10px] text-text-muted">{topic.creator?.job_title || 'Thành viên'} • {dateStr}</p>
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
            Các phản hồi ({topic.replies?.length || 0})
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
                          {new Date(reply.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-[9px] text-text-muted mt-0.5">
                        {reply.creator?.job_title || 'Thành viên'}
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
                        title="Xóa phản hồi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center py-6 text-text-muted text-[11px]">Chưa có phản hồi nào. Hãy là người đầu tiên trả lời.</p>
            )}
          </div>

          {/* Reply Form */}
          <form onSubmit={handlePostReply} className="flex gap-2 border-t border-border pt-3">
            <Input
              placeholder="Nhập nội dung phản hồi của bạn..."
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
              Gửi
            </Button>
          </form>
        </div>
      </div>
    </Drawer>
  );
};

import * as React from 'react';
import { useMyFeedback, useAllFeedback, useSubmitFeedback, useReviewFeedback } from '../../hooks/useFeedback';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { HelpCircle, Lock, MessageSquare, Shield, ShieldCheck, EyeOff, X } from 'lucide-react';

export const FeedbackManager: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();

  const isManagerOrAdmin = user?.role_id === 1 || user?.role_id === 2;

  // Active Tab: 'submit' | 'review' (only if manager/admin)
  const [activeTab, setActiveTab] = React.useState<'submit' | 'review'>('submit');

  // Queries
  const { data: myFeedback = [], isLoading: myLoading } = useMyFeedback();
  const { data: allFeedback = [], isLoading: allLoading } = useAllFeedback(isManagerOrAdmin);

  // Mutations
  const submitMutation = useSubmitFeedback();
  const reviewMutation = useReviewFeedback();

  // Form State (Submit)
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState('Hạ tầng & Công cụ');
  const [description, setDescription] = React.useState('');
  const [impactLevel, setImpactLevel] = React.useState('Medium');
  const [isAnonymous, setIsAnonymous] = React.useState(false);

  // Review Dialog State
  const [reviewId, setReviewId] = React.useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = React.useState('Resolved');
  const [reviewResponse, setReviewResponse] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    try {
      await submitMutation.mutateAsync({
        title: title.trim(),
        category,
        description: description.trim(),
        impact_level: impactLevel,
        is_anonymous: isAnonymous,
      });
      setTitle('');
      setDescription('');
      setIsAnonymous(false);
      toast.success('Thành công', 'Ý kiến của bạn đã được gửi tới Ban quản lý.');
    } catch {
      toast.error('Lỗi', 'Không thể gửi phản hồi.');
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewId) return;
    try {
      await reviewMutation.mutateAsync({
        id: reviewId,
        payload: {
          status: reviewStatus,
          response: reviewResponse.trim() || undefined,
        },
      });
      setReviewId(null);
      setReviewResponse('');
      toast.success('Thành công', 'Đã lưu kết quả đánh giá ý kiến phản hồi.');
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật đánh giá.');
    }
  };

  const impactBadges: Record<string, 'primary' | 'success' | 'warning' | 'danger'> = {
    Low: 'primary',
    Medium: 'success',
    High: 'warning',
    Critical: 'danger',
  };

  const statusBadges: Record<string, 'warning' | 'success' | 'danger' | 'primary'> = {
    New: 'warning',
    'Under Review': 'primary',
    Resolved: 'success',
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Tabs */}
      {isManagerOrAdmin && (
        <div className="flex border-b border-border/60 pb-px">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'submit'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Đóng góp ý kiến của tôi
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'review'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Quản lý & Duyệt phản hồi
          </button>
        </div>
      )}

      {activeTab === 'submit' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submission Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Đóng góp ý kiến mới
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Tiêu đề ý kiến *"
                    placeholder="Ví dụ: Đề xuất mở rộng bộ nhớ Redis test..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  <Select
                    label="Chuyên mục đóng góp"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={[
                      { value: 'Hạ tầng & Công cụ', label: 'Hạ tầng & Công cụ' },
                      { value: 'Môi trường làm việc', label: 'Môi trường làm việc' },
                      { value: 'Quy trình kỹ thuật', label: 'Quy trình kỹ thuật' },
                      { value: 'Phúc lợi & Sự kiện', label: 'Phúc lợi & Sự kiện' },
                    ]}
                  />
                  <Textarea
                    label="Nội dung chi tiết *"
                    placeholder="Phân tích tình trạng hiện tại và giải pháp kiến nghị..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    required
                  />
                  <Select
                    label="Mức độ ảnh hưởng"
                    value={impactLevel}
                    onChange={(e) => setImpactLevel(e.target.value)}
                    options={[
                      { value: 'Low', label: 'Thấp (Low)' },
                      { value: 'Medium', label: 'Trung bình (Medium)' },
                      { value: 'High', label: 'Cao (High)' },
                      { value: 'Critical', label: 'Nghiêm trọng (Critical)' },
                    ]}
                  />

                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/20 border border-border">
                    <input
                      type="checkbox"
                      id="feedback-anonymous"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="feedback-anonymous" className="cursor-pointer text-[11px] text-text-secondary flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>Gửi ẩn danh ý kiến này (Ẩn tên đối với Manager/Admin)</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    isLoading={submitMutation.isPending}
                  >
                    Gửi phản hồi
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Submission History */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase">Lịch sử phản hồi của tôi ({myFeedback.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {myLoading ? (
                  <div className="text-center py-6 text-text-muted">Đang tải lịch sử...</div>
                ) : myFeedback.length === 0 ? (
                  <div className="text-center py-12 text-text-muted">Bạn chưa gửi đóng góp ý kiến nào.</div>
                ) : (
                  myFeedback.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="p-4 rounded-xl border border-border bg-surface hover:border-primary/20 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                          <h4 className="font-bold text-text-primary text-sm">{feedback.title}</h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="default">{feedback.category}</Badge>
                            <Badge variant={impactBadges[feedback.impact_level] || 'primary'}>
                              Ảnh hưởng: {feedback.impact_level}
                            </Badge>
                            <Badge variant={statusBadges[feedback.status] || 'primary'}>
                              {feedback.status}
                            </Badge>
                            {feedback.is_anonymous && (
                              <Badge variant="danger" className="flex items-center gap-1">
                                <EyeOff className="h-3 w-3" /> Ẩn danh
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-text-muted">
                          {new Date(feedback.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-text-secondary leading-relaxed bg-secondary/10 p-2.5 rounded-lg border border-border/10">
                        {feedback.description}
                      </p>

                      {feedback.response && (
                        <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-500/[0.02] dark:border-emerald-950/20 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                            <MessageSquare className="h-4 w-4" />
                            Phản hồi từ Ban quản lý:
                          </div>
                          <p className="text-text-secondary leading-relaxed">{feedback.response}</p>
                          {feedback.reviewer && (
                            <p className="text-[10px] text-text-muted mt-1.5 italic text-right">
                              Đăng bởi: {feedback.reviewer.full_name} ({feedback.reviewer.job_title})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Manager Review View */
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Danh sách ý kiến đóng góp toàn công ty ({allFeedback.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allLoading ? (
              <div className="text-center py-6 text-text-muted">Đang tải danh sách đóng góp...</div>
            ) : allFeedback.length === 0 ? (
              <div className="text-center py-12 text-text-muted">Hiện tại không có ý kiến phản hồi nào.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {allFeedback.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 rounded-xl border border-border bg-surface hover:border-primary/20 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <h4 className="font-bold text-text-primary text-sm">{feedback.title}</h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="default">{feedback.category}</Badge>
                          <Badge variant={impactBadges[feedback.impact_level] || 'primary'}>
                            Ảnh hưởng: {feedback.impact_level}
                          </Badge>
                          <Badge variant={statusBadges[feedback.status] || 'primary'}>
                            {feedback.status}
                          </Badge>
                          {feedback.is_anonymous ? (
                            <Badge variant="danger" className="flex items-center gap-1">
                              <EyeOff className="h-3 w-3" /> Ẩn danh
                            </Badge>
                          ) : (
                            <Badge variant="primary" className="flex items-center gap-1">
                              Mã NV: {feedback.submitter?.id}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-text-muted">
                        {new Date(feedback.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="text-xs text-text-secondary leading-relaxed bg-secondary/15 p-3 rounded-lg border border-border/10 space-y-2">
                      <p>{feedback.description}</p>
                      {!feedback.is_anonymous && feedback.submitter && (
                        <div className="flex items-center gap-2 border-t border-border/40 pt-2 text-[10px] text-text-muted">
                          <Avatar
                            src={feedback.submitter.avatar_url}
                            name={feedback.submitter.full_name}
                            size="sm"
                          />
                          <span>Người gửi: <strong>{feedback.submitter.full_name}</strong> ({feedback.submitter.job_title})</span>
                        </div>
                      )}
                    </div>

                    {feedback.response ? (
                      <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-500/[0.02] dark:border-emerald-950/20 text-xs">
                        <div className="flex justify-between items-center gap-2 mb-1.5">
                          <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                            <MessageSquare className="h-4 w-4" />
                            Đã phản hồi:
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReviewId(feedback.id);
                              setReviewStatus(feedback.status);
                              setReviewResponse(feedback.response || '');
                            }}
                          >
                            Chỉnh sửa
                          </Button>
                        </div>
                        <p className="text-text-secondary">{feedback.response}</p>
                        {feedback.reviewer && (
                          <p className="text-[10px] text-text-muted mt-1.5 italic text-right">
                            Duyệt bởi: {feedback.reviewer.full_name} ({feedback.reviewer.job_title})
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setReviewId(feedback.id);
                            setReviewStatus('Resolved');
                            setReviewResponse('');
                          }}
                        >
                          Phản hồi ý kiến này
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Dialog Modal */}
      {reviewId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-sans p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/10">
              <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5 uppercase">
                <Shield className="h-4 w-4 text-primary" />
                Đánh giá & Trả lời đóng góp
              </h3>
              <button
                type="button"
                onClick={() => setReviewId(null)}
                className="p-1 rounded-lg text-text-muted hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleReview} className="p-4 space-y-4">
              <Select
                label="Trạng thái xử lý"
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                options={[
                  { value: 'Under Review', label: 'Đang xem xét (Under Review)' },
                  { value: 'Resolved', label: 'Đã giải quyết (Resolved)' },
                ]}
              />
              <Textarea
                label="Nội dung phản hồi chính thức *"
                placeholder="Nhập nội dung trả lời cho nhân viên biết cách xử lý của Ban quản lý..."
                value={reviewResponse}
                onChange={(e) => setReviewResponse(e.target.value)}
                rows={4}
                required
              />
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm" type="button" onClick={() => setReviewId(null)}>
                  Hủy bỏ
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={reviewMutation.isPending}>
                  Lưu & Gửi phản hồi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

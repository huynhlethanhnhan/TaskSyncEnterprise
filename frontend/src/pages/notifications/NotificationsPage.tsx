import * as React from 'react';
import { useNavigate } from 'react-router';
import { Bell, CheckCheck, Check, ArrowLeft, ExternalLink } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/common/Badge';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../../hooks/useNotifications';
import { useTasks } from '../../hooks/useTasks';
import { useToast } from '../../providers/ToastProvider';
import { RelativeTime } from '../../components/data-display/RelativeTime';
import { cn } from '../../utils/cn';

const NotificationsPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading, isError, refetch } = useNotifications();
  const { data: tasks = [] } = useTasks();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [filter, setFilter] = React.useState<'all' | 'unread' | 'read'>('all');

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const filteredNotifications = React.useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.is_read);
    if (filter === 'read') return notifications.filter((n) => n.is_read);
    return notifications;
  }, [notifications, filter]);

  // Group notifications by Date (Today, Yesterday, Earlier)
  const groupedNotifications = React.useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const groups: { today: any[]; yesterday: any[]; earlier: any[] } = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    filteredNotifications.forEach((item) => {
      const createdDate = new Date(item.created_at);
      if (createdDate.toDateString() === today.toDateString()) {
        groups.today.push(item);
      } else if (createdDate.toDateString() === yesterday.toDateString()) {
        groups.yesterday.push(item);
      } else {
        groups.earlier.push(item);
      }
    });

    return groups;
  }, [filteredNotifications]);

  const handleMarkOne = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await markRead.mutateAsync(id);
      toast.success('Đã đánh dấu thông báo là đã đọc');
    } catch {
      toast.error('Lỗi khi đánh dấu thông báo');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch {
      toast.error('Lỗi khi cập nhật danh sách thông báo');
    }
  };

  // Click handler to open entity context
  const handleItemClick = async (item: any) => {
    try {
      if (!item.is_read) {
        await markRead.mutateAsync(item.id);
      }

      const msg = item.message.toLowerCase();
      const title = item.title.toLowerCase();

      if (title.includes('nghỉ phép') || msg.includes('nghỉ phép') || title.includes('vacation')) {
        navigate('/vacations');
      } else {
        const matchedTask = tasks.find(t => msg.includes((t.title || t.name || '').toLowerCase()));
        if (matchedTask) {
          navigate(`/tasks?view=table&taskId=${matchedTask.id}`);
        } else {
          navigate('/tasks?view=table');
        }
      }
    } catch {
      // Fallback
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Thông báo Hệ thống" description="Đang tải hộp thư thông báo..." />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Thông báo Hệ thống" description="Hộp thư thông báo" />
        <ErrorState
          title="Không thể tải thông báo"
          message="Đã xảy ra lỗi khi kết nối đến máy chủ backend."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const renderGroupSection = (title: string, items: any[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 pt-4">{title}</h3>
        <div className="divide-y divide-border/60">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                'p-4 flex items-start justify-between gap-4 transition-all cursor-pointer hover:bg-accent/30',
                !item.is_read ? 'bg-primary/[0.01] border-l-2 border-l-primary' : 'bg-surface'
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    'p-2 rounded-xl shrink-0 mt-0.5',
                    !item.is_read
                      ? 'bg-primary/10 text-primary'
                      : 'bg-accent text-text-muted'
                  )}
                >
                  <Bell className="h-4.5 w-4.5" />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-text-primary truncate">{item.title}</h4>
                    {!item.is_read && (
                      <Badge variant="danger" size="sm" showDot>
                        Mới
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{item.message}</p>
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] text-text-muted">
                    <RelativeTime value={item.created_at} />
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="flex items-center gap-0.5 hover:underline">
                      Xem chi tiết <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              </div>

              {!item.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Check className="h-3.5 w-3.5" />}
                  onClick={(e) => handleMarkOne(e, item.id)}
                >
                  Đọc
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Thông báo Hệ thống"
        description="Theo dõi cập nhật phân công công việc, biến động dự án và nhắc nhở thời hạn"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Thông báo' },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(-1)}
            >
              Quay lại
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCheck className="h-4 w-4" />}
                onClick={handleMarkAll}
                isLoading={markAllRead.isPending}
              >
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Tabs Header */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between bg-accent/10">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: `Tất cả (${notifications.length})` },
              { id: 'unread', label: `Chưa đọc (${unreadCount})` },
              { id: 'read', label: `Đã đọc (${notifications.length - unreadCount})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  filter === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Badge variant={unreadCount > 0 ? 'warning' : 'success'} showDot>
            {unreadCount} Tin nhắn mới
          </Badge>
        </CardContent>
      </Card>

      {/* Grouped Notifications List */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 divide-y divide-border/40">
          {filteredNotifications.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="Không có thông báo nào"
                description="Hộp thư thông báo của bạn hiện đang trống."
              />
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {renderGroupSection('Hôm nay', groupedNotifications.today)}
              {renderGroupSection('Hôm qua', groupedNotifications.yesterday)}
              {renderGroupSection('Trước đó', groupedNotifications.earlier)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;

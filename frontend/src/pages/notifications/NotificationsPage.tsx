import * as React from 'react';
import { Bell, CheckCheck, Check } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/common/Badge';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../../hooks/useNotifications';
import { useToast } from '../../providers/ToastProvider';
import { RelativeTime } from '../../components/data-display/RelativeTime';

export const NotificationsPage: React.FC = () => {
  const toast = useToast();
  const { data: notifications = [], isLoading, isError, refetch } = useNotifications();
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

  const handleMarkOne = async (id: number) => {
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
          unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="h-4 w-4 text-emerald-600" />}
              onClick={handleMarkAll}
              isLoading={markAllRead.isPending}
            >
              Đánh dấu tất cả là đã đọc
            </Button>
          )
        }
      />

      {/* Filter Tabs Header */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filter === 'unread' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('read')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filter === 'read' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Đã đọc ({notifications.length - unreadCount})
            </button>
          </div>

          <Badge variant={unreadCount > 0 ? 'warning' : 'success'} showDot>
            {unreadCount} Thông báo Mới
          </Badge>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0 divide-y divide-border/60">
          {filteredNotifications.length === 0 ? (
            <EmptyState
              title="Không có thông báo nào"
              description="Hộp thư thông báo của bạn hiện đang trống."
            />
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  !item.is_read ? 'bg-accent/40 dark:bg-accent/20' : 'bg-surface'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      !item.is_read
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground'
                    }`}
                  >
                    <Bell className="h-4.5 w-4.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-text-primary">{item.title}</h4>
                      {!item.is_read && (
                        <Badge variant="danger" showDot>
                          Mới
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">{item.message}</p>
                    <RelativeTime value={item.created_at} className="text-[11px] text-text-muted block pt-1" />
                  </div>
                </div>

                {!item.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Check className="h-4 w-4" />}
                    onClick={() => handleMarkOne(item.id)}
                  >
                    Đọc
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;

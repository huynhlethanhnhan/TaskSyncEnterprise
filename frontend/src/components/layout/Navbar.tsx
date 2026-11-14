import * as React from 'react';
import { useNavigate } from 'react-router';
import { Search, Bell, Sun, Moon, Command, CheckCheck, ExternalLink, ArrowLeft, Home, Menu } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Dropdown } from '../common/Dropdown';
import { cn } from '../../utils/cn';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../../hooks/useNotifications';
import { useTasks } from '../../hooks/useTasks';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { RelativeTime } from '../data-display/RelativeTime';

export interface NavbarProps {
  user?: {
    name: string;
    email: string;
    role?: string;
    avatar_url?: string | null;
  };
  unreadNotificationsCount?: number;
  onOpenMobileMenu?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenMobileMenu,
  onOpenSearch,
  isDarkMode = false,
  onToggleTheme,
  onLogout,
  onProfileClick,
  className,
}) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useSettings();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = React.useState(false);

  const { data: notifications = [] } = useNotifications();
  const { data: tasks = [] } = useTasks();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const recentNotifications = React.useMemo(() => {
    return notifications.slice(0, 5);
  }, [notifications]);

  // Close notifications dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsNotifDropdownOpen(false);
      }
    };
    if (isNotifDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifDropdownOpen]);

  // Deep linking helper
  const handleNotificationClick = async (item: any) => {
    try {
      if (!item.is_read) {
        await markRead.mutateAsync(item.id);
      }
      setIsNotifDropdownOpen(false);

      // Determine entity type based on content
      const msg = item.message.toLowerCase();
      const title = item.title.toLowerCase();

      if (
        item.type === 'PASSWORD_RESET_REQUEST' ||
        title.includes('đặt lại mật khẩu') ||
        title.includes('password reset')
      ) {
        let requesterId: number | null = null;
        if (item.context_json) {
          try {
            const ctx = JSON.parse(item.context_json);
            if (typeof ctx?.requester_id === 'number') {
              requesterId = ctx.requester_id;
            }
          } catch {
            // fallback to directory
          }
        }
        navigate(requesterId ? `/employees/${requesterId}` : '/employees');
      } else if (title.includes('nghỉ phép') || msg.includes('nghỉ phép') || title.includes('vacation')) {
        navigate('/vacations');
      } else {
        // Look up corresponding task by matching name or title in message
        const matchedTask = tasks.find(t => msg.includes((t.title || t.name || '').toLowerCase()));
        if (matchedTask) {
          navigate(`/tasks?view=table&taskId=${matchedTask.id}`);
        } else {
          navigate('/tasks?view=table');
        }
      }
    } catch {
      // Fallback
      navigate('/notifications');
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllRead.mutateAsync();
      toast.success(t('Đã đánh dấu tất cả thông báo là đã đọc', 'Marked all notifications as read'));
    } catch {
      toast.error(t('Lỗi khi cập nhật danh sách thông báo', 'Failed to update notifications'));
    }
  };

  const profileMenuItems = [
    {
      key: 'profile',
      label: user?.name || t('Hồ sơ cá nhân', 'User Profile'),
      onClick: onProfileClick,
    },
    {
      key: 'theme',
      label: isDarkMode ? t('Giao diện Sáng', 'Light Mode') : t('Giao diện Tối', 'Dark Mode'),
      icon: isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      onClick: onToggleTheme,
    },
    'separator' as const,
    {
      key: 'logout',
      label: t('Đăng xuất', 'Log Out'),
      destructive: true,
      onClick: onLogout,
    },
  ];

  return (
    <header
      className={cn(
        'h-16 w-full bg-surface px-3 sm:px-6 flex items-center justify-between gap-2 transition-colors',
        className
      )}
    >
      {/* Navigation History & Global Search Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 cursor-pointer"
            aria-label={t('Mở menu điều hướng', 'Open mobile menu')}
            title={t('Mở menu điều hướng', 'Open mobile menu')}
          >
            <Menu className="h-5 w-5 stroke-[1.75]" />
          </button>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-label={t('Quay lại trang trước', 'Go back')}
            title={t('Quay lại trang trước', 'Go back')}
          >
            <ArrowLeft className="h-4 w-4 stroke-[1.75]" />
            <span className="hidden md:inline">{t('Quay lại', 'Back')}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="hidden sm:inline-flex items-center justify-center rounded-md p-1.5 text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-label={t('Trang chủ Dashboard', 'Dashboard Home')}
            title={t('Về Trang chủ (Dashboard)', 'Go to Dashboard')}
          >
            <Home className="h-4 w-4 stroke-[1.75]" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 h-9 px-3 flex-1 max-w-44 sm:max-w-none sm:flex-none sm:w-56 md:w-72 xl:w-96 rounded-md border border-input bg-background/50 text-xs text-text-muted hover:border-slate-400 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0 cursor-pointer"
        >
          <Search className="h-3.5 w-3.5 stroke-[1.75]" />
          <span className="flex-1 text-left truncate">
            {t('Tìm nhanh công việc, cài đặt...', 'Search settings, tasks...')}
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-muted">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-md p-2 text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Toggle visual theme"
        >
          {isDarkMode ? (
            <Sun className="h-4.5 w-4.5 stroke-[1.75] text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5 stroke-[1.75]" />
          )}
        </button>

        {/* Notification Bell Badge and Popover Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
            className="relative rounded-md p-2 text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="View notifications"
          >
            <Bell className="h-4.5 w-4.5 stroke-[1.75]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
          </button>

          {isNotifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface shadow-2xl p-1 z-dropdown animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                <span className="text-xs font-bold text-text-primary">
                  {t(`Thông báo (${unreadCount})`, `Notifications (${unreadCount})`)}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="h-3 w-3" /> {t('Đọc tất cả', 'Mark all read')}
                  </button>
                )}
              </div>

              <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-muted">
                    {t('Không có thông báo mới nào', 'No new notifications')}
                  </div>
                ) : (
                  recentNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={cn(
                        "p-3 text-left transition-colors cursor-pointer flex gap-2.5 items-start hover:bg-accent/40",
                        !item.is_read && "bg-primary/[0.02]"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-text-primary truncate">{item.title}</span>
                          {!item.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                        <RelativeTime value={item.created_at} className="text-[9px] text-text-muted mt-1 block" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border/60 p-1">
                <button
                  onClick={() => {
                    setIsNotifDropdownOpen(false);
                    navigate('/notifications');
                  }}
                  className="w-full text-center py-2 text-[10px] font-bold text-text-secondary hover:text-text-primary bg-accent/40 hover:bg-accent rounded-xl transition flex items-center justify-center gap-1"
                >
                  {t('Xem tất cả hộp thư', 'View all notifications')} <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              aria-label="Open account menu"
              title={user?.name || 'Admin'}
              className="flex items-center gap-2.5 rounded-lg p-1 pr-2 hover:bg-secondary transition-colors cursor-pointer"
            >
              <Avatar
                src={user?.avatar_url}
                name={user?.name || 'Admin'}
                size="sm"
                status="online"
              />
              <div className="hidden xl:block min-w-0 text-left">
                <p className="max-w-36 truncate text-xs font-semibold text-text-primary">{user?.name || 'Admin'}</p>
                <p className="max-w-36 truncate text-[10px] text-text-muted">{user?.role || 'User'}</p>
              </div>
            </button>
          }
          items={profileMenuItems}
        />
      </div>
    </header>
  );
};

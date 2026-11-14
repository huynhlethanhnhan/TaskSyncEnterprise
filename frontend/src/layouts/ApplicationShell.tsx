import * as React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router';
import { useIsFetching } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Users,
  Building2,
  Calendar,
  Bell,
  Settings,
  ShieldAlert,
  User,
  Component,
  Layers,
  RefreshCw,
  MessageSquare,
  HeartHandshake,
  FolderOpen,
  Clock,
  BarChart3,
  Network,
} from 'lucide-react';
import { Sidebar, type SidebarSection } from '../components/layout/Sidebar';
import { Navbar } from '../components/layout/Navbar';
import { Drawer } from '../components/common/Drawer';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';
import { useToast } from '../providers/ToastProvider';
import { GlobalSearchModal } from '../components/search/GlobalSearchModal';
import { useNotifications, useNotificationRealtime } from '../hooks/useNotifications';

export interface ApplicationShellProps {
  children?: React.ReactNode;
}

export const ApplicationShell: React.FC<ApplicationShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const { runtime, updatePrefs, t } = useSettings();
  const isFetchingCount = useIsFetching();
  const [isRouteTransitioning, setIsRouteTransitioning] = React.useState(false);

  React.useEffect(() => {
    setIsRouteTransitioning(true);
    const timer = window.setTimeout(() => setIsRouteTransitioning(false), 320);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);
  const toast = useToast();
  const { data: notifications = [] } = useNotifications();
  useNotificationRealtime();
  const unreadNotificationsCount = notifications.filter((notification) => !notification.is_read).length;

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = React.useState<boolean>(false);

  const toggleSidebarCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem('sidebar_collapsed', String(next));
    } catch {
      // Ignore
    }
  };

  // Keyboard shortcut listener for Cmd+K / Ctrl+K search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (e.repeat) return;
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roleStr = (user?.role || '').toLowerCase();
  const roleId = Number(user?.role_id);
  const isAdmin = roleStr === 'admin' || roleId === 1;
  const isManager = roleStr === 'manager' || roleId === 2;
  const isAdminOrManager = isAdmin || isManager;
  const isTeamLeader = Boolean(user?.is_team_leader && user?.team_id);

  const sidebarBrand = runtime.system_name || 'TaskSync';

  const sidebarSections: SidebarSection[] = [
    {
      title: t('Tổng quan', 'Overview'),
      items: [
        {
          key: '/dashboard',
          label: t('Bảng điều khiển', 'Dashboard'),
          icon: <LayoutDashboard className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/dashboard'); setMobileDrawerOpen(false); },
        },
        {
          key: '/my-work',
          label: t('Việc của tôi', 'My Work'),
          icon: <CheckSquare className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/my-work'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: t('Quản lý Công việc', 'Work Management'),
      items: [
        {
          key: '/projects',
          label: t('Dự án', 'Projects'),
          icon: <Briefcase className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/projects'); setMobileDrawerOpen(false); },
        },
        {
          key: '/tasks',
          label: t('Danh sách Công việc', 'Tasks List'),
          icon: <CheckSquare className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/tasks?view=kanban'); setMobileDrawerOpen(false); },
        },
        {
          key: '/backlog',
          label: t('Kho công việc (Backlog)', 'Product Backlog'),
          icon: <Layers className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/backlog'); setMobileDrawerOpen(false); },
        },
        {
          key: '/sprints',
          label: t('Chu kỳ (Sprints)', 'Sprints'),
          icon: <RefreshCw className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/sprints'); setMobileDrawerOpen(false); },
        },
        {
          key: '/calendar',
          label: t('Lịch biểu', 'Calendar'),
          icon: <Calendar className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/calendar'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: t('Cộng tác', 'Collaboration'),
      items: [
        {
          key: '/topics',
          label: t('Thảo luận', 'Topics'),
          icon: <MessageSquare className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/topics'); setMobileDrawerOpen(false); },
        },
        {
          key: '/feedback',
          label: t('Góp ý', 'Feedback'),
          icon: <HeartHandshake className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/feedback'); setMobileDrawerOpen(false); },
        },
        {
          key: '/files',
          label: t('Tài liệu', 'Files'),
          icon: <FolderOpen className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/files'); setMobileDrawerOpen(false); },
        },
        {
          key: '/notifications',
          label: t('Thông báo', 'Notifications'),
          icon: <Bell className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/notifications'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: t('Nhân sự & Tự phục vụ', 'Employee Self-Service'),
      items: [
        {
          key: '/vacations',
          label: t('Nghỉ phép', 'My Vacation'),
          icon: <Clock className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/vacations'); setMobileDrawerOpen(false); },
        },
        {
          key: '/hrm',
          label: t('HRM & Chấm công / Lương', 'HRM & Attendance'),
          icon: <Users className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/hrm'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: t('Báo cáo', 'Reports'),
      items: [
        {
          key: '/reports',
          label: t('Báo cáo Hiệu suất', 'Performance Reports'),
          icon: <BarChart3 className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/reports'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: t('Quản trị Hệ thống', 'Administration'),
      items: [
        ...(isAdminOrManager ? [{
          key: '/employees',
          label: t('Nhân sự', 'Employees'),
          icon: <Users className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/employees'); setMobileDrawerOpen(false); },
        }] : []),
        ...(isAdminOrManager ? [
          {
            key: '/departments',
            label: t('Phòng ban', 'Departments'),
            icon: <Building2 className="h-4.5 w-4.5" />,
            onClick: () => { navigate('/departments'); setMobileDrawerOpen(false); },
          },
        ] : []),
        ...(isTeamLeader ? [{
          key: `/teams/${user?.team_id}`,
          label: 'My Team',
          icon: <Network className="h-4.5 w-4.5" />,
          onClick: () => { navigate(`/teams/${user?.team_id}`); setMobileDrawerOpen(false); },
        }] : []),
        ...(isAdminOrManager ? [{
          key: '/teams',
          label: t('Nhóm', 'Teams'),
          icon: <Network className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/teams'); setMobileDrawerOpen(false); },
        }] : []),
        {
          key: '/settings',
          label: isAdmin ? 'System Settings' : 'My Settings',
          icon: <Settings className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/settings'); setMobileDrawerOpen(false); },
        },
        ...(isAdmin ? [{
          key: '/audit',
          label: t('Nhật ký Hệ thống', 'Audit Logs'),
          icon: <ShieldAlert className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/audit'); setMobileDrawerOpen(false); },
        }] : []),
        {
          key: '/profile',
          label: t('Hồ sơ cá nhân', 'My Profile'),
          icon: <User className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/profile'); setMobileDrawerOpen(false); },
        },
        ...(import.meta.env.DEV ? [{
          key: '/dev/components',
          label: t('Thư viện UI', 'UI Showcase'),
          icon: <Component className="h-4.5 w-4.5" />,
          badge: 'DEV',
          onClick: () => { navigate('/dev/components'); setMobileDrawerOpen(false); },
        }] : []),
      ],
    },
  ];


  // Active key matching current location path
  const activeKey = location.pathname;

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-row font-sans antialiased">
      {/* Skip-to-content anchor for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-toast px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar (hidden on mobile viewports < 1024px) */}
      <div className="hidden lg:block shrink-0">
        <Sidebar
          brandName={sidebarBrand}
          onBrandClick={() => navigate('/dashboard')}
          sections={sidebarSections}
          activeKey={activeKey}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          user={user || undefined}
          onProfileClick={() => navigate('/profile')}
        />
      </div>

      {/* Mobile Sidebar Drawer (< 1024px) */}
      <Drawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        position="left"
        size="sm"
        title={sidebarBrand}
      >
        <Sidebar
          brandName={sidebarBrand}
          onBrandClick={() => { navigate('/dashboard'); setMobileDrawerOpen(false); }}
          sections={sidebarSections}
          activeKey={activeKey}
          isCollapsed={false}
          user={user || undefined}
          onProfileClick={() => { navigate('/profile'); setMobileDrawerOpen(false); }}
        />
      </Drawer>


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar Header */}
        <div className="sticky top-0 z-header w-full bg-surface/95 backdrop-blur-md border-b border-border">
          <Navbar
            user={user || undefined}
            unreadNotificationsCount={unreadNotificationsCount}
            onOpenMobileMenu={() => setMobileDrawerOpen(true)}
            onOpenSearch={() => setIsSearchModalOpen(true)}
            onOpenNotifications={() => navigate('/notifications')}
            isDarkMode={isDarkMode}
            onToggleTheme={() => {
              const nextTheme = isDarkMode ? 'light' : 'dark';
              void updatePrefs({ theme: nextTheme }).catch(() => {
                toast.error(t('Không thể lưu giao diện', 'Failed to persist theme'));
              });
            }}
            onProfileClick={() => navigate('/profile')}
            onLogout={() => {
              logout();
              toast.success(t('Đã đăng xuất tài khoản', 'Signed out successfully'));
              navigate('/login');
            }}
          />

          {/* Global Navigation & Query Sync Progress Bar */}
          {(isRouteTransitioning || isFetchingCount > 0) && (
            <div
              role="progressbar"
              aria-label={t('Đang đồng bộ dữ liệu trang', 'Syncing page data')}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/15 overflow-hidden"
            >
              <div className="h-full w-1/2 bg-primary animate-pulse rounded-r-full" />
            </div>
          )}
        </div>

        {/* Viewport Outlet Container */}
        <main id="main-content" className="flex-1 w-full p-4 sm:p-5 lg:px-6 lg:py-5 overflow-x-hidden">
          {runtime.maintenance_mode && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-2.5 text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
              <span>
                {t(
                  'Hệ thống đang ở Chế độ Bảo trì (Maintenance Mode) — Một số thao tác thay đổi dữ liệu có thể bị hạn chế.',
                  'System is in Maintenance Mode — some write operations may be restricted.',
                )}
              </span>
            </div>
          )}
          {children || <Outlet />}
        </main>

        <GlobalSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
      </div>
    </div>
  );
};

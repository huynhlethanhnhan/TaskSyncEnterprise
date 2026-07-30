import * as React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
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
  Menu,
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
import { useToast } from '../providers/ToastProvider';
import { GlobalSearchModal } from '../components/search/GlobalSearchModal';
import { useNotifications, useNotificationRealtime } from '../hooks/useNotifications';

export interface ApplicationShellProps {
  children?: React.ReactNode;
}

export const ApplicationShell: React.FC<ApplicationShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, setTheme, theme } = useTheme();
  const { user, logout } = useAuth();
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

  const sidebarSections: SidebarSection[] = [
    {
      title: 'Overview',
      items: [
        {
          key: '/dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/dashboard'); setMobileDrawerOpen(false); },
        },
        {
          key: '/my-work',
          label: 'My Work',
          icon: <CheckSquare className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/my-work'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: 'Work Management',
      items: [
        {
          key: '/projects',
          label: 'Projects',
          icon: <Briefcase className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/projects'); setMobileDrawerOpen(false); },
        },
        {
          key: '/tasks',
          label: 'Tasks List',
          icon: <CheckSquare className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/tasks?view=kanban'); setMobileDrawerOpen(false); },
        },
        {
          key: '/backlog',
          label: 'Product Backlog',
          icon: <Layers className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/backlog'); setMobileDrawerOpen(false); },
        },
        {
          key: '/sprints',
          label: 'Sprints',
          icon: <RefreshCw className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/sprints'); setMobileDrawerOpen(false); },
        },
        {
          key: '/calendar',
          label: 'Calendar',
          icon: <Calendar className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/calendar'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: 'Collaboration',
      items: [
        {
          key: '/topics',
          label: 'Topics',
          icon: <MessageSquare className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/topics'); setMobileDrawerOpen(false); },
        },
        {
          key: '/feedback',
          label: 'Feedback',
          icon: <HeartHandshake className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/feedback'); setMobileDrawerOpen(false); },
        },
        {
          key: '/files',
          label: 'Files',
          icon: <FolderOpen className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/files'); setMobileDrawerOpen(false); },
        },
        {
          key: '/notifications',
          label: 'Notifications',
          icon: <Bell className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/notifications'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: 'Employee Self-Service',
      items: [
        {
          key: '/vacations',
          label: 'My Vacation',
          icon: <Clock className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/vacations'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: 'Reports',
      items: [
        {
          key: '/reports',
          label: 'Performance Reports',
          icon: <BarChart3 className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/reports'); setMobileDrawerOpen(false); },
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        ...(isAdminOrManager ? [{
          key: '/employees',
          label: 'Employees',
          icon: <Users className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/employees'); setMobileDrawerOpen(false); },
        }] : []),
        {
          key: '/departments',
          label: 'Departments',
          icon: <Building2 className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/departments'); setMobileDrawerOpen(false); },
        },
        {
          key: '/teams',
          label: 'Teams',
          icon: <Network className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/teams'); setMobileDrawerOpen(false); },
        },
        {
          key: '/settings',
          label: isAdminOrManager ? 'System Settings' : 'My Settings',
          icon: <Settings className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/settings'); setMobileDrawerOpen(false); },
        },
        ...(isAdmin ? [{
          key: '/audit',
          label: 'Audit Logs',
          icon: <ShieldAlert className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/audit'); setMobileDrawerOpen(false); },
        }] : []),
        {
          key: '/profile',
          label: 'My Profile',
          icon: <User className="h-4.5 w-4.5" />,
          onClick: () => { navigate('/profile'); setMobileDrawerOpen(false); },
        },
        ...(import.meta.env.DEV ? [{
          key: '/dev/components',
          label: 'UI Showcase',
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
          brandName="TaskSync"
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
        title="TaskSync Navigation"
      >
        <Sidebar
          brandName="TaskSync"
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
        <div className="flex items-center relative z-header sticky top-0">
          {/* Mobile hamburger menu trigger */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden ml-3 p-2 text-text-secondary hover:bg-secondary rounded-md"
            aria-label="Open mobile menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <Navbar
              user={user || undefined}
              unreadNotificationsCount={unreadNotificationsCount}
              onOpenSearch={() => setIsSearchModalOpen(true)}
              onOpenNotifications={() => navigate('/notifications')}
              isDarkMode={isDarkMode}
              onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              onProfileClick={() => navigate('/profile')}
              onLogout={() => {
                logout();
                toast.success('Đã đăng xuất tài khoản');
                navigate('/login');
              }}
            />
          </div>
        </div>

        {/* Viewport Outlet Container */}
        <main id="main-content" className="flex-1 w-full p-4 sm:p-5 lg:px-6 lg:py-5">
          {children || <Outlet />}
        </main>

        <GlobalSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
      </div>
    </div>
  );
};

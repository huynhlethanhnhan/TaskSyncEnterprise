import * as React from 'react';
import { Search, Bell, Sun, Moon, Command } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Dropdown } from '../common/Dropdown';
import { cn } from '../../utils/cn';

export interface NavbarProps {
  user?: {
    name: string;
    email: string;
    role?: string;
    avatar_url?: string | null;
  };
  unreadNotificationsCount?: number;
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
  unreadNotificationsCount = 0,
  onOpenSearch,
  onOpenNotifications,
  isDarkMode = false,
  onToggleTheme,
  onLogout,
  onProfileClick,
  className,
}) => {
  const profileMenuItems = [
    {
      key: 'profile',
      label: user?.name || 'User Profile',
      onClick: onProfileClick,
    },
    {
      key: 'theme',
      label: isDarkMode ? 'Light Mode' : 'Dark Mode',
      icon: isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      onClick: onToggleTheme,
    },
    'separator' as const,
    {
      key: 'logout',
      label: 'Log Out',
      destructive: true,
      onClick: onLogout,
    },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-header h-16 w-full border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors',
        className
      )}
    >
      {/* Global Command Search Trigger */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex items-center gap-2 h-9 px-3 w-44 sm:w-64 md:w-80 xl:w-96 rounded-md border border-input bg-background/50 text-xs text-text-muted hover:border-slate-400 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="h-3.5 w-3.5 stroke-[1.75]" />
        <span className="flex-1 text-left truncate">Search settings, tasks...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-muted">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

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

        {/* Notification Bell Badge */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative rounded-md p-2 text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="View notifications"
        >
          <Bell className="h-4.5 w-4.5 stroke-[1.75]" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          )}
        </button>

        {/* User Profile Dropdown */}
        <Dropdown
          trigger={
            <div className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-secondary transition-colors">
              <Avatar
                src={user?.avatar_url}
                name={user?.name || 'Admin'}
                size="sm"
                status="online"
              />
              <div className="hidden xl:block min-w-0 text-left">
                <p className="max-w-32 truncate text-xs font-semibold text-text-primary">{user?.name || 'Admin'}</p>
                <p className="max-w-32 truncate text-[10px] text-text-muted">{user?.role || 'User'}</p>
              </div>
            </div>
          }
          items={profileMenuItems}
        />
      </div>
    </header>
  );
};

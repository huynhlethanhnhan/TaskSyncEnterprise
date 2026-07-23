import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { cn } from '../../utils/cn';


export interface SidebarNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | number;
  onClick?: () => void;
}

export interface SidebarSection {
  title?: string;
  items: SidebarNavItem[];
}

export interface SidebarProps {
  brandName?: string;
  brandLogo?: React.ReactNode;
  sections: SidebarSection[];
  activeKey: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  user?: {
    name: string;
    email: string;
    role?: string;
    avatar_url?: string | null;
  };
  onProfileClick?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  brandName = 'TaskSync',
  brandLogo,
  sections,
  activeKey,
  isCollapsed = false,
  onToggleCollapse,
  user,
  onProfileClick,
  className,
}) => {
  return (
    <aside
      className={cn(
        'sticky top-0 z-sidebar h-screen flex flex-col border-r border-border bg-surface text-text-primary transition-all duration-300 select-none overflow-x-hidden',
        isCollapsed ? 'w-18' : 'w-52',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg shrink-0">
            {brandLogo || brandName[0]}
          </div>
          {!isCollapsed && (
            <span className="font-display text-base font-bold text-text-primary truncate tracking-tight">
              {brandName}
            </span>
          )}
        </div>

        {onToggleCollapse && !isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 text-text-muted hover:bg-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4 stroke-[1.75]" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && !isCollapsed && (
              <h4 className="px-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                {section.title}
              </h4>
            )}
            {section.items.map((item) => {
              const isActive = activeKey === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-text-secondary hover:bg-secondary hover:text-text-primary',
                    isCollapsed && 'justify-center px-0'
                  )}
                >
                  {/* Active Left Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                  )}

                  <span className={cn('h-4.5 w-4.5 shrink-0', isActive ? 'text-primary' : 'text-text-muted')}>
                    {item.icon}
                  </span>

                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-secondary text-text-muted">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Avatar Sidebar Footer */}
      {user && (
        <div
          onClick={onProfileClick}
          className="p-3 border-t border-border/60 flex items-center gap-3 shrink-0 cursor-pointer hover:bg-secondary/60 transition-colors"
          title={isCollapsed ? user.name : undefined}
        >
          <Avatar
            src={user.avatar_url}
            name={user.name || 'User'}
            size="sm"
            status="online"
            className="shrink-0"
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
              <p className="text-[10px] text-text-muted truncate">{user.role || 'User'}</p>
            </div>
          )}
        </div>
      )}

      {/* Expand Toggle Button when Collapsed */}
      {onToggleCollapse && isCollapsed && (
        <div className="p-3 border-t border-border/60 flex justify-center shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-2 text-text-muted hover:bg-secondary hover:text-text-primary transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4 stroke-[1.75]" />
          </button>
        </div>
      )}
    </aside>
  );
};


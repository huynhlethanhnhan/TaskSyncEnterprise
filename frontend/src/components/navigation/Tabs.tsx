import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (_id: string) => void;
  variant?: 'line' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'line',
  className,
}) => {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 select-none overflow-x-auto scrollbar-none',
        variant === 'line' && 'border-b border-border/80 pb-px',
        variant === 'pills' && 'bg-muted p-1 rounded-lg w-fit',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => {
              if (tab.disabled) return;
              onChange(tab.id);
            }}
            className={cn(
              'relative inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-md whitespace-nowrap',
              variant === 'line' && (
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              ),
              variant === 'pills' && (
                isActive
                  ? 'text-text-primary bg-surface shadow-xs font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              ),
              tab.disabled && 'cursor-not-allowed opacity-40 hover:text-text-secondary'
            )}
          >
            {tab.icon && (
              <span className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-text-muted')}>
                {tab.icon}
              </span>
            )}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 text-[10px] font-semibold rounded-full',
                  isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-text-muted'
                )}
              >
                {tab.badge}
              </span>
            )}

            {/* Sliding Underline Bar for Line Variant */}
            {variant === 'line' && isActive && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

import * as React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  onHomeClick?: () => void;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHome = true,
  onHomeClick,
  className,
}) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs text-text-muted', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <li className="inline-flex items-center">
            <button
              type="button"
              onClick={onHomeClick}
              className="inline-flex items-center gap-1 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
              aria-label="Home"
            >
              <Home className="h-3.5 w-3.5 stroke-[1.75]" />
            </button>
            <ChevronRight className="h-3.5 w-3.5 stroke-[1.5] text-text-muted/60 mx-1" aria-hidden="true" />
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="inline-flex items-center">
              {isLast ? (
                <span
                  className="font-semibold text-text-primary tracking-wide inline-flex items-center gap-1"
                  aria-current="page"
                >
                  {item.icon && <span className="h-3.5 w-3.5">{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xs inline-flex items-center gap-1"
                  >
                    {item.icon && <span className="h-3.5 w-3.5">{item.icon}</span>}
                    {item.label}
                  </button>
                  <ChevronRight
                    className="h-3.5 w-3.5 stroke-[1.5] text-text-muted/60 mx-1"
                    aria-hidden="true"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

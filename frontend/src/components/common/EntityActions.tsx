import * as React from 'react';
import { createPortal } from 'react-dom';
import { FileText, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useSettings } from '../../providers/SettingsProvider';
import { GLOBAL_ACTION_TEXT } from '../../utils/globalLabels';
import { cn } from '../../utils/cn';
import { Dropdown, type DropdownItem } from './Dropdown';

export type IconActionTone = 'neutral' | 'outline' | 'primary' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<IconActionTone, string> = {
  neutral:
    'border-transparent bg-transparent text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/10',
  outline:
    'border-transparent bg-transparent text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-500/10',
  primary:
    'border-transparent bg-transparent text-primary hover:text-primary-hover hover:bg-primary/10',
  success:
    'border-transparent bg-transparent text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10',
  warning:
    'border-transparent bg-transparent text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10',
  danger:
    'border-transparent bg-transparent text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10',
};

export interface IconActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  tone?: IconActionTone;
  disabled?: boolean;
  isLoading?: boolean;
  stopPropagation?: boolean;
  className?: string;
}

export const IconActionButton: React.FC<IconActionButtonProps> = ({
  icon,
  label,
  onClick,
  tone = 'outline',
  disabled = false,
  isLoading = false,
  stopPropagation = true,
  className,
}) => {
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{ top: number; left: number; placeBottom: boolean } | null>(null);

  const showTooltip = React.useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const placeBottom = rect.top < 44;
    const clampedLeft = Math.min(Math.max(rect.left + rect.width / 2, 48), window.innerWidth - 48);
    setTooltipPos({
      top: placeBottom ? rect.bottom + 6 : rect.top - 6,
      left: clampedLeft,
      placeBottom,
    });
  }, []);

  const hideTooltip = React.useCallback(() => {
    setTooltipPos(null);
  }, []);

  React.useEffect(() => {
    if (!tooltipPos) return;
    const handleScrollOrResize = () => setTooltipPos(null);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [tooltipPos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        disabled={disabled || isLoading}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={(e) => {
          if (stopPropagation) {
            e.stopPropagation();
          }
          hideTooltip();
          onClick(e);
        }}
        className={cn(
          'relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-95 disabled:pointer-events-none disabled:opacity-40',
          TONE_CLASSES[tone],
          className,
        )}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : icon}
      </button>
      {tooltipPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
            className={cn(
              'pointer-events-none fixed z-[9999] -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg dark:bg-slate-800 border border-slate-700/60',
              tooltipPos.placeBottom ? '' : '-translate-y-full',
            )}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
};

export interface EntityActionsExtraItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface EntityActionsProps {
  onView?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onEdit?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRequestDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  requestDeleteLabel?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
  layout?: 'icons' | 'menu';
  extraMenuItems?: EntityActionsExtraItem[];
  children?: React.ReactNode;
}

export const EntityActions: React.FC<EntityActionsProps> = ({
  onView,
  onEdit,
  onDelete,
  onRequestDelete,
  viewLabel,
  editLabel,
  deleteLabel,
  requestDeleteLabel,
  className,
  align = 'end',
  layout = 'icons',
  extraMenuItems = [],
  children,
}) => {
  const { t } = useSettings();

  const resolvedViewLabel = viewLabel || t(GLOBAL_ACTION_TEXT.view.vi, GLOBAL_ACTION_TEXT.view.en);
  const resolvedEditLabel = editLabel || t(GLOBAL_ACTION_TEXT.edit.vi, GLOBAL_ACTION_TEXT.edit.en);
  const resolvedDeleteLabel = deleteLabel || t(GLOBAL_ACTION_TEXT.delete.vi, GLOBAL_ACTION_TEXT.delete.en);
  const resolvedRequestDeleteLabel =
    requestDeleteLabel || t(GLOBAL_ACTION_TEXT.requestDelete.vi, GLOBAL_ACTION_TEXT.requestDelete.en);
  const resolvedMenuLabel = t(GLOBAL_ACTION_TEXT.actionsHeader.vi, GLOBAL_ACTION_TEXT.actionsHeader.en);

  const alignClass =
    align === 'center' ? 'justify-center' : align === 'end' ? 'justify-end' : 'justify-start';

  if (layout === 'menu') {
    const syntheticEvent = { stopPropagation: () => {} } as unknown as React.MouseEvent<HTMLButtonElement>;
    const menuItems: (DropdownItem | 'separator')[] = [];

    if (onView) {
      menuItems.push({
        key: 'view',
        label: resolvedViewLabel,
        icon: <FileText className="h-3.5 w-3.5" aria-hidden="true" />,
        onClick: () => onView(syntheticEvent),
      });
    }

    if (onEdit) {
      menuItems.push({
        key: 'edit',
        label: resolvedEditLabel,
        icon: <Pencil className="h-3.5 w-3.5" aria-hidden="true" />,
        onClick: () => onEdit(syntheticEvent),
      });
    }

    for (const extra of extraMenuItems) {
      menuItems.push({
        key: extra.key,
        label: extra.label,
        icon: extra.icon,
        onClick: extra.onClick,
        destructive: extra.destructive,
        disabled: extra.disabled,
      });
    }

    if ((onDelete || onRequestDelete) && menuItems.length > 0) {
      menuItems.push('separator');
    }

    if (onDelete) {
      menuItems.push({
        key: 'delete',
        label: resolvedDeleteLabel,
        icon: <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />,
        destructive: true,
        onClick: () => onDelete(syntheticEvent),
      });
    } else if (onRequestDelete) {
      menuItems.push({
        key: 'request-delete',
        label: resolvedRequestDeleteLabel,
        icon: <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />,
        destructive: true,
        onClick: () => onRequestDelete(syntheticEvent),
      });
    }

    return (
      <div
        className={cn('flex items-center gap-1.5', alignClass, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {menuItems.length > 0 && (
          <Dropdown
            align="right"
            items={menuItems}
            trigger={
              <IconActionButton
                tone="neutral"
                stopPropagation={false}
                icon={<MoreVertical className="h-4 w-4" aria-hidden="true" />}
                label={resolvedMenuLabel}
                onClick={() => {}}
              />
            }
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        alignClass,
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {onView && (
        <IconActionButton
          tone="neutral"
          icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
          label={resolvedViewLabel}
          onClick={onView}
        />
      )}

      {onEdit && (
        <IconActionButton
          tone="outline"
          icon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
          label={resolvedEditLabel}
          onClick={onEdit}
        />
      )}

      {children}

      {onDelete && (
        <IconActionButton
          tone="danger"
          icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
          label={resolvedDeleteLabel}
          onClick={onDelete}
        />
      )}

      {!onDelete && onRequestDelete && (
        <IconActionButton
          tone="warning"
          icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
          label={resolvedRequestDeleteLabel}
          onClick={onRequestDelete}
        />
      )}
    </div>
  );
};

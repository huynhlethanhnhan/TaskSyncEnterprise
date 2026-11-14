import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { useSettings } from '../../providers/SettingsProvider';
import { cn } from '../../utils/cn';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (_page: number) => void;
  onPageSizeChange?: (_pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}) => {
  const { t } = useSettings();
  const startRecord = totalRecords === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, totalRecords);
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border-t border-border/80 bg-surface text-xs text-text-muted select-none',
        className
      )}
    >
      {/* Total records summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="whitespace-nowrap">
          {t('Hiển thị', 'Showing')}{' '}
          <strong className="text-text-primary font-semibold">{startRecord}</strong>{' '}
          {t('đến', 'to')}{' '}
          <strong className="text-text-primary font-semibold">{endRecord}</strong>{' '}
          {t('trên', 'of')}{' '}
          <strong className="text-text-primary font-semibold">{totalRecords}</strong>{' '}
          {t('bản ghi', 'records')}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline whitespace-nowrap">{t('Mỗi trang:', 'Per page:')}</span>
            <Select
              size="sm"
              containerClassName="w-[78px]"
              aria-label={t('Số bản ghi mỗi trang', 'Records per page')}
              value={String(pageSize)}
              options={pageSizeOptions.map((opt) => ({
                value: String(opt),
                label: String(opt),
              }))}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page indicator */}
        <span className="px-3 py-1 text-xs font-semibold text-text-primary">
          {t('Trang', 'Page')} {currentPage} / {Math.max(totalPages, 1)}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Columns3, Pin, PinOff } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox';
import { SkeletonTable } from '../feedback/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { useSettings } from '../../providers/SettingsProvider';
import { cn } from '../../utils/cn';

export interface DataTableWrapperProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  enableSelection?: boolean;
  enableColumnPin?: boolean;
  defaultFreezeColumns?: number;
  onRowSelect?: (_rows: TData[]) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  className?: string;
}

export function DataTableWrapper<TData, TValue>({
  columns: userColumns,
  data,
  isLoading = false,
  enableSelection = false,
  enableColumnPin = true,
  defaultFreezeColumns,
  onRowSelect,
  emptyTitle,
  emptyDescription,
  onEmptyAction,
  emptyActionLabel,
  className,
}: DataTableWrapperProps<TData, TValue>) {
  const { t } = useSettings();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const columns = React.useMemo(() => {
    if (!enableSelection) return userColumns;

    const selectionColumn: ColumnDef<TData, TValue> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    };

    return [selectionColumn, ...userColumns];
  }, [userColumns, enableSelection]);

  const initialFreezeCount = React.useMemo(() => {
    if (!enableColumnPin || columns.length < 4) return 0;
    if (typeof defaultFreezeColumns === 'number') {
      return Math.max(0, Math.min(defaultFreezeColumns, columns.length - 1));
    }
    return columns.length >= 5 ? 2 : 1;
  }, [columns.length, defaultFreezeColumns, enableColumnPin]);

  const [pinnedLeftCount, setPinnedLeftCount] = React.useState<number>(initialFreezeCount);
  const [pinActionsColumn, setPinActionsColumn] = React.useState<boolean>(() => enableColumnPin && columns.length >= 4);

  const headerRefs = React.useRef<(HTMLTableCellElement | null)[]>([]);
  const [leftOffsets, setLeftOffsets] = React.useState<number[]>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  React.useEffect(() => {
    if (onRowSelect) {
      const selectedData = table.getSelectedRowModel().rows.map((row) => row.original);
      onRowSelect(selectedData);
    }
  }, [rowSelection, onRowSelect, table]);

  const recomputeOffsets = React.useCallback(() => {
    if (pinnedLeftCount <= 0) {
      setLeftOffsets([]);
      return;
    }
    let cumulative = 0;
    const nextOffsets: number[] = [];
    for (let i = 0; i < pinnedLeftCount; i += 1) {
      nextOffsets.push(cumulative);
      const cell = headerRefs.current[i];
      cumulative += cell ? cell.getBoundingClientRect().width : 0;
    }
    setLeftOffsets((prev) => {
      if (prev.length === nextOffsets.length && prev.every((v, idx) => Math.abs(v - nextOffsets[idx]) < 0.5)) {
        return prev;
      }
      return nextOffsets;
    });
  }, [pinnedLeftCount]);

  React.useLayoutEffect(() => {
    recomputeOffsets();
    if (pinnedLeftCount <= 0 || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => recomputeOffsets());
    headerRefs.current.slice(0, pinnedLeftCount).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [recomputeOffsets, pinnedLeftCount, columns.length, data.length]);

  if (isLoading) {
    return <SkeletonTable rows={5} cols={columns.length} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        onAction={onEmptyAction}
        actionLabel={emptyActionLabel}
      />
    );
  }

  const hasActionsCol = columns.some((c) => c.id === 'actions');
  const maxFreezePresets = Math.min(3, Math.max(1, columns.length - (hasActionsCol ? 2 : 1)));
  const showPinToolbar = enableColumnPin && columns.length >= 4;

  const getPinStyle = (
    colIndex: number,
    colId: string,
    isHeader: boolean,
  ): { className: string; style?: React.CSSProperties } => {
    if (!enableColumnPin) return { className: '' };

    const isPinnedLeft = colIndex < pinnedLeftCount && colId !== 'actions';
    const isLastPinnedLeft = isPinnedLeft && colIndex === pinnedLeftCount - 1;
    const isPinnedRight = pinActionsColumn && colId === 'actions';

    if (isPinnedLeft) {
      return {
        className: cn(
          'sticky',
          isHeader ? 'z-30 bg-slate-50 dark:bg-slate-900' : 'z-10 bg-surface',
          isLastPinnedLeft &&
            'border-r-2 border-r-slate-300 dark:border-r-slate-600 shadow-[3px_0_8px_-3px_rgba(15,23,42,0.14)]',
        ),
        style: { left: `${leftOffsets[colIndex] ?? 0}px` },
      };
    }

    if (isPinnedRight) {
      return {
        className: cn(
          'sticky right-0 border-l-2 border-l-slate-200 dark:border-l-slate-700 shadow-[-3px_0_8px_-3px_rgba(15,23,42,0.12)]',
          isHeader ? 'z-30 bg-slate-50 dark:bg-slate-900' : 'z-10 bg-surface',
        ),
      };
    }

    return { className: '' };
  };

  return (
    <div className={cn('w-full border border-border rounded-xl overflow-hidden bg-surface shadow-xs', className)}>
      {showPinToolbar && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-slate-50/70 dark:bg-slate-900/60"
          data-testid="table-freeze-toolbar"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted mr-1">
              <Columns3 className="h-3.5 w-3.5 text-primary" />
              <span>{t('Đóng băng cột (Freeze):', 'Freeze Columns:')}</span>
            </span>

            <button
              type="button"
              onClick={() => setPinnedLeftCount(0)}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer',
                pinnedLeftCount === 0
                  ? 'bg-slate-200 dark:bg-slate-700 text-text-primary'
                  : 'text-text-muted hover:bg-secondary hover:text-text-primary',
              )}
            >
              {t('Tắt', 'Off')}
            </button>

            {Array.from({ length: maxFreezePresets }, (_, idx) => idx + 1).map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setPinnedLeftCount(count)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1',
                  pinnedLeftCount === count
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-text-secondary bg-surface border border-border/70 hover:bg-accent hover:text-primary',
                )}
                title={t(`Cố định ${count} cột đầu tiên bên trái giống Excel / Google Sheets`, `Freeze first ${count} left column(s)`)}
              >
                {pinnedLeftCount === count && <Pin className="h-2.5 w-2.5" />}
                <span>{t(`${count} cột`, `${count} col${count > 1 ? 's' : ''}`)}</span>
              </button>
            ))}
          </div>

          {hasActionsCol && (
            <button
              type="button"
              onClick={() => setPinActionsColumn((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer',
                pinActionsColumn
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-text-muted hover:bg-secondary hover:text-text-primary',
              )}
              title={t('Giữ cột Thao tác (Chi tiết / Chỉnh sửa) luôn hiển thị bên phải khi cuộn ngang', 'Keep Actions column pinned on the right')}
            >
              {pinActionsColumn ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
              <span>{t('Cột Thao tác', 'Actions Col')}</span>
            </button>
          )}
        </div>
      )}

      <div className="max-h-[68vh] overflow-auto">
        <table className="w-full text-left text-xs text-text-primary border-collapse">
          <thead className="bg-slate-50/95 dark:bg-slate-900/95 border-b border-border/80 text-text-muted font-semibold uppercase tracking-wider select-none sticky top-0 z-20 backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();
                  const pinMeta = getPinStyle(idx, header.column.id, true);
                  const canFreezeHeader =
                    showPinToolbar &&
                    header.column.id !== 'actions' &&
                    idx < columns.length - 1;
                  const isFrozenColumn = idx < pinnedLeftCount && header.column.id !== 'actions';

                  return (
                    <th
                      key={header.id}
                      ref={(el) => {
                        headerRefs.current[idx] = el;
                      }}
                      style={pinMeta.style}
                      className={cn(
                        'group/th p-3.5 whitespace-nowrap',
                        header.column.id === 'actions' && 'text-center w-20',
                        pinMeta.className,
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="inline-flex items-center gap-1.5">
                          <div
                            className={cn(
                              'inline-flex items-center gap-1.5',
                              canSort && 'cursor-pointer hover:text-text-primary select-none',
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              <span className="text-text-muted">
                                {isSorted === 'asc' ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                ) : isSorted === 'desc' ? (
                                  <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                                )}
                              </span>
                            )}
                          </div>

                          {canFreezeHeader && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPinnedLeftCount((prev) => (prev === idx + 1 ? idx : idx + 1));
                              }}
                              className={cn(
                                'p-0.5 rounded transition-opacity cursor-pointer',
                                isFrozenColumn
                                  ? 'text-primary opacity-90 hover:bg-primary/15'
                                  : 'text-text-muted opacity-0 group-hover/th:opacity-70 hover:!opacity-100 hover:bg-secondary',
                              )}
                              title={
                                isFrozenColumn
                                  ? `Bỏ ghim tới cột "${String(header.column.id)}"`
                                  : `Đóng băng từ cột đầu tới cột này (kiểu Excel)`
                              }
                              aria-label={`Toggle freeze at column ${header.column.id}`}
                            >
                              <Pin className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-border/60">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40',
                  row.getIsSelected() && 'bg-accent/40 dark:bg-slate-800/70',
                )}
              >
                {row.getVisibleCells().map((cell, idx) => {
                  const pinMeta = getPinStyle(idx, cell.column.id, false);
                  return (
                    <td
                      key={cell.id}
                      style={pinMeta.style}
                      className={cn(
                        'p-3.5 whitespace-nowrap align-middle',
                        cell.column.id === 'actions' && 'text-center',
                        pinMeta.className,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

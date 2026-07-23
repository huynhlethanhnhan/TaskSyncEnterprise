import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox';
import { SkeletonTable } from '../feedback/Skeleton';
import { EmptyState } from '../feedback/EmptyState';
import { cn } from '../../utils/cn';

export interface DataTableWrapperProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  enableSelection?: boolean;
  onRowSelect?: (_rows: TData[]) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTableWrapper<TData, TValue>({
  columns: userColumns,
  data,
  isLoading = false,
  enableSelection = false,
  onRowSelect,
  emptyTitle,
  emptyDescription,
  className,
}: DataTableWrapperProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  // Add selection checkbox column if enabled
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

  // Notify selected rows callback
  React.useEffect(() => {
    if (onRowSelect) {
      const selectedData = table.getSelectedRowModel().rows.map((row) => row.original);
      onRowSelect(selectedData);
    }
  }, [rowSelection, onRowSelect, table]);

  if (isLoading) {
    return <SkeletonTable rows={5} cols={columns.length} />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn('w-full border border-border rounded-lg overflow-hidden bg-surface shadow-xs', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-text-primary border-collapse">
          {/* Header */}
          <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-border/80 text-text-muted font-semibold uppercase tracking-wider select-none sticky top-0 z-sticky backdrop-blur-xs">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th key={header.id} className="p-3.5 whitespace-nowrap">
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'inline-flex items-center gap-1.5',
                            canSort && 'cursor-pointer hover:text-text-primary select-none'
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
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border/60">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40',
                  row.getIsSelected() && 'bg-accent/40 dark:bg-slate-800/80'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-3.5 whitespace-nowrap align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import * as React from 'react';
import { Calendar } from 'lucide-react';
import { Select } from './Select';
import { useSettings } from '../../providers/SettingsProvider';
import { cn } from '../../utils/cn';

interface MonthYearSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  size?: 'sm' | 'md';
  helperText?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MonthYearSelect: React.FC<MonthYearSelectProps> = ({
  label,
  value,
  onChange,
  required,
  size = 'md',
  helperText,
  className,
  disabled,
  'aria-label': ariaLabel,
}) => {
  const { t } = useSettings();
  const now = React.useMemo(() => new Date(), []);
  const fallbackYear = now.getFullYear();
  const fallbackMonth = String(now.getMonth() + 1).padStart(2, '0');

  const [rawYear, rawMonth] = (value || '').split('-');
  const selectedYear = /^\d{4}$/.test(rawYear || '') ? rawYear : String(fallbackYear);
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(rawMonth || '') ? rawMonth : fallbackMonth;

  const monthOptions = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, idx) => {
        const mm = String(idx + 1).padStart(2, '0');
        return {
          value: mm,
          label: t(`Tháng ${mm}`, `${MONTH_NAMES_EN[idx]} (${mm})`),
        };
      }),
    [t],
  );

  const yearOptions = React.useMemo(() => {
    const baseYear = fallbackYear;
    const years = new Set<number>([
      baseYear - 2,
      baseYear - 1,
      baseYear,
      baseYear + 1,
      baseYear + 2,
      Number(selectedYear),
    ]);
    return Array.from(years)
      .filter((y) => Number.isFinite(y) && y >= 2020 && y <= 2100)
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) }));
  }, [fallbackYear, selectedYear]);

  const handleMonthChange = (nextMonth: string) => {
    onChange(`${selectedYear}-${nextMonth}`);
  };

  const handleYearChange = (nextYear: string) => {
    onChange(`${nextYear}-${selectedMonth}`);
  };

  const baseLabel = label || ariaLabel || t('Kỳ lương', 'Pay Period');

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-xs font-semibold text-text-primary tracking-wide flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-text-muted" />
          <span>
            {label}
            {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
          </span>
        </span>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Select
          aria-label={`${baseLabel} - ${t('Tháng', 'Month')}`}
          size={size}
          value={selectedMonth}
          disabled={disabled}
          onChange={(e) => handleMonthChange(e.target.value)}
          options={monthOptions}
        />
        <Select
          aria-label={`${baseLabel} - ${t('Năm', 'Year')}`}
          size={size}
          value={selectedYear}
          disabled={disabled}
          onChange={(e) => handleYearChange(e.target.value)}
          options={yearOptions}
        />
      </div>
      {helperText && <p className="text-xs text-text-muted">{helperText}</p>}
    </div>
  );
};

import * as React from 'react';
import { Badge, type BadgeVariant } from './Badge';
import { useSettings } from '../../providers/SettingsProvider';
import { getStatusMeta } from '../../utils/globalLabels';

export interface StatusBadgeProps {
  status?: string | null;
  /** Optional boolean status helper for Active/Inactive entity states */
  isActive?: boolean;
  /** Optional explicit Badge color variant override */
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  isActive,
  variant,
  size = 'sm',
  showDot,
  className,
}) => {
  const { isEnglish } = useSettings();

  if (typeof isActive === 'boolean') {
    return (
      <Badge
        variant={variant ?? (isActive ? 'success' : 'outline')}
        size={size}
        showDot={showDot ?? true}
        className={className}
      >
        {isActive ? (isEnglish ? 'Active' : 'Hoạt động') : isEnglish ? 'Inactive' : 'Tạm dừng'}
      </Badge>
    );
  }

  const meta = getStatusMeta(status);
  return (
    <Badge
      variant={variant ?? meta.variant}
      size={size}
      showDot={showDot ?? meta.showDot}
      className={className}
    >
      {isEnglish ? meta.en : meta.vi}
    </Badge>
  );
};

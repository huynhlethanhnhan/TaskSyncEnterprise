import * as React from 'react';
import { cn } from '../../utils/cn';
import { getMediaUrl } from '../../utils/media';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
}

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  status,
  className,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);
  const mediaUrl = React.useMemo(() => getMediaUrl(src), [src]);

  // Reset image error state if src changes
  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const statusSizeClasses = {
    sm: 'h-2 w-2 ring-1',
    md: 'h-2.5 w-2.5 ring-2',
    lg: 'h-3 w-3 ring-2',
    xl: 'h-4 w-4 ring-2',
  };

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', className)} {...props}>
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-accent-foreground border border-border/50 transition-all',
          sizeClasses[size]
        )}
      >
        {mediaUrl && !imageError ? (
          <img
            src={mediaUrl}
            alt={alt || name || 'Avatar'}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-background',
            statusSizeClasses[size],
            status === 'online' && 'bg-emerald-500',
            status === 'offline' && 'bg-slate-400',
            status === 'busy' && 'bg-rose-500',
            status === 'away' && 'bg-amber-500'
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

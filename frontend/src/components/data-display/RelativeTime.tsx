import * as React from 'react';
import { formatRelativeTime } from '../../utils/time';

export const RelativeTime: React.FC<{ value: string; className?: string }> = ({ value, className }) => {
  const [, refresh] = React.useReducer((count: number) => count + 1, 0);

  React.useEffect(() => {
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const absolute = new Date(value).toLocaleString('vi-VN');
  return (
    <time className={className} dateTime={value} title={absolute}>
      {formatRelativeTime(value)}
    </time>
  );
};

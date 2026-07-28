import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type NotificationItem } from '../api/services';
import { tokenService } from '../services/tokenService';

export const useNotifications = () => {
  return useQuery<NotificationItem[], Error>({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
    refetchInterval: 1000 * 10,
    refetchIntervalInBackground: true,
  });
};

export const useNotificationRealtime = () => {
  const queryClient = useQueryClient();
  const token = tokenService.getAccessToken();

  React.useEffect(() => {
    if (!token || typeof window === 'undefined' || typeof WebSocket === 'undefined') return undefined;

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let closedByClient = false;
    let retryCount = 0;
    const maxRetries = 10;

    const getWebSocketUrl = (): string => {
      let baseUrl = import.meta.env.VITE_WS_URL;
      if (!baseUrl) {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (apiUrl) {
          baseUrl = apiUrl
            .replace(/^http/, 'ws')
            .replace(/\/api\/v1\/?$/, '/ws/notifications')
            .replace(/\/api\/?$/, '/ws/notifications');
          if (!baseUrl.includes('/ws/notifications')) {
            baseUrl = `${baseUrl.replace(/\/+$/, '')}/ws/notifications`;
          }
        } else {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          baseUrl = `${protocol}//${window.location.host}/ws/notifications`;
        }
      }
      return `${baseUrl}?token=${encodeURIComponent(token)}`;
    };

    const connect = () => {
      if (closedByClient) return;

      try {
        const url = getWebSocketUrl();
        socket = new WebSocket(url);

        socket.onopen = () => {
          retryCount = 0;
        };

        socket.onmessage = () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        };

        socket.onclose = () => {
          if (!closedByClient && retryCount < maxRetries) {
            retryCount += 1;
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
            retryTimer = setTimeout(connect, delay);
          }
        };

        socket.onerror = () => {
          // Silent catch to prevent console error pollution when closing
        };
      } catch {
        // Ignored
      }
    };

    connect();

    return () => {
      closedByClient = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (socket) {
        const s = socket;
        s.onopen = null;
        s.onmessage = null;
        s.onclose = null;
        s.onerror = null;
        if (s.readyState === WebSocket.OPEN) {
          s.close();
        } else if (s.readyState === WebSocket.CONNECTING) {
          s.onopen = () => {
            try { s.close(); } catch { /* ignore */ }
          };
        }
      }
    };
  }, [queryClient, token]);
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

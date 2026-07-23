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

  React.useEffect(() => {
    const token = tokenService.getAccessToken();
    if (!token || typeof window === 'undefined' || typeof WebSocket === 'undefined') return undefined;

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let closedByClient = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws/notifications?token=${encodeURIComponent(token)}`);
      socket.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      };
      socket.onclose = () => {
        if (!closedByClient) retryTimer = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      closedByClient = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [queryClient]);
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

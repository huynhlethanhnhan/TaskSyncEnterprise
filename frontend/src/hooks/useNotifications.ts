import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type NotificationItem } from '../api/services';
import { tokenService } from '../services/tokenService';
import { useAuth } from '../providers/AuthProvider';

export const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  return useQuery<NotificationItem[], Error>({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
    enabled: isAuthenticated,
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
        if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
          baseUrl = apiUrl
            .replace(/^http/, 'ws')
            .replace(/\/api\/v1\/?$/, '/ws/notifications')
            .replace(/\/api\/?$/, '/ws/notifications');
          if (!baseUrl.includes('/ws/notifications')) {
            baseUrl = `${baseUrl.replace(/\/+$/, '')}/ws/notifications`;
          }
        } else if (import.meta.env.DEV) {
          // Keep Vite out of the WebSocket path in development. Uvicorn's
          // hot-reload resets open sockets, and proxying those resets through
          // Vite produces noisy `ws proxy error: ECONNRESET` messages.
          baseUrl = 'ws://127.0.0.1:8000/ws/notifications';
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

        socket.onmessage = (event) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          try {
            const message = JSON.parse(event.data);
            const eventType = message?.event;

            if (eventType === 'task.changed') {
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            } else if (eventType === 'employee.changed') {
              queryClient.invalidateQueries({ queryKey: ['employees'] });
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              queryClient.invalidateQueries({ queryKey: ['project-eligible-assignees'] });
            } else if (eventType === 'project.changed') {
              queryClient.invalidateQueries({ queryKey: ['projects'] });
              queryClient.invalidateQueries({ queryKey: ['project-eligible-assignees'] });
            } else if (eventType === 'sprint.changed') {
              queryClient.invalidateQueries({ queryKey: ['sprints'] });
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
            } else if (eventType === 'backlog.changed') {
              queryClient.invalidateQueries({ queryKey: ['backlog'] });
            } else if (eventType === 'team.changed') {
              queryClient.invalidateQueries({ queryKey: ['teams'] });
              queryClient.invalidateQueries({ queryKey: ['project-eligible-assignees'] });
            } else if (eventType === 'department.changed') {
              queryClient.invalidateQueries({ queryKey: ['departments'] });
              queryClient.invalidateQueries({ queryKey: ['project-eligible-assignees'] });
            } else if (eventType === 'topic.changed') {
              queryClient.invalidateQueries({ queryKey: ['topics'] });
            } else if (eventType === 'feedback.changed') {
              queryClient.invalidateQueries({ queryKey: ['feedback'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            } else if (eventType === 'file.changed') {
              queryClient.invalidateQueries({ queryKey: ['files'] });
            } else if (eventType === 'vacation.changed') {
              queryClient.invalidateQueries({ queryKey: ['vacations'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            }

            window.dispatchEvent(
              new CustomEvent('tasksync:domain-event', { detail: message }),
            );
          } catch {
            // Existing notification payloads do not need a domain event field.
          }
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

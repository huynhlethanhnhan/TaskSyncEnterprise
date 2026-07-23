import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type DashboardAnalytics } from '../api/services';

export const useDashboardAnalytics = () => {
  return useQuery<DashboardAnalytics, Error>({
    queryKey: ['dashboard', 'analytics'],
    queryFn: dashboardApi.getAnalytics,
    refetchInterval: 1000 * 60 * 2, // Auto refetch every 2 minutes
  });
};

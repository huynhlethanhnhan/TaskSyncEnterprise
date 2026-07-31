import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type DashboardAnalytics } from '../api/services';
import { useAuth } from '../providers/AuthProvider';

export const useDashboardAnalytics = () => {
  const { isAuthenticated } = useAuth();
  return useQuery<DashboardAnalytics, Error>({
    queryKey: ['dashboard', 'analytics'],
    queryFn: dashboardApi.getAnalytics,
    enabled: isAuthenticated,
    refetchInterval: 1000 * 60 * 2, // Auto refetch every 2 minutes
  });
};

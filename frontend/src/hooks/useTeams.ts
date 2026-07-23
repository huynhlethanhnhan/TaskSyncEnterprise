import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi, type TeamItem } from '../api/services';

export const useTeams = (params?: Record<string, any>) => {
  return useQuery<TeamItem[], Error>({
    queryKey: ['teams', params],
    queryFn: () => teamsApi.getAll(params),
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation<TeamItem, Error, Partial<TeamItem>>({
    mutationFn: teamsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation<TeamItem, Error, { id: number; payload: Partial<TeamItem> }>({
    mutationFn: ({ id, payload }) => teamsApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams', variables.id] });
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: teamsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type ProjectItem } from '../api/services';

export const useProjects = () => {
  return useQuery<ProjectItem[], Error>({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });
};

export const useProjectDetail = (id: number) => {
  return useQuery<ProjectItem, Error>({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.getById(id),
    enabled: Boolean(id),
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ProjectItem>) => projectsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProjectItem> }) =>
      projectsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi, type FileRegistryItem } from '../api/services';

export const useFilesList = (projectId?: number, module?: string) => {
  return useQuery<FileRegistryItem[], Error>({
    queryKey: ['files', { projectId, module }],
    queryFn: () => filesApi.getAll(projectId || module ? { project_id: projectId, module } : undefined),
  });
};
export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => filesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

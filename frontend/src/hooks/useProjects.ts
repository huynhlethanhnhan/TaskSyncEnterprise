import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type ProjectItem } from '../api/services';
import { isValidEntityId } from '../utils/entityId';

export const useProjects = (params?: Record<string, string | number | undefined>) => {
  return useQuery<ProjectItem[], Error>({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.getAll(params),
  });
};

export const useProjectDetail = (id: number) => {
  return useQuery<ProjectItem, Error>({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.getById(id),
    enabled: isValidEntityId(id),
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
      queryClient.invalidateQueries({ queryKey: ['project-eligible-assignees', id] });
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

export const useProjectMembers = (projectId?: number | null) => {
  return useQuery({
    queryKey: ['project-eligible-assignees', projectId],
    queryFn: ({ signal }) => projectsApi.getEligibleAssignees(projectId!, signal),
    enabled: isValidEntityId(projectId),
  });
};

export const useProjectMembersList = (projectId?: number | null) => {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.getMembers(projectId!),
    enabled: isValidEntityId(projectId),
  });
};

export const useAddProjectMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, employeeId }: { projectId: number; employeeId: number }) =>
      projectsApi.addMember(projectId, employeeId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-eligible-assignees', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
};



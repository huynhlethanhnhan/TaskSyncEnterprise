import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  backlogApi,
  sprintsApi,
  type BacklogItem,
  type SprintItem,
  type SprintPlanningData,
} from '../api/services';

const isValidId = (id: unknown): id is number =>
  typeof id === 'number' && Number.isFinite(id) && Number.isInteger(id) && id > 0;

export const useBacklog = (projectId: number, status?: string) => {
  return useQuery<BacklogItem[], Error>({
    queryKey: ['backlog', projectId, status],
    queryFn: () => backlogApi.getAll({ project_id: projectId, status }),
    enabled: isValidId(projectId),
  });
};

export const useCreateBacklogItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BacklogItem>) => backlogApi.create(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['backlog', variables.project_id] });
    },
  });
};

export const useUpdateBacklogItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<BacklogItem> }) =>
      backlogApi.update(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['backlog', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useDeleteBacklogItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; projectId: number }) => backlogApi.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['backlog', variables.projectId] });
    },
  });
};

export const useConvertBacklogToTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => backlogApi.convertToTask(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['backlog', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useSprints = (projectId?: number) => {
  return useQuery<SprintItem[], Error>({
    queryKey: ['sprints', projectId],
    queryFn: () => sprintsApi.getAll(projectId ? { project_id: projectId } : undefined),
    enabled: projectId === undefined || isValidId(projectId),
  });
};

export const useSprintPlanning = (sprintId: number) => {
  return useQuery<SprintPlanningData, Error>({
    queryKey: ['sprints', 'planning', sprintId],
    queryFn: () => sprintsApi.getPlanning(sprintId),
    enabled: isValidId(sprintId),
  });
};

export const useAddBacklogItemToSprint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sprintId,
      itemId,
    }: {
      sprintId: number;
      itemId: number;
      projectId: number;
    }) => sprintsApi.addBacklogItem(sprintId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sprints', 'planning', variables.sprintId],
      });
      queryClient.invalidateQueries({
        queryKey: ['backlog', variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      });
    },
  });
};

export const useRemoveBacklogItemFromSprint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sprintId,
      itemId,
    }: {
      sprintId: number;
      itemId: number;
      projectId: number;
    }) => sprintsApi.removeBacklogItem(sprintId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sprints', 'planning', variables.sprintId],
      });
      queryClient.invalidateQueries({
        queryKey: ['backlog', variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      });
    },
  });
};

export const useCreateSprint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<SprintItem>) => sprintsApi.create(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', data.project_id] });
    },
  });
};

export const useUpdateSprint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<SprintItem> }) =>
      sprintsApi.update(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useStartSprint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sprintsApi.start(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useCompleteSprint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sprintsApi.complete(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useCancelSprint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sprintsApi.cancel(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useReopenSprint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sprintsApi.reopen(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useSprintAnalytics = (sprintId: number) => {
  return useQuery({
    queryKey: ['sprint-analytics', sprintId],
    queryFn: () => sprintsApi.getAnalytics(sprintId),
    enabled: isValidId(sprintId),
  });
};

export const useVelocity = (projectId: number) => {
  return useQuery({
    queryKey: ['velocity', projectId],
    queryFn: () => sprintsApi.getVelocity({ project_id: projectId }),
    enabled: isValidId(projectId),
  });
};

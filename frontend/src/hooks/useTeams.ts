import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi, type TeamItem, type TeamDetailItem } from '../api/services';
import { isValidEntityId } from '../utils/entityId';

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

export const useTeamDetail = (id: number) => {
  return useQuery<TeamDetailItem, Error>({
    queryKey: ['teams', id],
    queryFn: () => teamsApi.getById(id),
    enabled: isValidEntityId(id),
  });
};

export const useTeamMemberCandidates = (id: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['teams', id, 'member-candidates'],
    queryFn: () => teamsApi.getMemberCandidates(id),
    enabled: enabled && isValidEntityId(id),
  });
};

export const useTeamTransferTargets = (id: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['teams', id, 'transfer-targets'],
    queryFn: () => teamsApi.getTransferTargets(id),
    enabled: enabled && isValidEntityId(id),
  });
};

const invalidateTeamMembership = (
  queryClient: ReturnType<typeof useQueryClient>,
  teamIds: number[],
) => {
  queryClient.invalidateQueries({ queryKey: ['employees'] });
  queryClient.invalidateQueries({ queryKey: ['departments'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  teamIds.forEach((id) => {
    queryClient.invalidateQueries({ queryKey: ['teams', id] });
  });
  queryClient.invalidateQueries({ queryKey: ['teams'] });
};

export const useAddTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: number; employeeId: number }) =>
      teamsApi.addMember(id, employeeId),
    onSuccess: (_, { id }) => invalidateTeamMembership(queryClient, [id]),
  });
};

export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: number; employeeId: number }) =>
      teamsApi.removeMember(id, employeeId),
    onSuccess: (_, { id }) => invalidateTeamMembership(queryClient, [id]),
  });
};

export const useTransferTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      employeeId,
      targetTeamId,
    }: {
      id: number;
      employeeId: number;
      targetTeamId: number;
    }) => teamsApi.transferMember(id, employeeId, targetTeamId),
    onSuccess: (_, { id, targetTeamId }) =>
      invalidateTeamMembership(queryClient, [id, targetTeamId]),
  });
};

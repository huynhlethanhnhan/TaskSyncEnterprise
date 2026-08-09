import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi, type DepartmentItem, type DepartmentDetailItem } from '../api/services';
import { isValidEntityId } from '../utils/entityId';

export const useDepartments = (enabled = true) => {
  return useQuery<DepartmentItem[], Error>({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
    enabled,
  });
};

export const useDepartmentDetail = (id: number) => {
  return useQuery<DepartmentDetailItem, Error>({
    queryKey: ['departments', id],
    queryFn: () => departmentsApi.getById(id),
    enabled: isValidEntityId(id),
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DepartmentItem>) => departmentsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<DepartmentItem> }) =>
      departmentsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['departments', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => departmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDepartmentMemberCandidates = (id: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['departments', id, 'member-candidates'],
    queryFn: () => departmentsApi.getMemberCandidates(id),
    enabled: enabled && isValidEntityId(id),
  });
};

export const useDepartmentTransferTargets = (id: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['departments', id, 'transfer-targets'],
    queryFn: () => departmentsApi.getTransferTargets(id),
    enabled: enabled && isValidEntityId(id),
  });
};

const invalidateDepartmentMembership = (
  queryClient: ReturnType<typeof useQueryClient>,
  departmentIds: number[],
) => {
  queryClient.invalidateQueries({ queryKey: ['employees'] });
  queryClient.invalidateQueries({ queryKey: ['teams'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  departmentIds.forEach((id) => {
    queryClient.invalidateQueries({ queryKey: ['departments', id] });
  });
  queryClient.invalidateQueries({ queryKey: ['departments'] });
};

export const useAddDepartmentMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: number; employeeId: number }) =>
      departmentsApi.addMember(id, employeeId),
    onSuccess: (_, { id }) => invalidateDepartmentMembership(queryClient, [id]),
  });
};

export const useRemoveDepartmentMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: number; employeeId: number }) =>
      departmentsApi.removeMember(id, employeeId),
    onSuccess: (_, { id }) => invalidateDepartmentMembership(queryClient, [id]),
  });
};

export const useTransferDepartmentMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      employeeId,
      targetDepartmentId,
    }: {
      id: number;
      employeeId: number;
      targetDepartmentId: number;
    }) => departmentsApi.transferMember(id, employeeId, targetDepartmentId),
    onSuccess: (_, { id, targetDepartmentId }) =>
      invalidateDepartmentMembership(queryClient, [id, targetDepartmentId]),
  });
};

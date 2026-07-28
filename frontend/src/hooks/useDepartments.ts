import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi, type DepartmentItem, type DepartmentDetailItem } from '../api/services';
import { isValidEntityId } from '../utils/entityId';

export const useDepartments = () => {
  return useQuery<DepartmentItem[], Error>({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
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

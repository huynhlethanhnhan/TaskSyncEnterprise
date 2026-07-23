import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, type EmployeeItem } from '../api/services';

export const useEmployees = () => {
  return useQuery<EmployeeItem[], Error>({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });
};

export const useEmployeeDetail = (id: number) => {
  return useQuery<EmployeeItem, Error>({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.getById(id),
    enabled: Boolean(id),
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<EmployeeItem>) => employeesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<EmployeeItem> }) =>
      employeesApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

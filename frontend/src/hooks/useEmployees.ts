import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, type EmployeeItem } from '../api/services';
import { useAuth } from '../providers/AuthProvider';

export const useEmployees = (overrideEnabled?: boolean) => {
  const { user } = useAuth();
  const roleStr = (user?.role || '').toLowerCase();
  const roleId = Number(user?.role_id);
  const isAuthorized = roleStr === 'admin' || roleStr === 'manager' || roleId === 1 || roleId === 2;
  const enabled = overrideEnabled !== undefined ? overrideEnabled : isAuthorized;

  return useQuery<EmployeeItem[], Error>({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
    enabled,
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

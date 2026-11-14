import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  employeesApi,
  type AdminResetPasswordPayload,
  type EmployeeItem,
  type PasswordResetRequestItem,
} from '../api/services';
import { useAuth } from '../providers/AuthProvider';
import { isValidEntityId } from '../utils/entityId';

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
    enabled: isValidEntityId(id),
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

export const useUpdateEmployeeStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      employeesApi.patchStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const usePasswordResetRequests = (enabled = false) => {
  return useQuery<PasswordResetRequestItem[], Error>({
    queryKey: ['employees', 'password-reset-requests'],
    queryFn: employeesApi.getPasswordResetRequests,
    enabled,
    refetchInterval: 1000 * 30,
  });
};

export const useAdminResetPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminResetPasswordPayload }) =>
      employeesApi.resetPassword(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', id] });
      queryClient.invalidateQueries({ queryKey: ['employees', 'password-reset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useDismissPasswordResetRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: number) => employeesApi.dismissPasswordResetRequest(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', 'password-reset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

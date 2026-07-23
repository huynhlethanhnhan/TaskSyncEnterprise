import { useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { getPermissionsForUser, type UserPermissions } from '../utils/permissions';

export const usePermissions = (): UserPermissions => {
  const { user } = useAuth();
  return useMemo(() => getPermissionsForUser(user), [user]);
};

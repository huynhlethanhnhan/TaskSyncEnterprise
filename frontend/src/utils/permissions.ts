export interface UserPermissions {
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
  canDeleteEmployee: boolean;
  canReadRoles: boolean;
  canManageDepartment: boolean;
  canCreateProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canViewAuditLogs: boolean;
}

export const getPermissionsForUser = (user: { role?: string; role_id?: number } | null): UserPermissions => {
  if (!user) {
    return {
      canCreateEmployee: false,
      canEditEmployee: false,
      canDeleteEmployee: false,
      canReadRoles: false,
      canManageDepartment: false,
      canCreateProject: false,
      canEditProject: false,
      canDeleteProject: false,
      canCreateTask: false,
      canEditTask: false,
      canDeleteTask: false,
      canViewAuditLogs: false,
    };
  }

  const roleStr = (user.role || '').toLowerCase();
  const roleId = Number(user.role_id);

  const isAdmin = roleStr === 'admin' || roleId === 1;
  const isManager = roleStr === 'manager' || roleId === 2;
  const isTeamLead = roleStr === 'team_leader' || roleStr === 'team leader' || roleId === 3;

  return {
    // Employee & Role management: Only Admin can create, edit, delete employees and read roles (Outcome A)
    canCreateEmployee: isAdmin,
    canEditEmployee: isAdmin,
    canDeleteEmployee: isAdmin,
    canReadRoles: isAdmin,

    // Department management: Admin & Manager
    canManageDepartment: isAdmin || isManager,

    // Project management: Admin & Manager
    canCreateProject: isAdmin || isManager,
    canEditProject: isAdmin || isManager,
    canDeleteProject: isAdmin,

    // Task management: Admin, Manager & Team Leader can create/edit/delete; Staff can update status
    canCreateTask: isAdmin || isManager || isTeamLead,
    canEditTask: isAdmin || isManager || isTeamLead,
    canDeleteTask: isAdmin || isManager || isTeamLead,

    // Audit logs: Only Admin
    canViewAuditLogs: isAdmin,
  };
};


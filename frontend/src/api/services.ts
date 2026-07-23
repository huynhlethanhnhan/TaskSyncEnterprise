import api from './axios';

// ── Types & Interfaces ────────────────────────────────────────────────────────
export interface DashboardAnalytics {
  overview: {
    total_employees: number;
    active_employees: number;
    inactive_employees: number;
    total_departments: number;
    total_projects: number;
    active_projects: number;
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    overdue_tasks: number;
    vacation_requests: number;
    pending_vacation_requests: number;
  };
  tasks_by_status: { status: string; count: number }[];
  projects_by_status: { status: string; count: number }[];
  employees_by_department: { department_name: string; employee_count: number }[];
  workload_by_department: {
    department_name: string;
    total_tasks: number;
    pending_tasks: number;
    overdue_tasks: number;
  }[];
  leave_by_status?: { status: string; count: number }[];
  monthly_activity?: { month: string; created: number }[];
  notification_volume?: any[];
  upcoming_deadlines?: any[];
  upcoming_leaves?: any[];
  upcoming_birthdays?: any[];
  pending_approvals?: any[];
}

export interface ProjectItem {
  id: number;
  project_code?: string;
  name: string;
  description?: string | null;
  status: string;
  department_id?: number | null;
  manager_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface TaskItem {
  id: number;
  task_code?: string;
  title?: string;
  name?: string;
  description?: string | null;
  status: string;
  priority: string;
  project_id?: number | null;
  assigned_to?: number | null;
  created_by?: number | null;
  deadline?: string | null;
  created_at?: string;
  progress_percent?: number;
  story_points?: number;
  attachments?: any[];
}

export interface EmployeeItem {
  id: number;
  employee_code?: string;
  full_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  start_date?: string | null;
  department_id?: number | null;
  role_id?: number | null;
  manager_id?: number | null;
  job_title?: string | null;
  is_active: boolean;
  avatar_url?: string | null;
  created_at?: string;
}

export interface DepartmentItem {
  id: number;
  department_code?: string;
  name: string;
  description?: string | null;
  manager_id?: number | null;
  is_active: boolean;
  employee_count?: number;
  created_at?: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  type?: string;
  created_at: string;
}

// ── API Services ──────────────────────────────────────────────────────────────

export const dashboardApi = {
  getAnalytics: async (): Promise<DashboardAnalytics> => {
    const res = await api.get('/dashboard/analytics');
    return res.data?.data || res.data;
  },
};

export const projectsApi = {
  getAll: async (): Promise<ProjectItem[]> => {
    const res = await api.get('/projects');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getById: async (id: number): Promise<ProjectItem> => {
    const res = await api.get(`/projects/${id}`);
    return res.data?.data || res.data;
  },
  create: async (payload: Partial<ProjectItem>): Promise<ProjectItem> => {
    const res = await api.post('/projects', payload);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: Partial<ProjectItem>): Promise<ProjectItem> => {
    const res = await api.put(`/projects/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};

export const tasksApi = {
  getAll: async (params?: Record<string, string>): Promise<TaskItem[]> => {
    const res = await api.get('/tasks', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getMyTasks: async (): Promise<TaskItem[]> => {
    const res = await api.get('/tasks/my-tasks');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getById: async (id: number): Promise<TaskItem> => {
    const res = await api.get(`/tasks/${id}`);
    return res.data?.data || res.data;
  },
  create: async (payload: Partial<TaskItem>): Promise<TaskItem> => {
    const res = await api.post('/tasks', payload);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: Partial<TaskItem>): Promise<TaskItem> => {
    const res = await api.put(`/tasks/${id}`, payload);
    return res.data?.data || res.data;
  },
  patchStatus: async (id: number, status: string): Promise<TaskItem> => {
    const res = await api.patch(`/tasks/${id}`, { status });
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};

export const employeesApi = {
  getAll: async (): Promise<EmployeeItem[]> => {
    const res = await api.get('/employees');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getById: async (id: number): Promise<EmployeeItem> => {
    const res = await api.get(`/employees/${id}`);
    return res.data?.data || res.data;
  },
  create: async (payload: Partial<EmployeeItem>): Promise<EmployeeItem> => {
    const res = await api.post('/employees', payload);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: Partial<EmployeeItem>): Promise<EmployeeItem> => {
    const res = await api.put(`/employees/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },
};

export const departmentsApi = {
  getAll: async (): Promise<DepartmentItem[]> => {
    const res = await api.get('/departments');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getById: async (id: number): Promise<DepartmentItem> => {
    const res = await api.get(`/departments/${id}`);
    return res.data?.data || res.data;
  },
  create: async (payload: Partial<DepartmentItem>): Promise<DepartmentItem> => {
    const res = await api.post('/departments', payload);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: Partial<DepartmentItem>): Promise<DepartmentItem> => {
    const res = await api.put(`/departments/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};

export const notificationsApi = {
  getAll: async (): Promise<NotificationItem[]> => {
    const res = await api.get('/notifications');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  markAsRead: async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },
};

export interface TeamItem {
  id: number;
  department_id: number;
  team_code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export const teamsApi = {
  getAll: async (params?: Record<string, any>): Promise<TeamItem[]> => {
    const res = await api.get('/teams', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getById: async (id: number): Promise<TeamItem> => {
    const res = await api.get(`/teams/${id}`);
    return res.data?.data || res.data;
  },
  create: async (payload: Partial<TeamItem>): Promise<TeamItem> => {
    const res = await api.post('/teams', payload);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: Partial<TeamItem>): Promise<TeamItem> => {
    const res = await api.put(`/teams/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/teams/${id}`);
  },
};

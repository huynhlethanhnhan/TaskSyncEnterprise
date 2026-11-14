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
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  priority?: string;
  budget?: number | null;
  progress_percent?: number;
  department_id?: number | null;
  team_id?: number | null;
  department_name?: string | null;
  team_name?: string | null;
  created_by?: number | null;
  created_at?: string;
  upcoming_vacations?: Array<{
    start_date: string;
    end_date: string;
    status: string;
  }>;
  updated_at?: string | null;
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
  sprint_id?: number | null;
  topic_id?: number | null;
  assigned_to?: number | null;
  created_by?: number | null;
  deadline?: string | null;
  created_at?: string;
  upcoming_vacations?: Array<{
    start_date: string;
    end_date: string;
    status: string;
  }>;
  progress_percent?: number;
  story_points?: number;
  attachments?: any[];
  creator_name?: string | null;
  assignee?: any | null;
  sprint_name?: string | null;
  is_standalone?: boolean;
  is_from_backlog?: boolean;
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
  department_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  role_id?: number | null;
  manager_id?: number | null;
  job_title?: string | null;
  employment_status?: string;
  is_active: boolean;
  is_online?: boolean;
  last_login?: string | null;
  last_logout?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  upcoming_vacations?: Array<{
    start_date: string;
    end_date: string;
    status: string;
  }>;
}

export interface DepartmentItem {
  id: number;
  department_code: string;
  name: string;
  description?: string | null;
  manager_id?: number | null;
  manager_name?: string | null;
  manager_avatar_url?: string | null;
  employee_count?: number;
  team_count?: number;
  project_count?: number;
  completed_project_count?: number;
  sprint_count?: number;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentMemberItem {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  job_title?: string | null;
  avatar_url?: string | null;
  team_id?: number | null;
  role_id: number;
  is_active: boolean;
}

interface DepartmentTeamItem {
  id: number;
  team_code: string;
  name: string;
  leader_id?: number | null;
  leader_name?: string | null;
  member_count: number;
}

export interface DepartmentDetailItem
  extends DepartmentItem {
  members: DepartmentMemberItem[];
  teams: DepartmentTeamItem[];
}
export interface MembershipTargetItem {
  id: number;
  name: string;
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
  getAll: async (params?: Record<string, string | number | undefined>): Promise<ProjectItem[]> => {
    const res = await api.get('/projects', { params });
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
  getEligibleAssignees: async (
    projectId: number,
    signal?: AbortSignal,
  ): Promise<Partial<EmployeeItem>[]> => {
    const res = await api.get(`/projects/${projectId}/eligible-assignees`, { signal });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getMembers: async (projectId: number): Promise<Partial<EmployeeItem>[]> => {
    const res = await api.get(`/projects/${projectId}/members`);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  addMember: async (projectId: number, employeeId: number): Promise<any> => {
    const res = await api.post(`/projects/${projectId}/members`, { employee_id: employeeId });
    return res.data?.data || res.data;
  },
};

export const tasksApi = {
  getAll: async (params?: Record<string, string>): Promise<TaskItem[]> => {
    const res = await api.get('/tasks', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  search: async (params: {
    keyword?: string;
    project_id?: number;
    department_id?: number;
    team_id?: number;
    sprint_id?: number;
    topic_id?: number;
    assigned_to?: number;
    status?: string;
    priority?: string;
    overdue_only?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<TaskItem[]> => {
    const res = await api.get('/tasks/search', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getMyTasks: async (): Promise<TaskItem[]> => {
    const res = await api.get('/tasks/my-tasks');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  // ĐÃ FIX LẠI ĐOẠN NÀY: Trả về TaskItem và gọi endpoint /tasks/
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
  patchStatus: async (id: number, status: string): Promise<EmployeeItem> => {
    const res = await api.patch(`/employees/${id}/status`, { status });
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },
  getPasswordResetRequests: async (): Promise<PasswordResetRequestItem[]> => {
    const res = await api.get('/employees/password-reset-requests');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  dismissPasswordResetRequest: async (employeeId: number): Promise<void> => {
    await api.delete(`/employees/password-reset-requests/${employeeId}`);
  },
  resetPassword: async (
    employeeId: number,
    payload: AdminResetPasswordPayload,
  ): Promise<AdminResetPasswordResponse> => {
    const res = await api.post(`/employees/${employeeId}/reset-password`, payload);
    return res.data?.data || res.data;
  },
};

export interface PasswordResetRequestItem {
  employee_id: number;
  employee_code: string;
  full_name: string;
  email: string;
  department_name?: string | null;
  avatar_url?: string | null;
  note?: string | null;
  requested_at?: string | null;
  notification_id: number;
}

export interface AdminResetPasswordPayload {
  new_password?: string | null;
  force_change_on_login?: boolean;
  notify_via_email?: boolean;
}

export interface AdminResetPasswordResponse {
  employee_id: number;
  employee_code: string;
  full_name: string;
  email: string;
  temporary_password: string;
  reset_link: string;
  force_change_on_login: boolean;
  email_sent: boolean;
  message: string;
}

export const authApi = {
  forgotPassword: async (
    email: string,
    note?: string,
  ): Promise<{ message: string; admin_notified: boolean; email_sent: boolean }> => {
    const res = await api.post('/auth/forgot-password', { email, note: note || undefined });
    return res.data?.data || res.data;
  },
  resetPassword: async (payload: {
    token: string;
    new_password: string;
    confirm_password?: string;
  }): Promise<{ message: string }> => {
    const res = await api.post('/auth/reset-password', payload);
    return res.data?.data || res.data;
  },
};

export const departmentsApi = {
  getAll: async (): Promise<DepartmentItem[]> => {
    const res = await api.get('/departments');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getById: async (id: number): Promise<DepartmentDetailItem> => {
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
  getMemberCandidates: async (id: number): Promise<EmployeeItem[]> => {
    const res = await api.get(`/departments/${id}/member-candidates`);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getTransferTargets: async (id: number): Promise<MembershipTargetItem[]> => {
    const res = await api.get(`/departments/${id}/transfer-targets`);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  addMember: async (id: number, employeeId: number): Promise<void> => {
    await api.post(`/departments/${id}/members/${employeeId}`);
  },
  removeMember: async (id: number, employeeId: number): Promise<void> => {
    await api.delete(`/departments/${id}/members/${employeeId}`);
  },
  transferMember: async (
    id: number,
    employeeId: number,
    targetDepartmentId: number,
  ): Promise<void> => {
    await api.post(`/departments/${id}/members/${employeeId}/transfer`, {
      target_department_id: targetDepartmentId,
    });
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
  department_name? :string | null;
  team_code: string;
  name: string;
  description?: string | null;

  leader_id?: number | null;
  leader_name?: string | null;
  leader_avatar_url?: string | null;

  member_count?: number;

  is_active: boolean;
  created_at: string;
}

export interface TeamMemberItem {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  job_title?: string | null;
  avatar_url?: string | null;
  role_id: number;
  is_active: boolean;
}

export interface TeamDetailItem extends TeamItem {
  members: TeamMemberItem[];
}

export const teamsApi = {
  getAll: async (params?: Record<string, any>): Promise<TeamItem[]> => {
    const res = await api.get('/teams', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getById: async (id: number): Promise<TeamDetailItem> => {
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
  getMemberCandidates: async (id: number): Promise<EmployeeItem[]> => {
    const res = await api.get(`/teams/${id}/member-candidates`);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getTransferTargets: async (id: number): Promise<MembershipTargetItem[]> => {
    const res = await api.get(`/teams/${id}/transfer-targets`);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  addMember: async (id: number, employeeId: number): Promise<void> => {
    await api.post(`/teams/${id}/members/${employeeId}`);
  },
  removeMember: async (id: number, employeeId: number): Promise<void> => {
    await api.delete(`/teams/${id}/members/${employeeId}`);
  },
  transferMember: async (
    id: number,
    employeeId: number,
    targetTeamId: number,
  ): Promise<void> => {
    await api.post(`/teams/${id}/members/${employeeId}/transfer`, {
      target_team_id: targetTeamId,
    });
  },
};

// ── NEW SERVICES & INTERFACES FOR GAP REMEDIATION ──────────────────────────

export interface TaskChecklistResponse {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
}

export interface TaskCommentResponse {
  id: number;
  task_id: number;
  employee_id: number;
  content: string;
  created_at: string;
  author?: {
    id: number;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
    role_id: number;
  };
}



export interface BacklogItem {
  id: number;
  project_id: number;
  sprint_id?: number | null;
  topic_id?: number | null;
  task_id?: number | null;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  story_points: number;
  created_at: string;
}

export interface SprintItem {
  id: number;
  project_id: number;
  name: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  capacity: number;
  created_at: string;
}

export interface SprintDetailItem extends SprintItem {
  total_tasks: number;
  completed_tasks: number;
  remaining_tasks: number;
  progress_percent: number;
  total_story_points: number;
  completed_story_points: number;
  remaining_story_points: number;
}

export interface SprintPlanningData {
  sprint: SprintItem;
  eligible_items: BacklogItem[];
  sprint_items: BacklogItem[];
  capacity: number;
  total_story_points: number;
}

interface SprintSnapshot {
  snapshot_date: string;
  remaining_story_points: number;
  completed_story_points: number;
  remaining_tasks: number;
  completed_tasks: number;
}

export interface SprintAnalytics {
  sprint_id: number;
  name: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  capacity: number;
  total_tasks: number;
  completed_tasks: number;
  total_story_points: number;
  completed_story_points: number;
  snapshots: SprintSnapshot[];
}

export interface VelocityItem {
  sprint_id: number;
  name: string;
  completed_story_points: number;
}

export interface ReplyItem {
  id: number;
  topic_id: number;
  content: string;
  created_by_id: number;
  created_at: string;
  creator?: {
    id: number;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
    role_id: number;
  };
}

export interface TopicItem {
  id: number;
  project_id?: number | null;
  title: string;
  name?: string;
  content: string;
  status: string;
  created_by_id: number;
  created_at: string;
  creator?: {
    id: number;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
    role_id: number;
  };
  reply_count?: number;
  replies?: ReplyItem[];
}

export interface FeedbackItem {
  id: number;
  title: string;
  category: string;
  description: string;
  impact_level: string;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  submitter_id?: number | null;
  submitter?: {
    id: number;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
    role_id: number;
  } | null;
  reviewer_id?: number | null;
  reviewer?: {
    id: number;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
    role_id: number;
  } | null;
  response?: string | null;
}

export interface FileRegistryItem {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by_id: number;
  uploader_name?: string | null;
  parent_module: string;
  parent_entity_id: number;
  project_id?: number | null;
}

export const checklistsApi = {
  getByTaskId: async (taskId: number): Promise<TaskChecklistResponse[]> => {
    const res = await api.get(`/tasks/${taskId}/checklist`);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  create: async (taskId: number, payload: Partial<TaskChecklistResponse>): Promise<TaskChecklistResponse> => {
    const res = await api.post(`/tasks/${taskId}/checklist`, payload);
    return res.data?.data || res.data;
  },
  update: async (taskId: number, itemId: number, payload: Partial<TaskChecklistResponse>): Promise<TaskChecklistResponse> => {
    const res = await api.patch(`/tasks/${taskId}/checklist/${itemId}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (taskId: number, itemId: number): Promise<void> => {
    await api.delete(`/tasks/${taskId}/checklist/${itemId}`);
  },
};

export const commentsApi = {
  getByTaskId: async (taskId: number): Promise<TaskCommentResponse[]> => {
    const res = await api.get(`/tasks/${taskId}/comments`);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  create: async (taskId: number, payload: { content: string }): Promise<TaskCommentResponse> => {
    const res = await api.post(`/tasks/${taskId}/comments`, payload);
    return res.data?.data || res.data;
  },
  update: async (taskId: number, commentId: number, payload: { content: string }): Promise<TaskCommentResponse> => {
    const res = await api.patch(`/tasks/${taskId}/comments/${commentId}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (taskId: number, commentId: number): Promise<void> => {
    await api.delete(`/tasks/${taskId}/comments/${commentId}`);
  },
};

export const backlogApi = {
  getAll: async (params: { project_id: number; status?: string }): Promise<BacklogItem[]> => {
    const res = await api.get('/backlog', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  create: async (payload: Partial<BacklogItem>): Promise<BacklogItem> => {
    const res = await api.post('/backlog', payload);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: Partial<BacklogItem>): Promise<BacklogItem> => {
    const res = await api.put(`/backlog/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/backlog/${id}`);
  },
  convertToTask: async (id: number): Promise<TaskItem> => {
    const res = await api.post(`/backlog/${id}/convert-to-task`);
    return res.data?.data || res.data;
  },
};

export const sprintsApi = {
  getAll: async (params?: { project_id?: number }): Promise<SprintItem[]> => {
    const res = await api.get('/sprints', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  create: async (payload: Partial<SprintItem>): Promise<SprintItem> => {
    const res = await api.post('/sprints', payload);
    return res.data?.data || res.data;
  },
  getById: async (id: number): Promise<SprintDetailItem> => {
    const res = await api.get(`/sprints/${id}`);
    return res.data?.data || res.data;
  },
  getPlanning: async (id: number): Promise<SprintPlanningData> => {
    const res = await api.get(`/sprints/${id}/planning`);
    return res.data?.data || res.data;
  },
  addBacklogItem: async (
    sprintId: number,
    itemId: number,
  ): Promise<SprintPlanningData> => {
    const res = await api.post(`/sprints/${sprintId}/backlog/${itemId}`);
    return res.data?.data || res.data;
  },
  removeBacklogItem: async (
    sprintId: number,
    itemId: number,
  ): Promise<SprintPlanningData> => {
    const res = await api.delete(`/sprints/${sprintId}/backlog/${itemId}`);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: Partial<SprintItem>): Promise<SprintItem> => {
    const res = await api.put(`/sprints/${id}`, payload);
    return res.data?.data || res.data;
  },
  start: async (id: number): Promise<SprintItem> => {
    const res = await api.patch(`/sprints/${id}/start`);
    return res.data?.data || res.data;
  },
  complete: async (id: number): Promise<SprintItem> => {
    const res = await api.patch(`/sprints/${id}/complete`);
    return res.data?.data || res.data;
  },
  cancel: async (id: number): Promise<SprintItem> => {
    const res = await api.patch(`/sprints/${id}/cancel`);
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/sprints/${id}`);
  },
  reopen: async (id: number): Promise<SprintItem> => {
    const res = await api.patch(`/sprints/${id}/reopen`);
    return res.data?.data || res.data;
  },
  getAnalytics: async (id: number): Promise<SprintAnalytics> => {
    const res = await api.get(`/sprints/${id}/analytics`);
    return res.data?.data || res.data;
  },
  getVelocity: async (params: { project_id: number }): Promise<VelocityItem[]> => {
    const res = await api.get('/sprints/velocity', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
};

export const topicsApi = {
  getAll: async (params?: { project_id?: number }): Promise<TopicItem[]> => {
    const res = await api.get('/topics', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getById: async (id: number): Promise<TopicItem> => {
    const res = await api.get(`/topics/${id}`);
    return res.data?.data || res.data;
  },
  create: async (payload: Partial<TopicItem>): Promise<TopicItem> => {
    const res = await api.post('/topics', payload);
    return res.data?.data || res.data;
  },
  update: async (id: number, payload: Partial<TopicItem>): Promise<TopicItem> => {
    const res = await api.put(`/topics/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/topics/${id}`);
  },
  createReply: async (topicId: number, payload: { content: string }): Promise<ReplyItem> => {
    const res = await api.post(`/topics/${topicId}/replies`, payload);
    return res.data?.data || res.data;
  },
  updateReply: async (topicId: number, replyId: number, payload: { content: string }): Promise<ReplyItem> => {
    const res = await api.patch(`/topics/${topicId}/replies/${replyId}`, payload);
    return res.data?.data || res.data;
  },
  deleteReply: async (topicId: number, replyId: number): Promise<void> => {
    await api.delete(`/topics/${topicId}/replies/${replyId}`);
  },
};

export const feedbackApi = {
  submit: async (payload: Partial<FeedbackItem>): Promise<FeedbackItem> => {
    const res = await api.post('/feedback', payload);
    return res.data?.data || res.data;
  },
  getMyFeedback: async (): Promise<FeedbackItem[]> => {
    const res = await api.get('/feedback/my');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getAll: async (): Promise<FeedbackItem[]> => {
    const res = await api.get('/feedback');
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  review: async (id: number, payload: { status: string; response?: string }): Promise<FeedbackItem> => {
    const res = await api.patch(`/feedback/${id}/review`, payload);
    return res.data?.data || res.data;
  },
};

export const filesApi = {
  getAll: async (params?: { project_id?: number; module?: string }): Promise<FileRegistryItem[]> => {
    const res = await api.get('/files', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/files/${id}`);
  },
  upload: async (formData: FormData): Promise<any> => {
    const res = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

// ── HRM Subsystem Interfaces & APIs ───────────────────────────────────────────

export interface LeaveBalanceItem {
  id: number;
  employee_id: number;
  leave_year: number;
  annual_entitlement: number | string;
  carried_over_days: number | string;
  used_days: number | string;
  pending_days: number | string;
  remaining_days: number;
  updated_at?: string | null;
}

export interface LeaveBalanceAdjustPayload {
  leave_year: number;
  annual_entitlement: number;
  carried_over_days?: number;
}

export interface EmploymentContractItem {
  id: number;
  employee_id: number;
  contract_code: string;
  contract_type: 'Probation' | 'Fixed-Term' | 'Indefinite' | 'Part-Time' | 'Contractor' | string;
  base_salary: number | string;
  allowance: number | string;
  currency: string;
  start_date: string;
  end_date?: string | null;
  status: 'Draft' | 'Active' | 'Expired' | 'Terminated' | string;
  is_deleted?: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface EmploymentContractCreatePayload {
  employee_id: number;
  contract_code: string;
  contract_type: string;
  base_salary: number;
  allowance?: number;
  currency?: string;
  start_date: string;
  end_date?: string | null;
  status?: string;
}

export interface EmploymentContractUpdatePayload {
  contract_type?: string;
  base_salary?: number;
  allowance?: number;
  currency?: string;
  start_date?: string;
  end_date?: string | null;
  status?: string;
}

export interface AttendanceLogItem {
  id: number;
  employee_id: number;
  work_date: string;
  check_in?: string | null;
  check_out?: string | null;
  work_hours: number | string;
  overtime_hours: number | string;
  status: string;
  note?: string | null;
  created_at: string;
}

export interface OvertimeRequestItem {
  id: number;
  employee_id: number;
  project_id?: number | null;
  work_date: string;
  hours: number | string;
  reason?: string | null;
  status: 'Pending' | 'Manager Approved' | 'HR Approved' | 'Rejected' | 'Withdrawn' | string;
  team_leader_note?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface OvertimeRequestCreatePayload {
  project_id?: number | null;
  work_date: string;
  hours: number;
  reason?: string;
}

export interface LeaveTaskConflictItem {
  employee_id: number;
  employee_name: string;
  task_id: number;
  task_title: string;
  task_deadline: string;
  vacation_id: number;
  vacation_status: string;
  leave_start_date: string;
  leave_end_date: string;
}

export interface HRMOverviewItem {
  employee_id: number;
  full_name: string;
  role_id: number;
  employment_status: string;
  is_team_leader: boolean;
  led_team_ids: number[];
  leave_balance: LeaveBalanceItem;
  active_contract?: EmploymentContractItem | null;
  attendance_days_this_month: number;
  total_work_hours_this_month: number;
  total_overtime_hours_this_month: number;
  pending_leave_requests: number;
  pending_overtime_requests: number;
  leave_task_conflicts: LeaveTaskConflictItem[];
}

export interface BackupHistoryItem {
  id: number;
  backup_type: string;
  database_name: string;
  backup_path?: string | null;
  status: string;
  performed_by?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface BackupHistoryCreatePayload {
  backup_type: 'FULL' | 'DIFFERENTIAL' | 'LOG' | 'SNAPSHOT' | 'LOGICAL_ROLLBACK';
  database_name: string;
  backup_path?: string;
  status: 'SUCCESS' | 'VERIFIED' | 'FAILED' | 'RESTORED';
  notes?: string;
}

export interface UserPreferenceSettings {
  employee_id?: number;
  theme: string;
  language: string;
  timezone: string;
  date_format: string;
  page_size: number;
  compact_mode: boolean;
  in_app_notifications: boolean;
  email_notifications: boolean;
  task_assigned_notify: boolean;
  task_deadline_notify: boolean;
  sprint_status_notify: boolean;
  project_update_notify: boolean;
}

export interface SystemRuntimeSettings {
  system_name: string;
  default_sprint_capacity: number;
  default_task_page_size: number;
  deadline_reminder_days: number;
  allow_employee_status_update: boolean;
  maintenance_mode: boolean;
}

export const settingsApi = {
  getMe: async (): Promise<UserPreferenceSettings> => {
    const res = await api.get('/settings/me');
    return res.data?.data || res.data;
  },
  updateMe: async (payload: Partial<UserPreferenceSettings>): Promise<UserPreferenceSettings> => {
    const res = await api.patch('/settings/me', payload);
    return res.data?.data || res.data;
  },
  getRuntime: async (): Promise<SystemRuntimeSettings> => {
    const res = await api.get('/settings/runtime');
    return res.data?.data || res.data;
  },
  getSystem: async (): Promise<SystemRuntimeSettings> => {
    const res = await api.get('/settings/system');
    return res.data?.data || res.data;
  },
  updateSystem: async (payload: Partial<SystemRuntimeSettings>): Promise<SystemRuntimeSettings> => {
    const res = await api.patch('/settings/system', payload);
    return res.data?.data || res.data;
  },
};

export interface PayrollItem {
  id: number;
  employee_id: number;
  contract_id?: number | null;
  pay_period: string;
  standard_work_days: number | string;
  actual_work_days: number | string;
  paid_leave_days: number | string;
  overtime_hours: number | string;
  base_salary: number | string;
  allowance: number | string;
  overtime_pay: number | string;
  bonus: number | string;
  deduction: number | string;
  net_salary: number | string;
  currency: string;
  status: 'Draft' | 'Confirmed' | 'Paid' | string;
  note?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PayrollCalculatePayload {
  pay_period: string;
  employee_id?: number;
  standard_work_days?: number;
  overtime_multiplier?: number;
}

export interface PayrollUpdatePayload {
  actual_work_days?: number;
  paid_leave_days?: number;
  overtime_hours?: number;
  overtime_pay?: number;
  bonus?: number;
  deduction?: number;
  note?: string;
}

export interface AttendanceUpdatePayload {
  check_in?: string;
  check_out?: string;
  work_hours?: number;
  overtime_hours?: number;
  status?: 'Present' | 'Remote' | 'Late' | 'Half-Day' | 'Leave' | 'Absent' | 'Holiday';
  note?: string;
}

export interface CandidateItem {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  applied_position: string;
  department_id?: number | null;
  expected_salary?: number | string | null;
  stage: 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected' | string;
  interview_date?: string | null;
  source?: string | null;
  notes?: string | null;
  converted_employee_id?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CandidateCreatePayload {
  full_name: string;
  email: string;
  phone?: string;
  applied_position: string;
  department_id?: number | null;
  expected_salary?: number | null;
  stage?: string;
  interview_date?: string | null;
  source?: string;
  notes?: string;
}

export interface CandidateOnboardPayload {
  department_id?: number | null;
  team_id?: number | null;
  job_title?: string;
  password?: string;
  create_contract?: boolean;
  contract_type?: 'Probation' | 'Fixed-Term' | 'Indefinite' | 'Part-Time' | 'Contractor';
  base_salary?: number;
  allowance?: number;
  currency?: string;
  start_date?: string;
}

export const hrmApi = {
  getOverview: async (): Promise<HRMOverviewItem> => {
    const res = await api.get('/hrm/me/overview');
    return res.data?.data || res.data;
  },
  getLeaveTaskConflicts: async (params?: {
    employee_id?: number;
    project_id?: number;
  }): Promise<LeaveTaskConflictItem[]> => {
    const res = await api.get('/hrm/leave-task-conflicts', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getMyLeaveBalance: async (leave_year?: number): Promise<LeaveBalanceItem> => {
    const res = await api.get('/hrm/leave-balances/me', {
      params: leave_year ? { leave_year } : undefined,
    });
    return res.data?.data || res.data;
  },
  listLeaveBalances: async (params?: {
    leave_year?: number;
    employee_id?: number;
  }): Promise<LeaveBalanceItem[]> => {
    const res = await api.get('/hrm/leave-balances', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  getEmployeeLeaveBalance: async (employeeId: number, leave_year?: number): Promise<LeaveBalanceItem> => {
    const res = await api.get(`/hrm/leave-balances/${employeeId}`, {
      params: leave_year ? { leave_year } : undefined,
    });
    return res.data?.data || res.data;
  },
  adjustLeaveBalance: async (
    employeeId: number,
    payload: LeaveBalanceAdjustPayload,
  ): Promise<LeaveBalanceItem> => {
    const res = await api.put(`/hrm/leave-balances/${employeeId}`, payload);
    return res.data?.data || res.data;
  },
  listContracts: async (params?: {
    employee_id?: number;
    status_filter?: string;
  }): Promise<EmploymentContractItem[]> => {
    const res = await api.get('/hrm/contracts', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  createContract: async (payload: EmploymentContractCreatePayload): Promise<EmploymentContractItem> => {
    const res = await api.post('/hrm/contracts', payload);
    return res.data?.data || res.data;
  },
  updateContract: async (
    contractId: number,
    payload: EmploymentContractUpdatePayload,
  ): Promise<EmploymentContractItem> => {
    const res = await api.put(`/hrm/contracts/${contractId}`, payload);
    return res.data?.data || res.data;
  },
  deleteContract: async (contractId: number): Promise<void> => {
    await api.delete(`/hrm/contracts/${contractId}`);
  },
  checkIn: async (payload?: {
    work_date?: string;
    check_in?: string;
    status?: 'Present' | 'Remote';
    note?: string;
  }): Promise<AttendanceLogItem> => {
    const res = await api.post('/hrm/attendance/check-in', payload || {});
    return res.data?.data || res.data;
  },
  checkOut: async (payload?: {
    work_date?: string;
    check_out?: string;
    note?: string;
  }): Promise<AttendanceLogItem> => {
    const res = await api.post('/hrm/attendance/check-out', payload || {});
    return res.data?.data || res.data;
  },
  listAttendance: async (params?: {
    employee_id?: number;
    work_date_from?: string;
    work_date_to?: string;
    limit?: number;
  }): Promise<AttendanceLogItem[]> => {
    const res = await api.get('/hrm/attendance', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  updateAttendance: async (
    attendanceId: number,
    payload: AttendanceUpdatePayload,
  ): Promise<AttendanceLogItem> => {
    const res = await api.put(`/hrm/attendance/${attendanceId}`, payload);
    return res.data?.data || res.data;
  },
  listOvertime: async (params?: {
    status_filter?: string;
    employee_id?: number;
  }): Promise<OvertimeRequestItem[]> => {
    const res = await api.get('/hrm/overtime', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  createOvertime: async (payload: OvertimeRequestCreatePayload): Promise<OvertimeRequestItem> => {
    const res = await api.post('/hrm/overtime', payload);
    return res.data?.data || res.data;
  },
  updateOvertime: async (
    overtimeId: number,
    payload: Partial<OvertimeRequestCreatePayload>,
  ): Promise<OvertimeRequestItem> => {
    const res = await api.put(`/hrm/overtime/${overtimeId}`, payload);
    return res.data?.data || res.data;
  },
  addOvertimeLeaderNote: async (
    overtimeId: number,
    team_leader_note: string,
  ): Promise<OvertimeRequestItem> => {
    const res = await api.patch(`/hrm/overtime/${overtimeId}/leader-note`, { team_leader_note });
    return res.data?.data || res.data;
  },
  updateOvertimeStatus: async (
    overtimeId: number,
    status: string,
    note?: string,
  ): Promise<OvertimeRequestItem> => {
    const res = await api.patch(`/hrm/overtime/${overtimeId}/status`, { status, note });
    return res.data?.data || res.data;
  },
  deleteOvertime: async (overtimeId: number): Promise<void> => {
    await api.delete(`/hrm/overtime/${overtimeId}`);
  },
  listBackups: async (limit = 50): Promise<BackupHistoryItem[]> => {
    const res = await api.get('/hrm/backups', { params: { limit } });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  createBackup: async (payload: BackupHistoryCreatePayload): Promise<BackupHistoryItem> => {
    const res = await api.post('/hrm/backups', payload);
    return res.data?.data || res.data;
  },
  listPayrolls: async (params?: {
    pay_period?: string;
    employee_id?: number;
  }): Promise<PayrollItem[]> => {
    const res = await api.get('/hrm/payrolls', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  calculatePayrolls: async (payload: PayrollCalculatePayload): Promise<PayrollItem[]> => {
    const res = await api.post('/hrm/payrolls/calculate', payload);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  updatePayroll: async (
    payrollId: number,
    payload: PayrollUpdatePayload,
  ): Promise<PayrollItem> => {
    const res = await api.put(`/hrm/payrolls/${payrollId}`, payload);
    return res.data?.data || res.data;
  },
  updatePayrollStatus: async (
    payrollId: number,
    status: string,
    note?: string,
  ): Promise<PayrollItem> => {
    const res = await api.patch(`/hrm/payrolls/${payrollId}/status`, { status, note });
    return res.data?.data || res.data;
  },
  listCandidates: async (params?: { stage?: string }): Promise<CandidateItem[]> => {
    const res = await api.get('/hrm/candidates', { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  createCandidate: async (payload: CandidateCreatePayload): Promise<CandidateItem> => {
    const res = await api.post('/hrm/candidates', payload);
    return res.data?.data || res.data;
  },
  updateCandidate: async (
    candidateId: number,
    payload: Partial<CandidateCreatePayload>,
  ): Promise<CandidateItem> => {
    const res = await api.put(`/hrm/candidates/${candidateId}`, payload);
    return res.data?.data || res.data;
  },
  deleteCandidate: async (candidateId: number): Promise<void> => {
    await api.delete(`/hrm/candidates/${candidateId}`);
  },
  onboardCandidate: async (
    candidateId: number,
    payload: CandidateOnboardPayload,
  ): Promise<CandidateItem> => {
    const res = await api.post(`/hrm/candidates/${candidateId}/onboard`, payload);
    return res.data?.data || res.data;
  },
};

import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import TaskFormModal from "../../components/tasks/TaskFormModal";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

const STATUS_SECTIONS = [
  { key: "To Do", label: "To Do", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500", color: "#f59e0b" },
  { key: "In Progress", label: "In Progress", badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500", color: "#0ea5e9" },
  { key: "Done", label: "Done", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", color: "#22c55e" },
];

const PRIORITIES = ["Low", "Medium", "High"];

const normalizeResponse = (res) => {
  const payload = res?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

const formatDate = (value) => {
  if (!value) return "Không có hạn";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function DashboardPage() {
  const currentUser = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const isStaff = useMemo(() => Number(currentUser.role_id) === 3 || currentUser.role === "employee", [currentUser]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(() => Number(localStorage.getItem("active_project_id")) || 0);
  const [activeProjectName, setActiveProjectName] = useState(() => localStorage.getItem("active_project_name") || "Dự án");
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ todo: 0, in_progress: 0, done: 0, total: 0, progress_percent: 0 });
  const [filteredDepartmentId, setFilteredDepartmentId] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    project_id: Number(localStorage.getItem("active_project_id")) || "",
    assigned_employee_id: "",
    status: "To Do",
    priority: "Medium",
    deadline: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };
  
  const [clockInState, setClockInState] = useState(() => {
    const todayStr = new Date().toDateString();
    const stored = localStorage.getItem(`clock_in_${todayStr}`);
    return stored ? JSON.parse(stored) : { clockedIn: false, time: null };
  });

  const employeesById = useMemo(() => Object.fromEntries(employees.map(emp => [emp.id, emp])), [employees]);
  const departmentsById = useMemo(() => Object.fromEntries(departments.map(dept => [dept.id, dept])), [departments]);

  const projectTasks = useMemo(
    () => tasks.filter(task => Number(task.project_id) === Number(activeProjectId)),
    [tasks, activeProjectId]
  );

  const leaveStats = useMemo(() => {
    const userVacations = vacations.filter(v => Number(v.requested_by) === Number(currentUser.id));
    const pending = userVacations.filter(v => v.status === "Pending").length;
    const approvedAnnual = userVacations.filter(v => v.status === "Approved" && v.type === "Annual Leave");
    
    let takenDays = 0;
    approvedAnnual.forEach(v => {
      const start = new Date(v.start_date);
      const end = new Date(v.end_date);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      takenDays += Number.isNaN(diffDays) ? 0 : diffDays;
    });
    
    return {
      remaining: Math.max(0, 12 - takenDays),
      pending,
      taken: takenDays
    };
  }, [vacations, currentUser.id]);

  const upcomingDeadlines = useMemo(() => {
    return projectTasks
      .filter(t => t.status !== "Done" && t.deadline)
      .map(t => ({
        ...t,
        parsedDeadline: new Date(t.deadline)
      }))
      .sort((a, b) => a.parsedDeadline - b.parsedDeadline)
      .slice(0, 5);
  }, [projectTasks]);

  const visibleTasks = useMemo(
    () => projectTasks.filter(task => {
      if (filteredDepartmentId) {
        const employee = employeesById[task.assigned_to || task.created_by];
        if (employee?.department_id !== Number(filteredDepartmentId)) return false;
      }
      if (selectedStatusFilter && task.status !== selectedStatusFilter) return false;
      return true;
    }),
    [projectTasks, filteredDepartmentId, selectedStatusFilter, employeesById]
  );

  const statusSummary = useMemo(() => ({
    "To Do": 0,
    "In Progress": 0,
    "Done": 0,
    ...projectTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {}),
  }), [projectTasks]);

  const activeProject = useMemo(
    () => projects.find(project => project.id === activeProjectId) || {
      name: activeProjectName,
      description: "",
      progress_percent: projectTasks.length ? Math.round((statusSummary["Done"] / projectTasks.length) * 100) : 0,
    },
    [projects, activeProjectId, activeProjectName, projectTasks.length, statusSummary]
  );

  const statusChartData = useMemo(
    () => STATUS_SECTIONS.map((section) => ({
      name: section.label,
      value: statusSummary[section.key] || 0,
      color: section.color,
    })),
    [statusSummary]
  );

  const projectProgressData = useMemo(
    () => projects.map((project) => ({
      name: project.name,
      progress: project.progress_percent || 0,
      id: project.id,
    })),
    [projects]
  );

  const monthlyTrendData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const label = date.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" });
      return { label, count: 0 };
    });

    tasks.forEach((task) => {
      const taskDate = task.created_at ? new Date(task.created_at) : task.deadline ? new Date(task.deadline) : null;
      if (!taskDate || Number.isNaN(taskDate.getTime())) return;
      const monthLabel = taskDate.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" });
      const monthItem = months.find((item) => item.label === monthLabel);
      if (monthItem) monthItem.count += 1;
    });
    return months;
  }, [tasks]);

  const departmentPerformanceData = useMemo(() => {
    return departments.map((department) => ({
      name: department.name,
      count: tasks.reduce((acc, task) => {
        const assignee = employeesById[task.assigned_to || task.created_by];
        return acc + (assignee?.department_id === department.id ? 1 : 0);
      }, 0),
      id: department.id,
    })).sort((a, b) => b.count - a.count);
  }, [departments, employeesById, tasks]);

  const topEmployees = useMemo(() => {
    return employees
      .map((employee) => {
        const completed = tasks.reduce((count, task) => {
          const assigneeId = task.assigned_to || task.created_by;
          return count + (Number(assigneeId) === Number(employee.id) && task.status === "Done" ? 1 : 0);
        }, 0);
        return {
          ...employee,
          completed,
          departmentName: departmentsById[employee.department_id]?.name || "Không có",
        };
      })
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5);
  }, [departmentsById, employees, tasks]);

  const resetTaskForm = () => {
    setEditingTask(null);
    setTaskForm({
      title: "",
      description: "",
      project_id: activeProjectId || "",
      assigned_employee_id: "",
      status: "To Do",
      priority: "Medium",
      deadline: "",
    });
    setErrorMessage("");
  };

  const handleClockInOut = () => {
    showToast("Tính năng chấm công đang được phát triển.", "info");
  };

  const navigate = useNavigate();

  const loadWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      const [projectRes, taskRes, departmentRes, employeeRes, dashboardRes, vacationRes] = await Promise.all([
        api.get("/projects").catch(() => ({ data: [] })),
        isStaff ? api.get("/tasks/my-tasks").catch(() => ({ data: [] })) : api.get("/tasks").catch(() => ({ data: [] })),
        api.get("/departments").catch(() => ({ data: [] })),
        api.get("/employees").catch(() => ({ data: [] })),
        api.get("/dashboard/progress").catch(() => ({ data: {} })),
        api.get("/vacations").catch(() => ({ data: [] })),
      ]);

      const rawProjects = normalizeResponse(projectRes);
      const rawTasks = normalizeResponse(taskRes);
      const rawDepartments = normalizeResponse(departmentRes);
      const rawEmployees = normalizeResponse(employeeRes);
      const rawVacations = normalizeResponse(vacationRes);

      const enrichedProjects = rawProjects.map(project => {
        const counts = rawTasks.reduce(
          (acc, task) => {
            if (Number(task.project_id) !== Number(project.id)) return acc;
            acc.total += 1;
            if (task.status === "To Do") acc.todo += 1;
            if (task.status === "In Progress") acc.in_progress += 1;
            if (task.status === "Done") acc.done += 1;
            return acc;
          },
          { total: 0, todo: 0, in_progress: 0, done: 0 }
        );
        return {
          ...project,
          stats: counts,
          progress_percent: counts.total ? Math.round((counts.done / counts.total) * 100) : 0,
        };
      });

      setProjects(enrichedProjects);
      setTasks(rawTasks.map(task => ({ ...task, deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : "" })));
      setDepartments(rawDepartments);
      setEmployees(rawEmployees);
      setVacations(rawVacations);
      setDashboardStats(dashboardRes.data || { todo: 0, in_progress: 0, done: 0, total: 0, progress_percent: 0 });

      if (!activeProjectId && enrichedProjects.length) {
        const first = enrichedProjects[0];
        setActiveProjectId(first.id);
        setActiveProjectName(first.name);
        setTaskForm(prev => ({ ...prev, project_id: first.id }));
        localStorage.setItem("active_project_id", first.id);
        localStorage.setItem("active_project_name", first.name);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu Dashboard:", err);
      if (err.response?.status === 401) {
        localStorage.clear();
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    (async () => {
      await loadWorkspace();
    })();
  }, [loadWorkspace]);

  useEffect(() => {
    const handleStorage = () => {
      const nextProjectId = Number(localStorage.getItem("active_project_id"));
      const nextProjectName = localStorage.getItem("active_project_name") || "";
      if (nextProjectId) setActiveProjectId(nextProjectId);
      if (nextProjectName) setActiveProjectName(nextProjectName);
      setTaskForm(prev => ({ ...prev, project_id: nextProjectId || prev.project_id }));
    };

    window.addEventListener("storage_project_changed", handleStorage);
    return () => window.removeEventListener("storage_project_changed", handleStorage);
  }, []);

  const openCreateModal = () => {
    resetTaskForm();
    setIsTaskModalOpen(true);
  };


  const clearStatusFilter = () => setSelectedStatusFilter("");

  const openEditModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      project_id: task.project_id || activeProjectId || "",
      assigned_employee_id: task.assigned_to || task.created_by || "",
      status: task.status || "To Do",
      priority: task.priority || "Medium",
      deadline: task.deadline || "",
    });
    setErrorMessage("");
    setIsTaskModalOpen(true);
  };

  const handleTaskFormChange = (field, value) => {
    setTaskForm(prev => ({ ...prev, [field]: value }));
    if (field === "assigned_employee_id" && value) {
      const employee = employeesById[Number(value)];
      if (employee?.department_id) {
        setFilteredDepartmentId(String(employee.department_id));
      }
    }
  };

  const handleSubmitTask = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!taskForm.title.trim()) {
      setErrorMessage("Tiêu đề task là bắt buộc.");
      return;
    }
    if (!taskForm.project_id) {
      setErrorMessage("Task phải thuộc một dự án.");
      return;
    }
    if (!taskForm.assigned_employee_id) {
      setErrorMessage("Phải chọn nhân viên chịu trách nhiệm.");
      return;
    }

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      project_id: Number(taskForm.project_id),
      assigned_to: Number(taskForm.assigned_employee_id),
      status: taskForm.status,
      priority: taskForm.priority,
      deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : null,
    };

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, payload);
      } else {
        await api.post("/tasks", payload);
      }

      setIsTaskModalOpen(false);
      resetTaskForm();
      await loadWorkspace();
    } catch (err) {
      console.error("Lỗi lưu task:", err);
      setErrorMessage(err.response?.data?.detail || "Không thể lưu task. Vui lòng thử lại.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingTask) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      setErrorMessage("");
      await api.post(`/tasks/${editingTask.id}/attachments`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      const isStaff = Number(currentUser.role_id) === 3 || currentUser.role === "employee";
      const taskRes = await (isStaff ? api.get("/tasks/my-tasks") : api.get("/tasks"));
      const list = Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || [];
      const updatedTask = list.find(t => t.id === editingTask.id);
      if (updatedTask) {
        setEditingTask(updatedTask);
      }
      await loadWorkspace();
      alert("Nộp file thành công!");
    } catch (err) {
      console.error("Lỗi upload file:", err);
      setErrorMessage("Không thể nộp file.");
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài liệu đính kèm này?")) return;
    try {
      setErrorMessage("");
      await api.delete(`/tasks/${editingTask.id}/attachments/${attachmentId}`);
      const isStaff = Number(currentUser.role_id) === 3 || currentUser.role === "employee";
      const taskRes = await (isStaff ? api.get("/tasks/my-tasks") : api.get("/tasks"));
      const list = Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || [];
      const updatedTask = list.find(t => t.id === editingTask.id);
      if (updatedTask) {
        setEditingTask(updatedTask);
      }
      await loadWorkspace();
      alert("Xóa file thành công!");
    } catch (err) {
      console.error("Lỗi xóa file:", err);
      setErrorMessage("Không thể xóa file đính kèm.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Banner Skeleton */}
        <div className="rounded-[32px] bg-white border border-slate-100 p-8 h-64 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-4 w-32 bg-slate-100 rounded-md" />
            <div className="h-8 w-64 bg-slate-100 rounded-md" />
            <div className="h-4 w-full bg-slate-100 rounded-md" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-slate-50/50 border border-slate-50 rounded-2xl" />
            <div className="h-16 bg-slate-50/50 border border-slate-50 rounded-2xl" />
            <div className="h-16 bg-slate-50/50 border border-slate-50 rounded-2xl" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 bg-white border border-slate-100 rounded-[28px]" />
          <div className="h-28 bg-white border border-slate-100 rounded-[28px]" />
          <div className="h-28 bg-white border border-slate-100 rounded-[28px]" />
          <div className="h-28 bg-white border border-slate-100 rounded-[28px]" />
        </div>

        {/* Board Skeleton */}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="h-96 bg-white border border-slate-100 rounded-[32px]" />
          <div className="h-96 bg-white border border-slate-100 rounded-[32px]" />
          <div className="h-96 bg-white border border-slate-100 rounded-[32px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 🚀 BANNER HEADER CARD */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[32px] bg-white p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-50/60 blur-3xl -z-10" />
          
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Active Project Overview</p>
              <h1 className="mt-4 text-3xl font-extrabold text-slate-800 tracking-tight">{activeProject.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 font-medium">{activeProject.description || "Không có mô tả cho dự án này."}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STATUS_SECTIONS.map(section => (
              <div key={section.key} className="rounded-3xl border border-slate-50 bg-slate-50/50 p-5 group transition-all hover:bg-white hover:shadow-md hover:border-slate-100 flex flex-col justify-between min-h-[140px]">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${section.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${section.dot}`} />
                      {section.label}
                    </span>
                    <p className="mt-4 text-4xl font-extrabold text-slate-800 tracking-tight">{statusSummary[section.key] || 0}</p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100/80">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${section.key === "To Do" ? "bg-amber-500" : section.key === "In Progress" ? "bg-sky-500" : "bg-emerald-500"}`}
                    style={{ width: `${projectTasks.length ? ((statusSummary[section.key] || 0) / projectTasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK ACTIONS & ATTENDANCE PANEL */}
        <aside className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between gap-6 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-slate-50 blur-2xl -z-10" />
          
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-[0.24em] text-slate-400 font-bold">Quick Actions</h3>
            
            {/* Attendance Clock Widget */}
            <div className="rounded-3xl border border-slate-50 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold">ATTENDANCE STATUS</p>
                  <p className="text-sm font-extrabold text-slate-700 mt-1">
                    {clockInState.clockedIn ? `Checked In: ${clockInState.time}` : "Not Checked In Today"}
                  </p>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${clockInState.clockedIn ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              </div>
              <button 
                onClick={handleClockInOut}
                className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all ${clockInState.clockedIn ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                {clockInState.clockedIn ? "Clock Out (Rời ca)" : "Clock In (Điểm danh)"}
              </button>
            </div>

            <div className={currentUser.role === "admin" || currentUser.role === "manager" ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
              {(currentUser.role === "admin" || currentUser.role === "manager") && (
                <button onClick={openCreateModal} className="py-2.5 rounded-2xl text-xs font-bold text-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">+ Tạo task</button>
              )}
              <button onClick={() => navigate("/vacations")} className="py-2.5 rounded-2xl text-xs font-bold text-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">Xin nghỉ phép</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Workspace Department</label>
            <select value={filteredDepartmentId} onChange={(e) => setFilteredDepartmentId(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-700 outline-none">
              <option value="">Tất cả phòng ban</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </aside>
      </section>

      {/* 📊 HRM METRICS & WORKSPACE STATS */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Workspace Task Progress */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Workspace Tasks</p>
          <p className="mt-3 text-3xl font-black text-slate-800 tracking-tight">{dashboardStats.total}</p>
          <p className="mt-1 text-xs text-slate-400 font-medium">Across all projects</p>
        </div>

        {/* Completion rate */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Done / Completion Rate</p>
          <p className="mt-3 text-3xl font-black text-slate-800 tracking-tight">{dashboardStats.done} <span className="text-sm font-semibold text-slate-400">({dashboardStats.progress_percent}%)</span></p>
          <p className="mt-1 text-xs text-slate-400 font-medium">All completed tasks</p>
        </div>

        {/* Attendance Summary */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance This Month</p>
          <p className="mt-3 text-3xl font-black text-slate-800 tracking-tight">100%</p>
          <p className="mt-1 text-xs text-slate-400 font-medium">0 late check-ins</p>
        </div>

        {/* Leave Summary */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leave Balance</p>
          <p className="mt-3 text-3xl font-black text-slate-800 tracking-tight">{leaveStats.remaining} <span className="text-sm font-semibold text-slate-400">days left</span></p>
          <p className="mt-1 text-xs text-slate-400 font-medium">{leaveStats.pending} pending requests</p>
        </div>
      </section>

      {/* 🚀 UPCOMING DEADLINES & BEST PERFORMERS */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        
        {/* Left Widget: Upcoming Deadlines */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Sắp Hết Hạn Hoàn Thành</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Nhiệm vụ cần hoàn thành gấp trong dự án</p>
            </div>
          </div>

          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400 font-medium">Tuyệt vời! Không có nhiệm vụ nào sắp hết hạn.</div>
            ) : upcomingDeadlines.map(task => {
              const assignee = employeesById[task.assigned_to || task.created_by];
              const isOverdue = task.parsedDeadline < new Date();
              return (
                <div key={task.id} className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isOverdue ? "border-rose-100 bg-rose-50/20" : "border-slate-50 bg-slate-50/50"}`}>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-bold text-slate-700 truncate">{task.title}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">Phụ trách: {assignee?.full_name || "Chưa giao"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${isOverdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      {isOverdue ? "Quá hạn" : `Hạn: ${formatDate(task.deadline)}`}
                    </span>
                    <button onClick={() => openEditModal(task)} className="text-xs font-bold text-blue-600 hover:text-blue-700">Chi tiết</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Widget: Best Performers */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-800">Best Performers</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Thành viên hoàn thành nhiều task nhất</p>
          </div>
          <div className="mt-6 space-y-3">
            {topEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center gap-3 rounded-2xl border border-slate-50 bg-slate-50/30 p-3.5 hover:bg-slate-50/80 transition-all">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 overflow-hidden border border-slate-200">
                  {employee.avatar_url ? (
                    <img src={employee.avatar_url.startsWith("http") ? employee.avatar_url : `http://127.0.0.1:8001${employee.avatar_url}`} alt={employee.full_name} className="h-full w-full object-cover" />
                  ) : (
                    employee.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-700 truncate">{employee.full_name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">{employee.departmentName}</p>
                </div>
                <div className="ml-auto rounded-lg bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">{employee.completed} done</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 📊 CHARTS SECTION */}
      <section className="grid gap-6 xl:grid-cols-4">
        
        {/* Chart 1: Pie chart */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Tỷ lệ trạng thái công việc</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Phân bổ trạng thái trong dự án active</p>
            </div>
            {selectedStatusFilter && (
              <button onClick={clearStatusFilter} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all">Xóa bộ lọc</button>
            )}
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={88}
                  innerRadius={50}
                  paddingAngle={4}
                  onClick={(entry) => setSelectedStatusFilter(entry?.name || "")}
                >
                  {statusChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} style={{ cursor: "pointer" }} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}`, "Tasks"]} contentStyle={{ borderRadius: "16px", border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Trend */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-800">Task Creation Trend</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Xuương tạo task trong 6 tháng gần nhất</p>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9" }} />
                <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Department Tasks Bar chart */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-800">Công việc theo phòng ban</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Số lượng task được tạo cho từng bộ phận</p>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentPerformanceData} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9" }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 📋 WORKSPACE TASKS BOARD */}
      <section className="grid gap-6 xl:grid-cols-3">
        {STATUS_SECTIONS.map(section => (
          <div key={section.key} className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400 font-bold">{section.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-700">{visibleTasks.filter(task => task.status === section.key).length}</p>
              </div>
              <span className={`rounded-xl px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${section.badge}`}>{section.key}</span>
            </div>

            <div className="space-y-4">
              {visibleTasks.filter(task => task.status === section.key).map(task => {
                const assignee = employeesById[task.assigned_to || task.created_by];
                const department = departmentsById[assignee?.department_id];
                return (
                  <div key={task.id} className="rounded-[24px] border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:bg-white hover:border-slate-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden border border-slate-200 flex-shrink-0">
                          {assignee?.avatar_url ? (
                            <img src={assignee.avatar_url.startsWith("http") ? assignee.avatar_url : `http://127.0.0.1:8001${assignee.avatar_url}`} alt={assignee.full_name} className="h-full w-full object-cover" />
                          ) : (
                            assignee?.full_name?.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex h-2 w-2 rounded-full ${section.dot}`} />
                            <h3 className="text-xs font-bold text-slate-700 truncate">{task.title}</h3>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400 font-medium line-clamp-2">{task.description || "—"}</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => openEditModal(task)} 
                        title="Sửa" 
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 border border-slate-100/50 transition-all flex items-center justify-center flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"></path>
                        </svg>
                      </button>
                    </div>

                    <div className="mt-4 grid gap-1.5 text-[10px] text-slate-400 font-semibold sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-100/50 bg-white p-2">
                        <span className="text-slate-400 block text-[9px] uppercase">Priority</span>
                        <span className="text-slate-700 font-bold">{task.priority || "Medium"}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100/50 bg-white p-2">
                        <span className="text-slate-400 block text-[9px] uppercase">Employee</span>
                        <span className="text-slate-700 font-bold truncate block">{assignee?.full_name || "Unassigned"}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100/50 bg-white p-2">
                        <span className="text-slate-400 block text-[9px] uppercase">Department</span>
                        <span className="text-slate-700 font-bold truncate block">{department?.name || "Không có"}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100/50 bg-white p-2">
                        <span className="text-slate-400 block text-[9px] uppercase">Deadline</span>
                        <span className="text-slate-700 font-bold block">{formatDate(task.deadline)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!visibleTasks.filter(task => task.status === section.key).length && (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400 font-bold">Chưa có task ở cột này.</div>
              )}
            </div>
          </div>
        ))}
      </section>

      <TaskFormModal
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={editingTask}
        onSave={loadWorkspace}
        projects={projects}
        employees={employees}
        departments={departments}
      />

      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[999] flex items-center gap-3 rounded-2xl bg-sky-600 px-5 py-3 text-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

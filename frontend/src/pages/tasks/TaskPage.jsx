import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../api/axios";
import TaskFormModal from "../../components/tasks/TaskFormModal";

const STATUS_ORDER = ["To Do", "In Progress", "Done"];

const STATUS_CONFIG = {
  "To Do":      { dot: "bg-amber-400",   pill: "bg-amber-50 text-amber-700 border border-amber-200/60",   colBg: "bg-amber-50/40",   colBorder: "border-amber-100" },
  "In Progress":{ dot: "bg-sky-500",     pill: "bg-sky-50 text-sky-700 border border-sky-200/60",         colBg: "bg-sky-50/40",     colBorder: "border-sky-100"   },
  "Done":       { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border border-emerald-200/60", colBg: "bg-emerald-50/40", colBorder: "border-emerald-100" },
};

const PRIORITY_BADGE = {
  High:   "bg-rose-50 text-rose-700 border border-rose-200/60",
  Medium: "bg-amber-50 text-amber-700 border border-amber-200/60",
  Low:    "bg-slate-50 text-slate-600 border border-slate-200",
};

export default function TaskPage() {
  const currentUser = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const isStaff = Number(currentUser.role_id) === 3 || currentUser.role === "employee";
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [error, setError] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      const [taskRes, projectRes, employeeRes, deptRes] = await Promise.all([
        isStaff ? api.get("/tasks/my-tasks").catch(() => ({ data: [] })) : api.get("/tasks").catch(() => ({ data: [] })),
        api.get("/projects").catch(() => ({ data: [] })),
        api.get("/employees").catch(() => ({ data: [] })),
        api.get("/departments").catch(() => ({ data: [] })),
      ]);
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || []);
      setProjects(Array.isArray(projectRes.data) ? projectRes.data : projectRes.data?.data || []);
      setEmployees(Array.isArray(employeeRes.data) ? employeeRes.data : employeeRes.data?.data || []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.data || []);
    } catch (err) {
      console.error("Lỗi tải nhiệm vụ:", err);
      setError("Không thể tải dữ liệu nhiệm vụ.");
    }
  }, [isStaff]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      setError("");
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      await fetchTasks();
      window.dispatchEvent(new Event("storage_project_changed"));
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái task:", err);
      setError("Không thể cập nhật trạng thái nhiệm vụ.");
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterDepartment === "all") return true;
      const assignedTo = task.assigned_to;
      const employee = employees.find((emp) => Number(emp.id) === Number(assignedTo));
      return employee?.department_id === Number(filterDepartment);
    });
  }, [tasks, employees, filterDepartment]);

  const grouped = useMemo(() => {
    return STATUS_ORDER.reduce((acc, status) => {
      acc[status] = filteredTasks.filter((task) => task.status === status || (status === "To Do" && !task.status));
      return acc;
    }, {});
  }, [filteredTasks]);

  const getProject = (task) => projects.find((p) => Number(p.id) === Number(task.project_id));
  const getEmployee = (task) => employees.find((e) => Number(e.id) === Number(task.assigned_to));
  const getDepartment = (employee) => departments.find((d) => Number(d.id) === Number(employee?.department_id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi trạng thái công việc theo Kanban và phòng ban.</p>
        </div>
        <div className="flex items-center gap-3">
          {(currentUser.role === "admin" || currentUser.role === "manager") && (
            <button
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              + Tạo Task
            </button>
          )}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 shadow-sm transition"
          >
            <option value="all">Tất cả phòng ban</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {/* Color legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3 shadow-sm">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">Trạng thái:</span>
        {STATUS_ORDER.map((status) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <span key={status} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
              {status}
            </span>
          );
        })}
        <span className="ml-auto text-[11px] font-bold text-slate-400">Màu cột = trạng thái task</span>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-4 xl:grid-cols-3">
        {STATUS_ORDER.map((status) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className={`rounded-3xl border ${cfg.colBorder} ${cfg.colBg} p-5 space-y-4`}>
              {/* Column header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${cfg.dot}`} />
                  <h2 className="text-sm font-bold text-slate-800">{status}</h2>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-white/70 border border-slate-100 px-2 py-0.5 rounded-full">
                  {grouped[status]?.length || 0}
                </span>
              </div>

              {/* Task cards */}
              <div className="space-y-3">
                {(!grouped[status] || grouped[status].length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-xs text-slate-400 font-medium">
                    — Chưa có task —
                  </div>
                ) : (
                  grouped[status].map((task) => {
                    const project = getProject(task);
                    const employee = getEmployee(task);
                    const department = getDepartment(employee);
                    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done";
                    return (
                      <div
                        key={task.id}
                        onClick={() => {
                          setEditingTask(task);
                          setIsTaskModalOpen(true);
                        }}
                        className="rounded-2xl border border-white bg-white shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        {/* Task title & status pill (same design across all statuses) */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-800 leading-snug flex-1">{task.title || task.name || "Untitled task"}</h3>
                          <select
                            value={task.status || "To Do"}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleUpdateTaskStatus(task.id, e.target.value);
                            }}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border outline-none cursor-pointer ${cfg.pill}`}
                          >
                            <option value="To Do" className="bg-white text-slate-800">To Do</option>
                            <option value="In Progress" className="bg-white text-slate-800">In Progress</option>
                            <option value="Done" className="bg-white text-slate-800">Done</option>
                          </select>
                        </div>

                        <p className="text-[11px] text-slate-400 font-medium truncate" title={project?.name}>{project?.name || "—"}</p>

                        <div className="pt-2 border-t border-slate-50 space-y-1.5 text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span className="truncate font-medium text-slate-600" title={employee?.full_name}>{employee?.full_name || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            <span className="truncate" title={department?.name}>{department?.name || "—"}</span>
                          </div>
                        </div>

                        {/* Priority + Deadline row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE["Medium"]}`}>
                            {task.priority || "Medium"}
                          </span>
                          <span className={`text-[10px] font-semibold ${isOverdue ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                            {task.deadline ? new Date(task.deadline).toLocaleDateString("vi-VN") : "—"}
                            {isOverdue && " ⚠ Quá hạn"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskFormModal
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={editingTask}
        onSave={fetchTasks}
        projects={projects}
        employees={employees}
        departments={departments}
      />
    </div>
  );
}

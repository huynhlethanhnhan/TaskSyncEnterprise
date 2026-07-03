import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { 
  Clock, CheckCircle2, Inbox, User, Briefcase, Calendar, 
  DollarSign, AlertCircle, Sparkles, FolderKanban, ShieldAlert
} from "lucide-react";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const [projectRes, tasksRes, employeesRes, departmentsRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get("/tasks").catch(() => ({ data: [] })),
          api.get("/employees").catch(() => ({ data: [] })),
          api.get("/departments").catch(() => ({ data: [] })),
        ]);
        setProject(projectRes.data);
        setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.data || []);
        setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : employeesRes.data?.data || []);
        setDepartments(Array.isArray(departmentsRes.data) ? departmentsRes.data : departmentsRes.data?.data || []);
      } catch (err) {
        console.error("Lỗi lấy thông tin dự án:", err);
        setError("Không thể tải thông tin dự án.");
      } finally {
        setLoading(false);
      }
    };
    fetchProjectDetails();
  }, [id]);

  const employeesById = useMemo(() => Object.fromEntries(employees.map(emp => [emp.id, emp])), [employees]);
  const departmentsById = useMemo(() => Object.fromEntries(departments.map(dept => [dept.id, dept])), [departments]);

  const projectTasks = useMemo(() => {
    return tasks.filter((task) => Number(task.project_id) === Number(id));
  }, [tasks, id]);

  const counts = useMemo(() => {
    return projectTasks.reduce(
      (acc, task) => {
        acc.total += 1;
        if (task.status === "To Do") acc.todo += 1;
        if (task.status === "In Progress") acc.in_progress += 1;
        if (task.status === "Done") acc.done += 1;
        
        const now = new Date();
        const deadline = task.deadline ? new Date(task.deadline) : null;
        if (deadline && task.status !== "Done" && deadline < now) {
          acc.overdue += 1;
        }
        return acc;
      },
      { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 }
    );
  }, [projectTasks]);

  const members = useMemo(() => {
    // Get unique employee IDs from tasks of this project
    const memberIds = new Set(projectTasks.map(t => Number(t.assigned_to || t.created_by)).filter(Boolean));
    return employees.filter(emp => memberIds.has(Number(emp.id)));
  }, [employees, projectTasks]);

  const progressPercent = useMemo(() => {
    return counts.total ? Math.round((counts.done / counts.total) * 100) : 0;
  }, [counts]);

  if (loading) return <div className="p-8 text-slate-500 font-medium">Đang tải chi tiết dự án...</div>;
  if (error || !project) return <div className="p-8 text-rose-600 font-bold">{error || "Không tìm thấy dự án."}</div>;

  return (
    <div className="space-y-6">
      
      {/* 🚀 HEADER SUMMARY BANNER */}
      <div className="relative rounded-[32px] overflow-hidden border border-slate-100 bg-white p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-50/60 blur-3xl -z-10" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><FolderKanban size={18} /></span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{project.name}</h1>
            </div>
            <p className="text-sm text-slate-500 font-medium max-w-2xl">{project.description || "Không có mô tả cho dự án này."}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-100/50">
                Code: {project.project_code || `PRJ${project.id}`}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                project.priority === "High" ? "bg-rose-50 text-rose-600 border-rose-100/50" : "bg-slate-50 text-slate-500 border-slate-100"
              }`}>
                Priority: {project.priority || "Medium"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500 border border-slate-100">
                Status: {project.status || "Planning"}
              </span>
            </div>
          </div>
          <button onClick={() => navigate(-1)} className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 transition-all cursor-pointer shadow-xs self-start sm:self-auto">
            Quay lại
          </button>
        </div>
      </div>

      {/* 📊 SUMMARY STATISTICS */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tổng số task", value: counts.total, icon: <Inbox className="h-4 w-4 text-blue-500" /> },
          { label: "Tiến độ dự án", value: `${progressPercent}%`, icon: <Sparkles className="h-4 w-4 text-indigo-500" /> },
          { label: "Thành viên", value: members.length, icon: <User className="h-4 w-4 text-purple-500" /> },
          { label: "Task quá hạn", value: counts.overdue, icon: <ShieldAlert className="h-4 w-4 text-rose-500" /> },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1.5">
              {item.icon} {item.label}
            </p>
            <p className="mt-3 text-3xl font-black text-slate-700">{item.value}</p>
          </div>
        ))}
      </div>

      {/* 🏢 MAIN SECTIONS SPLIT */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        
        {/* Left Column: Kanban task board */}
        <div className="space-y-6">
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-4 mb-6">Bảng công việc dự án (Kanban)</h2>
            
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { key: "To Do", label: "To Do", badge: "bg-amber-50 text-amber-600 border border-amber-100/50", dot: "bg-amber-500" },
                { key: "In Progress", label: "In Progress", badge: "bg-sky-50 text-sky-600 border border-sky-100/50", dot: "bg-sky-500" },
                { key: "Done", label: "Done", badge: "bg-emerald-50 text-emerald-600 border border-emerald-100/50", dot: "bg-emerald-500" },
              ].map(col => {
                const colTasks = projectTasks.filter(t => t.status === col.key);
                return (
                  <div key={col.key} className="rounded-2xl border border-slate-50 bg-slate-50/20 p-4 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                        {col.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                    </div>

                    <div className="space-y-3">
                      {colTasks.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-150 bg-slate-50/30 p-6 text-center text-[10px] text-slate-400 font-bold">Chưa có task</div>
                      ) : colTasks.map(task => {
                        const assignee = employeesById[task.assigned_to || task.created_by];
                        return (
                          <div key={task.id} className="rounded-xl border border-slate-50 bg-white p-3.5 shadow-sm hover:shadow-md transition-all">
                            <p className="text-xs font-bold text-slate-700 truncate">{task.title}</p>
                            <p className="mt-1 text-[10px] text-slate-400 line-clamp-2">{task.description || "Không có mô tả."}</p>
                            <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-slate-50 pt-2.5">
                              <span className="text-[9px] font-bold text-slate-400">Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString("vi-VN") : "N/A"}</span>
                              <div className="h-6 w-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center border border-slate-200 overflow-hidden" title={assignee?.full_name}>
                                {assignee?.avatar_url ? (
                                  <img src={assignee.avatar_url.startsWith("http") ? assignee.avatar_url : `http://127.0.0.1:8001${assignee.avatar_url}`} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                  assignee?.full_name?.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Members list, Budget, Timeline details */}
        <div className="space-y-6">
          
          {/* Card 4: Project Details */}
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-4 mb-4">Chi tiết dự án</h2>
            <div className="space-y-3.5 text-xs font-medium text-slate-600">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={13} /> Ngày bắt đầu</span>
                <span className="text-slate-700 font-bold">{project.start_date ? new Date(project.start_date).toLocaleDateString("vi-VN") : "Chưa xác định"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={13} /> Ngày kết thúc</span>
                <span className="text-slate-700 font-bold">{project.end_date ? new Date(project.end_date).toLocaleDateString("vi-VN") : "Chưa xác định"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span className="text-slate-400 flex items-center gap-1.5"><DollarSign size={13} /> Ngân sách</span>
                <span className="text-slate-700 font-bold">${project.budget?.toLocaleString() || "0"}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-slate-400 flex items-center gap-1.5"><Briefcase size={13} /> Trạng thái</span>
                <span className="text-slate-700 font-bold">{project.status || "Planning"}</span>
              </div>
            </div>
          </div>

          {/* Card 5: Project Team Members */}
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-4 mb-4 flex items-center gap-2">
              <User size={16} className="text-purple-500" /> Thành viên ({members.length})
            </h2>
            <div className="space-y-3">
              {members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400 font-bold">Chưa có thành viên nào trong dự án.</div>
              ) : members.map(member => {
                const dept = departmentsById[member.department_id];
                return (
                  <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-50 bg-slate-50/20 p-3 hover:bg-slate-50 transition-all cursor-pointer" onClick={() => navigate(`/employees/${member.id}`)}>
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden border border-slate-200 flex-shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url.startsWith("http") ? member.avatar_url : `http://127.0.0.1:8001${member.avatar_url}`} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        member.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700 truncate">{member.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{member.job_title || "Nhân viên"}{dept ? ` · ${dept.name}` : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

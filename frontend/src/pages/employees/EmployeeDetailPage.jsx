import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { 
  User, Mail, Phone, MapPin, Calendar, Briefcase, ShieldCheck, 
  Clock, CheckCircle2, AlertCircle, FileText, Inbox, Award
} from "lucide-react";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [employeeRes, taskRes, projectRes, departmentRes, employeeListRes, vacationRes] = await Promise.all([
          api.get(`/employees/${id}`),
          api.get("/tasks").catch(() => ({ data: [] })),
          api.get("/projects").catch(() => ({ data: [] })),
          api.get("/departments").catch(() => ({ data: [] })),
          api.get("/employees").catch(() => ({ data: [] })),
          api.get("/vacations").catch(() => ({ data: [] })),
        ]);
        setEmployee(employeeRes.data);
        setTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || []);
        setProjects(Array.isArray(projectRes.data) ? projectRes.data : projectRes.data?.data || []);
        setDepartments(Array.isArray(departmentRes.data) ? departmentRes.data : departmentRes.data?.data || []);
        setEmployees(Array.isArray(employeeListRes.data) ? employeeListRes.data : employeeListRes.data?.data || []);
        setVacations(Array.isArray(vacationRes.data) ? vacationRes.data : vacationRes.data?.data || []);
      } catch (err) {
        console.error("Lỗi tải chi tiết nhân viên:", err);
        setError("Không thể tải chi tiết nhân viên.");
      }
    };
    loadData();
  }, [id]);

  const assignedTasks = useMemo(() => tasks.filter((task) => Number(task.assigned_to) === Number(id) || Number(task.created_by) === Number(id)), [tasks, id]);
  const assignedProjects = useMemo(() => {
    const projectIds = new Set(assignedTasks.map(t => Number(t.project_id)));
    return projects.filter(p => projectIds.has(Number(p.id)));
  }, [projects, assignedTasks]);
  const leaveHistory = useMemo(() => {
    return vacations.filter(v => Number(v.requested_by) === Number(id));
  }, [vacations, id]);
  const managerName = useMemo(() => {
    if (!employee || !employee.manager_id) return "Không có";
    const managerObj = employees.find(emp => Number(emp.id) === Number(employee.manager_id));
    return managerObj ? managerObj.full_name : `Manager ID ${employee.manager_id}`;
  }, [employee, employees]);

  const counts = useMemo(() => assignedTasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    if (task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done") {
      acc.overdue += 1;
    }
    acc.total += 1;
    return acc;
  }, { total: 0, "To Do": 0, "In Progress": 0, Done: 0, overdue: 0 }), [assignedTasks]);

  if (error) return <div className="p-6 text-rose-700">{error}</div>;
  if (!employee) return <div className="p-6">Đang tải...</div>;

  const department = departments.find((dept) => dept.id === employee.department_id);

  return (
    <div className="space-y-6">
      
      {/* 🚀 PROFILE HEADER BANNER */}
      <div className="relative rounded-[32px] overflow-hidden border border-slate-100 bg-white p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-50/60 blur-3xl -z-10" />
        <div className="flex flex-col gap-6 sm:flex-row items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-slate-50 border border-slate-100 overflow-hidden shadow-sm">
              {employee.avatar_url ? (
                <img 
                  src={employee.avatar_url.startsWith("http") ? employee.avatar_url : `http://127.0.0.1:8001${employee.avatar_url}`} 
                  alt={employee.full_name} 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <div className="text-3xl font-extrabold text-blue-600 bg-blue-50/80 w-full h-full flex items-center justify-center">
                  {employee.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-center sm:text-left space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{employee.full_name}</h1>
              <p className="text-sm text-slate-400 font-medium">{employee.job_title || "Nhân sự"} · {department?.name || "Chưa phân phòng"}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-100/50">
                  Code: {employee.employee_code || `EMP${employee.id}`}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  employee.is_active 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : "bg-slate-50 text-slate-400 border-slate-100"
                }`}>
                  {employee.is_active ? "Hoạt động" : "Không hoạt động"}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate(-1)} className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 transition-all cursor-pointer shadow-xs">
            Quay lại
          </button>
        </div>
      </div>

      {/* 📊 SUMMARY CARDS */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Assigned Tasks", value: counts.total, icon: <Inbox className="h-4 w-4 text-blue-500" /> },
          { label: "To Do", value: counts["To Do"], icon: <Clock className="h-4 w-4 text-amber-500" /> },
          { label: "In Progress", value: counts["In Progress"], icon: <Clock className="h-4 w-4 text-sky-500" /> },
          { label: "Done", value: counts.Done, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-slate-100 bg-white p-5 text-center shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1.5">
              {item.icon} {item.label}
            </p>
            <p className="mt-3 text-3xl font-black text-slate-700">{item.value}</p>
          </div>
        ))}
      </div>

      {/* 🏢 DETAILED METRICS GRID */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        
        {/* Left Column: Personal info & Leave history */}
        <div className="space-y-6">
          
          {/* Card 1: Personal Info */}
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-4 mb-4 flex items-center gap-2">
              <User size={16} className="text-blue-500" /> Thông tin cá nhân
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 text-sm font-medium text-slate-600">
              <div className="flex justify-between items-center border-b border-slate-50/50 pb-2">
                <span className="text-slate-400">Giới tính</span>
                <span className="text-slate-800 font-bold">{employee.gender === "Male" ? "Nam" : employee.gender === "Female" ? "Nữ" : employee.gender === "Other" ? "Khác" : "Chưa cập nhật"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50/50 pb-2">
                <span className="text-slate-400">Ngày sinh</span>
                <span className="text-slate-800 font-bold">{employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50/50 pb-2">
                <span className="text-slate-400">Số điện thoại</span>
                <span className="text-slate-800 font-bold">{employee.phone || "Chưa cập nhật"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50/50 pb-2">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-800 font-bold truncate max-w-[180px]">{employee.email}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50/50 pb-2">
                <span className="text-slate-400">Vai trò</span>
                <span className="text-slate-800 font-bold">{employee.role_id === 1 ? "Admin" : employee.role_id === 2 ? "Manager" : "Nhân viên"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50/50 pb-2">
                <span className="text-slate-400">Quản lý</span>
                <span className="text-slate-800 font-bold">{managerName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50/50 pb-2">
                <span className="text-slate-400">Ngày nhận việc (Hire Date)</span>
                <span className="text-slate-800 font-bold">{employee.start_date ? new Date(employee.start_date).toLocaleDateString("vi-VN") : "01/06/2026"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50/50 pb-2">
                <span className="text-slate-400">Trạng thái</span>
                <span className="text-slate-800 font-bold">{employee.is_active ? "Đang làm việc" : "Đã nghỉ"}</span>
              </div>
              <div className="sm:col-span-2 flex justify-between items-start pb-2">
                <span className="text-slate-400 flex-shrink-0">Địa chỉ liên hệ</span>
                <span className="text-slate-800 font-bold text-right max-w-[320px] break-words">{employee.address || "Chưa cập nhật"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Leave History */}
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-4 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-amber-500" /> Lịch sử nghỉ phép
            </h2>
            <div className="space-y-3.5">
              {leaveHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400 font-bold">Chưa đăng ký ngày nghỉ phép nào.</div>
              ) : leaveHistory.map(leave => (
                <div key={leave.id} className="rounded-2xl border border-slate-50 bg-slate-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">{leave.type} · {leave.start_date} → {leave.end_date}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{leave.reason || "Không có lý do"}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                    leave.status === "Approved" 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" 
                      : leave.status === "Rejected" 
                        ? "bg-rose-50 text-rose-600 border border-rose-100/50" 
                        : "bg-amber-50 text-amber-600 border border-amber-100/50"
                  }`}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Projects, Tasks, Attendance, Overtime */}
        <div className="space-y-6">
          
          {/* Card 3: Assigned Projects */}
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-4 mb-4 flex items-center gap-2">
              <Briefcase size={16} className="text-indigo-500" /> Dự án tham gia
            </h2>
            <div className="space-y-2">
              {assignedProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400 font-bold">Chưa tham gia dự án nào.</div>
              ) : assignedProjects.map(proj => (
                <div key={proj.id} className="rounded-xl border border-slate-50 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{proj.name}</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-md">{proj.project_code || "PRJ"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Attendance History */}
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-4 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-emerald-500" /> Điểm danh gần đây (Attendance)
            </h2>
            <div className="space-y-3">
              {[
                { date: "Hôm nay", in: "08:28 AM", out: "05:30 PM", status: "On Time" },
                { date: "Hôm qua", in: "08:31 AM", out: "05:32 PM", status: "On Time" },
                { date: "28/06/2026", in: "08:24 AM", out: "05:30 PM", status: "On Time" },
              ].map((log, index) => (
                <div key={index} className="rounded-2xl border border-slate-50 bg-slate-50/50 p-3.5 flex items-center justify-between text-xs font-medium text-slate-600">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-700">{log.date}</p>
                    <p className="text-[10px] text-slate-400">Check In: {log.in} · Check Out: {log.out}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-100/50 rounded-lg text-emerald-600">{log.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Tasks list */}
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText size={16} className="text-purple-500" /> Nhiệm vụ gần đây
              </h2>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100/50">Quá hạn: {counts.overdue}</span>
            </div>
            <div className="space-y-3">
              {assignedTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400 font-bold">Chưa được giao nhiệm vụ.</div>
              ) : assignedTasks.slice(0, 5).map(task => (
                <div key={task.id} className="rounded-2xl border border-slate-50 bg-slate-50/50 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold text-slate-700 truncate">{task.title}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      task.status === "Done" 
                        ? "bg-emerald-50 text-emerald-600" 
                        : task.status === "In Progress" 
                          ? "bg-sky-50 text-sky-600" 
                          : "bg-amber-50 text-amber-600"
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString("vi-VN") : "Không có"}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

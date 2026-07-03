import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";

export default function DepartmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDepartment = async () => {
      try {
        const [deptRes, empRes, taskRes, projectRes] = await Promise.all([
          api.get(`/departments/${id}`),
          api.get("/employees").catch(() => ({ data: [] })),
          api.get("/tasks").catch(() => ({ data: [] })),
          api.get("/projects").catch(() => ({ data: [] })),
        ]);
        setDepartment(Array.isArray(deptRes.data) ? null : deptRes.data);
        setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || []);
        setTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || []);
        setProjects(Array.isArray(projectRes.data) ? projectRes.data : projectRes.data?.data || []);
      } catch (err) {
        console.error("Lỗi tải chi tiết phòng ban:", err);
        setError("Không thể tải chi tiết phòng ban.");
      }
    };
    loadDepartment();
  }, [id]);

  const employeesInDept = useMemo(() => employees.filter((emp) => emp.department_id === Number(id)), [employees, id]);
  const employeeIds = useMemo(() => new Set(employeesInDept.map((emp) => emp.id)), [employeesInDept]);
  const tasksInDept = useMemo(() => tasks.filter((task) => employeeIds.has(Number(task.created_by))), [tasks, employeeIds]);
  const taskCounts = useMemo(() => tasksInDept.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    if (task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done") {
      acc.overdue += 1;
    }
    return acc;
  }, { "To Do": 0, "In Progress": 0, Done: 0, overdue: 0 }), [tasksInDept]);

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!department) {
    return <div className="p-6">Đang tải...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{department.name}</h1>
          <p className="mt-2 text-sm text-slate-500">{department.description || "—"}</p>
        </div>
        <button onClick={() => navigate(-1)} className="rounded-3xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">Quay lại</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { title: "Nhân sự", value: employeesInDept.length },
          { title: "Tasks To Do", value: taskCounts["To Do"] },
          { title: "In Progress", value: taskCounts["In Progress"] },
          { title: "Done", value: taskCounts.Done },
        ].map((item) => (
          <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.title}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Nhân sự</h2>
            <p className="mt-1 text-sm text-slate-500">Danh sách nhân viên thuộc phòng ban.</p>
          </div>
          <p className="text-sm text-slate-500">{employeesInDept.length} nhân viên</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {employeesInDept.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-500 text-center font-medium">—</div>
          ) : employeesInDept.map((employee) => (
            <div key={employee.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{employee.full_name}</p>
              <p className="mt-1 text-sm text-slate-500">{employee.email}</p>
              <p className="mt-2 text-sm text-slate-600">Vai trò: {employee.role_id || "N/A"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tasks liên quan</h2>
            <p className="mt-1 text-sm text-slate-500">Công việc được giao cho nhân viên trong phòng ban.</p>
          </div>
          <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Quá hạn: {taskCounts.overdue}</div>
        </div>

        <div className="space-y-4">
          {tasksInDept.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-500 text-center font-medium">—</div>
          ) : tasksInDept.map((task) => {
            const project = projects.find((proj) => Number(proj.id) === Number(task.project_id));
            return (
              <div key={task.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{project?.name || "Không xác định"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${task.status === "To Do" ? "bg-amber-100 text-amber-700" : task.status === "In Progress" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>{task.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span>Priority: {task.priority || "Medium"}</span>
                  <span>Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString("vi-VN") : "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

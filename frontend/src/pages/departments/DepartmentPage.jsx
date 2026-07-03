import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import DepartmentFormModal from "./DepartmentFormModal";

export default function DepartmentPage() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [deptRes, empRes, taskRes] = await Promise.all([
        api.get("/departments"),
        api.get("/employees").catch(() => ({ data: [] })),
        api.get("/tasks").catch(() => ({ data: [] })),
      ]);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.data || []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || []);
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || []);
    } catch (err) {
      console.error("Lỗi tải phòng ban:", err);
      setError("Không thể tải dữ liệu phòng ban.");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleCreate = () => {
    setSelectedDepartment(null);
    setIsModalOpen(true);
  };

  const handleEdit = (department) => {
    setSelectedDepartment(department);
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedDepartment) {
        await api.put(`/departments/${selectedDepartment.id}`, data);
      } else {
        await api.post("/departments", data);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Lỗi lưu phòng ban:", err);
      setError("Không thể lưu phòng ban. Vui lòng thử lại.");
    }
  };

  const handleDelete = async (departmentId) => {
    if (!window.confirm("Xóa phòng ban này?")) return;
    try {
      await api.delete(`/departments/${departmentId}`);
      loadData();
    } catch (err) {
      console.error("Lỗi xóa phòng ban:", err);
      setError("Không thể xóa phòng ban.");
    }
  };

  const enriched = useMemo(() => {
    return departments.map((department) => {
      const departmentEmployees = employees.filter((emp) => emp.department_id === department.id);
      const employeeIds = new Set(departmentEmployees.map((emp) => emp.id));
      const departmentTasks = tasks.filter((task) => employeeIds.has(Number(task.created_by)));
      const manager = departmentEmployees.find((emp) => emp.role_id === 2 || emp.role_id === 3);
      return {
        ...department,
        employeeCount: departmentEmployees.length,
        taskCount: departmentTasks.length,
        managerName: manager?.full_name || "—",
      };
    });
  }, [departments, employees, tasks]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Phòng ban</h1>
          <p className="mt-2 text-sm text-slate-500">Quản lý phòng ban, nhân sự và công việc liên quan.</p>
        </div>
        <button onClick={handleCreate} className="rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Tạo phòng ban</button>
      </div>

      {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        {enriched.map((department) => (
          <div key={department.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900 truncate" title={department.name}>{department.name}</h2>
                <p className="mt-2 text-sm text-slate-500 truncate">{department.description || "—"}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button 
                  onClick={() => handleEdit(department)} 
                  title="Chỉnh sửa" 
                  className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button 
                  onClick={() => handleDelete(department.id)} 
                  title="Xóa" 
                  className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-slate-600">
              <div className="rounded-3xl bg-slate-50 p-4">Nhân sự: <span className="font-semibold text-slate-900">{department.employeeCount}</span></div>
              <div className="rounded-3xl bg-slate-50 p-4">Công việc: <span className="font-semibold text-slate-900">{department.taskCount}</span></div>
              <div className="rounded-3xl bg-slate-50 p-4">Quản lý: <span className="font-semibold text-slate-900">{department.managerName}</span></div>
            </div>
            <Link to={`/departments/${department.id}`} className="mt-6 inline-flex items-center justify-center rounded-3xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">Xem chi tiết</Link>
          </div>
        ))}
      </div>

      <DepartmentFormModal open={isModalOpen} department={selectedDepartment} onClose={() => setIsModalOpen(false)} onSave={handleSave} />
    </div>
  );
}

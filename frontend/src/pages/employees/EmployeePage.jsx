import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import EmployeeFormModal from "./EmployeeFormModal";
import { Link } from "react-router-dom";

export default function EmployeePage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [employeeRes, departmentRes, roleRes] = await Promise.all([
        api.get("/employees").catch(() => ({ data: [] })),
        api.get("/departments").catch(() => ({ data: [] })),
        api.get("/roles").catch(() => ({ data: [] })),
      ]);
      setEmployees(Array.isArray(employeeRes.data) ? employeeRes.data : employeeRes.data?.data || []);
      setDepartments(Array.isArray(departmentRes.data) ? departmentRes.data : departmentRes.data?.data || []);
      setRoles(Array.isArray(roleRes.data) ? roleRes.data : roleRes.data?.data || []);
    } catch (err) {
      console.error("Lỗi tải nhân sự:", err);
      setError("Không thể tải dữ liệu nhân sự.");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const managers = useMemo(() => employees.filter((emp) => emp.role_id && emp.role_id !== undefined), [employees]);

  const handleCreate = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedEmployee) {
        await api.put(`/employees/${selectedEmployee.id}`, {
          full_name: data.full_name,
          email: data.email,
          department_id: data.department_id || null,
          role_id: data.role_id || null,
          manager_id: data.manager_id || null,
          job_title: data.job_title,
          is_active: data.is_active,
        });
      } else {
        await api.post("/employees", {
          employee_code: `EMP${Date.now().toString().slice(-4)}`,
          ...data,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Lỗi lưu nhân viên:", err);
      setError("Không thể lưu nhân viên.");
    }
  };

  const handleDelete = async (employee) => {
    if (!window.confirm(`Xóa nhân viên ${employee.full_name}?`)) return;
    try {
      await api.delete(`/employees/${employee.id}`);
      loadData();
    } catch (err) {
      console.error("Lỗi xóa nhân viên:", err);
      setError("Không thể xóa nhân viên.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Nhân viên</h1>
          <p className="mt-2 text-sm text-slate-500">Quản lý danh sách nhân sự và thông tin chi tiết.</p>
        </div>
        <button onClick={handleCreate} className="rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Thêm nhân viên</button>
      </div>

      {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm table-fixed">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 w-[80px]">Avatar</th>
                <th className="px-6 py-4 w-[150px]">Họ tên</th>
                <th className="px-6 py-4 w-[200px]">Email</th>
                <th className="px-6 py-4 w-[160px]">Phòng ban</th>
                <th className="px-6 py-4 w-[120px]">Vai trò</th>
                <th className="px-6 py-4 w-[130px]">Trạng thái</th>
                <th className="px-6 py-4 w-[130px]">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const department = departments.find((dept) => dept.id === employee.department_id);
                const role = roles.find((roleItem) => roleItem.id === employee.role_id);
                return (
                  <tr key={employee.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden border border-slate-200 flex-shrink-0">
                          {employee.avatar_url ? (
                            <img src={employee.avatar_url.startsWith("http") ? employee.avatar_url : `http://127.0.0.1:8001${employee.avatar_url}`} alt={employee.full_name} className="h-full w-full object-cover" />
                          ) : (
                            employee.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top truncate max-w-[150px]" title={employee.full_name}>{employee.full_name}</td>
                    <td className="px-6 py-4 align-top truncate max-w-[200px]" title={employee.email}>{employee.email}</td>
                    <td className="px-6 py-4 align-top truncate max-w-[160px]" title={department?.name || "—"}>{department?.name || "—"}</td>
                    <td className="px-6 py-4 align-top truncate max-w-[120px]" title={role?.role_name || role?.name || String(employee.role_id)}>{role?.role_name || role?.name || employee.role_id || "—"}</td>
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        employee.is_active 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50" 
                          : "bg-slate-50 text-slate-500 border border-slate-200/50"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${employee.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        {employee.is_active ? "Hoạt động" : "Tạm khóa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-1.5">
                        <Link 
                          to={`/employees/${employee.id}`} 
                          title="Chi tiết" 
                          className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/50 transition-all shadow-sm flex items-center justify-center h-8 w-8"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                        </Link>
                        <button 
                          onClick={() => handleEdit(employee)} 
                          title="Sửa" 
                          className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-600 border border-slate-200/50 transition-all shadow-sm flex items-center justify-center h-8 w-8"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"></path>
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(employee)} 
                          title="Xóa" 
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-100/50 transition-all shadow-sm flex items-center justify-center h-8 w-8"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 p-4 lg:hidden">
          {employees.map((employee) => {
            const department = departments.find((dept) => dept.id === employee.department_id);
            const role = roles.find((roleItem) => roleItem.id === employee.role_id);
            return (
              <div key={employee.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{employee.full_name}</p>
                    <p className="text-sm text-slate-600">{employee.email}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${employee.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{employee.is_active ? "Hoạt động" : "Không hoạt động"}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <div>Phòng ban: {department?.name || "Không có"}</div>
                  <div>Vai trò: {role?.role_name || role?.name || employee.role_id || "N/A"}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/employees/${employee.id}`} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">Chi tiết</Link>
                  <button onClick={() => handleEdit(employee)} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">Sửa</button>
                  <button onClick={() => handleDelete(employee)} className="rounded-2xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200">Xóa</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EmployeeFormModal open={isModalOpen} onClose={() => setIsModalOpen(false)} employee={selectedEmployee} departments={departments} roles={roles} managers={managers} onSave={handleSave} />
    </div>
  );
}

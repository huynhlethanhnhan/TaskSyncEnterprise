import { useEffect, useState } from "react";

export default function EmployeeFormModal({ open, onClose, employee, departments, roles, managers, onSave }) {
  const [state, setState] = useState({
    full_name: "",
    email: "",
    department_id: "",
    role_id: "",
    manager_id: "",
    job_title: "",
    is_active: true,
    password: "",
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (employee) {
      setState({
        full_name: employee.full_name || "",
        email: employee.email || "",
        department_id: employee.department_id || "",
        role_id: employee.role_id || "",
        manager_id: employee.manager_id || "",
        job_title: employee.job_title || "",
        is_active: employee.is_active ?? true,
        password: "",
      });
    } else {
      setState({
        full_name: "",
        email: "",
        department_id: "",
        role_id: "",
        manager_id: "",
        job_title: "",
        is_active: true,
        password: "",
      });
    }
  }, [employee]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{employee ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}</h2>
            <p className="mt-1 text-sm text-slate-500">Điền thông tin cơ bản cho nhân viên.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(state); }} className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Họ tên</label>
            <input value={state.full_name} onChange={(e) => setState((prev) => ({ ...prev, full_name: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email</label>
            <input type="email" value={state.email} onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Phòng ban</label>
            <select value={state.department_id} onChange={(e) => setState((prev) => ({ ...prev, department_id: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
              <option value="">Chọn phòng ban</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Vai trò</label>
            <select value={state.role_id} onChange={(e) => setState((prev) => ({ ...prev, role_id: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
              <option value="">Chọn vai trò</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.role_name || role.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Quản lý</label>
            <select value={state.manager_id} onChange={(e) => setState((prev) => ({ ...prev, manager_id: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
              <option value="">Chọn quản lý</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>{manager.full_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Chức danh</label>
            <input value={state.job_title} onChange={(e) => setState((prev) => ({ ...prev, job_title: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          </div>
          {!employee && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mật khẩu</label>
              <input type="password" value={state.password} onChange={(e) => setState((prev) => ({ ...prev, password: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Trạng thái</label>
            <select value={state.is_active ? "active" : "inactive"} onChange={(e) => setState((prev) => ({ ...prev, is_active: e.target.value === "active" }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-3xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">Hủy</button>
            <button type="submit" className="rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">{employee ? "Lưu" : "Tạo"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

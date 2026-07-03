import { useEffect, useState } from "react";

export default function DepartmentFormModal({ open, onClose, department, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (department) {
      setName(department.name || "");
      setDescription(department.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [department]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{department ? "Cập nhật phòng ban" : "Tạo phòng ban mới"}</h2>
            <p className="mt-1 text-sm text-slate-500">Quản lý tên và mô tả phòng ban.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave({ name, description }); }} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tên phòng ban</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên phòng ban" className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mô tả</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Mô tả ngắn về phòng ban" className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-3xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">Hủy</button>
            <button type="submit" className="rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">{department ? "Cập nhật" : "Tạo"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

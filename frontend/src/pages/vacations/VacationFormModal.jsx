import { useEffect, useState } from "react";

export default function VacationFormModal({ open, onClose, onSave, initialData }) {
  const [state, setState] = useState({
    type: initialData?.type || "Annual Leave",
    start_date: initialData?.start_date || "",
    end_date: initialData?.end_date || "",
    reason: initialData?.reason || "",
  });

  useEffect(() => {
    setState({
      type: initialData?.type || "Annual Leave",
      start_date: initialData?.start_date || "",
      end_date: initialData?.end_date || "",
      reason: initialData?.reason || "",
    });
  }, [initialData]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{initialData ? "Cập nhật yêu cầu nghỉ" : "Yêu cầu nghỉ phép mới"}</h2>
            <p className="mt-1 text-sm text-slate-500">Chọn loại và khoảng thời gian nghỉ phép.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(state); }} className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Loại nghỉ</label>
            <select value={state.type} onChange={(e) => setState((prev) => ({ ...prev, type: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
              <option>Annual Leave</option>
              <option>Sick Leave</option>
              <option>Personal Leave</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ngày bắt đầu</label>
            <input type="date" value={state.start_date} onChange={(e) => setState((prev) => ({ ...prev, start_date: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ngày kết thúc</label>
            <input type="date" value={state.end_date} onChange={(e) => setState((prev) => ({ ...prev, end_date: e.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Lý do</label>
            <textarea value={state.reason} onChange={(e) => setState((prev) => ({ ...prev, reason: e.target.value }))} rows={4} className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          </div>
          <div className="lg:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-3xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">Hủy</button>
            <button type="submit" className="rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Gửi yêu cầu</button>
          </div>
        </form>
      </div>
    </div>
  );
}

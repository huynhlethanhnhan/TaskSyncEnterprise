import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";

const STATUS_CLASS = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
};

export default function VacationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vacation, setVacation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const vacRes = await api.get(`/vacations/${id}`);
        setVacation(vacRes.data);
      } catch (err) {
        console.error("Lỗi tải chi tiết nghỉ phép:", err);
        setError("Không thể tải chi tiết nghỉ phép.");
      }
    };
    loadData();
  }, [id]);

  if (error) return <div className="p-6 text-rose-700">{error}</div>;
  if (!vacation) return <div className="p-6">Đang tải...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chi tiết nghỉ phép</h1>
          <p className="mt-2 text-sm text-slate-500">Xem thông tin yêu cầu nghỉ phép và trạng thái.</p>
        </div>
        <button onClick={() => navigate(-1)} className="rounded-3xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">Quay lại</button>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">{vacation.type}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{vacation.requested_by_name || "Người dùng"}</h2>
            <p className="mt-1 text-sm text-slate-500">{vacation.requested_by_email || "Không có email"}</p>
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-semibold ${STATUS_CLASS[vacation.status] || "bg-slate-100 text-slate-600"}`}>{vacation.status}</div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Bắt đầu</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{vacation.start_date}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Kết thúc</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{vacation.end_date}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Yêu cầu</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{vacation.requested_by || "N/A"}</p>
          </div>
        </div>
        <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Lý do nghỉ phép</p>
          <p className="mt-3 text-sm text-slate-600">{vacation.reason || "Không có lý do."}</p>
        </div>
      </div>
    </div>
  );
}

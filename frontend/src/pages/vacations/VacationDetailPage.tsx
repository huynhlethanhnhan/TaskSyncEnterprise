import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import api from "../../api/axios";

interface VacationDetail {
  id: number;
  type: string;
  requested_by_name?: string;
  requested_by_email?: string;
  requested_by?: number;
  status: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

const STATUS_CLASS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300",
};

export default function VacationDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vacation, setVacation] = useState<VacationDetail | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const vacRes = await api.get(`/vacations/${id}`);
        setVacation(vacRes.data?.data || vacRes.data);
      } catch (err) {
        console.error("Lỗi tải chi tiết nghỉ phép:", err);
        setError("Không thể tải chi tiết nghỉ phép.");
      }
    };
    if (id) loadData();
  }, [id]);

  if (error) return <div className="p-6 text-rose-700 font-bold">{error}</div>;
  if (!vacation) return <div className="p-6 text-text-muted">Đang tải...</div>;

  return (
    <div className="space-y-6 p-6 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Chi tiết nghỉ phép</h1>
          <p className="mt-2 text-sm text-text-muted">Xem thông tin yêu cầu nghỉ phép và trạng thái.</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-3xl bg-accent border border-border px-5 py-3 text-sm font-semibold text-text-primary hover:bg-accent/80 cursor-pointer"
        >
          Quay lại
        </button>
      </div>
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-text-muted">{vacation.type}</p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">
              {vacation.requested_by_name || "Người dùng"}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {vacation.requested_by_email || "Không có email"}
            </p>
          </div>
          <div
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              STATUS_CLASS[vacation.status] || "bg-accent text-text-secondary"
            }`}
          >
            {vacation.status}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-accent/30 p-4 border border-border/40">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted font-bold">Bắt đầu</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{vacation.start_date}</p>
          </div>
          <div className="rounded-3xl bg-accent/30 p-4 border border-border/40">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted font-bold">Kết thúc</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{vacation.end_date}</p>
          </div>
          <div className="rounded-3xl bg-accent/30 p-4 border border-border/40">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted font-bold">Yêu cầu</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">#{vacation.requested_by || "N/A"}</p>
          </div>
        </div>
        <div className="mt-6 rounded-3xl border border-border/60 bg-accent/20 p-5">
          <p className="text-sm font-semibold text-text-primary">Lý do nghỉ phép</p>
          <p className="mt-3 text-sm text-text-secondary leading-relaxed">
            {vacation.reason || "Không có lý do."}
          </p>
        </div>
      </div>
    </div>
  );
}

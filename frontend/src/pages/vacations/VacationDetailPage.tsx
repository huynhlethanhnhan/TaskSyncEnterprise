import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import api from "../../api/axios";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useSettings } from "../../providers/SettingsProvider";

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

export default function VacationDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatDate } = useSettings();
  const [vacation, setVacation] = useState<VacationDetail | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const vacRes = await api.get(`/vacations/${id}`);
        setVacation(vacRes.data?.data || vacRes.data);
      } catch (err) {
        console.error("Failed to load vacation detail:", err);
        setError(t("Không thể tải chi tiết nghỉ phép.", "Failed to load leave request details."));
      }
    };
    if (id) loadData();
  }, [id, t]);

  if (error) return <div className="p-6 text-rose-700 font-bold">{error}</div>;
  if (!vacation) return <div className="p-6 text-text-muted">{t("Đang tải...", "Loading...")}</div>;

  return (
    <div className="space-y-6 p-6 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t("Chi tiết nghỉ phép", "Leave Request Details")}</h1>
          <p className="mt-2 text-sm text-text-muted">{t("Xem thông tin yêu cầu nghỉ phép và trạng thái.", "View leave request information and approval status.")}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-3xl bg-accent border border-border px-5 py-3 text-sm font-semibold text-text-primary hover:bg-accent/80 cursor-pointer"
        >
          {t("Quay lại", "Back")}
        </button>
      </div>
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-text-muted">{vacation.type}</p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">
              {vacation.requested_by_name || t("Người dùng", "Employee")}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {vacation.requested_by_email || t("Không có email", "No email")}
            </p>
          </div>
          <StatusBadge status={vacation.status} size="md" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-accent/30 p-4 border border-border/40">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted font-bold">{t("Bắt đầu", "Start Date")}</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{formatDate(vacation.start_date)}</p>
          </div>
          <div className="rounded-3xl bg-accent/30 p-4 border border-border/40">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted font-bold">{t("Kết thúc", "End Date")}</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{formatDate(vacation.end_date)}</p>
          </div>
          <div className="rounded-3xl bg-accent/30 p-4 border border-border/40">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted font-bold">{t("Yêu cầu", "Requester")}</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">#{vacation.requested_by || "N/A"}</p>
          </div>
        </div>
        <div className="mt-6 rounded-3xl border border-border/60 bg-accent/20 p-5">
          <p className="text-sm font-semibold text-text-primary">{t("Lý do nghỉ phép", "Leave Reason")}</p>
          <p className="mt-3 text-sm text-text-secondary leading-relaxed">
            {vacation.reason || t("Không có lý do.", "No reason provided.")}
          </p>
        </div>
      </div>
    </div>
  );
}

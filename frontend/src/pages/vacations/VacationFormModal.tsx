import React, { useEffect, useState } from "react";
import { Select } from "../../components/ui/Select";
import { useSettings } from "../../providers/SettingsProvider";

export interface VacationFormData {
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
}

interface VacationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: VacationFormData) => void;
  initialData?: Partial<VacationFormData> | null;
}

export default function VacationFormModal({
  open,
  onClose,
  onSave,
  initialData,
}: VacationFormModalProps): React.ReactElement | null {
  const { t } = useSettings();
  const [state, setState] = useState<VacationFormData>({
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
      <div className="w-full max-w-2xl rounded-[32px] bg-surface border border-border p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {initialData
                ? t("Cập nhật yêu cầu nghỉ", "Update Leave Request")
                : t("Yêu cầu nghỉ phép mới", "New Leave Request")}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {t("Chọn loại và khoảng thời gian nghỉ phép.", "Select leave type and date range.")}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary cursor-pointer">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(state);
          }}
          className="mt-6 grid gap-4 lg:grid-cols-2"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              {t("Loại nghỉ", "Leave Type")}
            </label>
            <Select
              aria-label={t("Loại nghỉ", "Leave Type")}
              value={state.type}
              onChange={(e) =>
                setState((prev) => ({ ...prev, type: e.target.value }))
              }
              options={[
                { value: "Annual Leave", label: t("Nghỉ phép năm", "Annual Leave") },
                { value: "Sick Leave", label: t("Nghỉ ốm", "Sick Leave") },
                { value: "Personal Leave", label: t("Nghỉ việc riêng", "Personal Leave") },
              ]}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              {t("Ngày bắt đầu", "Start Date")}
            </label>
            <input
              type="date"
              value={state.start_date}
              onChange={(e) =>
                setState((prev) => ({ ...prev, start_date: e.target.value }))
              }
              className="w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              {t("Ngày kết thúc", "End Date")}
            </label>
            <input
              type="date"
              value={state.end_date}
              onChange={(e) =>
                setState((prev) => ({ ...prev, end_date: e.target.value }))
              }
              className="w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              {t("Lý do", "Reason")}
            </label>
            <textarea
              value={state.reason}
              onChange={(e) =>
                setState((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows={4}
              className="w-full rounded-[28px] border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none"
            />
          </div>
          <div className="lg:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-3xl border border-border bg-accent px-5 py-3 text-sm font-semibold text-text-primary hover:bg-accent/80 cursor-pointer"
            >
              {t("Hủy", "Cancel")}
            </button>
            <button
              type="submit"
              className="rounded-3xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              {t("Gửi yêu cầu", "Submit Request")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

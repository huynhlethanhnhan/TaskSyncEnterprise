import React, { useEffect, useState } from "react";
import { useTheme } from "../../providers/ThemeProvider";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import api from "../../api/axios";
import { Button } from "../../components/ui/Button";

interface LanguageOption {
  value: string;
  label: string;
}

interface TimezoneOption {
  value: string;
  label: string;
}

interface UserPreferences {
  theme: string;
  language: string;
  timezone: string;
  date_format: string;
  page_size: number;
  compact_mode: boolean;
  in_app_notifications: boolean;
  email_notifications: boolean;
  task_assigned_notify: boolean;
  task_deadline_notify: boolean;
  sprint_status_notify: boolean;
  project_update_notify: boolean;
}

interface SystemSettingsData {
  system_name: string;
  default_sprint_capacity: number;
  default_task_page_size: number;
  deadline_reminder_days: number;
  allow_employee_status_update: boolean;
  maintenance_mode: boolean;
}

const languages: LanguageOption[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const timezones: TimezoneOption[] = [
  { value: "Asia/Ho_Chi_Minh", label: "GMT+7 Ho Chi Minh" },
  { value: "UTC", label: "UTC" },
];

export default function SettingsPage(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [_savingUser, setSavingUser] = useState<boolean>(false);
  const [savingSystem, setSavingSystem] = useState<boolean>(false);

  // User preferences state
  const [prefs, setPrefs] = useState<UserPreferences>({
    theme: theme || "system",
    language: localStorage.getItem("tasksync_language") || "vi",
    timezone: localStorage.getItem("tasksync_timezone") || "Asia/Ho_Chi_Minh",
    date_format: "DD/MM/YYYY",
    page_size: 20,
    compact_mode: false,
    in_app_notifications: true,
    email_notifications: true,
    task_assigned_notify: true,
    task_deadline_notify: true,
    sprint_status_notify: true,
    project_update_notify: true,
  });

  // Admin system settings state
  const [sysSettings, setSysSettings] = useState<SystemSettingsData>({
    system_name: "TaskSync Enterprise",
    default_sprint_capacity: 30,
    default_task_page_size: 20,
    deadline_reminder_days: 3,
    allow_employee_status_update: true,
    maintenance_mode: false,
  });

  const roleId = Number(user?.role_id);
  const isAdmin = roleId === 1 || user?.role === "admin";

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const meRes = await api.get("/settings/me").catch(() => null);
        if (meRes?.data) {
          setPrefs(meRes.data);
          if (meRes.data.theme) setTheme(meRes.data.theme as any);
          if (meRes.data.language) {
            localStorage.setItem("tasksync_language", meRes.data.language);
          }
          if (meRes.data.timezone) {
            localStorage.setItem("tasksync_timezone", meRes.data.timezone);
          }
        }

        if (isAdmin) {
          const sysRes = await api.get("/settings/system").catch(() => null);
          if (sysRes?.data) {
            setSysSettings(sysRes.data);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [isAdmin, setTheme]);

  const handleSaveUserPrefs = async (updated: Partial<UserPreferences>) => {
    try {
      setSavingUser(true);
      const newPrefs = { ...prefs, ...updated };
      setPrefs(newPrefs);

      if (updated.theme) {
        setTheme(updated.theme as any);
      }
      if (updated.language) {
        localStorage.setItem("tasksync_language", updated.language);
        window.dispatchEvent(new Event("language_changed"));
      }
      if (updated.timezone) {
        localStorage.setItem("tasksync_timezone", updated.timezone);
        window.dispatchEvent(
          new CustomEvent("timezone_changed", { detail: { timezone: updated.timezone } })
        );
      }

      await api.patch("/settings/me", updated);
      toast.success("Cài đặt cá nhân đã được lưu", "Thông tin cài đặt đã đồng bộ vào cơ sở dữ liệu.");
    } catch {
      toast.error("Lỗi lưu cài đặt", "Không thể lưu cài đặt cá nhân.");
    } finally {
      setSavingUser(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      setSavingSystem(true);
      const res = await api.patch("/settings/system", sysSettings);
      if (res.data) setSysSettings(res.data);
      toast.success("Cấu hình Hệ thống đã cập nhật", "Thông số hệ thống quản trị đã lưu thành công.");
    } catch (err: any) {
      toast.error("Lỗi cập nhật Cấu hình Hệ thống", err.response?.data?.detail || "Không thể cập nhật.");
    } finally {
      setSavingSystem(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-text-muted">Đang tải cài đặt hệ thống...</div>;
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 pb-12 font-sans text-xs">
      {/* HEADER HERO */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl -z-10" />
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
          {isAdmin ? "Cài đặt & Quản trị Hệ thống" : "Cài đặt Cá nhân"}
        </h1>
        <p className="mt-2 text-sm text-text-muted font-medium">
          {isAdmin
            ? "Tùy chỉnh giao diện cá nhân, thông báo và cấu hình thông số vận hành cho toàn bộ hệ thống Enterprise."
            : "Tùy chỉnh giao diện, ngôn ngữ, múi giờ và cài đặt thông báo cho tài khoản của bạn."}
        </p>
      </div>

      {/* USER PREFERENCES GRID */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* APPEARANCE CARD */}
        <div className="flex min-h-[260px] flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              🎨 Giao diện & Chủ đề (Appearance)
            </h2>
            <p className="mt-2 text-xs text-text-muted font-medium leading-relaxed">
              Thay đổi chủ đề màu sắc ứng dụng và chế độ xem nhỏ gọn (Compact Mode).
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((tVal) => (
                <button
                  key={tVal}
                  type="button"
                  onClick={() => handleSaveUserPrefs({ theme: tVal })}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border font-bold transition-all cursor-pointer ${
                    prefs.theme === tVal
                      ? "border-primary/40 bg-primary/10 text-primary shadow-xs"
                      : "border-border bg-accent/20 text-text-secondary hover:bg-accent/40"
                  }`}
                >
                  <span className="text-base">
                    {tVal === "light" ? "☀️" : tVal === "dark" ? "🌙" : "💻"}
                  </span>
                  <span className="mt-1 capitalize text-[11px]">{tVal}</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <div>
                <p className="font-bold text-text-primary">Chế độ hiển thị nhỏ gọn (Compact Mode)</p>
                <p className="text-[10px] text-text-muted">Thu gọn lề bảng và danh sách để tăng diện tích hiển thị.</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.compact_mode}
                onChange={(e) => handleSaveUserPrefs({ compact_mode: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* REGIONAL / LOCALIZATION CARD */}
        <div className="flex min-h-[260px] flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              🌐 Ngôn ngữ & Định dạng (Regional)
            </h2>
            <p className="mt-2 text-xs text-text-muted font-medium leading-relaxed">
              Tùy chỉnh ngôn ngữ hiển thị giao diện và múi giờ hệ thống của bạn.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Ngôn ngữ hiển thị
              </label>
              <select
                value={prefs.language}
                onChange={(e) => handleSaveUserPrefs({ language: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs outline-none font-semibold text-text-primary focus:border-primary transition-colors cursor-pointer"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Múi giờ làm việc
              </label>
              <select
                value={prefs.timezone}
                onChange={(e) => handleSaveUserPrefs({ timezone: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs outline-none font-semibold text-text-primary focus:border-primary transition-colors cursor-pointer"
              >
                {timezones.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFICATION PREFERENCES CARD */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
          🔔 Tùy chọn Nhận Thông báo (Notification Preferences)
        </h2>
        <p className="text-xs text-text-muted font-medium leading-relaxed">
          Cấu hình nhận thông báo qua ứng dụng, email và sự kiện liên quan đến công việc.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {[
            { key: "in_app_notifications", label: "Thông báo Trong Ứng dụng (In-app)", desc: "Hiển thị chuông thông báo trực tiếp trên màn hình." },
            { key: "email_notifications", label: "Thông báo qua Email", desc: "Gửi thư điện tử cho các sự kiện quan trọng." },
            { key: "task_assigned_notify", label: "Khi được gán Task mới", desc: "Thông báo khi quản lý phân công task cho bạn." },
            { key: "task_deadline_notify", label: "Nhắc nhở Hạn chót Task", desc: "Cảnh báo khi task sắp đến hạn hoặc quá hạn." },
            { key: "sprint_status_notify", label: "Thay đổi Trạng thái Sprint", desc: "Thông báo khi Sprint được kích hoạt hoặc hoàn thành." },
            { key: "project_update_notify", label: "Cập nhật Dự án", desc: "Thông báo khi thông tin dự án được điều chỉnh." },
          ].map((item) => (
            <div key={item.key} className="p-3.5 rounded-xl border border-border/80 bg-accent/10 flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-text-primary text-xs">{item.label}</p>
                <p className="text-[10px] text-text-muted mt-0.5 leading-normal">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={(prefs as any)[item.key]}
                onChange={(e) => handleSaveUserPrefs({ [item.key]: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ACCOUNT INFO & SECURITY */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
          👤 Thông tin Tài khoản (Account Details)
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-accent/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Họ và tên</p>
            <p className="mt-1 text-sm font-extrabold text-text-primary">{user?.full_name || "N/A"}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-accent/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Email làm việc</p>
            <p className="mt-1 text-sm font-extrabold text-text-primary">{user?.email || "N/A"}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-accent/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Mã nhân sự & Vai trò</p>
            <p className="mt-1 text-sm font-extrabold text-primary">
              {user?.employee_code || `#EMP-${user?.id}`} ({user?.role || "Employee"})
            </p>
          </div>
        </div>
      </div>

      {/* ADMIN SYSTEM SETTINGS (ADMIN ONLY) */}
      {isAdmin && (
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              ⚙️ Cấu hình Hệ thống Quản trị (Admin System Settings)
            </h2>
            <p className="mt-1 text-xs text-text-muted font-medium">
              Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa các thông số vận hành này.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Tên Hệ thống Enterprise</label>
              <input
                type="text"
                value={sysSettings.system_name}
                onChange={(e) => setSysSettings({ ...sysSettings, system_name: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-text-primary font-semibold outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Default Sprint Capacity (Story Points)</label>
              <input
                type="number"
                value={sysSettings.default_sprint_capacity}
                onChange={(e) => setSysSettings({ ...sysSettings, default_sprint_capacity: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-text-primary font-semibold outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Default Page Size</label>
              <input
                type="number"
                value={sysSettings.default_task_page_size}
                onChange={(e) => setSysSettings({ ...sysSettings, default_task_page_size: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-text-primary font-semibold outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Deadline Reminder Days</label>
              <input
                type="number"
                value={sysSettings.deadline_reminder_days}
                onChange={(e) => setSysSettings({ ...sysSettings, deadline_reminder_days: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-text-primary font-semibold outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between">
            <div>
              <p className="font-bold text-text-primary">Cho phép Employee tự đổi trạng thái Task được gán</p>
              <p className="text-[10px] text-text-muted">Nhân viên được gán trực tiếp công việc có thể chuyển đổi To Do ➔ In Progress ➔ Done.</p>
            </div>
            <input
              type="checkbox"
              checked={sysSettings.allow_employee_status_update}
              onChange={(e) => setSysSettings({ ...sysSettings, allow_employee_status_update: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              isLoading={savingSystem}
              onClick={handleSaveSystemSettings}
            >
              Lưu Cấu hình Quản trị
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { useTheme } from "../../providers/ThemeProvider";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";

interface LanguageOption {
  value: string;
  label: string;
}

interface TimezoneOption {
  value: string;
  label: string;
}

interface DictionaryEntry {
  title: string;
  subtitle: string;
  appearance: string;
  appearanceDesc: string;
  light: string;
  dark: string;
  system: string;
  langTime: string;
  langTimeDesc: string;
  language: string;
  timezone: string;
  security: string;
  securityDesc: string;
  changePass: string;
  changePassVal: string;
  sessionInfo: string;
  sessionInfoVal: string;
  toastSaved: string;
  saving: string;
  saveBtn: string;
}

const languages: LanguageOption[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const timezones: TimezoneOption[] = [
  { value: "Asia/Ho_Chi_Minh", label: "GMT+7 Ho Chi Minh" },
  { value: "UTC", label: "UTC" },
];

const dictionary: Record<string, DictionaryEntry> = {
  vi: {
    title: "Cài đặt hệ thống",
    subtitle: "Quản lý chủ đề, ngôn ngữ, múi giờ và bảo mật tài khoản của bạn.",
    appearance: "Giao diện & Chủ đề",
    appearanceDesc: "Thay đổi giao diện ứng dụng để phù hợp với môi trường của bạn.",
    light: "Chế độ Sáng (Light)",
    dark: "Chế độ Tối (Dark)",
    system: "Theo cài đặt thiết bị",
    langTime: "Ngôn ngữ & Múi giờ",
    langTimeDesc: "Tùy chỉnh ngôn ngữ hiển thị và định dạng thời gian toàn cầu.",
    language: "Ngôn ngữ hiển thị",
    timezone: "Múi giờ hệ thống",
    security: "Bảo mật & Phiên kết nối",
    securityDesc: "Quản lý mật khẩu cá nhân và giám sát hoạt động của các phiên truy cập.",
    changePass: "Mật khẩu đăng nhập",
    changePassVal: "Đã thiết lập",
    sessionInfo: "Hoạt động thiết bị",
    sessionInfoVal: "Thiết bị hiện tại",
    toastSaved: "Cài đặt đã được đồng bộ hóa thành công!",
    saving: "Đang đồng bộ cài đặt...",
    saveBtn: "Lưu thay đổi",
  },
  en: {
    title: "System Settings",
    subtitle: "Manage application theme, language, timezone, and account security.",
    appearance: "Appearance & Theme",
    appearanceDesc: "Switch between light and dark modes to suit your work environment.",
    light: "Light Mode",
    dark: "Dark Mode",
    system: "Use Device Setting",
    langTime: "Language & Timezone",
    langTimeDesc: "Customize display language and global date/time formatting.",
    language: "Display Language",
    timezone: "System Timezone",
    security: "Security & Active Sessions",
    securityDesc: "Manage account credentials and monitor connected devices.",
    changePass: "Account Password",
    changePassVal: "Configured",
    sessionInfo: "Device Activity",
    sessionInfoVal: "Active Session",
    toastSaved: "Settings synchronized successfully!",
    saving: "Syncing settings...",
    saveBtn: "Save Changes",
  },
};

export default function SettingsPage(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [language, setLanguage] = useState<string>(
    localStorage.getItem("tasksync_language") || "vi"
  );
  const [timezone, setTimezone] = useState<string>(
    localStorage.getItem("tasksync_timezone") || "Asia/Ho_Chi_Minh"
  );

  const t: DictionaryEntry = dictionary[language] || dictionary.vi;
  const roleId = Number(user?.role_id);
  const canViewSystemPolicy = roleId === 1 || roleId === 2;
  const pageTitle = canViewSystemPolicy
    ? t.title
    : language === "vi"
    ? "Cài đặt cá nhân"
    : "Personal Settings";
  const pageSubtitle = canViewSystemPolicy
    ? t.subtitle
    : language === "vi"
    ? "Tùy chỉnh giao diện, ngôn ngữ, múi giờ và bảo mật cho tài khoản của bạn."
    : "Customize appearance, language, timezone, and security for your account.";

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    localStorage.setItem("tasksync_language", val);
    window.dispatchEvent(new Event("language_changed"));
    toast.success(dictionary[val]?.toastSaved || dictionary.vi.toastSaved);
  };

  const handleThemeChange = (val: "light" | "dark" | "system") => {
    setTheme(val);
    toast.success(t.toastSaved);
  };

  const handleTimezoneChange = (val: string) => {
    setTimezone(val);
    localStorage.setItem("tasksync_timezone", val);
    window.dispatchEvent(
      new CustomEvent("timezone_changed", { detail: { timezone: val } })
    );
    toast.success(t.toastSaved);
  };

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 pb-12 font-sans">
      {/* HEADER HERO */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl -z-10" />
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
          {pageTitle}
        </h1>
        <p className="mt-2 text-sm text-text-muted font-medium">{pageSubtitle}</p>
      </div>

      {/* SETTINGS PANELS */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* APPEARANCE CARD */}
        <div className="flex min-h-[260px] flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              🎨 {t.appearance}
            </h2>
            <p className="mt-2 text-xs text-text-muted font-medium leading-relaxed">
              {t.appearanceDesc}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => handleThemeChange("light")}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                theme === "light"
                  ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-accent/20 text-text-secondary hover:bg-accent/40"
              }`}
            >
              <span>☀️ {t.light}</span>
              {theme === "light" && <span className="text-primary">✓</span>}
            </button>

            <button
              onClick={() => handleThemeChange("dark")}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                theme === "dark"
                  ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-accent/20 text-text-secondary hover:bg-accent/40"
              }`}
            >
              <span>🌙 {t.dark}</span>
              {theme === "dark" && <span className="text-primary">✓</span>}
            </button>

            <button
              onClick={() => handleThemeChange("system")}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                theme === "system"
                  ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-accent/20 text-text-secondary hover:bg-accent/40"
              }`}
            >
              <span>💻 {t.system}</span>
              {theme === "system" && <span className="text-primary">✓</span>}
            </button>
          </div>
        </div>

        {/* REGIONAL / LOCALIZATION CARD */}
        <div className="flex min-h-[260px] flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              🌐 {t.langTime}
            </h2>
            <p className="mt-2 text-xs text-text-muted font-medium leading-relaxed">
              {t.langTimeDesc}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {t.language}
              </label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs outline-none font-semibold text-text-primary focus:border-primary transition-colors cursor-pointer"
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
                {t.timezone}
              </label>
              <select
                value={timezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs outline-none font-semibold text-text-primary focus:border-primary transition-colors cursor-pointer"
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

      {/* SECURITY METRICS */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
          🛡️ {t.security}
        </h2>
        <p className="mt-2 text-xs text-text-muted font-medium leading-relaxed">
          {t.securityDesc}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-accent/10 p-5 flex items-center justify-between hover:bg-accent/20 transition-colors duration-300">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {t.changePass}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-text-primary">
                {t.changePassVal}
              </p>
            </div>
            <span className="text-2xl text-primary">🛡️</span>
          </div>

          <div className="rounded-3xl border border-border bg-accent/10 p-5 flex items-center justify-between hover:bg-accent/20 transition-colors duration-300">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {t.sessionInfo}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-text-primary">
                {t.sessionInfoVal}
              </p>
            </div>
            <span className="text-2xl text-primary">💻</span>
          </div>
        </div>
      </div>

      {/* 📋 ROLE & PERMISSION MATRIX */}
      {canViewSystemPolicy && (
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            📋 Bảng phân quyền hệ thống (Role Matrix)
          </h2>
          <p className="mt-2 text-xs text-text-muted font-medium leading-relaxed">
            Tra cứu quyền hạn thao tác dữ liệu được cấu hình cứng theo vai trò
            (Role-Based Access Control)
          </p>

          <div className="mt-6 overflow-x-auto border border-border rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-accent/40 text-text-secondary border-b border-border">
                  <th className="p-3 font-semibold">Quyền hạn thao tác</th>
                  <th className="p-3 font-semibold text-center w-28">
                    Admin (Quản trị)
                  </th>
                  <th className="p-3 font-semibold text-center w-28">
                    Manager (Quản lý)
                  </th>
                  <th className="p-3 font-semibold text-center w-28">
                    Employee (Nhân viên)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  {
                    label: "Xem & Cấu hình Nhật ký Hệ thống (Audit Logs)",
                    admin: true,
                    manager: false,
                    employee: false,
                  },
                  {
                    label: "Thêm, Sửa, Xóa Nhân viên & Vai trò",
                    admin: true,
                    manager: false,
                    employee: false,
                  },
                  {
                    label: "Xóa Dự án (Projects)",
                    admin: true,
                    manager: false,
                    employee: false,
                  },
                  {
                    label: "Quản lý Phòng ban (Departments)",
                    admin: true,
                    manager: true,
                    employee: false,
                  },
                  {
                    label: "Khởi tạo & Sửa Dự án",
                    admin: true,
                    manager: true,
                    employee: false,
                  },
                  {
                    label: "Khởi tạo, Sửa & Xóa Task công việc",
                    admin: true,
                    manager: true,
                    employee: false,
                  },
                  {
                    label: "Tạo & Đăng ký đơn Nghỉ phép (Vacation)",
                    admin: true,
                    manager: true,
                    employee: true,
                  },
                  {
                    label: "Duyệt Đơn nghỉ phép của cấp dưới",
                    admin: true,
                    manager: true,
                    employee: false,
                  },
                  {
                    label: "Cập nhật trạng thái Task được gán",
                    admin: true,
                    manager: true,
                    employee: true,
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-accent/20 transition-colors">
                    <td className="p-3 text-text-primary font-medium">{row.label}</td>
                    <td className="p-3 text-center">
                      {row.admin ? (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 font-bold">
                          ✗
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {row.manager ? (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 font-bold">
                          ✗
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {row.employee ? (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 font-bold">
                          ✗
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useTheme } from "../../providers/ThemeProvider";
import { useAuth } from "../../providers/AuthProvider";
import { useSettings } from "../../providers/SettingsProvider";
import { useToast } from "../../providers/ToastProvider";
import { settingsApi, type SystemRuntimeSettings, type UserPreferenceSettings } from "../../api/services";
import { PageHeader } from "../../components/layout/PageHeader";
import { Breadcrumb } from "../../components/navigation/Breadcrumb";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Switch } from "../../components/ui/Switch";
import { SkeletonCard } from "../../components/feedback/Skeleton";
import { ShieldCheck, Globe, Palette, Bell, User as UserIcon } from "lucide-react";

const languages = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const timezones = [
  { value: "Asia/Ho_Chi_Minh", label: "GMT+7 Ho Chi Minh" },
  { value: "UTC", label: "UTC" },
];

const dateFormats = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (14/11/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-11-14)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (11/14/2026)" },
];

const pageSizeOptions = [
  { value: "10", label: "10 dòng / trang" },
  { value: "20", label: "20 dòng / trang" },
  { value: "30", label: "30 dòng / trang" },
  { value: "50", label: "50 dòng / trang" },
];

export default function SettingsPage(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { prefs, runtime, updatePrefs, updateRuntime, isLoading, t } = useSettings();
  const toast = useToast();

  const [savingSystem, setSavingSystem] = useState<boolean>(false);
  const [sysForm, setSysForm] = useState<SystemRuntimeSettings>(runtime);

  const roleId = Number(user?.role_id);
  const isAdmin = roleId === 1 || user?.role === "admin";

  useEffect(() => {
    setSysForm(runtime);
  }, [runtime]);

  useEffect(() => {
    if (!isAdmin) return;
    settingsApi
      .getSystem()
      .then((data) => setSysForm(data))
      .catch(() => {
        // Fallback to runtime already loaded in provider
      });
  }, [isAdmin]);

  const handleSaveUserPrefs = async (patch: Partial<UserPreferenceSettings>) => {
    try {
      if (patch.theme) {
        setTheme(patch.theme as "light" | "dark" | "system");
      }
      if (patch.language) {
        localStorage.setItem("tasksync_language", patch.language);
      }
      await updatePrefs(patch);
      toast.success(
        t("Cài đặt cá nhân đã được đồng bộ", "Preferences saved and synchronized"),
        t("Thay đổi đã áp dụng trực tiếp lên giao diện và lưu xuống cơ sở dữ liệu.", "Applied immediately across UI and database."),
      );
    } catch {
      toast.error(t("Lỗi lưu cài đặt", "Save Failed"), t("Không thể lưu cài đặt cá nhân.", "Failed to save personal preferences."));
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      setSavingSystem(true);
      const saved = await updateRuntime(sysForm);
      setSysForm(saved);
      toast.success(
        t("Cấu hình Hệ thống đã đồng bộ", "System Settings Synchronized"),
        t(
          `Tên hệ thống "${saved.system_name}" và các thông số vận hành đã cập nhật toàn cục.`,
          `System name "${saved.system_name}" and runtime settings updated globally.`,
        ),
      );
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        t("Không thể cập nhật cấu hình hệ thống.", "Unable to update system settings.");
      toast.error(t("Lỗi cập nhật Cấu hình Hệ thống", "System Settings Error"), detail);
    } finally {
      setSavingSystem(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans pb-12">
        <PageHeader title={t("Cài đặt Hệ thống", "System Settings")} description={t("Đang tải cấu hình...", "Loading settings...")} />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      <PageHeader
        title={isAdmin ? t("Cài đặt & Quản trị Hệ thống", "System Settings & Administration") : t("Cài đặt Cá nhân", "My Settings")}
        description={
          isAdmin
            ? t(
                "Đồng bộ giao diện cá nhân, ngôn ngữ, chế độ hiển thị và cấu hình thông số vận hành bảo mật toàn hệ thống.",
                "Synchronize personal appearance, language, display preferences, and global system runtime configuration.",
              )
            : t(
                "Tùy chỉnh giao diện, ngôn ngữ, định dạng ngày giờ và thông báo cho tài khoản của bạn.",
                "Customize theme, language, date format, and notifications for your account.",
              )
        }
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: isAdmin ? t("Cài đặt Hệ thống", "System Settings") : t("Cài đặt Cá nhân", "My Settings") },
            ]}
          />
        }
        actions={
          <Badge variant={isAdmin ? "danger" : "primary"} showDot>
            {isAdmin ? t("Phạm vi Quản trị", "Admin Security Scope") : t("Tùy chọn Cá nhân", "Personal Preferences")}
          </Badge>
        }
      />

      {/* USER PREFERENCES GRID */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-primary" />
              {t("Giao diện & Chủ đề (Appearance)", "Appearance & Theme")}
            </CardTitle>
            <CardDescription>
              {t(
                "Thay đổi chủ đề Sáng/Tối, chế độ thu gọn lề bảng (Compact Mode) đồng bộ trực tiếp toàn ứng dụng.",
                "Switch Light/Dark theme and Compact Mode across the entire application.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-2.5">
              {(["light", "dark", "system"] as const).map((tVal) => (
                <button
                  key={tVal}
                  type="button"
                  onClick={() => handleSaveUserPrefs({ theme: tVal })}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border font-semibold transition-all cursor-pointer ${
                    (prefs.theme || theme) === tVal
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border bg-secondary/40 text-text-secondary hover:bg-secondary"
                  }`}
                >
                  <span className="text-base">{tVal === "light" ? "☀️" : tVal === "dark" ? "🌙" : "💻"}</span>
                  <span className="mt-1 text-xs">
                    {tVal === "light" ? t("Sáng", "Light") : tVal === "dark" ? t("Tối", "Dark") : t("Hệ thống", "System")}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-primary">{t("Chế độ nhỏ gọn (Compact Mode)", "Compact Mode")}</p>
                <p className="text-[11px] text-text-muted">{t("Thu gọn khoảng cách bảng và nội dung để hiển thị nhiều dữ liệu hơn.", "Reduce table and card spacing to fit more data.")}</p>
              </div>
              <Switch
                checked={Boolean(prefs.compact_mode)}
                onChange={(checked) => handleSaveUserPrefs({ compact_mode: checked })}
              />
            </div>

            <Select
              label={t("Số dòng mặc định trên bảng (Page Size)", "Default Table Page Size")}
              value={String(prefs.page_size || 20)}
              onChange={(e) => handleSaveUserPrefs({ page_size: Number(e.target.value) })}
              options={pageSizeOptions.map((opt) => ({
                value: opt.value,
                label: t(opt.label, `${opt.value} rows / page`),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" />
              {t("Ngôn ngữ & Định dạng (Regional)", "Language & Regional")}
            </CardTitle>
            <CardDescription>
              {t(
                "Đồng bộ ngôn ngữ menu điều hướng, múi giờ và định dạng ngày tháng trên tất cả trang.",
                "Synchronize navigation language, timezone, and date formats across all pages.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label={t("Ngôn ngữ hiển thị", "Display Language")}
              value={prefs.language || "vi"}
              onChange={(e) => handleSaveUserPrefs({ language: e.target.value })}
              options={languages}
            />

            <Select
              label={t("Múi giờ làm việc", "Timezone")}
              value={prefs.timezone || "Asia/Ho_Chi_Minh"}
              onChange={(e) => handleSaveUserPrefs({ timezone: e.target.value })}
              options={timezones}
            />

            <Select
              label={t("Định dạng ngày (Date Format)", "Date Format")}
              value={prefs.date_format || "DD/MM/YYYY"}
              onChange={(e) => handleSaveUserPrefs({ date_format: e.target.value })}
              options={dateFormats}
            />
          </CardContent>
        </Card>
      </div>

      {/* NOTIFICATION PREFERENCES CARD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            {t("Tùy chọn Nhận Thông báo (Notification Preferences)", "Notification Preferences")}
          </CardTitle>
          <CardDescription>
            {t(
              "Cấu hình nhận thông báo trong ứng dụng, email và các cảnh báo liên quan đến Task / Sprint / Dự án.",
              "Configure in-app notifications, email alerts, and Task / Sprint / Project updates.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                key: "in_app_notifications",
                label: t("Thông báo Trong Ứng dụng", "In-App Notifications"),
                desc: t("Hiển thị chuông thông báo trực tiếp.", "Show live bell alerts inside the app."),
              },
              {
                key: "email_notifications",
                label: t("Thông báo qua Email", "Email Notifications"),
                desc: t("Gửi email cho các sự kiện quan trọng.", "Send email for important events."),
              },
              {
                key: "task_assigned_notify",
                label: t("Khi được gán Task mới", "Task Assignment Alerts"),
                desc: t("Thông báo khi có công việc mới.", "Notify when assigned to a task."),
              },
              {
                key: "task_deadline_notify",
                label: t("Nhắc nhở Hạn chót Task", "Task Deadline Reminders"),
                desc: t("Cảnh báo khi task sắp đến hạn.", "Alert when tasks are due soon."),
              },
              {
                key: "sprint_status_notify",
                label: t("Thay đổi Trạng thái Sprint", "Sprint Status Changes"),
                desc: t("Thông báo khi Sprint kích hoạt/đóng.", "Notify when a sprint starts or closes."),
              },
              {
                key: "project_update_notify",
                label: t("Cập nhật Dự án", "Project Updates"),
                desc: t("Thông báo khi dự án điều chỉnh.", "Notify when project details change."),
              },
            ].map((item) => (
              <div
                key={item.key}
                className="p-3.5 rounded-xl border border-border/80 bg-secondary/25 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary text-xs">{item.label}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{item.desc}</p>
                </div>
                <Switch
                  checked={Boolean((prefs as unknown as Record<string, unknown>)[item.key])}
                  onChange={(checked) => handleSaveUserPrefs({ [item.key]: checked })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ACCOUNT INFO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="h-4 w-4 text-primary" />
            {t("Thông tin Tài khoản Đang đăng nhập", "Signed-in Account Information")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t("Họ và tên", "Full Name")}</p>
              <p className="mt-1 text-sm font-bold text-text-primary">{user?.full_name || "N/A"}</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t("Email làm việc", "Work Email")}</p>
              <p className="mt-1 text-sm font-bold text-text-primary break-all">{user?.email || "N/A"}</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t("Mã nhân sự & Vai trò", "Employee Code & Role")}</p>
              <p className="mt-1 text-sm font-bold text-primary">
                {user?.employee_code || `#EMP-${user?.id}`} ({user?.role || "Employee"})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADMIN SYSTEM SETTINGS (ADMIN ONLY - BLOCKED FOR MANAGER/STAFF) */}
      {isAdmin && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  {t("Cấu hình Hệ thống Quản trị", "Admin System Settings")}
                </CardTitle>
                <CardDescription>
                  {t(
                    "Chỉ Quản trị viên (Admin) mới có quyền truy cập và thay đổi thông số vận hành / bảo mật hệ thống.",
                    "Only Administrators can access and update global system runtime & security settings.",
                  )}
                </CardDescription>
              </div>
              <Badge variant="danger">{t("Chỉ Admin", "Admin Only")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("Tên Hệ thống Enterprise (hiển thị Sidebar & Tab)", "Enterprise System Name (Sidebar & Tab)")}
                value={sysForm.system_name}
                onChange={(e) => setSysForm({ ...sysForm, system_name: e.target.value })}
              />

              <Input
                label={t("Sức chứa Sprint mặc định (Story Points)", "Default Sprint Capacity (Story Points)")}
                type="number"
                value={String(sysForm.default_sprint_capacity)}
                onChange={(e) => setSysForm({ ...sysForm, default_sprint_capacity: Number(e.target.value) })}
              />

              <Input
                label={t("Kích thước trang mặc định (Page Size)", "Default Page Size")}
                type="number"
                value={String(sysForm.default_task_page_size)}
                onChange={(e) => setSysForm({ ...sysForm, default_task_page_size: Number(e.target.value) })}
              />

              <Input
                label={t("Số ngày nhắc hạn chót (Deadline Reminder)", "Deadline Reminder Days")}
                type="number"
                value={String(sysForm.deadline_reminder_days)}
                onChange={(e) => setSysForm({ ...sysForm, deadline_reminder_days: Number(e.target.value) })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3.5">
                <div>
                  <p className="text-xs font-semibold text-text-primary">{t("Cho phép Employee đổi trạng thái Task", "Allow Employees to Update Task Status")}</p>
                  <p className="text-[11px] text-text-muted">{t("Nhân viên được gán trực tiếp có thể chuyển To Do → In Progress → Done.", "Assigned staff can move To Do → In Progress → Done.")}</p>
                </div>
                <Switch
                  checked={sysForm.allow_employee_status_update}
                  onChange={(checked) => setSysForm({ ...sysForm, allow_employee_status_update: checked })}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20 p-3.5">
                <div>
                  <p className="text-xs font-semibold text-text-primary">{t("Chế độ Bảo trì (Maintenance Mode)", "Maintenance Mode")}</p>
                  <p className="text-[11px] text-text-muted">{t("Hiển thị cảnh báo bảo trì toàn hệ thống cho tất cả tài khoản.", "Show system-wide maintenance banner to all accounts.")}</p>
                </div>
                <Switch
                  checked={sysForm.maintenance_mode}
                  onChange={(checked) => setSysForm({ ...sysForm, maintenance_mode: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" isLoading={savingSystem} onClick={handleSaveSystemSettings}>
                {t("Lưu Cấu hình Quản trị", "Save System Settings")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

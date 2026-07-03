import { useEffect, useState } from "react";

const languages = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const timezones = [
  { value: "Asia/Ho_Chi_Minh", label: "GMT+7 Ho Chi Minh" },
  { value: "UTC", label: "UTC" },
];

const dictionary = {
  vi: {
    title: "Cài đặt hệ thống",
    subtitle: "Quản lý chủ đề, ngôn ngữ, múi giờ và bảo mật tài khoản của bạn.",
    appearance: "Giao diện & Chủ đề",
    appearanceDesc: "Thay đổi giao diện ứng dụng để phù hợp với môi trường của bạn.",
    light: "Chế độ Sáng (Light)",
    dark: "Chế độ Tối (Dark)",
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
  }
};

export default function SettingsPage() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [language, setLanguage] = useState(localStorage.getItem("language") || "vi");
  const [timezone, setTimezone] = useState(localStorage.getItem("timezone") || "Asia/Ho_Chi_Minh");
  const [syncing, setSyncing] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const t = dictionary[language] || dictionary.vi;

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLanguageChange = (val) => {
    setSyncing(true);
    setTimeout(() => {
      setLanguage(val);
      localStorage.setItem("language", val);
      // Dispatch a custom event so other components (like sidebar) reload localized strings if needed
      window.dispatchEvent(new Event("language_changed"));
      setSyncing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }, 600);
  };

  const handleThemeChange = (val) => {
    setSyncing(true);
    setTimeout(() => {
      setTheme(val);
      setSyncing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }, 500);
  };

  const handleTimezoneChange = (val) => {
    setSyncing(true);
    setTimeout(() => {
      setTimezone(val);
      localStorage.setItem("timezone", val);
      setSyncing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }, 500);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 relative max-w-5xl mx-auto">
      
      {/* 🚀 TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-emerald-100 border border-emerald-500/30 animate-bounce transition-all">
          <span>✨</span>
          <span className="text-sm font-semibold">{t.toastSaved}</span>
        </div>
      )}

      {/* 🔄 SYNCING OVERLAY */}
      {syncing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/30 backdrop-blur-sm transition-all duration-300">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl border border-slate-100">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
          <p className="mt-4 text-sm font-bold text-slate-800 bg-white/95 px-4 py-2 rounded-2xl shadow-lg border border-slate-100">{t.saving}</p>
        </div>
      )}

      {/* HEADER HERO */}
      <div className="rounded-[32px] border border-slate-100 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-50/60 blur-3xl -z-10" />
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-500 font-medium">{t.subtitle}</p>
      </div>

      {/* SETTINGS PANELS */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* APPEARANCE CARD */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between min-h-[260px]">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">🎨 {t.appearance}</h2>
            <p className="mt-2 text-xs text-slate-400 font-medium leading-relaxed">{t.appearanceDesc}</p>
          </div>
          
          <div className="mt-6 space-y-3">
            <button
              onClick={() => handleThemeChange("light")}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-sm font-bold transition-all ${
                theme === "light" 
                  ? "border-blue-200 bg-blue-50/50 text-blue-600 shadow-sm" 
                  : "border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>☀️ {t.light}</span>
              {theme === "light" && <span className="text-blue-500">✓</span>}
            </button>

            <button
              onClick={() => handleThemeChange("dark")}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-sm font-bold transition-all ${
                theme === "dark" 
                  ? "border-blue-200 bg-blue-50/50 text-blue-600 shadow-sm" 
                  : "border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>🌙 {t.dark}</span>
              {theme === "dark" && <span className="text-blue-500">✓</span>}
            </button>
          </div>
        </div>

        {/* REGIONAL / LOCALIZATION CARD */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between min-h-[260px]">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">🌐 {t.langTime}</h2>
            <p className="mt-2 text-xs text-slate-400 font-medium leading-relaxed">{t.langTimeDesc}</p>
          </div>
          
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.language}</label>
              <select 
                value={language} 
                onChange={(e) => handleLanguageChange(e.target.value)} 
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none font-semibold text-slate-700 focus:border-blue-400 transition-colors"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.timezone}</label>
              <select 
                value={timezone} 
                onChange={(e) => handleTimezoneChange(e.target.value)} 
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none font-semibold text-slate-700 focus:border-blue-400 transition-colors"
              >
                {timezones.map((zone) => (
                  <option key={zone.value} value={zone.value}>{zone.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* SECURITY METRICS */}
      <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm relative overflow-hidden">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">🛡️ {t.security}</h2>
        <p className="mt-2 text-xs text-slate-400 font-medium leading-relaxed">{t.securityDesc}</p>
        
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-50 bg-slate-50/40 p-5 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.changePass}</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-700">{t.changePassVal}</p>
            </div>
            <span className="text-2xl text-blue-500">🛡️</span>
          </div>
          
          <div className="rounded-3xl border border-slate-50 bg-slate-50/40 p-5 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.sessionInfo}</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-700">{t.sessionInfoVal}</p>
            </div>
            <span className="text-2xl text-blue-500">💻</span>
          </div>
        </div>
      </div>

    </div>
  );
}

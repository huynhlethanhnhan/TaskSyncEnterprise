import * as React from 'react';
import {
  settingsApi,
  type SystemRuntimeSettings,
  type UserPreferenceSettings,
} from '../api/services';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { getStatusLabel } from '../utils/globalLabels';

const DEFAULT_PREFS: UserPreferenceSettings = {
  theme: 'system',
  language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  date_format: 'DD/MM/YYYY',
  page_size: 20,
  compact_mode: false,
  in_app_notifications: true,
  email_notifications: true,
  task_assigned_notify: true,
  task_deadline_notify: true,
  sprint_status_notify: true,
  project_update_notify: true,
};

const DEFAULT_RUNTIME: SystemRuntimeSettings = {
  system_name: 'TaskSync Enterprise',
  default_sprint_capacity: 30,
  default_task_page_size: 20,
  deadline_reminder_days: 3,
  allow_employee_status_update: true,
  maintenance_mode: false,
};

interface SettingsContextValue {
  prefs: UserPreferenceSettings;
  runtime: SystemRuntimeSettings;
  isLoading: boolean;
  updatePrefs: (patch: Partial<UserPreferenceSettings>) => Promise<UserPreferenceSettings>;
  updateRuntime: (patch: Partial<SystemRuntimeSettings>) => Promise<SystemRuntimeSettings>;
  refreshSettings: () => Promise<void>;
  formatDate: (value?: string | Date | null, mode?: 'short' | 'full') => string;
  defaultPageSize: number;
  isEnglish: boolean;
  t: (viText: string, enText: string) => string;
  statusLabel: (status?: string | null) => string;
}

const SettingsContext = React.createContext<SettingsContextValue | undefined>(undefined);

function readStoredPrefs(): UserPreferenceSettings {
  try {
    return {
      ...DEFAULT_PREFS,
      theme: localStorage.getItem('tasksync_theme') || 'system',
      language: localStorage.getItem('tasksync_language') || 'vi',
      timezone: localStorage.getItem('tasksync_timezone') || 'Asia/Ho_Chi_Minh',
      date_format: localStorage.getItem('tasksync_date_format') || 'DD/MM/YYYY',
      compact_mode: localStorage.getItem('tasksync_compact_mode') === 'true',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { setTheme } = useTheme();
  const [prefs, setPrefs] = React.useState<UserPreferenceSettings>(readStoredPrefs);
  const [runtime, setRuntime] = React.useState<SystemRuntimeSettings>(DEFAULT_RUNTIME);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const syncDomAttributes = React.useCallback(
    (nextPrefs: UserPreferenceSettings, nextRuntime: SystemRuntimeSettings) => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('compact', Boolean(nextPrefs.compact_mode));
        document.documentElement.lang = nextPrefs.language === 'en' ? 'en' : 'vi';
        document.title = nextRuntime.system_name || 'TaskSync Enterprise';
      }
      try {
        localStorage.setItem('tasksync_language', nextPrefs.language || 'vi');
        localStorage.setItem('tasksync_timezone', nextPrefs.timezone || 'Asia/Ho_Chi_Minh');
        localStorage.setItem('tasksync_date_format', nextPrefs.date_format || 'DD/MM/YYYY');
        localStorage.setItem('tasksync_compact_mode', String(Boolean(nextPrefs.compact_mode)));
      } catch {
        // Ignore storage quota errors
      }
    },
    [],
  );

  const refreshSettings = React.useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [meRes, rtRes] = await Promise.all([
        settingsApi.getMe().catch(() => null),
        settingsApi.getRuntime().catch(() => null),
      ]);
      const nextPrefs = meRes ? { ...DEFAULT_PREFS, ...meRes } : readStoredPrefs();
      const nextRuntime = rtRes ? { ...DEFAULT_RUNTIME, ...rtRes } : DEFAULT_RUNTIME;
      setPrefs(nextPrefs);
      setRuntime(nextRuntime);
      if (nextPrefs.theme) {
        setTheme(nextPrefs.theme as 'light' | 'dark' | 'system');
      }
      syncDomAttributes(nextPrefs, nextRuntime);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, setTheme, syncDomAttributes]);

  React.useEffect(() => {
    syncDomAttributes(prefs, runtime);
  }, [prefs, runtime, syncDomAttributes]);

  React.useEffect(() => {
    if (isAuthenticated && user?.id) {
      void refreshSettings();
    }
  }, [isAuthenticated, user?.id, refreshSettings]);

  const updatePrefs = React.useCallback(
    async (patch: Partial<UserPreferenceSettings>) => {
      const optimistic = { ...prefs, ...patch };
      setPrefs(optimistic);
      if (patch.theme) {
        setTheme(patch.theme as 'light' | 'dark' | 'system');
      }
      syncDomAttributes(optimistic, runtime);
      const saved = await settingsApi.updateMe(patch);
      const merged = { ...optimistic, ...saved };
      setPrefs(merged);
      syncDomAttributes(merged, runtime);
      return merged;
    },
    [prefs, runtime, setTheme, syncDomAttributes],
  );

  const updateRuntime = React.useCallback(
    async (patch: Partial<SystemRuntimeSettings>) => {
      const saved = await settingsApi.updateSystem(patch);
      const merged = { ...runtime, ...saved };
      setRuntime(merged);
      syncDomAttributes(prefs, merged);
      return merged;
    },
    [prefs, runtime, syncDomAttributes],
  );

  const formatDate = React.useCallback(
    (value?: string | Date | null, mode: 'short' | 'full' = 'short') => {
      if (!value) return '—';
      const parsed = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(parsed.getTime())) return String(value);
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = String(parsed.getFullYear());
      let base = `${dd}/${mm}/${yyyy}`;
      if (prefs.date_format === 'YYYY-MM-DD') base = `${yyyy}-${mm}-${dd}`;
      else if (prefs.date_format === 'MM/DD/YYYY') base = `${mm}/${dd}/${yyyy}`;
      if (mode === 'full') {
        const hh = String(parsed.getHours()).padStart(2, '0');
        const min = String(parsed.getMinutes()).padStart(2, '0');
        return `${base} ${hh}:${min}`;
      }
      return base;
    },
    [prefs.date_format],
  );

  const isEnglish = prefs.language === 'en';
  const t = React.useCallback(
    (viText: string, enText: string) => (isEnglish ? enText : viText),
    [isEnglish],
  );
  const statusLabel = React.useCallback(
    (status?: string | null) => getStatusLabel(status, isEnglish),
    [isEnglish],
  );
  const defaultPageSize = prefs.page_size || runtime.default_task_page_size || 20;

  return (
    <SettingsContext.Provider
      value={{
        prefs,
        runtime,
        isLoading,
        updatePrefs,
        updateRuntime,
        refreshSettings,
        formatDate,
        defaultPageSize,
        isEnglish,
        t,
        statusLabel,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
};

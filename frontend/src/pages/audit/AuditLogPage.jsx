// 📂 FILE: src/pages/audit/AuditLogPage.jsx
import { useEffect, useMemo, useState } from "react";
import { auditApi } from "../../api/auditApi";

const ACTION_BADGE = {
  LOGIN: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  LOGOUT: "bg-slate-100 text-slate-600 border-slate-200",
  CREATE: "bg-blue-50 text-blue-700 border-blue-200/60",
  UPDATE: "bg-amber-50 text-amber-700 border-amber-200/60",
  DELETE: "bg-rose-50 text-rose-700 border-rose-200/60",
  OTHER: "bg-purple-50 text-purple-700 border-purple-200/60",
};

function getActionBadgeClass(action) {
  const key = (action || "OTHER").toUpperCase();
  return ACTION_BADGE[key] || ACTION_BADGE["OTHER"];
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const actionSummary = useMemo(() => {
    return logs.reduce((acc, item) => {
      acc.total = (acc.total || 0) + 1;
      const key = (item.action || "OTHER").toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, { total: 0 });
  }, [logs]);

  // Lọc theo email hoặc action
  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        (log.employee_email || "").toLowerCase().includes(q) ||
        (log.action || "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  // Thống kê điểm danh (Login/Logout per user)
  const attendanceSummary = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      const email = log.employee_email || "unknown";
      if (!map[email]) map[email] = { email, loginCount: 0, lastLogin: null };
      const action = (log.action || "").toUpperCase();
      if (action === "LOGIN") {
        map[email].loginCount += 1;
        const ts = log.timestamp ? new Date(log.timestamp) : null;
        if (!map[email].lastLogin || (ts && ts > map[email].lastLogin)) {
          map[email].lastLogin = ts;
        }
      }
    });
    return Object.values(map).filter(u => u.loginCount > 0).sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0));
  }, [logs]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await auditApi.getLogs();
        if (Array.isArray(res.data)) {
          setLogs(res.data);
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error("Lỗi lấy nhật ký:", err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-16 w-64 bg-slate-100 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-24 bg-white border border-slate-100 rounded-3xl" />
          <div className="h-24 bg-white border border-slate-100 rounded-3xl" />
          <div className="h-24 bg-white border border-slate-100 rounded-3xl" />
        </div>
        <div className="h-96 bg-white border border-slate-100 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Nhật ký hệ thống</h1>
          <p className="mt-1 text-sm text-slate-500">Giám sát lịch sử hoạt động, đăng nhập và bảo mật.</p>
        </div>
        {/* Search bar */}
        <div className="relative flex-shrink-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7 7 0 1116.65 16.65z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm email hoặc hành động..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-sm text-slate-700 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 w-full sm:w-64 transition"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tổng nhật ký</p>
          <p className="mt-3 text-3xl font-black text-slate-700">{actionSummary.total}</p>
        </div>
        {["LOGIN", "LOGOUT", "CREATE", "DELETE"].map((action) => (
          <div key={action} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{action}</p>
            <p className="mt-3 text-3xl font-black text-slate-700">{actionSummary[action] || 0}</p>
          </div>
        ))}
      </div>

      {/* Attendance Summary Table */}
      {attendanceSummary.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">📋 Lịch sử đăng nhập (Điểm danh tự động)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Thống kê theo hành động đăng nhập từ nhật ký hệ thống</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-bold text-[11px] uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 font-bold text-[11px] uppercase tracking-wider">Số lần đăng nhập</th>
                  <th className="px-6 py-3 font-bold text-[11px] uppercase tracking-wider">Lần cuối đăng nhập</th>
                </tr>
              </thead>
              <tbody>
                {attendanceSummary.map((u) => (
                  <tr key={u.email} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700 truncate max-w-[200px]" title={u.email}>{u.email}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        {u.loginCount} lần
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {u.lastLogin ? u.lastLogin.toLocaleString("vi-VN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Audit Log Table */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500 font-medium">
          {search ? `Không tìm thấy kết quả cho "${search}"` : "— Chưa có nhật ký nào —"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">📜 Chi tiết nhật ký ({filteredLogs.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-bold text-[11px] uppercase tracking-wider w-[220px]">User</th>
                  <th className="px-6 py-3 font-bold text-[11px] uppercase tracking-wider w-[140px]">Hành động</th>
                  <th className="px-6 py-3 font-bold text-[11px] uppercase tracking-wider">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr key={log.id || index} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 align-top font-medium text-slate-700 truncate max-w-[220px]" title={log.employee_email}>{log.employee_email}</td>
                    <td className="px-6 py-3 align-top">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 align-top text-slate-500 text-xs">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : "—"}
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
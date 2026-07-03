import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { formatRelativeTime, groupNotificationsByDate } from "../../utils/time";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Inbox,
  Check,
  Trash2
} from "lucide-react";

const mapNotificationType = (title = "") => {
  const t = title.toLowerCase();
  if (t.includes("quá hạn")) return "overdue";
  if (t.includes("sắp")) return "approaching";
  if (t.includes("hoàn thành")) return "completed";
  return "assigned";
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" hoặc "unread"

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications");
      setNotifications(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
      setError("Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const handleReadChanged = () => {
      const reload = async () => {
        try {
          const res = await api.get("/notifications");
          setNotifications(Array.isArray(res.data) ? res.data : res.data?.data || []);
        } catch (err) {
          console.error("Lỗi reload thông báo:", err);
        }
      };
      reload();
    };
    window.addEventListener("notification_read_changed", handleReadChanged);
    return () => {
      window.removeEventListener("notification_read_changed", handleReadChanged);
    };
  }, []);

  const notices = useMemo(() => {
    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      created_at: n.created_at,
      unread: !n.is_read,
      type: mapNotificationType(n.title),
    }));
  }, [notifications]);

  const filteredNotices = useMemo(() => {
    if (activeTab === "unread") {
      return notices.filter(n => n.unread);
    }
    return notices;
  }, [notices, activeTab]);

  const groupedNotices = useMemo(() => {
    return groupNotificationsByDate(filteredNotices, "created_at");
  }, [filteredNotices]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new Event("notification_read_changed"));
    } catch (err) {
      console.error("Lỗi đánh dấu đọc thông báo:", err);
    }
  };

  const markAllRead = async () => {
    const unreadNotis = notifications.filter(n => !n.is_read);
    if (unreadNotis.length === 0) return;
    try {
      await Promise.all(unreadNotis.map(n => api.patch(`/notifications/${n.id}/read`)));
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      window.dispatchEvent(new Event("notification_read_changed"));
    } catch (err) {
      console.error("Lỗi đánh dấu đọc tất cả thông báo:", err);
    }
  };

  const getNoticeMeta = (type) => {
    switch (type) {
      case "overdue":
        return {
          icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
          bgColor: "bg-rose-50/50",
          iconBg: "bg-rose-100/50",
          borderColor: "border-rose-100/70 hover:border-rose-200",
          leftStrip: "bg-rose-500"
        };
      case "approaching":
        return {
          icon: <Clock className="h-5 w-5 text-amber-600" />,
          bgColor: "bg-amber-50/40",
          iconBg: "bg-amber-100/50",
          borderColor: "border-amber-100/60 hover:border-amber-200",
          leftStrip: "bg-amber-500"
        };
      case "completed":
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
          bgColor: "bg-emerald-50/30",
          iconBg: "bg-emerald-100/50",
          borderColor: "border-emerald-100/50 hover:border-emerald-200",
          leftStrip: "bg-emerald-500"
        };
      case "assigned":
      default:
        return {
          icon: <UserCheck className="h-5 w-5 text-blue-600" />,
          bgColor: "bg-blue-50/30",
          iconBg: "bg-blue-100/50",
          borderColor: "border-blue-100/50 hover:border-blue-200",
          leftStrip: "bg-blue-500"
        };
    }
  };

  const unreadCount = notices.filter(n => n.unread).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Trung tâm thông báo
            {unreadCount > 0 && (
              <span className="flex h-3 w-3 rounded-full bg-blue-600 animate-ping" />
            )}
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-medium">Theo dõi cảnh báo deadline, phân công và trạng thái dự án của bạn.</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-blue-50 border border-blue-100 px-5 py-3 text-xs font-bold text-blue-600 hover:bg-blue-100/80 transition-all cursor-pointer self-start sm:self-auto shadow-sm"
          >
            <Check size={14} /> Đánh dấu đọc tất cả
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-600 flex items-center gap-2">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex border-b border-slate-100 gap-6">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${activeTab === "all" ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
            }`}
        >
          Tất cả ({notices.length})
          {activeTab === "all" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-800 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("unread")}
          className={`pb-3 text-sm font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${activeTab === "unread" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            }`}
        >
          Chưa đọc
          <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${unreadCount > 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
            }`}>
            {unreadCount}
          </span>
          {activeTab === "unread" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {/* RENDER NOTIFICATION LIST */}
      {loading ? (
        /* Loading Skeleton State */
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-3xl border border-slate-100 bg-white p-5 animate-pulse flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-slate-100 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-2/3 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotices.length === 0 ? (
        /* Beautiful Empty State */
        <div className="rounded-[32px] border border-slate-100 bg-white p-12 text-center shadow-sm max-w-lg mx-auto mt-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-2xl mx-auto text-slate-400 shadow-inner">
            <Inbox size={28} className="text-slate-300 animate-bounce" />
          </div>
          <h3 className="mt-6 text-base font-bold text-slate-800">Không có thông báo mới</h3>
          <p className="mt-2 text-xs text-slate-400 font-medium max-w-xs mx-auto">Tuyệt vời! Bạn đã cập nhật và xử lý mọi cảnh báo trong danh sách.</p>
        </div>
      ) : (
        /* Render Grouped Notices */
        <div className="space-y-8">
          {Object.entries(groupedNotices).map(([groupKey, list]) => {
            if (list.length === 0) return null;

            const groupTitle = groupKey === "today"
              ? "Hôm nay"
              : groupKey === "yesterday"
                ? "Hôm qua"
                : "Cũ hơn";

            return (
              <div key={groupKey} className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">{groupTitle}</h2>

                <div className="grid gap-3.5">
                  {list.map((notice) => {
                    const meta = getNoticeMeta(notice.type);
                    return (
                      <div
                        key={notice.id}
                        className={`relative rounded-3xl border transition-all p-5 flex items-start gap-4 overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-[4px] ${meta.leftStrip} ${notice.unread
                            ? "bg-blue-50/20 border-blue-100/50"
                            : "bg-white border-slate-100"
                          } ${meta.borderColor}`}
                      >
                        {/* Icon Block */}
                        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${meta.iconBg}`}>
                          {meta.icon}
                        </div>

                        {/* Details Description */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-snug truncate">{notice.title}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] sm:text-xs font-medium text-slate-400 whitespace-nowrap">
                                {formatRelativeTime(notice.created_at)}
                              </span>
                              {notice.unread && (
                                <span className="h-2 w-2 rounded-full bg-blue-600" title="Chưa đọc" />
                              )}
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">{notice.message}</p>
                        </div>

                        {/* Quick Mark Read Button */}
                        {notice.unread && (
                          <button
                            onClick={() => markRead(notice.id)}
                            title="Đánh dấu đã đọc"
                            className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0 cursor-pointer self-center"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

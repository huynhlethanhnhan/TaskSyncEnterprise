import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import api from "../../api/axios";

export default function NotificationBell({ onClick }) {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error("Lỗi fetch notifications trong Bell:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const handleSync = () => fetchNotifications();
    window.addEventListener("notification_read_changed", handleSync);
    return () => {
      window.removeEventListener("notification_read_changed", handleSync);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <button 
      onClick={onClick} 
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-100/50 transition-all duration-250 cursor-pointer shadow-xs group"
      title="Xem thông báo"
    >
      <Bell size={18} className="transition-transform duration-300 group-hover:rotate-12 group-active:scale-95" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-black text-white shadow-sm ring-2 ring-white scale-95 animate-in zoom-in duration-200 animate-pulse">
          {unreadCount}
        </span>
      )}
    </button>
  );
}

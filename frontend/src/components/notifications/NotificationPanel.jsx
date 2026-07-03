import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { formatRelativeTime, groupNotificationsByDate } from "../../utils/time";
import { 
  Bell, 
  X, 
  Check, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  Inbox,
  ChevronRight
} from "lucide-react";

export default function NotificationPanel({ notifications, onClose, onMarkRead, onMarkAllRead }) {
  // Sync transitions or close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.unread).length;
  }, [notifications]);

  // Group notifications by date
  const groupedNotices = useMemo(() => {
    return groupNotificationsByDate(notifications, "created_at");
  }, [notifications]);

  const getNoticeMeta = (type) => {
    switch (type) {
      case "overdue":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
          iconBg: "bg-rose-50 text-rose-500",
          leftStrip: "bg-rose-500",
          hoverBorder: "hover:border-rose-100"
        };
      case "approaching":
        return {
          icon: <Clock className="h-4 w-4 text-amber-500" />,
          iconBg: "bg-amber-50 text-amber-500",
          leftStrip: "bg-amber-500",
          hoverBorder: "hover:border-amber-100"
        };
      case "completed":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          iconBg: "bg-emerald-50 text-emerald-500",
          leftStrip: "bg-emerald-500",
          hoverBorder: "hover:border-emerald-100"
        };
      case "assigned":
      default:
        return {
          icon: <UserCheck className="h-4 w-4 text-blue-500" />,
          iconBg: "bg-blue-50 text-blue-500",
          leftStrip: "bg-blue-500",
          hoverBorder: "hover:border-blue-100"
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      
      {/* Click outside to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      
      {/* Sliding Drawer Container */}
      <div className="relative w-full max-w-[380px] h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-350 ease-in-out">
        
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-800">Cảnh báo & Thông báo</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">Mới nhất được hiển thị trên cùng</p>
          </div>
          
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button 
                onClick={onMarkAllRead} 
                title="Đọc tất cả"
                className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <Check size={16} />
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          {notifications.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-300">
                <Inbox size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700">Hộp thư trống</h3>
                <p className="mt-1 text-xs text-slate-400 font-medium max-w-[200px] mx-auto">Bạn không có cảnh báo hay thông báo nào lúc này.</p>
              </div>
            </div>
          ) : (
            /* Render Grouped List */
            <div className="space-y-6">
              {Object.entries(groupedNotices).map(([groupKey, list]) => {
                if (list.length === 0) return null;
                
                const groupTitle = groupKey === "today" 
                  ? "Hôm nay" 
                  : groupKey === "yesterday" 
                    ? "Hôm qua" 
                    : "Cũ hơn";
                    
                return (
                  <div key={groupKey} className="space-y-2.5">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">{groupTitle}</h3>
                    
                    <div className="grid gap-2.5">
                      {list.map((notice) => {
                        const meta = getNoticeMeta(notice.type);
                        return (
                          <div 
                            key={notice.id} 
                            onClick={() => notice.unread && onMarkRead(notice.id)}
                            className={`group relative rounded-2xl border transition-all p-3.5 flex items-start gap-3 overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] ${meta.leftStrip} ${
                              notice.unread 
                                ? "bg-blue-50/15 border-blue-100/40 cursor-pointer" 
                                : "bg-white border-slate-100"
                            } ${meta.hoverBorder}`}
                          >
                            {/* Icon */}
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${meta.iconBg}`}>
                              {meta.icon}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-slate-800 leading-snug truncate group-hover:text-blue-600 transition-colors">
                                  {notice.title}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-[9px] font-medium text-slate-400">
                                    {formatRelativeTime(notice.created_at)}
                                  </span>
                                  {notice.unread && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                                {notice.message}
                              </p>
                            </div>

                            {/* Mark Read Quick Action */}
                            {notice.unread && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkRead(notice.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition-all cursor-pointer flex-shrink-0 self-center"
                                title="Đánh dấu đã đọc"
                              >
                                <Check size={12} />
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

        {/* Drawer Footer Link */}
        <div className="p-4 border-t border-slate-50 bg-slate-50/50">
          <Link 
            to="/notifications" 
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1 py-3 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            Xem tất cả thông báo <ChevronRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}

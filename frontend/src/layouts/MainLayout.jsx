// 📂 FILE: src/layouts/MainLayout.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import NotificationBell from "../components/notifications/NotificationBell";
import NotificationPanel from "../components/notifications/NotificationPanel";
import { Menu } from "lucide-react";


export default function MainLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");

  const toggleSidebarCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebar_collapsed", next ? "true" : "false");
  };

  // State quản lý danh sách dự án từ Backend
  const [projects, setProjects] = useState([]);
  const [sidebarTasks, setSidebarTasks] = useState([]);
  const [sidebarEmployees, setSidebarEmployees] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [apiNotifications, setApiNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      setApiNotifications(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error("Lỗi fetch notifications:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const handleReload = () => fetchNotifications();
    window.addEventListener("notification_read_changed", handleReload);
    return () => {
      window.removeEventListener("notification_read_changed", handleReload);
    };
  }, [fetchNotifications]);

  // State quản lý trạng thái đóng/mở và dữ liệu của POPUP FORM MODAL (Chỉ dành cho Project)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" hoặc "update"
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectNameInput, setProjectNameInput] = useState("");

  // Tự động nhận diện tài khoản ADMIN dựa trên email test độc quyền của bạn
  const [user, setUser] = useState(() => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const email = savedUser.email || "thanhnhan1807@gmail.com";
    const role = savedUser.role || (email === "thanhnhan1807@gmail.com" ? "admin" : "staff");
    const name = savedUser.full_name || savedUser.name || (email === "thanhnhan1807@gmail.com" ? "Thanh Nhân (Admin)" : "Nhân viên");
    const avatar_url = savedUser.avatar_url || null;
    return {
      name,
      email,
      role,
      avatar_url,
    };
  });

  useEffect(() => {
    const handleUserChange = () => {
      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const email = savedUser.email || "thanhnhan1807@gmail.com";
      const role = savedUser.role || (email === "thanhnhan1807@gmail.com" ? "admin" : "staff");
      const name = savedUser.full_name || savedUser.name || (email === "thanhnhan1807@gmail.com" ? "Thanh Nhân (Admin)" : "Nhân viên");
      const avatar_url = savedUser.avatar_url || null;
      setUser({ name, email, role, avatar_url });
    };

    window.addEventListener("storage_user_changed", handleUserChange);
    return () => {
      window.removeEventListener("storage_user_changed", handleUserChange);
    };
  }, []);

  // 1. READ: Chỉ lấy danh sách Dự án tổng để hiển thị lên Sidebar
  const fetchSidebarProjects = useCallback(async () => {
    try {
      const [projectRes, taskRes, employeeRes] = await Promise.all([
        api.get("/projects").catch(() => ({ data: [] })),
        api.get("/tasks").catch(() => ({ data: [] })),
        api.get("/employees").catch(() => ({ data: [] })),
      ]);
 
      const projectsList = Array.isArray(projectRes.data)
        ? projectRes.data
        : projectRes.data?.data || [];
      const tasksList = Array.isArray(taskRes.data)
        ? taskRes.data
        : taskRes.data?.data || [];
      const employeesList = Array.isArray(employeeRes.data)
        ? employeeRes.data
        : employeeRes.data?.data || [];

      const currentActiveId = Number(localStorage.getItem("active_project_id"));

      setSidebarTasks(tasksList);
      setSidebarEmployees(employeesList);
      setProjects(projectsList.map((proj, index) => {
        const stats = tasksList.reduce(
          (acc, task) => {
            if (Number(task.project_id) !== Number(proj.id)) return acc;
            acc.total += 1;
            if (task.status === "To Do") acc.todo += 1;
            if (task.status === "In Progress") acc.in_progress += 1;
            if (task.status === "Done") acc.done += 1;
            return acc;
          },
          { total: 0, todo: 0, in_progress: 0, done: 0 }
        );

        return {
          id: proj.id,
          name: proj.name,
          project_code: proj.project_code,
          active: currentActiveId ? proj.id === currentActiveId : index === 0,
          stats,
          progress_percent: stats.total ? Math.round((stats.done / stats.total) * 100) : 0,
        };
      }));

      if (projectsList.length > 0 && !localStorage.getItem("active_project_id")) {
        localStorage.setItem("active_project_id", projectsList[0].id);
        localStorage.setItem("active_project_name", projectsList[0].name);
      }

    } catch (err) {
      console.error("Lỗi tải danh sách dự án Sidebar:", err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    }
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => { if (isMounted) await fetchSidebarProjects(); };
    loadData();
    return () => { isMounted = false; };
  }, [location.pathname, fetchSidebarProjects]);

  // 🟢 HÀM XỬ LÝ KHI NHÂN CLICK CHỌN 1 DỰ ÁN TRÊN SIDEBAR
  const handleSelectProject = (projId, projName) => {
    localStorage.setItem("active_project_id", projId);
    localStorage.setItem("active_project_name", projName);
    
    // Cập nhật trạng thái hiển thị sáng/tối lập tức trên giao diện Sidebar
    setProjects(prev => prev.map(p => ({ ...p, active: p.id === projId })));

    // Bắn tín hiệu thông báo cho trang DashboardPage biết để tự động reload lại Task tương ứng
    window.dispatchEvent(new Event("storage_project_changed"));
    navigate(`/projects/${projId}`);
  };

  // Điều hướng mở Popup Tạo mới Project
  const openCreateModal = () => {
    setModalMode("create");
    setProjectNameInput("");
    setIsModalOpen(true);
  };

  // Điều hướng mở Popup Sửa Project
  const openUpdateModal = (proj) => {
    setModalMode("update");
    setEditingProjectId(proj.id);
    setProjectNameInput(proj.name);
    setIsModalOpen(true);
  };

  // Xử lý Submit Form của Project (Create / Update)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!projectNameInput.trim()) return;

    if (modalMode === "create") {
      const randomCode = "PRJ" + Math.floor(1000 + Math.random() * 9000);
      const mockProjectData = {
        project_code: randomCode,
        name: projectNameInput.trim(),
        description: "Tạo từ Form Popup xịn",
        status: "Planning",
        priority: "Medium",
      };

      try {
        await api.post("/projects", mockProjectData);
        setIsModalOpen(false);
        fetchSidebarProjects();
      } catch (err) {
        console.error("Lỗi thêm dự án:", err.response?.data || err);
      }
    } else {
      try {
        await api.put(`/projects/${editingProjectId}`, { name: projectNameInput.trim() });
        setIsModalOpen(false);
        fetchSidebarProjects();
        if (editingProjectId === Number(localStorage.getItem("active_project_id"))) {
          localStorage.setItem("active_project_name", projectNameInput.trim());
          window.dispatchEvent(new Event("storage_project_changed"));
        }
      } catch (err) {
        console.error("Lỗi cập nhật dự án:", err.response?.data || err);
      }
    }
  };

  // Xóa Dự án khỏi hệ thống
  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa dự án này khỏi hệ thống?")) {
      try {
        await api.delete(`/projects/${projectId}`);
        if (projectId === Number(localStorage.getItem("active_project_id"))) {
          localStorage.removeItem("active_project_id");
          localStorage.removeItem("active_project_name");
        }
        fetchSidebarProjects();
        window.dispatchEvent(new Event("storage_project_changed"));
      } catch (err) {
        console.error("Lỗi xóa dự án:", err.response?.data || err);
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const mapNotificationType = (title = "") => {
    const t = title.toLowerCase();
    if (t.includes("quá hạn")) return "overdue";
    if (t.includes("sắp")) return "approaching";
    if (t.includes("hoàn thành")) return "completed";
    return "assigned";
  };

  const notifications = useMemo(() => {
    return apiNotifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      created_at: n.created_at,
      unread: !n.is_read,
      type: mapNotificationType(n.title),
    }));
  }, [apiNotifications]);

  const handleMarkNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setApiNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new Event("notification_read_changed"));
    } catch (err) {
      console.error("Lỗi đánh dấu đọc thông báo:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotis = apiNotifications.filter((n) => !n.is_read);
    if (unreadNotis.length === 0) return;
    try {
      await Promise.all(unreadNotis.map((n) => api.patch(`/notifications/${n.id}/read`)));
      setApiNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event("notification_read_changed"));
    } catch (err) {
      console.error("Lỗi đánh dấu đọc tất cả thông báo:", err);
    }
  };

  const unreadCount = notifications.filter((notice) => notice.unread).length;

  return (
    <div className={`w-full min-h-screen bg-[#f8fafc] flex flex-col md:grid transition-all duration-300 ${sidebarCollapsed ? "md:grid-cols-[76px_1fr]" : "md:grid-cols-[260px_1fr]"}`}>
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-100 p-4 sticky top-0 z-20">
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-500 hover:text-slate-700">
          <Menu size={20} />
        </button>
        <span className="font-bold text-base text-slate-800 tracking-tight">TaskFlow</span>
        <div className="flex items-center gap-2">
          <NotificationBell count={unreadCount} onClick={() => setIsNotificationOpen(!isNotificationOpen)} hasUnread={unreadCount > 0} />
        </div>
      </div>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/40 z-30 md:hidden" />
      )}
      
      {/* ⬅️ CỘT 1: SIDEBAR CHUẨN FIGMA */}
      <div className={`bg-white border-r border-slate-100 p-4 flex flex-col justify-between h-screen sticky top-0 overflow-y-auto select-none z-40 transition-all duration-300 fixed md:sticky inset-y-0 left-0 ${sidebarCollapsed ? "w-[76px]" : "w-[260px]"} ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div>
          {/* Logo TaskFlow & Expand/Collapse Toggle */}
          <div className={`flex items-center justify-between mb-6 px-1 ${sidebarCollapsed ? "flex-col gap-3" : ""}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✨</div>
              {!sidebarCollapsed && <span className="font-bold text-base text-slate-800 tracking-tight truncate">TaskFlow</span>}
            </div>
            <button onClick={toggleSidebarCollapse} className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              {sidebarCollapsed ? "▶" : "◀"}
            </button>
          </div>
          
          {/* Menu Điều Hướng */}
          <nav className="space-y-1">
            <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/dashboard") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Overview">
              <span className="text-lg flex-shrink-0">🎛️</span>
              {!sidebarCollapsed && <span>Overview</span>}
            </Link>
            
            {(user.role === "admin" || user.role === "manager") && (
              <Link to="/projects" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/projects") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Projects">
                <span className="text-lg flex-shrink-0">💼</span>
                {!sidebarCollapsed && <span>Projects</span>}
              </Link>
            )}

            <Link to="/tasks" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/tasks") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Tasks">
              <span className="text-lg flex-shrink-0">🧾</span>
              {!sidebarCollapsed && <span>Tasks</span>}
            </Link>
            
            <Link to="/calendar" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/calendar") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Calendar">
              <span className="text-lg flex-shrink-0">📅</span>
              {!sidebarCollapsed && <span>Calendar</span>}
            </Link>

            {(user.role === "admin" || user.role === "manager") && (
              <Link to="/departments" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/departments") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Departments">
                <span className="text-lg flex-shrink-0">🏢</span>
                {!sidebarCollapsed && <span>Departments</span>}
              </Link>
            )}

            {(user.role === "admin" || user.role === "manager") && (
              <Link to="/employees" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/employees") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Employees">
                <span className="text-lg flex-shrink-0">👥</span>
                {!sidebarCollapsed && <span>Employees</span>}
              </Link>
            )}

            <Link to="/vacations" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/vacations") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Vacations">
              <span className="text-lg flex-shrink-0">🌴</span>
              {!sidebarCollapsed && <span>Vacations</span>}
            </Link>
            
            <Link to="/notifications" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/notifications") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Notifications">
              <span className="text-lg flex-shrink-0">🔔</span>
              {!sidebarCollapsed && <span>Notifications</span>}
            </Link>
            
            <Link to="/settings" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/settings") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Settings">
              <span className="text-lg flex-shrink-0">⚙️</span>
              {!sidebarCollapsed && <span>Settings</span>}
            </Link>

            {user.role === "admin" && (
              <Link to="/audit" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/audit") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Audit">
                <span className="text-lg flex-shrink-0">📜</span>
                {!sidebarCollapsed && <span>Audit</span>}
              </Link>
            )}

            <Link to="/profile" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${isActive("/profile") ? "bg-blue-50/70 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center" : ""}`} title="Profile">
              <span className="text-lg flex-shrink-0">🧑</span>
              {!sidebarCollapsed && <span>Profile</span>}
            </Link>
          </nav>

          {/* 📂 KHỐI PROJECTS DỮ LIỆU ĐỘNG */}
          {!sidebarCollapsed && (
            <div className="mt-6">
              <div className="flex justify-between items-center px-3 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projects</span>
                {user.role === "admin" && (
                  <button onClick={openCreateModal} className="text-slate-400 hover:text-blue-600 text-xs font-bold transition-colors">＋</button>
                )}
              </div>
              
              <div className="space-y-0.5">
                {projects.map(proj => (
                  <div 
                    key={proj.id} 
                    onClick={() => { setSidebarOpen(false); handleSelectProject(proj.id, proj.name); }}
                    onDoubleClick={() => { if (user.role === "admin") openUpdateModal(proj); }}
                    title={user.role === "admin" ? "Click để xem việc - Click đúp chuột để đổi tên dự án" : "Click để xem công việc"}
                    className={`flex justify-between items-center px-3 py-2 rounded-xl text-xs transition-all cursor-pointer group ${
                      proj.active ? "bg-slate-100 text-slate-800 font-bold" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] shadow-sm group-hover:bg-white transition-colors flex-shrink-0">💼</span>
                      <span className="truncate" title={proj.name}>{proj.name}</span>
                    </span> 
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {user.role === "admin" && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }} 
                          className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all text-[10px] font-bold px-0.5"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        
        {/* Khối Profile & Đăng xuất */}
        <div className="space-y-2 mt-6">
          <div className={`flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <img 
              src={user.avatar_url ? (user.avatar_url.startsWith("http") ? user.avatar_url : `http://127.0.0.1:8001${user.avatar_url}`) : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop"} 
              alt="Avatar" 
              className="w-9 h-9 rounded-full object-cover border border-blue-100 shadow-sm flex-shrink-0" 
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-700 truncate">{user.name}</span>
                <span className="text-[10px] text-slate-400 font-medium truncate">{user.email}</span>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100/80 rounded-xl border border-red-100 transition-all cursor-pointer ${sidebarCollapsed ? "px-0" : ""}`} title="Đăng xuất">
            🚪 {!sidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </div>

      {/* 🏢 CỘT 2: TRUNG TÂM & TOPBAR */}
      <div className="p-4 md:p-8 overflow-y-auto max-h-screen flex flex-col gap-6">
        
        {/* Top bar header for Desktop / Tablet */}
        <header className="hidden md:flex items-center justify-between bg-white border border-slate-100 px-6 py-3.5 rounded-[24px] shadow-sm relative">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.16em] font-extrabold text-slate-400">Workspace / Active Session</span>
          </div>
          
          <div className="flex items-center gap-4 relative">
            
            {/* Notification Bell with Absolute Popover Dropdown */}
            <div className="relative">
              <NotificationBell count={unreadCount} onClick={() => setIsNotificationOpen(!isNotificationOpen)} hasUnread={unreadCount > 0} />
              
              {isNotificationOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsNotificationOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-3xl shadow-xl z-40 p-4 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-50 mb-3">
                      <span className="font-bold text-xs text-slate-700">Thông báo ({unreadCount})</span>
                      <button onClick={handleMarkAllAsRead} className="text-[10px] text-blue-600 hover:text-blue-800 font-bold">Đánh dấu đã đọc</button>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-medium">— Không có thông báo —</div>
                      ) : (
                        notifications.map(notice => (
                          <div 
                            key={notice.id} 
                            onClick={() => { handleMarkNotificationRead(notice.id); }}
                            className={`p-2.5 rounded-2xl border text-[11px] transition-all cursor-pointer ${
                              notice.unread 
                                ? "bg-blue-50/40 border-blue-100 text-slate-700 font-semibold" 
                                : "bg-slate-50/50 border-slate-100 text-slate-500"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold truncate max-w-[200px]">{notice.title}</span>
                              {notice.unread && <span className="h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0" />}
                            </div>
                            <p className="leading-relaxed">{notice.message}</p>
                            <span className="text-[9px] text-slate-400 block mt-1">{new Date(notice.created_at).toLocaleDateString("vi-VN")}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-6 w-[1px] bg-slate-100" />
            <Link to="/profile" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <img 
                  src={user.avatar_url ? (user.avatar_url.startsWith("http") ? user.avatar_url : `http://127.0.0.1:8001${user.avatar_url}`) : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop"} 
                  alt="Avatar" 
                  className="h-full w-full object-cover" 
                />
              </div>
              <span className="text-xs font-bold text-slate-700 hidden lg:inline">{user.name}</span>
            </Link>
          </div>
        </header>

        {/* Dynamic content rendering inside topbar layout */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Mobile view notification overlay */}
      {isNotificationOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden flex justify-end">
          <div className="w-80 h-full bg-white p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-800">Thông báo ({unreadCount})</h3>
                <button onClick={() => setIsNotificationOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
              </div>
              <div className="mt-4 max-h-[70vh] overflow-y-auto space-y-3 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 font-medium">— Không có thông báo —</div>
                ) : (
                  notifications.map(notice => (
                    <div 
                      key={notice.id} 
                      onClick={() => { handleMarkNotificationRead(notice.id); }}
                      className={`p-3 rounded-2xl border text-xs transition-all ${
                        notice.unread 
                          ? "bg-blue-50/40 border-blue-100 text-slate-700 font-semibold" 
                          : "bg-slate-50/50 border-slate-100 text-slate-500"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold">{notice.title}</span>
                        {notice.unread && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                      </div>
                      <p className="leading-relaxed text-[11px]">{notice.message}</p>
                      <span className="text-[10px] text-slate-400 block mt-1">{new Date(notice.created_at).toLocaleDateString("vi-VN")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <button onClick={handleMarkAllAsRead} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors">Đánh dấu tất cả đã đọc</button>
          </div>
        </div>
      )}

      {/* 🔮 FORM POPUP SỬA/TẠO PROJECT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">
                {modalMode === "create" ? "🆕 Tạo Dự Án Mới" : "✏️ Đổi Tên Dự Án"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tên Dự Án</label>
                <input 
                  type="text" autoFocus value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  placeholder="Nhập tên dự án..." 
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700"
                />
              </div>
              <div className="flex gap-2 pt-2 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl">Hủy</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl">
                  {modalMode === "create" ? "Tạo ngay" : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
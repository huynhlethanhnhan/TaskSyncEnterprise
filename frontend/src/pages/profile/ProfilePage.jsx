import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Camera, 
  Upload, 
  X, 
  Briefcase, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Sparkles,
  ShieldCheck,
  TrendingUp
} from "lucide-react";

export default function ProfilePage() {
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [user, setUser] = useState(savedUser);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employeeRecord, setEmployeeRecord] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  const [formState, setFormState] = useState({
    full_name: savedUser.full_name || savedUser.name || "",
    email: savedUser.email || "",
    phone: savedUser.phone || "",
    gender: savedUser.gender || "",
    address: savedUser.address || "",
    date_of_birth: savedUser.date_of_birth || "",
    emergency_contact: localStorage.getItem(`emergency_${savedUser.id}`) || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [taskRes, departmentRes, employeeRes] = await Promise.all([
          api.get("/tasks").catch(() => ({ data: [] })),
          api.get("/departments").catch(() => ({ data: [] })),
          api.get("/employees").catch(() => ({ data: [] })),
        ]);
        const fetchedTasks = Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || [];
        const fetchedDepartments = Array.isArray(departmentRes.data) ? departmentRes.data : departmentRes.data?.data || [];
        const fetchedEmployees = Array.isArray(employeeRes.data) ? employeeRes.data : employeeRes.data?.data || [];

        setTasks(fetchedTasks);
        setDepartments(fetchedDepartments);
        
        const record = fetchedEmployees.find((emp) => Number(emp.id) === Number(savedUser.id)) || null;
        if (record) {
          setEmployeeRecord(record);
        }
      } catch (err) {
        console.error("Lỗi tải hồ sơ:", err);
        setError("Không thể tải dữ liệu hồ sơ.");
      }
    };
    loadData();
  }, [savedUser.id]);

  const currentUser = employeeRecord || user;
  const department = departments.find((dept) => dept.id === currentUser.department_id);

  // Sync formState whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFormState({
        full_name: currentUser.full_name || currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        gender: currentUser.gender || "",
        address: currentUser.address || "",
        date_of_birth: currentUser.date_of_birth || "",
        emergency_contact: localStorage.getItem(`emergency_${currentUser.id}`) || "",
      });
    }
  }, [currentUser]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const counts = useMemo(() => {
    const now = new Date();
    return tasks.reduce(
      (acc, task) => {
        const assigneeId = task.assigned_to;
        if (Number(assigneeId) !== Number(currentUser.id)) return acc;
        acc.total += 1;
        if (task.status === "To Do") acc.todo += 1;
        if (task.status === "In Progress") acc.inProgress += 1;
        if (task.status === "Done") acc.done += 1;
        if (task.deadline && new Date(task.deadline) < now && task.status !== "Done") acc.overdue += 1;
        return acc;
      },
      { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 }
    );
  }, [tasks, currentUser.id]);

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formState.full_name.trim() || !formState.email.trim()) {
      setError("Vui lòng điền đầy đủ họ tên và email.");
      return;
    }

    try {
      if (currentUser?.id) {
        // 1. Cập nhật mật khẩu nếu được nhập
        if (passwordForm.old_password || passwordForm.new_password || passwordForm.confirm_password) {
          if (!passwordForm.old_password || !passwordForm.new_password || !passwordForm.confirm_password) {
            setError("Vui lòng nhập đầy đủ mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu.");
            return;
          }
          if (passwordForm.new_password !== passwordForm.confirm_password) {
            setError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
            return;
          }
          await api.post("/auth/change-password", {
            old_password: passwordForm.old_password,
            new_password: passwordForm.new_password,
            confirm_password: passwordForm.confirm_password
          });
        }

        // 2. Cập nhật thông tin nhân viên
        await api.put(`/employees/${currentUser.id}`, {
          full_name: formState.full_name,
          email: formState.email,
          phone: formState.phone || null,
          gender: formState.gender || null,
          address: formState.address || null,
          date_of_birth: formState.date_of_birth || null,
        });

        // 3. Lưu Emergency Contact vào LocalStorage vì DB không hỗ trợ
        localStorage.setItem(`emergency_${currentUser.id}`, formState.emergency_contact);

        const updatedUser = {
          ...user,
          full_name: formState.full_name,
          name: formState.full_name,
          email: formState.email,
          phone: formState.phone || null,
          gender: formState.gender || null,
          address: formState.address || null,
          date_of_birth: formState.date_of_birth || null,
        };

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (employeeRecord) {
          setEmployeeRecord((prev) => prev ? { ...prev, ...updatedUser } : prev);
        }
        
        // Broadcast custom storage event to update sidebar details immediately
        window.dispatchEvent(new Event("storage_user_changed"));
        
        setSuccess("Thông tin cá nhân và mật khẩu đã được cập nhật thành công.");
        setEditMode(false);
        setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
      }
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ:", err);
      setError(err.response?.data?.detail || "Không thể lưu thông tin cá nhân. Vui lòng kiểm tra lại mật khẩu cũ.");
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate extension & type
    const allowedExtensions = ["png", "jpg", "jpeg", "webp"];
    const extension = file.name.split(".").pop().toLowerCase();
    const isValidExtension = allowedExtensions.includes(extension);
    const isValidMime = file.type.startsWith("image/");

    if (!isValidExtension || !isValidMime) {
      setError("Định dạng file không hỗ trợ! Chỉ chấp nhận: png, jpg, jpeg, webp");
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Dung lượng ảnh đại diện không được vượt quá 5MB!");
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    setError("");
    setSuccess("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCancelPreview = () => {
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    setError("");
    setSuccess("");
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      setError("Vui lòng chọn ảnh trước khi tải lên.");
      return;
    }

    setUploadingAvatar(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", avatarFile);

      const res = await api.post("/employees/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const avatar_url = res.data.avatar_url;
      const updatedUser = {
        ...user,
        avatar_url,
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (employeeRecord) {
        setEmployeeRecord((prev) => prev ? { ...prev, avatar_url } : prev);
      }

      // Cleanup object URL
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      setAvatarFile(null);
      setSuccess("Ảnh đại diện đã được cập nhật thành công.");
      
      // Dispatch storage event to trigger sidebar refresh
      window.dispatchEvent(new Event("storage_user_changed"));
    } catch (err) {
      console.error("Lỗi tải lên ảnh đại diện:", err);
      setError(err.response?.data?.detail || "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Avatar path helper
  const getAvatarSrc = () => {
    if (avatarPreview) return avatarPreview;
    if (currentUser.avatar_url) {
      return currentUser.avatar_url.startsWith("http") 
        ? currentUser.avatar_url 
        : `http://127.0.0.1:8001${currentUser.avatar_url}`;
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      
      {/* 🚀 BANNER PROFILE CARD */}
      <div className="relative rounded-[32px] overflow-hidden border border-slate-100 bg-white p-6 sm:p-8 shadow-sm">
        {/* Background Accent Gradients */}
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-50/60 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-20 h-32 w-32 rounded-full bg-indigo-50/40 blur-2xl -z-10" />
        
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            
            {/* Avatar Group */}
            <div className="relative group">
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-slate-50 border border-slate-100 overflow-hidden shadow-sm">
                {getAvatarSrc() ? (
                  <img src={getAvatarSrc()} alt={currentUser.full_name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="text-3xl font-extrabold text-blue-600 bg-blue-50/80 w-full h-full flex items-center justify-center">
                    {(currentUser.full_name || currentUser.name || "U").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                )}
              </div>

              {/* Upload Overlay Button */}
              <label className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md transition-all">
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                <Camera size={16} />
              </label>
            </div>

            {/* Profile Info Details */}
            <div className="text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{currentUser.full_name || currentUser.name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-100/50">
                  <Sparkles size={12} /> {currentUser.job_title || "Nhân viên"}
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                <Mail size={14} /> {currentUser.email}
              </p>
              <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-2 font-medium">
                <Briefcase size={14} className="text-slate-400" />
                <span>{department?.name || "Phòng ban chưa cập nhật"}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500" /> {currentUser.role || "Nhân viên"}
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons (Edit & Change password) */}
          <div className="flex flex-row justify-center gap-3 self-center sm:self-auto">
            <button 
              onClick={() => setEditMode((prev) => !prev)} 
              className={`rounded-2xl px-5 py-3 text-sm font-bold shadow-sm transition-all border cursor-pointer ${
                editMode 
                  ? "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {editMode ? "Hủy bỏ" : "Chỉnh sửa"}
            </button>
            <button 
              onClick={() => window.location.href = "/change-password"} 
              className="rounded-2xl bg-blue-600 border border-transparent px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/10 hover:bg-blue-700 hover:shadow-blue-500/20 transition-all cursor-pointer"
            >
              Đổi mật khẩu
            </button>
          </div>
        </div>

        {/* Live Preview Floating Notification */}
        {avatarFile && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100/50 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
              <p className="text-xs sm:text-sm font-semibold text-blue-700">Đang chọn ảnh: <span className="font-bold">{avatarFile.name}</span></p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={handleUploadAvatar} 
                disabled={uploadingAvatar}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
              >
                <Upload size={14} /> {uploadingAvatar ? "Đang tải..." : "Tải ảnh lên"}
              </button>
              <button 
                onClick={handleCancelPreview}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-all cursor-pointer"
              >
                <X size={14} /> Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ERROR & SUCCESS ALERTS */}
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-600 flex items-center gap-2 animate-in fade-in zoom-in-95">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-emerald-600 flex items-center gap-2 animate-in fade-in zoom-in-95">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* 🛠️ FORM EDIT SECTION */}
      {editMode && (
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 sm:p-8 shadow-sm animate-in slide-in-from-bottom-6 duration-300">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-6">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">🛠️</span>
            <h2 className="text-lg font-bold text-slate-800">Chỉnh sửa thông tin cá nhân</h2>
          </div>
          
          <form onSubmit={handleSave} className="grid gap-5 md:grid-cols-2">
            
            {/* Họ và Tên */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><User size={13} /> Họ và tên</label>
              <input 
                type="text"
                value={formState.full_name} 
                onChange={(e) => setFormState((prev) => ({ ...prev, full_name: e.target.value }))} 
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all" 
              />
            </div>
            
            {/* Email (Read Only / Locked for Security) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Mail size={13} /> Email</label>
              <input 
                type="email" 
                value={formState.email} 
                disabled
                className="w-full rounded-2xl border border-slate-100 bg-slate-100/70 px-4 py-3 text-sm font-medium text-slate-400 outline-none cursor-not-allowed" 
              />
            </div>

            {/* Số điện thoại */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Phone size={13} /> Số điện thoại</label>
              <input 
                type="tel"
                value={formState.phone} 
                onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))} 
                placeholder="Chưa cập nhật số điện thoại"
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all" 
              />
            </div>

            {/* Giới tính */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">⚧ Giới tính</label>
              <select 
                value={formState.gender} 
                onChange={(e) => setFormState((prev) => ({ ...prev, gender: e.target.value }))}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all"
              >
                <option value="">Chọn giới tính</option>
                <option value="Male">Nam</option>
                <option value="Female">Nữ</option>
                <option value="Other">Khác</option>
              </select>
            </div>

            {/* Ngày sinh */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={13} /> Ngày sinh (Birthday)</label>
              <input 
                type="date" 
                value={formState.date_of_birth} 
                onChange={(e) => setFormState((prev) => ({ ...prev, date_of_birth: e.target.value }))} 
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all" 
              />
            </div>

            {/* Địa chỉ */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><MapPin size={13} /> Địa chỉ liên hệ</label>
              <input 
                type="text"
                value={formState.address} 
                onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))} 
                placeholder="Nhập địa chỉ nhà, căn hộ của bạn"
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all" 
              />
            </div>

            {/* Liên hệ khẩn cấp */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Phone size={13} /> Liên hệ khẩn cấp (Emergency Contact)</label>
              <input 
                type="text"
                value={formState.emergency_contact} 
                onChange={(e) => setFormState((prev) => ({ ...prev, emergency_contact: e.target.value }))} 
                placeholder="Tên và số điện thoại người liên hệ khẩn cấp"
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all" 
              />
            </div>

            {/* Inline Đổi Mật Khẩu */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">🔑 Thay đổi mật khẩu tài khoản (Tùy chọn)</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Mật khẩu hiện tại</label>
                  <input 
                    type="password"
                    value={passwordForm.old_password} 
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, old_password: e.target.value }))} 
                    placeholder="Mật khẩu cũ"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Mật khẩu mới</label>
                  <input 
                    type="password"
                    value={passwordForm.new_password} 
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))} 
                    placeholder="Mật khẩu mới"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Xác nhận mật khẩu mới</label>
                  <input 
                    type="password"
                    value={passwordForm.confirm_password} 
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))} 
                    placeholder="Xác nhận mật khẩu"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all" 
                  />
                </div>
              </div>
            </div>

            {/* Submit Action Block */}
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setEditMode(false)} 
                className="rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-6 py-3 text-sm font-bold text-slate-600 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className="rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer"
              >
                Lưu các thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📊 ACCOUNT STATISTICS PANEL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Todo Stats */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-200 group-hover:bg-blue-400 transition-colors" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">📋 Todo</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-700 tracking-tight">{counts.todo}</p>
        </div>

        {/* In Progress Stats */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-200 group-hover:bg-amber-400 transition-colors" />
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center justify-center gap-1"><Clock size={12} /> Progress</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-700 tracking-tight">{counts.inProgress}</p>
        </div>

        {/* Done Stats */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-200 group-hover:bg-emerald-400 transition-colors" />
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Done</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-700 tracking-tight">{counts.done}</p>
        </div>

        {/* Overdue Stats */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 text-center relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-200 group-hover:bg-rose-400 transition-colors" />
          <p className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center justify-center gap-1"><AlertCircle size={12} /> Quá hạn</p>
          <p className="mt-3 text-3xl font-extrabold text-rose-600 tracking-tight">{counts.overdue}</p>
        </div>
      </div>

      {/* 🏢 DETAILED PROFILE CARDS */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Card 1: Account Details */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm relative">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-4">
            <span className="text-blue-500 bg-blue-50 p-1.5 rounded-lg text-sm">📋</span>
            <h2 className="text-base font-bold text-slate-800">Tóm tắt hồ sơ nhân sự</h2>
          </div>
          
          <div className="space-y-4 text-sm font-medium text-slate-600">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400 flex items-center gap-1.5"><User size={14} /> Giới tính</span>
              <span className="text-slate-800 font-semibold">{currentUser.gender === "Male" ? "Nam" : currentUser.gender === "Female" ? "Nữ" : currentUser.gender === "Other" ? "Khác" : "Chưa cập nhật"}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={14} /> Ngày sinh</span>
              <span className="text-slate-800 font-semibold">{currentUser.date_of_birth ? new Date(currentUser.date_of_birth).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400 flex items-center gap-1.5"><Phone size={14} /> Điện thoại</span>
              <span className="text-slate-800 font-semibold">{currentUser.phone || "Chưa cập nhật"}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400 flex items-center gap-1.5"><Phone size={14} /> Liên hệ khẩn cấp</span>
              <span className="text-slate-800 font-semibold">{localStorage.getItem(`emergency_${currentUser.id}`) || "Chưa cập nhật"}</span>
            </div>
            <div className="flex justify-between items-start py-0.5">
              <span className="text-slate-400 flex items-center gap-1.5 flex-shrink-0 mt-0.5"><MapPin size={14} /> Địa chỉ</span>
              <span className="text-slate-800 font-semibold text-right max-w-[200px] break-words">{currentUser.address || "Chưa cập nhật"}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Account Activity */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-4">
            <span className="text-indigo-500 bg-indigo-50/70 p-1.5 rounded-lg text-sm"><TrendingUp size={14} /></span>
            <h2 className="text-base font-bold text-slate-800">Hoạt động gần đây</h2>
          </div>
          
          <div className="space-y-4 text-sm font-medium text-slate-600">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Lần đăng nhập cuối</span>
              <span className="text-slate-800 font-semibold">{user.last_login ? new Date(user.last_login).toLocaleString("vi-VN") : "Không khả dụng"}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Lần đăng xuất cuối</span>
              <span className="text-slate-800 font-semibold">{user.last_logout ? new Date(user.last_logout).toLocaleString("vi-VN") : "Không khả dụng"}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Số lần truy cập hệ thống</span>
              <span className="text-blue-600 font-bold bg-blue-50/70 px-2.5 py-0.5 rounded-full text-xs border border-blue-100/50">{user.login_count || "0"} lần</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

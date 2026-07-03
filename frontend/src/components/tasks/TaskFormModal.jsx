import { useEffect, useMemo, useState, useRef } from "react";
import api from "../../api/axios";

const STATUS_SECTIONS = [
  { key: "To Do", label: "To Do" },
  { key: "In Progress", label: "In Progress" },
  { key: "Done", label: "Done" },
];

const PRIORITIES = ["Low", "Medium", "High"];

export default function TaskFormModal({ open, onClose, task, onSave, projects = [], employees = [], departments = [] }) {
  const currentUser = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const isStaff = useMemo(() => Number(currentUser.role_id) === 3 || currentUser.role === "employee", [currentUser]);

  const [editingTask, setEditingTask] = useState(task);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    project_id: "",
    assigned_employee_id: "",
    status: "To Do",
    priority: "Medium",
    deadline: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // full-panel loading overlay
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // inline delete confirm
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const fileInputRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const employeesById = useMemo(() => Object.fromEntries(employees.map(emp => [emp.id, emp])), [employees]);
  const departmentsById = useMemo(() => Object.fromEntries(departments.map(dept => [dept.id, dept])), [departments]);

  // When modal opens with an existing task → always fetch fresh data from backend
  useEffect(() => {
    if (!open) return;
    if (task?.id) {
      setIsRefreshing(true);
      api.get(`/tasks/${task.id}`)
        .then(res => {
          setEditingTask(res.data);
          setTaskForm({
            title: res.data.title || "",
            description: res.data.description || "",
            project_id: res.data.project_id || "",
            assigned_employee_id: res.data.assigned_to || res.data.created_by || "",
            status: res.data.status || "To Do",
            priority: res.data.priority || "Medium",
            deadline: res.data.deadline ? res.data.deadline.slice(0, 10) : "",
          });
        })
        .catch(() => {
          // fallback to prop data if fetch fails
          setEditingTask(task);
          setTaskForm({
            title: task.title || "",
            description: task.description || "",
            project_id: task.project_id || "",
            assigned_employee_id: task.assigned_to || task.created_by || "",
            status: task.status || "To Do",
            priority: task.priority || "Medium",
            deadline: task.deadline ? task.deadline.slice(0, 10) : "",
          });
        })
        .finally(() => setIsRefreshing(false));
    } else {
      setEditingTask(null);
      setTaskForm({
        title: "",
        description: "",
        project_id: projects[0]?.id || "",
        assigned_employee_id: "",
        status: "To Do",
        priority: "Medium",
        deadline: "",
      });
    }
    setErrorMessage("");
    setConfirmDeleteId(null);
  }, [task, open]); // eslint-disable-line

  const handleTaskFormChange = (key, value) => {
    setTaskForm(prev => ({ ...prev, [key]: value }));
  };

  const refreshTask = async () => {
    if (!editingTask) return;
    setIsRefreshing(true);
    try {
      const taskRes = await api.get(`/tasks/${editingTask.id}`);
      setEditingTask(taskRes.data);
      return taskRes.data;
    } catch (err) {
      console.error("Lỗi reload task:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingTask) return;
    // Reset input so same file can be re-selected later
    if (fileInputRef.current) fileInputRef.current.value = "";

    const formData = new FormData();
    formData.append("file", file);

    try {
      setErrorMessage("");
      setIsUploading(true);
      await api.post(`/tasks/${editingTask.id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      // Fetch fresh data from backend after upload
      await refreshTask();
      if (onSave) onSave();
      showToast(`✅ Tải lên "${file.name}" thành công!`, "success");
    } catch (err) {
      console.error("Lỗi upload file:", err);
      const detail = err.response?.data?.detail || "Không thể nộp file.";
      setErrorMessage(detail);
      showToast(`❌ Lỗi: ${detail}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    setConfirmDeleteId(null); // close confirm popup
    try {
      setErrorMessage("");
      // 1. Optimistic: remove from local state immediately
      setEditingTask(prev => {
        if (!prev) return prev;
        return { ...prev, attachments: (prev.attachments || []).filter(a => a.id !== attachmentId) };
      });
      await api.delete(`/tasks/${editingTask.id}/attachments/${attachmentId}`);
      // 2. Refresh from backend to confirm
      await refreshTask();
      if (onSave) onSave();
      showToast("🗑️ Đã xóa file thành công!", "success");
    } catch (err) {
      console.error("Lỗi xóa file:", err);
      // Roll back optimistic update
      await refreshTask();
      const detail = err.response?.data?.detail || "Không thể xóa file đính kèm.";
      setErrorMessage(detail);
      showToast(`❌ Lỗi: ${detail}`, "error");
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa Task này không?")) return;
    try {
      setErrorMessage("");
      setIsLoading(true);
      await api.delete(`/tasks/${editingTask.id}`);
      showToast("Xóa task thành công!", "success");
      setTimeout(() => {
        if (onSave) onSave();
        onClose();
      }, 500);
    } catch (err) {
      console.error("Lỗi xóa task:", err);
      setErrorMessage("Không thể xóa task.");
      showToast("Lỗi xóa task!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTask = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!taskForm.title.trim()) {
      setErrorMessage("Tiêu đề task là bắt buộc.");
      return;
    }
    if (!taskForm.project_id) {
      setErrorMessage("Task phải thuộc một dự án.");
      return;
    }
    if (!taskForm.assigned_employee_id) {
      setErrorMessage("Phải chọn nhân viên chịu trách nhiệm.");
      return;
    }

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      project_id: Number(taskForm.project_id),
      assigned_to: Number(taskForm.assigned_employee_id),
      status: taskForm.status,
      priority: taskForm.priority,
      deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : null,
    };

    try {
      setIsLoading(true);
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, payload);
      } else {
        await api.post("/tasks", payload);
      }
      window.dispatchEvent(new Event("storage_project_changed"));
      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error("Lỗi lưu task:", err);
      setErrorMessage(err.response?.data?.detail || "Không thể lưu task. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[32px] bg-white p-6 shadow-2xl">

        {/* === LOADING OVERLAY: shows while fetching fresh task data === */}
        {isRefreshing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[32px] bg-white/80 backdrop-blur-sm gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <span className="text-sm font-semibold text-slate-500">Đang tải dữ liệu...</span>
          </div>
        )}

        {/* === UPLOAD PROGRESS BAR (top of card) === */}
        {isUploading && (
          <div className="absolute inset-x-0 top-0 h-1 z-40 overflow-hidden rounded-t-[32px]">
            <div className="h-full bg-blue-500 animate-pulse" style={{ width: "100%" }} />
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{editingTask ? "Chỉnh sửa task" : "Tạo task mới"}</h2>
            <p className="mt-1 text-sm text-slate-500">Điền đầy đủ Project, người phụ trách và trạng thái.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmitTask} className="mt-6">
          <div className="max-h-[70vh] overflow-y-auto pr-2 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Project</label>
              <select 
                value={taskForm.project_id} 
                disabled={isStaff}
                onChange={(e) => setTaskForm(prev => ({ ...prev, project_id: Number(e.target.value) }))} 
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:opacity-60"
              >
                <option value="">Chọn dự án</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Employee</label>
              <select 
                value={taskForm.assigned_employee_id} 
                disabled={isStaff}
                onChange={(e) => handleTaskFormChange("assigned_employee_id", e.target.value)} 
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:opacity-60"
              >
                <option value="">Chọn nhân viên</option>
                {employees.map(emp => {
                  const dept = departmentsById[emp.department_id];
                  return (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}{dept ? ` - ${dept.name}` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tiêu đề task</label>
              <input 
                value={taskForm.title} 
                disabled={isStaff}
                onChange={(e) => handleTaskFormChange("title", e.target.value)} 
                type="text" 
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:opacity-60" 
                placeholder="Ví dụ: Chuẩn bị báo cáo sprint" 
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mô tả</label>
              <textarea 
                value={taskForm.description} 
                disabled={isStaff}
                onChange={(e) => handleTaskFormChange("description", e.target.value)} 
                rows={4} 
                className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:opacity-60" 
                placeholder="Mô tả nhiệm vụ..." 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Department</label>
              <input 
                value={departmentsById[employeesById[taskForm.assigned_employee_id]?.department_id]?.name || "Chọn nhân viên để xác định"} 
                readOnly 
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Status</label>
              <select 
                value={taskForm.status} 
                disabled={isStaff}
                onChange={(e) => handleTaskFormChange("status", e.target.value)} 
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:opacity-60"
              >
                {STATUS_SECTIONS.map(section => (
                  <option key={section.key} value={section.key}>{section.key}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Priority</label>
              <select 
                value={taskForm.priority} 
                disabled={isStaff}
                onChange={(e) => handleTaskFormChange("priority", e.target.value)} 
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:opacity-60"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Deadline</label>
              <input 
                type="date" 
                value={taskForm.deadline} 
                disabled={isStaff}
                onChange={(e) => handleTaskFormChange("deadline", e.target.value)} 
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:opacity-60" 
              />
            </div>

            {editingTask && (
              <div className="lg:col-span-2 border-t border-slate-100 pt-4 mt-2 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tài liệu đính kèm ({editingTask.attachments?.length || 0})</label>
                
                {editingTask.attachments && editingTask.attachments.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {editingTask.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                        <div className="min-w-0 flex-1 pr-2">
                          <a 
                            href={att.file_path.startsWith("http") ? att.file_path : `http://127.0.0.1:8001${att.file_path}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="font-bold text-blue-600 hover:underline truncate block"
                            title={att.file_name}
                          >
                            📎 {att.file_name}
                          </a>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {Math.round(att.file_size / 1024)} KB · {new Date(att.uploaded_at).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        {(Number(att.uploaded_by_id) === Number(currentUser.id) || 
                          currentUser.role === "admin" || 
                          currentUser.role === "manager") && (
                          <div className="flex-shrink-0">
                            {confirmDeleteId === att.id ? (
                              // Inline confirm popup
                              <div className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2 py-1">
                                <span className="text-[10px] font-bold text-rose-700">Xóa?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttachment(att.id)}
                                  className="text-[10px] font-extrabold text-rose-600 hover:text-rose-800 underline"
                                >
                                  Đồng ý
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button 
                                type="button" 
                                onClick={() => setConfirmDeleteId(att.id)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Xóa file đính kèm"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có tài liệu đính kèm nào.</p>
                )}

                {/* Upload progress overlay */}
                {isUploading && (
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 mt-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    <span className="text-xs font-bold text-blue-600 animate-pulse">Đang tải lên file... vui lòng đợi</span>
                  </div>
                )}

                {/* Always show file input for employees too (they can upload) */}
                <div className="mt-3 flex items-center gap-3">
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    disabled={isUploading}
                    onChange={handleFileUpload} 
                    className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="lg:col-span-2 rounded-3xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700">{errorMessage}</div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-between items-center mt-6 border-t border-slate-100 pt-4">
            <div>
              {editingTask && (currentUser.role === "admin" || currentUser.role === "manager") && (
                <button 
                  type="button" 
                  onClick={handleDeleteTask}
                  className="rounded-3xl bg-rose-50 border border-rose-100 px-5 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                >
                  Xóa Task
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onClose} className="rounded-3xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">Hủy</button>
              {(currentUser.role === "admin" || currentUser.role === "manager") && (
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "Đang lưu..." : (editingTask ? "Lưu task" : "Tạo task")}
                </button>
              )}
            </div>
          </div>
        </form>

        {toast.show && (
          <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 rounded-2xl px-5 py-3.5 text-white shadow-2xl transition-all duration-300 ${
            toast.type === "success" ? "bg-emerald-600" : 
            toast.type === "error" ? "bg-rose-600" :
            "bg-sky-600"
          }`}>
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

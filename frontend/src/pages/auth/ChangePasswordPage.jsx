import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Mật khẩu mới và xác nhận phải trùng khớp.");
      return;
    }

    try {
      await api.post("/auth/change-password", {
        old_password: form.oldPassword,
        new_password: form.newPassword,
        confirm_password: form.confirmPassword,
      });
      setSuccess("Mật khẩu đã được đổi. Bạn sẽ được chuyển đến dashboard.");
      localStorage.setItem("is_first_login", "false");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      console.error("Lỗi đổi mật khẩu:", err);
      setError(err.response?.data?.detail || "Không thể đổi mật khẩu. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Đổi mật khẩu lần đầu</h1>
        <p className="mt-3 text-sm text-slate-500">Vui lòng cập nhật mật khẩu để tiếp tục sử dụng hệ thống.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && <div className="rounded-3xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">{error}</div>}
          {success && <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700">{success}</div>}
          <div>
            <label className="text-sm font-semibold text-slate-700">Mật khẩu cũ</label>
            <input
              type="password"
              value={form.oldPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Mật khẩu mới</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Xác nhận mật khẩu</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            />
          </div>
          <button type="submit" className="w-full rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            Cập nhật mật khẩu
          </button>
        </form>
      </div>
    </div>
  );
}

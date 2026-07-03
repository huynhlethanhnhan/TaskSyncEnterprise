import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import VacationFormModal from "./VacationFormModal";

const STATUS_CLASS = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
};

export default function VacationPage() {
  const currentUser = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const [vacations, setVacations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [vacRes, empRes] = await Promise.all([
        api.get("/vacations").catch(() => ({ data: [] })),
        api.get("/employees").catch(() => ({ data: [] })),
      ]);
      setVacations(Array.isArray(vacRes.data) ? vacRes.data : vacRes.data?.data || []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || []);
    } catch (err) {
      console.error("Lỗi tải vacation:", err);
      setError("Không thể tải yêu cầu nghỉ phép.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      await api.post("/vacations", {
        type: data.type,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
        status: "Pending",
      });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Lỗi lưu vacation:", err);
      setError("Không thể gửi yêu cầu nghỉ phép.");
    }
  };

  const handleUpdateStatus = async (vacationId, newStatus) => {
    try {
      setError("");
      await api.patch(`/vacations/${vacationId}`, { status: newStatus });
      loadData();
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái vacation:", err);
      setError("Không thể duyệt/từ chối đơn nghỉ phép.");
    }
  };

  const handleOpenDetail = (vacation) => {
    navigate(`/vacations/${vacation.id}`);
  };

  const recentRequests = useMemo(() => [...vacations].sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date)).slice(0, 6), [vacations]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quản lý nghỉ phép</h1>
          <p className="mt-2 text-sm text-slate-500">Theo dõi yêu cầu nghỉ phép của nhân viên.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Tạo yêu cầu nghỉ</button>
      </div>

      {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Tổng yêu cầu</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{vacations.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Đang chờ duyệt</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{vacations.filter((item) => item.status === "Pending").length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Đã duyệt</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{vacations.filter((item) => item.status === "Approved").length}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">Đang tải...</div>
      ) : vacations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">Chưa có yêu cầu nghỉ phép nào.</div>
      ) : (
        <div className="space-y-4">
          {recentRequests.map((vacation) => {
            const requester = employees.find((emp) => Number(emp.id) === Number(vacation.requested_by));
            const requesterName = vacation.requested_by_name || requester?.full_name || "Người dùng";
            return (
              <div key={vacation.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{vacation.type} · {requesterName}</p>
                    <p className="mt-2 text-sm text-slate-500">{vacation.start_date} → {vacation.end_date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[vacation.status] || "bg-slate-100 text-slate-600"}`}>{vacation.status}</span>
                    {((currentUser.role === "admin" || currentUser.role === "manager" || Number(currentUser.role_id) === 1 || Number(currentUser.role_id) === 2) && vacation.status === "Pending") && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(vacation.id, "Approved")} 
                          className="rounded-3xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Duyệt
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(vacation.id, "Rejected")} 
                          className="rounded-3xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    <button onClick={() => handleOpenDetail(vacation)} className="rounded-3xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">Chi tiết</button>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">{vacation.reason || "Không có lý do"}</p>
              </div>
            );
          })}
        </div>
      )}

      <VacationFormModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} initialData={null} />
    </div>
  );
}

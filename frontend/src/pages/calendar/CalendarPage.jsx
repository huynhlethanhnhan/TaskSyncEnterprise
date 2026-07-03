import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const STATUS_CLASSES = {
  "To Do": "bg-amber-500",
  "In Progress": "bg-sky-500",
  Done: "bg-emerald-500",
};

const getCalendarDays = (year, month) => {
  const startOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = startOfMonth.getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const days = [];

  for (let i = startDay - 1; i >= 0; i -= 1) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }

  while (days.length % 7 !== 0) {
    const nextDate = new Date(year, month, daysInMonth + (days.length - startDay) + 1);
    days.push({ date: nextDate, isCurrentMonth: false });
  }

  return days;
};

const formatDayKey = (date) => date.toISOString().slice(0, 10);

const formatLabel = (date) => date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [displayDate, setDisplayDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [taskRes, projectRes, employeeRes, departmentRes] = await Promise.all([
          api.get("/tasks"),
          api.get("/projects"),
          api.get("/employees").catch(() => ({ data: [] })),
          api.get("/departments").catch(() => ({ data: [] })),
        ]);
        const rawTasks = Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || [];
        const rawProjects = Array.isArray(projectRes.data) ? projectRes.data : projectRes.data?.data || [];
        const rawEmployees = Array.isArray(employeeRes.data) ? employeeRes.data : employeeRes.data?.data || [];
        const rawDepartments = Array.isArray(departmentRes.data) ? departmentRes.data : departmentRes.data?.data || [];

        setTasks(rawTasks.map(task => ({ ...task, deadline: task.deadline || task.due_date || null })));
        setProjects(rawProjects);
        setEmployees(rawEmployees);
        setDepartments(rawDepartments);
      } catch (err) {
        console.error("Lỗi tải dữ liệu Calendar:", err);
      }
    };
    loadData();
  }, []);

  const dayCells = useMemo(() => getCalendarDays(displayDate.getFullYear(), displayDate.getMonth()), [displayDate]);

  const tasksByDate = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!task.deadline) return acc;
      const key = formatDayKey(new Date(task.deadline));
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const getTaskIndicator = (dayTasks) => {
    if (!dayTasks?.length) return null;
    const statusSet = new Set(dayTasks.map((task) => {
      if (task.deadline && new Date(task.deadline) < new Date(formatDayKey(today))) {
        return task.status === "Done" ? "Done" : "Overdue";
      }
      return task.status;
    }));
    if (statusSet.has("Overdue")) return "bg-rose-500";
    if (statusSet.has("In Progress")) return "bg-sky-500";
    if (statusSet.has("Done")) return "bg-emerald-500";
    if (statusSet.has("To Do")) return "bg-amber-500";
    return "bg-slate-400";
  };

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    const key = formatDayKey(selectedDate);
    return tasksByDate[key] || [];
  }, [selectedDate, tasksByDate]);

  const selectedDateLabel = selectedDate ? formatLabel(selectedDate) : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lịch công việc</h1>
          <p className="mt-2 text-sm text-slate-500">Xem nhiệm vụ, deadline và trạng thái theo tháng.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1))} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Tháng trước</button>
          <button onClick={() => setDisplayDate(new Date(today.getFullYear(), today.getMonth(), 1))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Hôm nay</button>
          <button onClick={() => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1))} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Tháng sau</button>
        </div>
        {selectedDateLabel && <div className="text-sm text-slate-500">Ngày chọn: {selectedDateLabel}</div>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{displayDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}</h2>
              <p className="text-sm text-slate-500">Nhấp vào một ngày để xem chi tiết task.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" /> Quá hạn
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" /> Đang tiến hành
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /> Hoàn thành
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" /> To Do
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.24em] text-slate-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
              <div key={label} className="py-2">{label}</div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {dayCells.map((day) => {
              const dayKey = formatDayKey(day.date);
              const dayTasks = tasksByDate[dayKey] || [];
              const isToday = formatDayKey(day.date) === formatDayKey(today);
              const isSelected = selectedDate && formatDayKey(day.date) === formatDayKey(selectedDate);
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`group min-h-[96px] overflow-hidden rounded-3xl border p-3 text-left transition ${day.isCurrentMonth ? "bg-white" : "bg-slate-50 text-slate-400"} ${isSelected ? "border-blue-500 shadow-lg" : "border-slate-200"} ${isToday ? "ring-2 ring-sky-500" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{day.date.getDate()}</span>
                    {dayTasks.length > 0 && <span className={`inline-flex h-2.5 w-2.5 rounded-full ${getTaskIndicator(dayTasks)}`} />}
                  </div>
                  <div className="mt-3 space-y-1 text-[11px]">
                    {['Overdue', 'In Progress', 'Done', 'To Do'].map((status) => {
                      const count = dayTasks.filter((task) => {
                        if (status === 'Overdue') {
                          return task.deadline && new Date(task.deadline) < new Date(formatDayKey(today)) && task.status !== 'Done';
                        }
                        return task.status === status;
                      }).length;
                      if (!count) return null;
                      return (
                        <div key={status} className="flex items-center gap-2 text-slate-500">
                          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${status === 'Overdue' ? 'bg-rose-500' : STATUS_CLASSES[status]}`} />
                          <span>{count} {status === 'Overdue' ? 'Quá hạn' : status}</span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Chi tiết ngày</h3>
          {selectedDate ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Ngày</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              </div>

              {selectedTasks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-500">Không có task vào ngày này.</div>
              ) : (
                <div className="space-y-4">
                  {selectedTasks.map((task) => {
                    console.log("Rendering task in Calendar details:", task);
                    const project = projects.find((proj) => Number(proj.id) === Number(task.project_id));
                    const employee = employees.find((emp) => Number(emp.id) === Number(task.assigned_to)) || task.employee;
                    const department = departments.find((dept) => Number(dept.id) === Number(employee?.department_id)) || task.department;
                    const isOverdue = task.deadline && new Date(task.deadline) < new Date(formatDayKey(today)) && task.status !== 'Done';
                    return (
                      <div key={task.id} className={`rounded-3xl border p-4 ${isOverdue ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${task.status === 'To Do' ? 'bg-amber-100 text-amber-700' : task.status === 'In Progress' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>{task.status}</span>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-600">
                          <div><span className="font-semibold text-slate-900">Project:</span> {project?.name || 'Không xác định'}</div>
                          <div><span className="font-semibold text-slate-900">Employee:</span> {employee?.full_name || employee?.name || 'Không có'}</div>
                          <div><span className="font-semibold text-slate-900">Department:</span> {department?.name || 'Không có'}</div>
                          <div><span className="font-semibold text-slate-900">Priority:</span> {task.priority || 'Medium'}</div>
                          <div><span className="font-semibold text-slate-900">Deadline:</span> {task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : 'Không có'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-500">Chọn một ngày để xem chi tiết task.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

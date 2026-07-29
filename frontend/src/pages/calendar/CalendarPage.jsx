import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../api/axios";
import { PageHeader } from "../../components/layout/PageHeader";
import { Breadcrumb } from "../../components/navigation/Breadcrumb";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Avatar } from "../../components/common/Avatar";
import { Calendar as CalendarIcon, CheckSquare, Users } from "lucide-react";

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

const formatDayKey = (date) => {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

const formatLabel = (date) => date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [displayDate, setDisplayDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      const [taskRes, projectRes, vacationRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/projects"),
        api.get("/vacations").catch(() => ({ data: [] })),
      ]);
      const rawTasks = Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || [];
      const rawProjects = Array.isArray(projectRes.data) ? projectRes.data : projectRes.data?.data || [];
      const rawVacations = Array.isArray(vacationRes.data) ? vacationRes.data : vacationRes.data?.data || [];

      setTasks(rawTasks.map(task => ({ ...task, deadline: task.deadline || task.due_date || null })));
      setProjects(rawProjects);
      setVacations(rawVacations.filter(v => v.status === "Approved" || v.status === "HR Approved" || v.status === "Manager Approved"));
    } catch (err) {
      console.error("Lỗi tải dữ liệu Calendar:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const refreshCalendar = (event) => {
      if (["task.changed", "project.changed", "vacation.changed"].includes(event.detail?.event)) {
        loadData();
      }
    };
    window.addEventListener("tasksync:domain-event", refreshCalendar);
    return () => window.removeEventListener("tasksync:domain-event", refreshCalendar);
  }, [loadData]);

  const dayCells = useMemo(() => getCalendarDays(displayDate.getFullYear(), displayDate.getMonth()), [displayDate]);

  const tasksByDate = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!task.deadline) return acc;
      const key = formatDayKey(task.deadline);
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const vacationsByDate = useMemo(() => {
    return dayCells.reduce((acc, cell) => {
      const key = formatDayKey(cell.date);
      const cellDateStr = key;

      const activeVacations = vacations.filter(vac => {
        const startStr = vac.start_date.substring(0, 10);
        const endStr = vac.end_date.substring(0, 10);
        return cellDateStr >= startStr && cellDateStr <= endStr;
      });

      if (activeVacations.length > 0) {
        acc[key] = activeVacations;
      }
      return acc;
    }, {});
  }, [vacations, dayCells]);

  const getTaskIndicator = (dayTasks) => {
    if (!dayTasks?.length) return null;
    const statusSet = new Set(dayTasks.map((task) => {
      const deadlineDate = new Date(task.deadline);
      const todayDate = new Date(formatDayKey(today));
      if (task.deadline && deadlineDate < todayDate) {
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

  const selectedVacations = useMemo(() => {
    if (!selectedDate) return [];
    const key = formatDayKey(selectedDate);
    return vacationsByDate[key] || [];
  }, [selectedDate, vacationsByDate]);

  const selectedDateLabel = selectedDate ? formatLabel(selectedDate) : null;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Lịch biểu dự án (Calendar)"
        description="Theo dõi thời hạn hoàn thành công việc, lịch trình công tác và kế hoạch vắng mặt của nhóm"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Work Management', href: '#' },
              { label: 'Calendar' },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-accent border border-border">
            <button
              onClick={() => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-all"
            >
              Tháng trước
            </button>
            <button
              onClick={() => setDisplayDate(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-all"
            >
              Tháng này
            </button>
            <button
              onClick={() => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-all"
            >
              Tháng sau
            </button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        {/* Left Column: Calendar Grid */}
        <Card className="p-4 shadow-sm border border-border">
          <CardHeader className="px-2 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-text-primary uppercase tracking-wide">
                  {displayDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">Nhấp vào một ngày để xem chi tiết task và trạng thái vắng mặt.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-text-secondary">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Quá hạn</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> Đang làm</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Done</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> To Do</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500/20 border border-indigo-300" /> Nghỉ phép</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((label) => (
                <div key={label} className="py-2">{label}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 bg-border/40 p-[1px] rounded-xl overflow-hidden">
              {dayCells.map((day) => {
                const dayKey = formatDayKey(day.date);
                const dayTasks = tasksByDate[dayKey] || [];
                const dayLeaves = vacationsByDate[dayKey] || [];
                const isToday = formatDayKey(day.date) === formatDayKey(today);
                const isSelected = selectedDate && formatDayKey(day.date) === formatDayKey(selectedDate);
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`group min-h-[90px] overflow-hidden p-2 text-left transition flex flex-col justify-between ${
                      day.isCurrentMonth ? "bg-surface" : "bg-accent/40 text-text-muted"
                    } ${isSelected ? "ring-2 ring-primary/60 bg-primary/[0.02]" : ""} ${
                      isToday ? "bg-primary/[0.05] border-t-2 border-t-primary" : ""
                    } hover:bg-accent/30 cursor-pointer`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${isToday ? 'text-primary' : 'text-text-primary'}`}>
                        {day.date.getDate()}
                      </span>
                      <div className="flex gap-1">
                        {dayLeaves.length > 0 && (
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        )}
                        {dayTasks.length > 0 && (
                          <span className={`h-2 w-2 rounded-full ${getTaskIndicator(dayTasks)}`} />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 w-full text-[9px] text-left pt-2">
                      {/* Show short snippet of first leave */}
                      {dayLeaves.slice(0, 1).map((vac) => {
                        const employee = employees.find(e => e.id === vac.requested_by);
                        return (
                          <div key={vac.id} className="px-1 py-0.5 rounded-sm bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/30 truncate">
                            Nghỉ: {employee?.full_name || 'Nhân sự'}
                          </div>
                        );
                      })}
                      {/* Show tasks count badge */}
                      {dayTasks.length > 0 && (
                        <div className="px-1 py-0.5 rounded-sm bg-accent text-text-secondary truncate">
                          {dayTasks.length} nhiệm vụ
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Day Details Sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Chi tiết ngày
              </CardTitle>
              {selectedDateLabel && (
                <CardDescription className="text-text-primary font-semibold">
                  {selectedDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vacations section */}
              {selectedVacations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                    <Users className="h-3 w-3" /> Lịch vắng mặt ({selectedVacations.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedVacations.map((vac) => {
                      const employee = employees.find(e => e.id === vac.requested_by);
                      return (
                        <div key={vac.id} className="p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/20 dark:bg-indigo-950/10 flex items-center gap-2">
                          <Avatar name={employee?.full_name || 'Staff'} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-text-primary">{employee?.full_name}</p>
                            <p className="text-[10px] text-text-muted mt-0.5">Nghỉ phép ({vac.type})</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tasks list section */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" /> Công việc ({selectedTasks.length})
                </h4>
                {selectedTasks.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6 border border-dashed border-border rounded-xl bg-surface/50">
                    Không có task vào ngày này.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedTasks.map((task) => {
                      const project = projects.find((proj) => Number(proj.id) === Number(task.project_id));
                      const employee = employees.find((emp) => Number(emp.id) === Number(task.assigned_to)) || task.employee;
                      const isOverdue = task.deadline && new Date(task.deadline) < new Date(formatDayKey(today)) && task.status !== 'Done';
                      return (
                        <div key={task.id} className={`rounded-xl border p-4 ${isOverdue ? 'border-rose-200/50 bg-rose-50/20 dark:bg-rose-950/10' : 'border-border bg-surface'}`}>
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                            <h4 className="min-w-0 text-sm font-bold leading-snug text-text-primary">{task.title || task.name}</h4>
                            <Badge className="shrink-0 whitespace-nowrap" variant={task.status === 'Done' ? 'success' : task.status === 'In Progress' ? 'primary' : 'warning'} size="sm">
                              {task.status}
                            </Badge>
                          </div>
                          <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3 text-[11px] text-text-secondary">
                            <div><strong className="text-text-primary">Dự án:</strong> {project?.name || 'Không xác định'}</div>
                            {employee && (
                              <div className="flex items-center gap-1 mt-1">
                                <strong className="text-text-primary shrink-0">Người thực hiện:</strong>
                                <span className="truncate">{employee.full_name || employee.name}</span>
                              </div>
                            )}
                            <div><strong className="text-text-primary">Độ ưu tiên:</strong> {task.priority || 'Medium'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

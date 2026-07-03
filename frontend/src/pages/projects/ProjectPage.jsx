import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ProjectPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectRes, taskRes] = await Promise.all([
          api.get("/projects").catch(() => ({ data: [] })),
          api.get("/tasks").catch(() => ({ data: [] })),
        ]);
        setProjects(Array.isArray(projectRes.data) ? projectRes.data : projectRes.data?.data || []);
        setTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data || []);
      } catch (err) {
        console.error("Lỗi tải dự án:", err);
        setError("Không thể tải dữ liệu dự án.");
      }
    };
    loadData();
  }, []);

  const enrichedProjects = useMemo(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((task) => Number(task.project_id) === Number(project.id));
      const counts = projectTasks.reduce(
        (acc, task) => {
          acc.total += 1;
          if (task.status === "To Do") acc.todo += 1;
          if (task.status === "In Progress") acc.inProgress += 1;
          if (task.status === "Done") acc.done += 1;
          return acc;
        },
        { total: 0, todo: 0, inProgress: 0, done: 0 }
      );
      return {
        ...project,
        ...counts,
        progress: counts.total ? Math.round((counts.done / counts.total) * 100) : 0,
      };
    });
  }, [projects, tasks]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dự án</h1>
          <p className="mt-2 text-sm text-slate-500">Tổng quan các dự án và tiến độ công việc.</p>
        </div>
      </div>
      {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
        {enrichedProjects.map((project) => (
          <div 
            key={project.id} 
            onClick={() => navigate(`/projects/${project.id}`)}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm cursor-pointer hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{project.name}</h2>
                <p className="mt-2 text-sm text-slate-500">{project.description || "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Hoàn thành</p>
                <p className="mt-1 text-lg font-black text-slate-700">{project.progress}%</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">Tổng công việc: <span className="font-bold text-slate-900">{project.total}</span></div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-500">
                <div className="rounded-2xl bg-amber-50 border border-amber-200/40 py-2">
                  <div className="text-[9px] uppercase tracking-wider text-amber-600 font-bold">Todo</div>
                  <div className="mt-0.5 text-base font-black text-amber-800">{project.todo}</div>
                </div>
                <div className="rounded-2xl bg-sky-50 border border-sky-200/40 py-2">
                  <div className="text-[9px] uppercase tracking-wider text-sky-600 font-bold">Progress</div>
                  <div className="mt-0.5 text-base font-black text-sky-800">{project.inProgress}</div>
                </div>
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/40 py-2">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-600 font-bold">Done</div>
                  <div className="mt-0.5 text-base font-black text-emerald-800">{project.done}</div>
                </div>
              </div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${project.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

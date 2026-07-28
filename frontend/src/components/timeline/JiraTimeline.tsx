import * as React from 'react';
import { Search, Calendar as CalendarIcon, ChevronRight, ChevronDown, Plus, Filter, Clock, Layers, Zap, Bookmark } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../common/Avatar';
import { TaskDrawer } from '../drawers/TaskDrawer';
import { useTasks, useUpdateTask, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useSprints } from '../../hooks/useSprintBacklog';
import { useProjects } from '../../hooks/useProjects';
import { useEmployees } from '../../hooks/useEmployees';
import { useTopics } from '../../hooks/useTopics';
import { useToast } from '../../providers/ToastProvider';
import { type TaskItem, type SprintItem, type TopicItem } from '../../api/services';

interface JiraTimelineProps {
  projectId?: number;
}

interface EpicGroup {
  id: string;
  epicKey: string;
  title: string;
  topic?: TopicItem;
  items: TaskItem[];
}

export const JiraTimeline: React.FC<JiraTimelineProps> = ({ projectId }) => {
  const toast = useToast();
  const [viewScale, setViewScale] = React.useState<'Months' | 'Weeks' | 'Quarters'>('Months');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('All');
  
  // Collapsible Epic state
  const [expandedEpics, setExpandedEpics] = React.useState<Record<string, boolean>>({});

  // Task Drawer & Edit State
  const [selectedTask, setSelectedTask] = React.useState<TaskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // Load data
  const { data: allTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: employees = [] } = useEmployees();
  
  const currentProjectId = projectId || (projects.length > 0 ? projects[0].id : 0);
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(currentProjectId);
  const { data: topics = [] } = useTopics(currentProjectId);

  const updateTask = useUpdateTask();

  const tasks = React.useMemo(() => {
    return allTasks.filter((t) => !currentProjectId || t.project_id === currentProjectId);
  }, [allTasks, currentProjectId]);

  // Generate 6 months timeline columns starting from current month
  const timelineMonths = React.useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = -1; i < 5; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const name = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({
        date: d,
        name,
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
      });
    }
    return months;
  }, []);

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch = (t.title || t.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = selectedStatus === 'All' || t.status === selectedStatus;
      return matchSearch && matchStatus;
    });
  }, [tasks, searchQuery, selectedStatus]);

  // Group tasks into Epics (Topics) hierarchy
  const epicGroups = React.useMemo(() => {
    const map: Record<string, EpicGroup> = {};

    topics.forEach((tp, idx) => {
      const key = `EPIC-${tp.id}`;
      map[key] = {
        id: key,
        epicKey: `TS-${idx + 2}`,
        title: tp.title || tp.name || 'Feature Module',
        topic: tp,
        items: [],
      };
    });

    map['epic-general'] = {
      id: 'epic-general',
      epicKey: 'TS-1',
      title: 'General Product Backlog & Stories',
      items: [],
    };

    filteredTasks.forEach((t) => {
      if (t.topic_id && map[`EPIC-${t.topic_id}`]) {
        map[`EPIC-${t.topic_id}`].items.push(t);
      } else {
        map['epic-general'].items.push(t);
      }
    });

    return Object.values(map).filter((g) => g.items.length > 0);
  }, [topics, filteredTasks]);

  // Initialize expanded state for all epics to true by default
  React.useEffect(() => {
    const initial: Record<string, boolean> = {};
    epicGroups.forEach((g) => {
      if (expandedEpics[g.id] === undefined) {
        initial[g.id] = true;
      }
    });
    if (Object.keys(initial).length > 0) {
      setExpandedEpics((prev) => ({ ...prev, ...initial }));
    }
  }, [epicGroups]);

  const toggleEpic = (epicId: string) => {
    setExpandedEpics((prev) => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const handleTaskClick = (task: TaskItem) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleSaveTask = async (data: Partial<TaskItem>) => {
    if (!selectedTask) return;
    try {
      await updateTask.mutateAsync({ id: selectedTask.id, payload: data });
      toast.success('Cập nhật công việc thành công');
      setIsDrawerOpen(false);
      refetchTasks();
    } catch {
      toast.error('Lỗi lưu công việc');
    }
  };

  // Timeline position calculation helper
  const getTimelineBarStyles = (startDateInput?: string | Date | null, endDateInput?: string | Date | null) => {
    const today = new Date();
    const startDate = startDateInput ? new Date(startDateInput) : new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = endDateInput ? new Date(endDateInput) : new Date(today.getFullYear(), today.getMonth() + 1, 15);

    const rangeStart = timelineMonths[0].date.getTime();
    const rangeEnd = new Date(timelineMonths[timelineMonths.length - 1].year, timelineMonths[timelineMonths.length - 1].monthIdx + 1, 0).getTime();
    const totalDuration = rangeEnd - rangeStart;

    const leftPercent = Math.max(0, Math.min(100, ((startDate.getTime() - rangeStart) / totalDuration) * 100));
    const rightPercent = Math.max(0, Math.min(100, ((endDate.getTime() - rangeStart) / totalDuration) * 100));
    const widthPercent = Math.max(4, rightPercent - leftPercent);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Epic timeline bar range (min start, max deadline of child items)
  const getEpicTimelineBarStyles = (group: EpicGroup) => {
    if (group.items.length === 0) return getTimelineBarStyles(null, null);

    let minStart = new Date().getTime();
    let maxEnd = new Date().getTime();

    group.items.forEach((t) => {
      const start = t.created_at ? new Date(t.created_at).getTime() : new Date().getTime();
      const end = t.deadline ? new Date(t.deadline).getTime() : start + 14 * 86400000;
      if (start < minStart) minStart = start;
      if (end > maxEnd) maxEnd = end;
    });

    return getTimelineBarStyles(new Date(minStart), new Date(maxEnd));
  };

  const getBarColor = (status?: string, priority?: string) => {
    if (status === 'Done') return 'bg-emerald-500 hover:bg-emerald-600';
    if (priority === 'High' || priority === 'Urgent') return 'bg-rose-500 hover:bg-rose-600';
    if (status === 'In Progress') return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-amber-500 hover:bg-amber-600';
  };

  if (tasksLoading || sprintsLoading) {
    return <div className="text-center py-8 text-xs text-text-muted">Đang khởi tạo giao diện Jira Timeline...</div>;
  }

  // Today indicator position
  const today = new Date();
  const rangeStart = timelineMonths[0].date.getTime();
  const rangeEnd = new Date(timelineMonths[timelineMonths.length - 1].year, timelineMonths[timelineMonths.length - 1].monthIdx + 1, 0).getTime();
  const todayLeftPercent = Math.max(0, Math.min(100, ((today.getTime() - rangeStart) / (rangeEnd - rangeStart)) * 100));

  return (
    <Card className="font-sans text-xs bg-surface border border-border shadow-sm overflow-hidden">
      {/* Header Toolbar */}
      <CardHeader className="border-b border-border/40 pb-3 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Input
                placeholder="Search timeline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
              <Search className="h-3.5 w-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Status Filter Badges */}
            <div className="flex items-center gap-1">
              {['All', 'To Do', 'In Progress', 'Done'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    selectedStatus === st
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/60 text-text-secondary hover:bg-secondary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Scale Switcher (Weeks / Months / Quarters) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
              {(['Weeks', 'Months', 'Quarters'] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setViewScale(scale)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    viewScale === scale
                      ? 'bg-surface text-primary shadow-xs border border-border/60'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex min-h-[450px]">
          {/* Left Work Items Column (Epics -> Tasks Tree) */}
          <div className="w-96 shrink-0 border-r border-border/40 bg-surface/50">
            <div className="h-14 px-3 flex items-center justify-between border-b border-border/40 font-bold text-[11px] text-text-muted uppercase tracking-wider">
              <span>Work / Epics ({filteredTasks.length})</span>
              <span className="text-[10px] text-text-muted">Sprints: {sprints.length}</span>
            </div>

            {/* Top Sprint Track Header Placeholder */}
            <div className="h-10 px-3 flex items-center font-bold text-[11px] text-primary border-b border-border/30 bg-secondary/30">
              <Clock className="h-3.5 w-3.5 mr-1.5" /> Sprints Track
            </div>

            <div className="divide-y divide-border/20 max-h-[550px] overflow-y-auto">
              {epicGroups.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-xs">Chưa có công việc nào.</div>
              ) : (
                epicGroups.map((group) => {
                  const isExpanded = expandedEpics[group.id] !== false;

                  return (
                    <div key={group.id} className="space-y-0.5">
                      {/* Epic Header Row */}
                      <div
                        onClick={() => toggleEpic(group.id)}
                        className="h-11 px-3 bg-secondary/40 flex items-center justify-between gap-2 font-bold text-[11px] text-text-primary border-y border-border/30 select-none cursor-pointer hover:bg-secondary/60 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" /> : <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />}
                          <Zap className="h-3.5 w-3.5 text-purple-500 fill-purple-500 shrink-0" />
                          <span className="font-mono text-purple-600 dark:text-purple-400 text-[11px]">{group.epicKey}</span>
                          <span className="truncate text-text-primary font-bold">{group.title}</span>
                        </div>
                        <span className="text-[10px] text-text-muted shrink-0 font-normal">
                          ({group.items.length} items)
                        </span>
                      </div>

                      {/* Child Tasks List */}
                      {isExpanded &&
                        group.items.map((t) => {
                          const emp = (t as any).assignee || employees.find((e) => e.id === t.assigned_to);
                          return (
                            <div
                              key={t.id}
                              onClick={() => handleTaskClick(t)}
                              className="h-11 pl-8 pr-3 flex items-center justify-between gap-2 hover:bg-accent/40 transition-colors cursor-pointer group border-b border-border/10"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Bookmark className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="font-mono text-text-muted text-[10px] shrink-0">TS-{t.id}</span>
                                <span className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors" title={t.title || t.name}>
                                  {t.title || t.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {emp ? (
                                  <div className="flex items-center gap-1 bg-surface px-1.5 py-0.5 rounded-full border border-border/60 text-[10px]" title={`Người làm: ${emp.full_name}`}>
                                    <Avatar name={emp.full_name} src={emp.avatar_url} size="sm" />
                                  </div>
                                ) : null}

                                <Badge variant={t.status === 'Done' ? 'success' : t.status === 'In Progress' ? 'primary' : 'warning'} size="sm">
                                  {t.status}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Gantt Timeline Grid (With Top Sprint Header Bar) */}
          <div className="flex-1 overflow-x-auto relative">
            <div className="min-w-[700px] h-full flex flex-col">
              {/* Timeline Header Months */}
              <div className="h-14 flex border-b border-border/40 bg-surface/90 sticky top-0 z-10 font-bold text-[11px] text-text-muted uppercase">
                {timelineMonths.map((m, idx) => (
                  <div key={idx} className="flex-1 border-r border-border/20 px-3 flex items-center justify-center text-center">
                    {m.name}
                  </div>
                ))}
              </div>

              {/* Today Vertical Line Indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none"
                style={{ left: `${todayLeftPercent}%` }}
              >
                <div className="bg-blue-500 text-white text-[9px] font-bold px-1 rounded-xs absolute top-0 -translate-x-1/2">
                  Today
                </div>
              </div>

              {/* Top Sprint Timeline Header Track (Matching Image 4) */}
              <div className="h-10 relative flex items-center px-1 bg-secondary/20 border-b border-border/30">
                {sprints.map((s) => {
                  const barStyle = getTimelineBarStyles(s.start_date, s.end_date);
                  return (
                    <div
                      key={s.id}
                      className="absolute h-7 rounded-full bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs text-[10px] font-bold px-3 flex items-center justify-between truncate cursor-pointer hover:opacity-90 transition-opacity"
                      style={barStyle}
                      title={`Sprint: ${s.name} (${s.status})\nThời gian: ${s.start_date ? new Date(s.start_date).toLocaleDateString('vi-VN') : 'N/A'} - ${s.end_date ? new Date(s.end_date).toLocaleDateString('vi-VN') : 'N/A'}`}
                    >
                      <span className="truncate pr-1">🏃 {s.name} ({s.status})</span>
                    </div>
                  );
                })}
              </div>

              {/* Epics & Task Duration Horizontal Bars */}
              <div className="divide-y divide-border/20 relative flex-1 max-h-[550px] overflow-y-auto">
                {epicGroups.map((group) => {
                  const isExpanded = expandedEpics[group.id] !== false;
                  const epicBarStyle = getEpicTimelineBarStyles(group);

                  return (
                    <div key={group.id} className="space-y-0.5">
                      {/* Epic Summary Gantt Bar */}
                      <div className="h-11 relative flex items-center px-1 border-y border-border/10 bg-secondary/10">
                        <div
                          className="absolute h-6 rounded-md bg-purple-600/80 hover:bg-purple-600 text-white shadow-xs text-[10px] font-bold px-2.5 flex items-center justify-between transition-all cursor-pointer"
                          style={epicBarStyle}
                          title={`Epic: ${group.title}`}
                        >
                          <span className="truncate">⚡ {group.epicKey}: {group.title}</span>
                        </div>
                      </div>

                      {/* Child Tasks Gantt Bars */}
                      {isExpanded &&
                        group.items.map((t) => {
                          const matchedSprint = sprints.find((s) => s.id === t.sprint_id);
                          const barStyle = getTimelineBarStyles(t.created_at, t.deadline || matchedSprint?.end_date);
                          const colorClass = getBarColor(t.status, t.priority);
                          const emp = (t as any).assignee || employees.find((e) => e.id === t.assigned_to);

                          return (
                            <div key={t.id} className="h-11 relative flex items-center px-1 border-b border-border/10">
                              <div
                                onClick={() => handleTaskClick(t)}
                                className={`absolute h-6 rounded-md ${colorClass} shadow-xs text-white text-[10px] font-bold px-2.5 flex items-center justify-between transition-all group cursor-pointer hover:shadow-md hover:scale-[1.01]`}
                                style={barStyle}
                                title={`Task: TS-${t.id} - ${t.title || t.name}\nNgười thực hiện: ${emp?.full_name || 'Chưa gán'}\nTrạng thái: ${t.status}`}
                              >
                                <span className="truncate pr-1">TS-{t.id}: {t.title || t.name}</span>
                                {t.story_points ? (
                                  <span className="px-1.5 py-0.2 bg-black/20 rounded text-[9px] font-mono shrink-0">
                                    {t.story_points} SP
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Embedded Task Drawer */}
      <TaskDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        task={selectedTask}
        onSave={handleSaveTask}
      />
    </Card>
  );
};

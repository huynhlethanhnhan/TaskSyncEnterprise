import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Briefcase, CheckSquare, X, Command } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { Badge } from '../common/Badge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();

  // Debouncing query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setActiveIndex(0);
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  // Handle escape key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = React.useMemo(() => {
    if (!debouncedQuery.trim()) return { projects: [], tasks: [] };
    const q = debouncedQuery.toLowerCase();

    const matchedProjects = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.project_code?.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );

    const matchedTasks = tasks.filter(
      (t) =>
        (t.title || t.name || '').toLowerCase().includes(q) ||
        t.task_code?.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );

    return { projects: matchedProjects, tasks: matchedTasks };
  }, [debouncedQuery, projects, tasks]);

  const flatResults = React.useMemo(() => {
    const list: Array<{ type: 'project' | 'task'; id: number; name: string; subtitle?: string; path: string; status?: string }> = [];
    searchResults.projects.forEach(p => {
      list.push({
        type: 'project',
        id: p.id,
        name: p.name,
        subtitle: p.project_code,
        path: `/projects/${p.id}`,
        status: p.status,
      });
    });
    searchResults.tasks.forEach(t => {
      list.push({
        type: 'task',
        id: t.id,
        name: t.title || t.name || '',
        subtitle: t.task_code,
        path: `/tasks?view=table&taskId=${t.id}`,
        status: t.status,
      });
    });
    return list;
  }, [searchResults]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatResults[activeIndex];
      if (selected) {
        navigate(selected.path);
        onClose();
        // Clear query
        setQuery('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/40 backdrop-blur-sm" onClick={onClose} />

      {/* Search dialog */}
      <div
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Input area */}
        <div className="flex items-center gap-3 px-4 border-b border-border bg-accent/30">
          <Search className="h-4.5 w-4.5 text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Tìm kiếm dự án, công việc..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 py-4 text-sm bg-transparent outline-none border-none text-text-primary placeholder:text-text-muted focus:ring-0"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md hover:bg-accent text-text-muted hover:text-text-primary transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[150px]">
          {projectsLoading || tasksLoading ? (
            <div className="flex items-center justify-center py-12 text-xs text-text-muted">
              Đang đồng bộ cơ sở dữ liệu tìm kiếm...
            </div>
          ) : !debouncedQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Command className="h-8 w-8 text-text-muted/60 mb-2 stroke-[1.25]" />
              <p className="text-xs text-text-muted">Nhập từ khóa để tìm kiếm dự án hoặc task công việc.</p>
              <div className="flex gap-4 mt-3 text-[10px] text-text-muted">
                <span><kbd className="border border-border bg-muted px-1 py-0.5 rounded">↑↓</kbd> Di chuyển</span>
                <span><kbd className="border border-border bg-muted px-1 py-0.5 rounded">Enter</kbd> Chọn</span>
              </div>
            </div>
          ) : flatResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-xs text-text-muted">Không tìm thấy kết quả nào trùng khớp với "{debouncedQuery}"</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {searchResults.projects.length > 0 && (
                <div>
                  <h4 className="px-3 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                    Dự án ({searchResults.projects.length})
                  </h4>
                  <div className="space-y-0.5">
                    {searchResults.projects.map((proj, pIdx) => {
                      const idx = pIdx;
                      const isSel = activeIndex === idx;
                      return (
                        <button
                          key={`p-${proj.id}`}
                          onClick={() => {
                            navigate(`/projects/${proj.id}`);
                            onClose();
                            setQuery('');
                          }}
                          className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition ${
                            isSel ? 'bg-primary/10 text-primary' : 'hover:bg-accent/40 text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                            <div className="truncate">
                              <p className="text-xs font-semibold leading-normal truncate">{proj.name}</p>
                              {proj.project_code && (
                                <p className="text-[10px] text-text-muted mt-0.5 font-mono">{proj.project_code}</p>
                              )}
                            </div>
                          </div>
                          {proj.status && (
                            <Badge variant={proj.status === 'Active' ? 'success' : 'outline'} size="sm">
                              {proj.status}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchResults.tasks.length > 0 && (
                <div>
                  <h4 className="px-3 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                    Công việc ({searchResults.tasks.length})
                  </h4>
                  <div className="space-y-0.5">
                    {searchResults.tasks.map((task, tIdx) => {
                      const idx = searchResults.projects.length + tIdx;
                      const isSel = activeIndex === idx;
                      return (
                        <button
                          key={`t-${task.id}`}
                          onClick={() => {
                            navigate(`/tasks?view=table&taskId=${task.id}`);
                            onClose();
                            setQuery('');
                          }}
                          className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition ${
                            isSel ? 'bg-primary/10 text-primary' : 'hover:bg-accent/40 text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckSquare className="h-4 w-4 shrink-0 text-sky-500" />
                            <div className="truncate">
                              <p className="text-xs font-semibold leading-normal truncate">{task.title || task.name}</p>
                              {task.task_code && (
                                <p className="text-[10px] text-text-muted mt-0.5 font-mono">{task.task_code}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant={task.priority === 'High' || task.priority === 'Urgent' ? 'danger' : 'outline'} size="sm">
                              {task.priority}
                            </Badge>
                            <Badge variant={task.status === 'Done' ? 'success' : task.status === 'In Progress' ? 'primary' : 'warning'} size="sm">
                              {task.status}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

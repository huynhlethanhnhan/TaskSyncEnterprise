import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { useProjects } from '../../hooks/useProjects';
import { Select } from '../../components/ui/Select';
import { SprintsManager } from '../../components/sprints/SprintsManager';
import { JiraTimeline } from '../../components/timeline/JiraTimeline';
import { RefreshCw, Calendar as CalendarIcon } from 'lucide-react';

export const SprintsPage: React.FC = () => {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [viewMode, setViewMode] = React.useState<'list' | 'timeline'>('list');

  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      const activeProject = projects.find((project) => project.status === 'Active');
      setSelectedProjectId(String((activeProject || projects[0]).id));
    }
  }, [projects, selectedProjectId]);

  return (
    <div className="space-y-6 font-sans pb-12 text-xs">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Sprints"
        description="Lập kế hoạch sprint, theo dõi hiệu năng hoàn thành mục tiêu công việc theo chu kỳ phát triển (Agile/Scrum)"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Work Management', href: '#' },
              { label: 'Sprint Planning' },
            ]}
          />
        }
        actions={
          <div className="flex items-center rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              Chu kỳ Sprint
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'timeline' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              Timeline (Jira)
            </button>
          </div>
        }
      />

      {projectsLoading ? (
        <div className="text-center py-6 text-text-muted">Đang tải danh sách dự án...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface/50 text-xs text-text-muted">
          Bạn chưa tham gia vào dự án nào. Vui lòng tạo dự án hoặc tham gia thành viên để sử dụng Sprints.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project Selector Box */}
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-text-primary text-sm">Lựa chọn dự án làm việc</h4>
              <p className="text-text-muted mt-0.5 text-[11px]">Chọn dự án để lên kế hoạch và quản lý Sprints tương ứng.</p>
            </div>
            <div className="w-full sm:max-w-xs shrink-0">
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                options={projects.map((p) => ({
                  value: String(p.id),
                  label: `${p.name}${p.status === 'Completed' ? ' (Đã hoàn tất)' : ''}`,
                }))}
              />
            </div>
          </div>

          {selectedProjectId && (
            viewMode === 'list' ? (
              <SprintsManager projectId={Number(selectedProjectId)} />
            ) : (
              <JiraTimeline projectId={Number(selectedProjectId)} />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default SprintsPage;

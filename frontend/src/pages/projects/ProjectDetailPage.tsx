import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useProjectDetail } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);

  const { data: project, isLoading: isProjectLoading, isError: isProjectError, refetch } = useProjectDetail(projectId);
  const { data: allTasks = [] } = useTasks();

  const projectTasks = React.useMemo(() => {
    return allTasks.filter((t) => Number(t.project_id) === projectId);
  }, [allTasks, projectId]);

  const taskCounts = React.useMemo(() => {
    return projectTasks.reduce(
      (acc, t) => {
        if (t.status === 'Done') acc.done += 1;
        else if (t.status === 'In Progress') acc.inProgress += 1;
        else acc.todo += 1;
        return acc;
      },
      { todo: 0, inProgress: 0, done: 0 }
    );
  }, [projectTasks]);

  const completionRate = projectTasks.length ? Math.round((taskCounts.done / projectTasks.length) * 100) : 0;

  if (isProjectLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Chi tiết Dự án" description="Đang tải dữ liệu dự án..." />
        <SkeletonCard />
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Chi tiết Dự án" description="Thông tin dự án" />
        <ErrorState
          title="Không tìm thấy dự án"
          message="Dự án không tồn tại hoặc đã bị xóa khỏi hệ thống."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      <PageHeader
        title={project.name}
        description={project.description || 'Chi tiết thông tin công việc và tiến độ dự án.'}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dự án', href: '/projects' },
              { label: project.name },
            ]}
          />
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/projects')}
          >
            Quay lại danh sách
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Metrics & Task Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tiến độ Dự án</span>
                <Badge variant="primary">{completionRate}% Hoàn thành</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-3 w-full bg-accent rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${completionRate}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center pt-2">
                <div className="p-3 rounded-lg border border-amber-200/40 bg-amber-50/50 dark:bg-amber-950/20">
                  <span className="text-[11px] font-bold text-amber-600 uppercase">Cần làm (To Do)</span>
                  <p className="text-xl font-bold text-amber-800 dark:text-amber-300">{taskCounts.todo}</p>
                </div>
                <div className="p-3 rounded-lg border border-sky-200/40 bg-sky-50/50 dark:bg-sky-950/20">
                  <span className="text-[11px] font-bold text-sky-600 uppercase">Đang làm (In Progress)</span>
                  <p className="text-xl font-bold text-sky-800 dark:text-sky-300">{taskCounts.inProgress}</p>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200/40 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">Hoàn thành (Done)</span>
                  <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{taskCounts.done}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Task List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Danh sách Công việc thuộc Dự án ({projectTasks.length})</span>
                <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/tasks')}>
                  Quản lý Tasks
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectTasks.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">Chưa có công việc nào gắn với dự án này.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {projectTasks.map((task) => (
                    <div key={task.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{task.title || task.name}</p>
                        <span className="text-[11px] text-text-muted">Độ ưu tiên: {task.priority || 'Medium'}</span>
                      </div>
                      <Badge variant={task.status === 'Done' ? 'success' : 'primary'} showDot>
                        {task.status || 'To Do'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin Dự án</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted">Mã Dự án:</span>
              <span className="font-mono font-bold text-text-primary">{project.project_code || `PRJ-${project.id}`}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted">Trạng thái:</span>
              <Badge variant="primary" showDot>{project.status || 'Active'}</Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted">Ngày khởi tạo:</span>
              <span className="font-semibold text-text-primary">
                {project.created_at ? new Date(project.created_at).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectDetailPage;

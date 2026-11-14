import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, Search, Briefcase, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EntityActions } from '../../components/common/EntityActions';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { ForbiddenState } from '../../components/feedback/ForbiddenState';
import { Pagination } from '../../components/data-display/Pagination';
import { ProjectDrawer } from '../../components/drawers/ProjectDrawer';
import { ConfirmDialog } from '../../components/modals/ConfirmDialog';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '../../hooks/useProjects';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { type ProjectItem } from '../../api/services';

const ProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { t, statusLabel, formatDate } = useSettings();
  const permissions = usePermissions();

  const [searchTerm, setSearchTerm] = React.useState('');
  const departmentId = searchParams.get('department_id');
  const teamId = searchParams.get('team_id');
  const requestedStatus = searchParams.get('status');
  const [statusFilter, setStatusFilter] = React.useState(requestedStatus || 'all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(9);
  const projectFilters = React.useMemo(
    () => ({
      department_id: departmentId || undefined,
      team_id: teamId || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    [departmentId, statusFilter, teamId],
  );

  const { data: projects = [], isLoading, isError, error, refetch } = useProjects(projectFilters);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<ProjectItem | null>(null);

  // Confirm Delete Dialog state
  const [deletingProject, setDeletingProject] = React.useState<ProjectItem | null>(null);

  const filteredProjects = React.useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const organizationFilterLabel = React.useMemo(() => {
    if (teamId) {
      const teamName = projects.find((project) => String(project.team_id) === teamId)?.team_name;
      return teamName ? `Team: ${teamName}` : `Team #${teamId}`;
    }
    if (departmentId) {
      const departmentName = projects.find((project) => String(project.department_id) === departmentId)?.department_name;
      return departmentName ? `Phòng ban: ${departmentName}` : `Phòng ban #${departmentId}`;
    }
    return null;
  }, [departmentId, projects, teamId]);

  const clearOrganizationFilter = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('department_id');
    nextParams.delete('team_id');
    setSearchParams(nextParams);
    setCurrentPage(1);
  };

  const paginatedProjects = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredProjects.length / pageSize) || 1;

  const handleOpenCreate = () => {
    if (!permissions.canCreateProject) {
      toast.error('Quyền hạn bị giới hạn', 'Bạn không có quyền khởi tạo dự án mới.');
      return;
    }
    setEditingProject(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (project: ProjectItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!permissions.canEditProject) {
      toast.error('Quyền hạn bị giới hạn', 'Bạn không có quyền chỉnh sửa dự án này.');
      return;
    }
    setEditingProject(project);
    setIsDrawerOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    try {
      await deleteProject.mutateAsync(deletingProject.id);
      toast.success('Đã xóa dự án thành công', `Dự án ${deletingProject.name} đã được xóa khỏi hệ thống.`);
    } catch {
      toast.error('Lỗi khi xóa dự án', 'Không thể xóa dự án. Vui lòng thử lại sau.');
    } finally {
      setDeletingProject(null);
    }
  };

  const handleSave = async (data: Partial<ProjectItem>) => {
    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, payload: data });
        toast.success('Cập nhật dự án thành công', `Đã lưu thông tin dự án ${data.name}.`);
      } else {
        await createProject.mutateAsync(data);
        toast.success('Tạo dự án mới thành công', `Đã khởi tạo dự án ${data.name}.`);
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.detail)
          ? err?.response?.data?.detail[0]?.msg
          : err?.response?.data?.detail) ||
        'Không thể lưu dự án. Vui lòng kiểm tra lại thông tin.';
      toast.error('Lỗi lưu thông tin dự án', errorMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title={t('Quản lý Dự án', 'Project Management')} description={t('Đang tải danh sách dự án...', 'Loading project list...')} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const isForbidden = (error as any)?.response?.status === 403;
  if (isForbidden) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title={t('Quản lý Dự án', 'Project Management')} description={t('Tổng quan dự án và tiến độ', 'Projects overview and progress')} />
        <ForbiddenState onBack={() => navigate('/dashboard')} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title={t('Quản lý Dự án', 'Project Management')} description={t('Tổng quan dự án và tiến độ', 'Projects overview and progress')} />
        <ErrorState
          title={t('Lỗi tải danh sách dự án', 'Failed to load projects')}
          message={t('Không thể kết nối đến backend API. Vui lòng kiểm tra lại dịch vụ.', 'Could not connect to backend API service.')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('Quản lý Dự án', 'Project Management')}
        description={t('Tổng quan danh sách dự án, lập kế hoạch và theo dõi tiến độ công việc', 'Manage projects, planning and progress tracking')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Trang chủ', 'Dashboard'), href: '/dashboard' },
              { label: t('Danh sách Dự án', 'Projects') },
            ]}
          />
        }
        actions={
          permissions.canCreateProject ? (
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
              {t('Tạo Dự án Mới', 'New Project')}
            </Button>
          ) : undefined
        }
      />

      {organizationFilterLabel && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border/60 py-3 text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <Briefcase className="h-4 w-4 text-primary" />
            <span>{t('Đang lọc dự án theo', 'Filtering projects by')} <strong className="text-text-primary">{organizationFilterLabel}</strong></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<X className="h-3.5 w-3.5" />}
            onClick={clearOrganizationFilter}
          >
            {t('Xóa bộ lọc tổ chức', 'Clear organization filter')}
          </Button>
        </div>
      )}

      {/* Toolbar & Search Controls */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex-1 w-full md:w-auto">
            <Input
              placeholder={t('Tìm kiếm theo tên dự án hoặc mô tả...', 'Search by project name or description...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-text-muted" />}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: t('Tất cả trạng thái', 'All Statuses') },
                { value: 'Active', label: statusLabel('Active') },
                { value: 'Planning', label: statusLabel('Planning') },
                { value: 'In Progress', label: statusLabel('In Progress') },
                { value: 'Completed', label: statusLabel('Completed') },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid Container */}
      {paginatedProjects.length === 0 ? (
        <EmptyState
          title={t('Không tìm thấy dự án nào', 'No projects found')}
          description={searchTerm ? t('Không có dự án phù hợp với từ khóa tìm kiếm.', 'No projects match your search query.') : t('Chưa có dự án nào được khởi tạo trong hệ thống.', 'No projects have been created yet.')}
          action={
            permissions.canCreateProject ? (
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                {t('Khởi tạo Dự án Mới', 'Create New Project')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="card-grid-fluid">
          {paginatedProjects.map((project) => {
            return (
              <Card
                key={project.id}
                variant="interactive"
                className="cursor-pointer flex flex-col justify-between"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-accent text-accent-foreground shrink-0">
                        <Briefcase className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <span className="text-xs font-mono font-bold text-text-muted truncate">
                        {project.project_code || `PRJ-${project.id}`}
                      </span>
                    </div>

                    <StatusBadge status={project.status || 'Active'} className="shrink-0" />
                  </div>

                  <CardTitle className="text-lg font-bold text-text-primary mt-3 truncate" title={project.name}>
                    {project.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {project.description || t('Chưa có mô tả chi tiết cho dự án này.', 'No detailed description available.')}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-1 border-t border-border/60 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">{t('Tiến độ:', 'Progress:')}</span>
                      <span className="font-bold text-text-primary">
                        {project.progress_percent ?? 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, project.progress_percent ?? 0))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs border-t border-border/60 pt-2 min-w-0">
                    <span className="text-text-muted shrink-0">{t('Phòng ban / Nhóm:', 'Department / Team:')}</span>
                    <span
                      className="font-semibold text-text-primary text-right min-w-0 truncate"
                      title={
                        project.department_name
                          ? `${project.department_name}${project.team_name ? ` • ${project.team_name}` : ''}`
                          : t('Chưa gán Phòng ban', 'Unassigned')
                      }
                    >
                      {project.department_name ? (
                        <>
                          {project.department_name}
                          {project.team_name ? ` • ${project.team_name}` : ''}
                        </>
                      ) : (
                        <span className="text-text-muted italic">{t('Chưa gán Phòng ban', 'Unassigned')}</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs border-t border-border/60 pt-2 min-w-0">
                    <span className="text-text-muted shrink-0">{t('Thời gian thực hiện:', 'Timeline:')}</span>
                    <span className="font-semibold text-text-primary text-right truncate">
                      {project.start_date ? formatDate(project.start_date) : '—'}
                      {' → '}
                      {project.end_date ? formatDate(project.end_date) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs border-t border-border/60 pt-2 min-w-0">
                    <span className="text-text-muted shrink-0">{t('Ngày khởi tạo:', 'Created:')}</span>
                    <span className="font-semibold text-text-primary truncate">
                      {project.created_at ? formatDate(project.created_at) : t('Mới cập nhật', 'Recently updated')}
                    </span>
                  </div>

                  <EntityActions
                    align="end"
                    className="pt-3 border-t border-border/60"
                    onView={() => navigate(`/projects/${project.id}`)}
                    onEdit={permissions.canEditProject ? (e) => handleOpenEdit(project, e) : undefined}
                    onDelete={permissions.canDeleteProject ? () => setDeletingProject(project) : undefined}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredProjects.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={filteredProjects.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Drawer Form Modal */}
      {permissions.canCreateProject && (
        <ProjectDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          project={editingProject}
          onSave={handleSave}
          isLoading={createProject.isPending || updateProject.isPending}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingProject)}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleConfirmDelete}
        title={t('Xác nhận xóa dự án', 'Confirm Delete Project')}
        message={t(`Bạn có chắc chắn muốn xóa dự án ${deletingProject?.name}? Mọi dữ liệu liên quan sẽ bị xóa khỏi hệ thống.`, `Are you sure you want to delete project ${deletingProject?.name}?`)}
        confirmText={t('Xóa dự án', 'Delete Project')}
        isLoading={deleteProject.isPending}
      />
    </div>
  );
};

export default ProjectPage;

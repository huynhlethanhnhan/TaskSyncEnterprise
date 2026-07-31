import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Briefcase, Trash2, Edit3, Eye } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/common/Badge';
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
import { type ProjectItem } from '../../api/services';

const ProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const permissions = usePermissions();

  const { data: projects = [], isLoading, isError, error, refetch } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(9);

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
        <PageHeader title="Quản lý Dự án" description="Đang tải danh sách dự án..." />
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
        <PageHeader title="Quản lý Dự án" description="Tổng quan dự án và tiến độ" />
        <ForbiddenState onBack={() => navigate('/dashboard')} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Quản lý Dự án" description="Tổng quan dự án và tiến độ" />
        <ErrorState
          title="Lỗi tải danh sách dự án"
          message="Không thể kết nối đến backend API. Vui lòng kiểm tra lại dịch vụ."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Dự án"
        description="Tổng quan danh sách dự án, lập kế hoạch và theo dõi tiến độ công việc"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Danh sách Dự án' },
            ]}
          />
        }
        actions={
          permissions.canCreateProject ? (
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
              Tạo Dự án Mới
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar & Search Controls */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex-1 w-full md:w-auto">
            <Input
              placeholder="Tìm kiếm theo tên dự án hoặc mô tả..."
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
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'Active', label: 'Hoạt động (Active)' },
                { value: 'Planning', label: 'Lập kế hoạch' },
                { value: 'Completed', label: 'Hoàn thành' },
                { value: 'Archived', label: 'Lưu trữ' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid Container */}
      {paginatedProjects.length === 0 ? (
        <EmptyState
          title="Không tìm thấy dự án nào"
          description={searchTerm ? 'Không có dự án phù hợp với từ khóa tìm kiếm.' : 'Chưa có dự án nào được khởi tạo trong hệ thống.'}
          action={
            permissions.canCreateProject ? (
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                Khởi tạo Dự án Mới
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProjects.map((project) => {
            const isCompleted = project.status === 'Completed';
            return (
              <Card
                key={project.id}
                variant="interactive"
                className="cursor-pointer flex flex-col justify-between"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-accent text-accent-foreground">
                        <Briefcase className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <span className="text-xs font-mono font-bold text-text-muted">
                        {project.project_code || `PRJ-${project.id}`}
                      </span>
                    </div>

                    <Badge
                      variant={isCompleted ? 'success' : project.status === 'Active' ? 'primary' : 'warning'}
                      showDot
                    >
                      {project.status || 'Active'}
                    </Badge>
                  </div>

                  <CardTitle className="text-lg font-bold text-text-primary mt-3">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {project.description || 'Chưa có mô tả chi tiết cho dự án này.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center justify-between text-xs border-t border-border/60 pt-3">
                    <span className="text-text-muted">Phòng ban / Team:</span>
                    <span className="font-semibold text-text-primary text-right">
                      {project.department_name ? (
                        <>
                          {project.department_name}
                          {project.team_name ? ` • ${project.team_name}` : ''}
                        </>
                      ) : (
                        <span className="text-text-muted italic">Chưa gán Phòng ban</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-border/60 pt-2">
                    <span className="text-text-muted">Ngày khởi tạo:</span>
                    <span className="font-semibold text-text-primary">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString('vi-VN') : 'Mới cập nhật'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}`);
                      }}
                    >
                      Chi tiết
                    </Button>
                    {permissions.canEditProject && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                        onClick={(e) => handleOpenEdit(project, e)}
                      >
                        Sửa
                      </Button>
                    )}
                    {permissions.canDeleteProject && (
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingProject(project);
                        }}
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
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
        title="Xác nhận xóa dự án"
        message={`Bạn có chắc chắn muốn xóa dự án ${deletingProject?.name}? Mọi dữ liệu liên quan sẽ bị xóa khỏi hệ thống.`}
        confirmText="Xóa dự án"
        isLoading={deleteProject.isPending}
      />
    </div>
  );
};

export default ProjectPage;

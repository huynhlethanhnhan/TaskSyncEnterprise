import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, Edit3, Trash2, Eye } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/common/Badge';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { DepartmentDrawer } from '../../components/drawers/DepartmentDrawer';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '../../hooks/useDepartments';
import { useEmployees } from '../../hooks/useEmployees';
import { useToast } from '../../providers/ToastProvider';
import { type DepartmentItem } from '../../api/services';

export const DepartmentPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: departments = [], isLoading, isError, refetch } = useDepartments();
  const { data: employees = [] } = useEmployees();

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingDepartment, setEditingDepartment] = React.useState<DepartmentItem | null>(null);

  const filteredDepartments = React.useMemo(() => {
    return departments.filter((d) => {
      return (
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.department_code && d.department_code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [departments, searchTerm]);

  const handleOpenCreate = () => {
    setEditingDepartment(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDepartment(dept);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (dept: DepartmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Xác nhận xóa phòng ban "${dept.name}"?`)) return;

    try {
      await deleteDepartment.mutateAsync(dept.id);
      toast.success('Đã xóa phòng ban thành công');
    } catch {
      toast.error('Lỗi khi xóa phòng ban');
    }
  };

  const handleSave = async (data: Partial<DepartmentItem>) => {
    try {
      if (editingDepartment) {
        await updateDepartment.mutateAsync({ id: editingDepartment.id, payload: data });
        toast.success('Cập nhật phòng ban thành công');
      } else {
        await createDepartment.mutateAsync(data);
        toast.success('Thêm phòng ban mới thành công');
      }
      setIsDrawerOpen(false);
    } catch {
      toast.error('Lỗi khi lưu phòng ban');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Quản lý Phòng ban" description="Đang tải sơ đồ cơ cấu tổ chức..." />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Quản lý Phòng ban" description="Cơ cấu phòng ban doanh nghiệp" />
        <ErrorState
          title="Không thể tải danh sách phòng ban"
          message="Đã xảy ra lỗi khi tải dữ liệu phòng ban từ máy chủ backend."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Phòng ban"
        description="Sơ đồ tổ chức phòng ban, quản lý Trưởng phòng và thống kê nhân sự"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Danh sách Phòng ban' },
            ]}
          />
        }
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            Tạo Phòng ban Mới
          </Button>
        }
      />

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Tìm kiếm phòng ban theo tên hoặc mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-text-muted" />}
          />
        </CardContent>
      </Card>

      {/* Department Cards Grid */}
      {filteredDepartments.length === 0 ? (
        <EmptyState
          title="Chưa có phòng ban nào"
          description="Chưa có thông tin phòng ban được lưu trữ trong hệ thống."
          action={
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
              Thêm Phòng ban
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => {
            const manager = employees.find((e) => e.id === dept.manager_id);
            const deptHeadcount = employees.filter((e) => e.department_id === dept.id).length;

            return (
              <Card
                key={dept.id}
                variant="interactive"
                className="cursor-pointer flex flex-col justify-between"
                onClick={() => navigate(`/departments/${dept.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-accent text-accent-foreground">
                        <Building2 className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <span className="text-xs font-mono font-bold text-text-muted">
                        {dept.department_code || `DEPT-${dept.id}`}
                      </span>
                    </div>

                    <Badge variant="primary" showDot>
                      {deptHeadcount} Nhân sự
                    </Badge>
                  </div>

                  <CardTitle className="text-lg font-bold text-text-primary mt-3">{dept.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {dept.description || 'Chưa có mô tả chi tiết chức năng phòng ban.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center justify-between text-xs border-t border-border/60 pt-3">
                    <span className="text-text-muted">Trưởng phòng:</span>
                    <span className="font-semibold text-text-primary">
                      {manager ? manager.full_name : 'Chưa chỉ định'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/departments/${dept.id}`);
                      }}
                    >
                      Chi tiết
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                      onClick={(e) => handleOpenEdit(dept, e)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={(e) => handleDelete(dept, e)}
                    >
                      Xóa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Drawer Form Modal */}
      <DepartmentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        department={editingDepartment}
        employees={employees}
        onSave={handleSave}
        isLoading={createDepartment.isPending || updateDepartment.isPending}
      />
    </div>
  );
};

export default DepartmentPage;

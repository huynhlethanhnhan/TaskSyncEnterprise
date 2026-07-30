import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit3, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { ForbiddenState } from '../../components/feedback/ForbiddenState';
import { Pagination } from '../../components/data-display/Pagination';
import { DataTableWrapper } from '../../components/data-display/DataTableWrapper';
import { EmployeeDrawer } from '../../components/drawers/EmployeeDrawer';
import { ConfirmDialog } from '../../components/modals/ConfirmDialog';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '../../hooks/useEmployees';
import { useDepartments } from '../../hooks/useDepartments';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../providers/ToastProvider';
import { extractApiError } from '../../utils/errorHelpers';
import { type EmployeeItem } from '../../api/services';

const EmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const permissions = usePermissions();

  const { data: employees = [], isLoading, isError, error, refetch } = useEmployees();
  const { data: departments = [] } = useDepartments();

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  // Filters & State
  const [searchTerm, setSearchTerm] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Drawer Form State
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeItem | null>(null);

  // Confirm Delete Dialog State
  const [deletingEmployee, setDeletingEmployee] = React.useState<EmployeeItem | null>(null);

  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.job_title && emp.job_title.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDept = departmentFilter === 'all' || String(emp.department_id) === departmentFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && emp.is_active) ||
        (statusFilter === 'inactive' && !emp.is_active);
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const paginatedEmployees = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;

  const handleOpenCreate = () => {
    if (!permissions.canCreateEmployee) {
      toast.error('Quyền truy cập bị giới hạn', 'Chỉ Quản trị viên (Admin) mới có quyền tạo tài khoản nhân viên mới.');
      return;
    }
    setEditingEmployee(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!permissions.canEditEmployee) {
      toast.error('Quyền truy cập bị giới hạn', 'Bạn không có quyền chỉnh sửa tài khoản nhân viên này.');
      return;
    }
    setEditingEmployee(emp);
    setIsDrawerOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;
    try {
      await deleteEmployee.mutateAsync(deletingEmployee.id);
      toast.success('Đã xóa nhân viên thành công', `Đã xóa tài khoản ${deletingEmployee.full_name}.`);
    } catch {
      toast.error('Lỗi khi xóa nhân viên', 'Không thể xóa tài khoản. Vui lòng thử lại sau.');
    } finally {
      setDeletingEmployee(null);
    }
  };

  const handleSave = async (data: Partial<EmployeeItem>) => {
    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({ id: editingEmployee.id, payload: data });
        toast.success('Cập nhật nhân viên thành công');
      } else {
        await createEmployee.mutateAsync(data);
        toast.success('Thêm nhân viên mới thành công');
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('Lỗi phân quyền (403)', 'Bạn không có quyền thực hiện thao tác này trên backend.');
      } else {
        const apiError = extractApiError(err, 'Không thể lưu thông tin nhân viên');
        toast.error(`Lỗi [${apiError.status}]`, apiError.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Quản lý Nhân sự" description="Đang tải danh sách nhân viên..." />
        <SkeletonCard />
      </div>
    );
  }

  // Check 403 Forbidden Response
  const isForbidden = (error as any)?.response?.status === 403;

  if (isForbidden) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Quản lý Nhân sự" description="Danh sách nhân sự doanh nghiệp" />
        <ForbiddenState onBack={() => navigate('/dashboard')} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Quản lý Nhân sự" description="Danh sách nhân sự doanh nghiệp" />
        <ErrorState
          title="Không thể tải danh sách nhân sự"
          message="Đã xảy ra lỗi khi tải dữ liệu từ backend server API."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const columns = [
    {
      accessorKey: 'full_name',
      header: 'Nhân viên',
      cell: ({ row }: { row: { original: EmployeeItem } }) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.original.full_name} src={row.original.avatar_url || undefined} size="md" />
          <div>
            <div className="font-bold text-text-primary">{row.original.full_name}</div>
            <div className="text-xs text-text-muted">{row.original.job_title || 'Chưa gán chức danh'}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email Doanh nghiệp',
      cell: ({ row }: { row: { original: EmployeeItem } }) => (
        <span className="text-xs text-text-secondary">{row.original.email}</span>
      ),
    },
    {
      accessorKey: 'department_id',
      header: 'Phòng ban',
      cell: ({ row }: { row: { original: EmployeeItem } }) => {
        const dept = departments.find((d) => d.id === row.original.department_id);
        return <span className="text-xs font-medium text-text-primary">{dept?.name || '—'}</span>;
      },
    },
    {
      accessorKey: 'role_id',
      header: 'Vai trò',
      cell: ({ row }: { row: { original: EmployeeItem } }) => {
        const r = row.original.role_id;
        const label = r === 1 ? 'Admin' : r === 2 ? 'Manager' : 'Staff';
        return <Badge variant={r === 1 ? 'danger' : r === 2 ? 'primary' : 'default'}>{label}</Badge>;
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Trạng thái',
      cell: ({ row }: { row: { original: EmployeeItem } }) => (
        <Badge variant={row.original.is_active ? 'success' : 'danger'} showDot>
          {row.original.is_active ? 'Hoạt động' : 'Tạm khóa'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Hành động',
      cell: ({ row }: { row: { original: EmployeeItem } }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => navigate(`/employees/${row.original.id}`)}
          >
            Chi tiết
          </Button>

          {permissions.canEditEmployee && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit3 className="h-3.5 w-3.5" />}
              onClick={(e) => handleOpenEdit(row.original, e)}
            >
              Sửa
            </Button>
          )}

          {permissions.canDeleteEmployee && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                setDeletingEmployee(row.original);
              }}
            >
              Xóa
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Nhân sự"
        description="Danh sách tài khoản nhân viên, sơ đồ chức danh và phân quyền phòng ban"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Danh sách Nhân sự' },
            ]}
          />
        }
        actions={
          permissions.canCreateEmployee ? (
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
              Thêm Nhân viên Mới
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar & Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            placeholder="Tìm kiếm theo tên, email, chức danh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-text-muted" />}
          />

          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Tất cả phòng ban' },
              ...departments.map((d) => ({ value: String(d.id), label: d.name })),
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Hoạt động (Active)' },
              { value: 'inactive', label: 'Tạm khóa (Inactive)' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Main Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTableWrapper columns={columns} data={paginatedEmployees} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={filteredEmployees.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Drawer Form Modal */}
      {permissions.canCreateEmployee && (
        <EmployeeDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          employee={editingEmployee}
          departments={departments}
          onSave={handleSave}
          isLoading={createEmployee.isPending || updateEmployee.isPending}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingEmployee)}
        onClose={() => setDeletingEmployee(null)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa tài khoản"
        message={`Bạn có chắc chắn muốn xóa tài khoản nhân viên ${deletingEmployee?.full_name}? Thao tác này sẽ thực hiện xóa mềm (soft-delete) trong hệ thống.`}
        confirmText="Xóa tài khoản"
        isLoading={deleteEmployee.isPending}
      />
    </div>
  );
};

export default EmployeePage;

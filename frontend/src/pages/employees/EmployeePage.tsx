import * as React from 'react';
import { useNavigate } from 'react-router';
import { KeyRound, Plus, Search } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/common/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EntityActions } from '../../components/common/EntityActions';
import { Avatar } from '../../components/common/Avatar';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { ForbiddenState } from '../../components/feedback/ForbiddenState';
import { Pagination } from '../../components/data-display/Pagination';
import { DataTableWrapper } from '../../components/data-display/DataTableWrapper';
import { EmployeeDrawer } from '../../components/drawers/EmployeeDrawer';
import { ConfirmDialog } from '../../components/modals/ConfirmDialog';
import {
  ResetPasswordModal,
  type ResetPasswordModalTarget,
} from '../../components/modals/ResetPasswordModal';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useUpdateEmployeeStatus,
  usePasswordResetRequests,
  useDismissPasswordResetRequest,
} from '../../hooks/useEmployees';
import { useDepartments } from '../../hooks/useDepartments';
import { useHrmContracts } from '../../hooks/useHRM';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { useToast } from '../../providers/ToastProvider';
import { getContractTypeLabel } from '../../components/hrm/HrmModals';
import { extractApiError } from '../../utils/errorHelpers';
import { GLOBAL_ACTION_TEXT } from '../../utils/globalLabels';
import { type EmployeeItem, type EmploymentContractItem } from '../../api/services';

const EmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const permissions = usePermissions();
  const { user } = useAuth();
  const { defaultPageSize, t, isEnglish } = useSettings();
  const isAdmin = user?.role_id === 1 || (user?.role || '').toLowerCase() === 'admin';
  const isManager = user?.role_id === 2 || (user?.role || '').toLowerCase() === 'manager';

  const { data: employees = [], isLoading, isError, error, refetch } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const { data: contracts = [] } = useHrmContracts(undefined, isAdmin || isManager);
  const { data: passwordResetRequests = [] } = usePasswordResetRequests(isAdmin);

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const updateEmployeeStatus = useUpdateEmployeeStatus();
  const dismissResetRequest = useDismissPasswordResetRequest();

  // Filters & State
  const [searchTerm, setSearchTerm] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  React.useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);

  // Drawer Form State
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeItem | null>(null);

  // Confirm Delete / Offboard Dialog State
  const [deletingEmployee, setDeletingEmployee] = React.useState<EmployeeItem | null>(null);
  const [offboardAction, setOffboardAction] = React.useState<{
    employee: EmployeeItem;
    nextStatus: 'Terminated' | 'Pending_Offboard';
  } | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = React.useState<ResetPasswordModalTarget | null>(null);

  const pendingResetIds = React.useMemo(
    () => new Set(passwordResetRequests.map((req) => req.employee_id)),
    [passwordResetRequests],
  );

  const contractByEmployee = React.useMemo(() => {
    const map = new Map<number, EmploymentContractItem>();
    for (const c of contracts) {
      const prev = map.get(c.employee_id);
      if (!prev || (prev.status !== 'Active' && c.status === 'Active')) {
        map.set(c.employee_id, c);
      }
    }
    return map;
  }, [contracts]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, statusFilter]);

  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.job_title && emp.job_title.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDept = departmentFilter === 'all' || String(emp.department_id) === departmentFilter;
      const isOnline = Boolean(emp.is_active && emp.is_online);
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'online' && isOnline) ||
        (statusFilter === 'offline' && emp.is_active && !isOnline) ||
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
      toast.error(
        t('Quyền truy cập bị giới hạn', 'Access Restricted'),
        t('Chỉ Quản trị viên (Admin) mới có quyền tạo tài khoản nhân viên mới.', 'Only Administrators can create new employee accounts.'),
      );
      return;
    }
    setEditingEmployee(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const canManagerEditDeptMember =
      isManager && Boolean(user?.department_id) && Number(user?.department_id) === Number(emp.department_id);
    if (!permissions.canEditEmployee && !canManagerEditDeptMember) {
      toast.error(
        t('Quyền truy cập bị giới hạn', 'Access Restricted'),
        t('Bạn không có quyền chỉnh sửa tài khoản nhân viên này.', 'You do not have permission to edit this employee account.'),
      );
      return;
    }
    setEditingEmployee(emp);
    setIsDrawerOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;
    try {
      await deleteEmployee.mutateAsync(deletingEmployee.id);
      toast.success(
        t('Đã xóa nhân viên thành công', 'Employee Deleted'),
        t(`Đã xóa tài khoản ${deletingEmployee.full_name}.`, `Account ${deletingEmployee.full_name} has been deleted.`),
      );
    } catch {
      toast.error(
        t('Lỗi khi xóa nhân viên', 'Failed to Delete Employee'),
        t('Không thể xóa tài khoản. Vui lòng thử lại sau.', 'Unable to delete account. Please try again later.'),
      );
    } finally {
      setDeletingEmployee(null);
    }
  };

  const handleSave = async (data: Partial<EmployeeItem>) => {
    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({ id: editingEmployee.id, payload: data });
        toast.success(t('Cập nhật nhân viên thành công', 'Employee updated successfully'));
      } else {
        await createEmployee.mutateAsync(data);
        toast.success(t('Thêm nhân viên mới thành công', 'New employee created successfully'));
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error(
          t('Lỗi phân quyền (403)', 'Permission Error (403)'),
          t('Bạn không có quyền thực hiện thao tác này trên backend.', 'You do not have permission to perform this action.'),
        );
      } else {
        const apiError = extractApiError(err, t('Không thể lưu thông tin nhân viên', 'Unable to save employee information'));
        toast.error(`${t('Lỗi', 'Error')} [${apiError.status}]`, apiError.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title={t('Quản lý Nhân sự', 'Employee Management')} description={t('Đang tải danh sách nhân viên...', 'Loading employee directory...')} />
        <SkeletonCard />
      </div>
    );
  }

  // Check 403 Forbidden Response
  const isForbidden = (error as any)?.response?.status === 403;

  if (isForbidden) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title={t('Quản lý Nhân sự', 'Employee Management')} description={t('Danh sách nhân sự doanh nghiệp', 'Enterprise employee directory')} />
        <ForbiddenState onBack={() => navigate('/dashboard')} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title={t('Quản lý Nhân sự', 'Employee Management')} description={t('Danh sách nhân sự doanh nghiệp', 'Enterprise employee directory')} />
        <ErrorState
          title={t('Không thể tải danh sách nhân sự', 'Unable to Load Employees')}
          message={t('Đã xảy ra lỗi khi tải dữ liệu từ backend server API.', 'An error occurred while loading data from the backend API.')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const columns = [
    {
      accessorKey: 'full_name',
      header: t('Nhân viên', 'Employee'),
      cell: ({ row }: { row: { original: EmployeeItem } }) => (
        <div className="flex items-center gap-3 min-w-0 max-w-[230px]">
          <Avatar
            name={row.original.full_name}
            src={row.original.avatar_url || undefined}
            size="md"
            status={row.original.is_active && row.original.is_online ? 'online' : 'offline'}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-text-primary truncate" title={row.original.full_name}>
                {row.original.full_name}
              </span>
              {isAdmin && pendingResetIds.has(row.original.id) && (
                <Badge variant="warning" size="sm" className="shrink-0">
                  {t('Quên MK', 'Reset Req')}
                </Badge>
              )}
            </div>
            <div
              className="text-xs text-text-muted truncate"
              title={row.original.job_title || t('Chưa gán chức danh', 'No job title')}
            >
              {row.original.job_title || t('Chưa gán chức danh', 'No job title')}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: t('Liên hệ', 'Contact'),
      cell: ({ row }: { row: { original: EmployeeItem } }) => (
        <div className="min-w-0 max-w-[210px]">
          <div className="truncate text-xs text-text-secondary" title={row.original.email}>
            {row.original.email}
          </div>
          <div className="truncate text-[11px] text-text-muted" title={[row.original.phone, row.original.address].filter(Boolean).join(' · ') || undefined}>
            {row.original.phone || t('Chưa có SĐT', 'No phone')}
            {row.original.gender
              ? ` · ${
                  row.original.gender.toLowerCase() === 'male'
                    ? t('Nam', 'Male')
                    : row.original.gender.toLowerCase() === 'female'
                      ? t('Nữ', 'Female')
                      : t('Khác', 'Other')
                }`
              : ''}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'department_id',
      header: t('Phòng ban', 'Department'),
      cell: ({ row }: { row: { original: EmployeeItem } }) => {
        const dept = departments.find((d) => d.id === row.original.department_id);
        return (
          <span
            className="block max-w-[180px] truncate text-xs font-medium text-text-primary"
            title={dept?.name || '—'}
          >
            {dept?.name || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'role_id',
      header: t('Vai trò', 'Role'),
      cell: ({ row }: { row: { original: EmployeeItem } }) => {
        const r = row.original.role_id;
        const label = r === 1 ? 'Admin' : r === 2 ? 'Manager' : 'Staff';
        return <Badge variant={r === 1 ? 'danger' : r === 2 ? 'primary' : 'default'}>{label}</Badge>;
      },
    },
    {
      id: 'contract',
      header: t('Hợp đồng', 'Contract'),
      cell: ({ row }: { row: { original: EmployeeItem } }) => {
        const empContract = contractByEmployee.get(row.original.id);
        if (!empContract) {
          return (
            <span className="text-[11px] text-text-muted">
              {t('Chưa có HĐ', 'No Contract')}
            </span>
          );
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/employees/${row.original.id}`);
            }}
            className="text-left space-y-0.5 hover:opacity-80 cursor-pointer"
            title={`${empContract.contract_code} · ${getContractTypeLabel(empContract.contract_type, isEnglish)}`}
          >
            <div className="font-mono text-[11px] font-semibold text-primary">
              {empContract.contract_code}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-text-secondary truncate max-w-[120px]">
                {getContractTypeLabel(empContract.contract_type, isEnglish)}
              </span>
              <StatusBadge status={empContract.status} size="sm" />
            </div>
          </button>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: t('Trạng thái', 'Status'),
      cell: ({ row }: { row: { original: EmployeeItem } }) => {
        const emp = row.original;
        if (emp.employment_status === 'Terminated' || emp.employment_status === 'Pending_Offboard') {
          return <StatusBadge status={emp.employment_status} />;
        }
        if (!emp.is_active) {
          return <StatusBadge status="Disabled" />;
        }
        return <StatusBadge status={emp.is_online ? 'Online' : 'Offline'} />;
      },
    },
    {
      id: 'actions',
      header: t(GLOBAL_ACTION_TEXT.actionsHeader.vi, GLOBAL_ACTION_TEXT.actionsHeader.en),
      cell: ({ row }: { row: { original: EmployeeItem } }) => {
        const emp = row.original;
        const isPending = emp.employment_status === 'Pending_Offboard';
        const isTerminated = emp.employment_status === 'Terminated';

        const handleOffboardOrDelete = async (e: React.MouseEvent) => {
          e.stopPropagation();
          if (isAdmin) {
            if (isPending) {
              setOffboardAction({ employee: emp, nextStatus: 'Terminated' });
            } else {
              setDeletingEmployee(emp);
            }
          } else {
            setOffboardAction({ employee: emp, nextStatus: 'Pending_Offboard' });
          }
        };

        const canManagerEditDeptMember =
          isManager && Boolean(user?.department_id) && Number(user?.department_id) === Number(emp.department_id);

        return (
          <EntityActions
            layout="menu"
            align="center"
            onView={() => navigate(`/employees/${emp.id}`)}
            onEdit={permissions.canEditEmployee || canManagerEditDeptMember ? (e) => handleOpenEdit(emp, e) : undefined}
            onDelete={
              !isTerminated && isAdmin && !isPending
                ? handleOffboardOrDelete
                : undefined
            }
            onRequestDelete={
              !isTerminated && ((isAdmin && isPending) || (!isAdmin && isManager))
                ? handleOffboardOrDelete
                : undefined
            }
            requestDeleteLabel={
              isAdmin && isPending
                ? t('Duyệt xóa', 'Approve Offboard')
                : t('Yêu cầu Offboard', 'Offboard')
            }
            extraMenuItems={
              isAdmin
                ? [
                    {
                      key: 'reset-password',
                      label: t('Đặt lại mật khẩu', 'Reset Password'),
                      icon: <KeyRound className="h-4 w-4 text-amber-500" />,
                      onClick: () =>
                        setResetPasswordTarget({
                          id: emp.id,
                          full_name: emp.full_name,
                          email: emp.email,
                          employee_code: emp.employee_code,
                        }),
                    },
                  ]
                : undefined
            }
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('Quản lý Nhân sự', 'Employee Management')}
        description={t('Danh sách tài khoản nhân viên, sơ đồ chức danh và phân quyền phòng ban', 'Employee directory, job titles, and department permissions')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Dashboard', 'Dashboard'), href: '/dashboard' },
              { label: t('Danh sách Nhân sự', 'Employees') },
            ]}
          />
        }
        actions={
          permissions.canCreateEmployee ? (
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
              {t('Thêm Nhân viên Mới', 'Add New Employee')}
            </Button>
          ) : undefined
        }
      />

      {/* Pending Password Reset Queue for Admin */}
      {isAdmin && passwordResetRequests.length > 0 && (
        <Card className="border-amber-300/80 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-text-primary">
                  {t(
                    `Có ${passwordResetRequests.length} nhân viên yêu cầu cấp lại mật khẩu`,
                    `${passwordResetRequests.length} pending password reset request(s)`,
                  )}
                </span>
              </div>
              <Badge variant="warning" size="sm">
                {t('Cần Admin xử lý', 'Admin Action Needed')}
              </Badge>
            </div>
            <div className="space-y-2">
              {passwordResetRequests.map((req) => (
                <div
                  key={req.employee_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-surface px-3.5 py-2.5"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-text-primary">{req.full_name}</span>
                      <span className="text-[11px] font-mono text-text-muted">{req.employee_code}</span>
                      <span className="text-text-muted">· {req.email}</span>
                      {req.department_name && (
                        <Badge variant="outline" size="sm">{req.department_name}</Badge>
                      )}
                    </div>
                    {req.note && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        {t('Ghi chú:', 'Note:')} {req.note}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dismissResetRequest.mutate(req.employee_id)}
                      isLoading={dismissResetRequest.isPending}
                    >
                      {t('Bỏ qua', 'Dismiss')}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                      onClick={() =>
                        setResetPasswordTarget({
                          id: req.employee_id,
                          full_name: req.full_name,
                          email: req.email,
                          employee_code: req.employee_code,
                        })
                      }
                    >
                      {t('Cấp lại mật khẩu', 'Reset Password')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar & Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            placeholder={t('Tìm kiếm theo tên, email, chức danh...', 'Search by name, email, or job title...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-text-muted" />}
          />

          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: 'all', label: t('Tất cả phòng ban', 'All Departments') },
              ...departments.map((d) => ({ value: String(d.id), label: d.name })),
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: t('Tất cả trạng thái', 'All Statuses') },
              { value: 'online', label: t('Trực tuyến', 'Online') },
              { value: 'offline', label: t('Ngoại tuyến', 'Offline') },
              { value: 'active', label: t('Tài khoản bật', 'Enabled Accounts') },
              { value: 'inactive', label: t('Tạm dừng', 'Inactive') },
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
      {(permissions.canCreateEmployee || permissions.canEditEmployee || isManager) && (
        <EmployeeDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          employee={editingEmployee}
          departments={departments}
          onSave={handleSave}
          isLoading={createEmployee.isPending || updateEmployee.isPending}
          contactOnly={!isAdmin}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingEmployee)}
        onClose={() => setDeletingEmployee(null)}
        onConfirm={handleConfirmDelete}
        title={t('Xác nhận xóa tài khoản', 'Confirm Account Deletion')}
        message={t(
          `Bạn có chắc chắn muốn xóa tài khoản nhân viên ${deletingEmployee?.full_name}? Thao tác này sẽ thực hiện xóa mềm (soft-delete) trong hệ thống.`,
          `Are you sure you want to delete employee account ${deletingEmployee?.full_name}? This will perform a soft delete.`,
        )}
        confirmText={t('Xóa tài khoản', 'Delete Account')}
        isLoading={deleteEmployee.isPending}
      />
      {/* Confirm Offboard Action Dialog */}
      <ConfirmDialog
        isOpen={Boolean(offboardAction)}
        onClose={() => setOffboardAction(null)}
        onConfirm={async () => {
          if (!offboardAction) return;
          try {
            await updateEmployeeStatus.mutateAsync({
              id: offboardAction.employee.id,
              status: offboardAction.nextStatus,
            });
            toast.success(
              t('Thành công', 'Success'),
              offboardAction.nextStatus === 'Terminated'
                ? t('Đã duyệt yêu cầu nghỉ việc.', 'Offboard request approved.')
                : t('Đã gửi yêu cầu Offboard.', 'Offboard request submitted.'),
            );
            setOffboardAction(null);
          } catch (err) {
            const apiError = extractApiError(err, t('Không thể cập nhật trạng thái nhân sự.', 'Unable to update employee status.'));
            toast.error(`${t('Lỗi', 'Error')} [${apiError.status}]`, apiError.message);
          }
        }}
        title={
          offboardAction?.nextStatus === 'Terminated'
            ? t('Duyệt yêu cầu nghỉ việc', 'Approve Offboard Request')
            : t('Yêu cầu Offboard nhân sự', 'Request Employee Offboard')
        }
        message={
          offboardAction?.nextStatus === 'Terminated'
            ? t(
                `Xác nhận duyệt yêu cầu offboard cho nhân sự ${offboardAction?.employee.full_name}?`,
                `Confirm approving offboard request for ${offboardAction?.employee.full_name}?`,
              )
            : t(
                `Gửi yêu cầu Offboard nhân sự ${offboardAction?.employee.full_name} lên Quản trị viên?`,
                `Submit offboard request for ${offboardAction?.employee.full_name} to Administrator?`,
              )
        }
        confirmText={t('Xác nhận', 'Confirm')}
        isLoading={updateEmployeeStatus.isPending}
      />

      <ResetPasswordModal
        isOpen={Boolean(resetPasswordTarget)}
        onClose={() => setResetPasswordTarget(null)}
        employee={resetPasswordTarget}
      />
    </div>
  );
};

export default EmployeePage;

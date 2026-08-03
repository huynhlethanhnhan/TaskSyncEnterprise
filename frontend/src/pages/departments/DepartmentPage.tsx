import * as React from 'react';
import { useNavigate } from 'react-router';
import {
  Plus,
  Search,
  Building2,
  Users,
  UserCheck,
  ShieldAlert,
  Briefcase,
  RefreshCw,
  CircleCheckBig,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/common/Badge';
import { Drawer } from '../../components/common/Drawer';
import { Avatar } from '../../components/common/Avatar';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '../../hooks/useDepartments';
import { type DepartmentItem } from '../../api/services';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';

const DepartmentPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || Number(user?.role_id) === 1;

  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: departments = [], isLoading } = useDepartments();

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingDept, setEditingDept] = React.useState<DepartmentItem | null>(null);
  const [deletingDeptId, setDeletingDeptId] = React.useState<number | null>(null);

  // Form state
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (editingDept) {
      setName(editingDept.name);
      setCode(editingDept.department_code);
      setDescription(editingDept.description || '');
    } else {
      setName('');
      setCode('');
      setDescription('');
    }
  }, [editingDept]);

  const filteredDepts = React.useMemo(
    () =>
      departments.filter(
        (d) =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.department_code.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [departments, searchQuery],
  );

  const handleOpenCreate = () => {
    setEditingDept(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setIsDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng điền đầy đủ Tên và Mã phòng ban.');
      return;
    }

    const payload: Partial<DepartmentItem> = {
      name: name.trim(),
      department_code: code.trim().toUpperCase(),
      description: description.trim() || null,
    };

    try {
      if (editingDept) {
        await updateDepartment.mutateAsync({ id: editingDept.id, payload });
        toast.success('Cập nhật thành công', `Phòng ban ${payload.name} đã được cập nhật.`);
      } else {
        await createDepartment.mutateAsync(payload);
        toast.success('Thành công', `Đã tạo phòng ban mới ${payload.name}.`);
      }
      setIsDrawerOpen(false);
    } catch {
      toast.error('Lỗi lưu trữ', 'Không thể đồng bộ thông tin phòng ban với máy chủ.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDepartment.mutateAsync(id);
      toast.success('Đã xóa phòng ban', 'Phòng ban đã được gỡ bỏ khỏi hệ thống.');
      setDeletingDeptId(null);
    } catch {
      toast.error('Lỗi khi xóa', 'Không thể xóa phòng ban này. Có thể vẫn còn nhân viên hoặc nhóm đang hoạt động.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Quản lý Phòng ban" description="Đang tải cơ cấu tổ chức..." />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      <PageHeader
        title="Quản lý Phòng ban"
        description="Quản lý cơ cấu tổ chức, phòng ban và nhân sự trực thuộc"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Administration', href: '#' },
              { label: 'Departments' },
            ]}
          />
        }
        actions={
          isAdmin && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Tạo phòng ban mới
            </Button>
          )
        }
      />

      {/* Search bar */}
      <Card>
        <CardContent className="p-4 bg-accent/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="text"
              placeholder="Tìm theo tên hoặc mã phòng ban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Department grid */}
      {filteredDepts.length === 0 ? (
        <Card className="p-12 text-center text-text-muted text-xs border-dashed border-2">
          Không tìm thấy phòng ban nào trùng khớp.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepts.map((dept) => (
            <Card
              key={dept.id}
              className="relative flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-800 transition"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-[10px] font-bold text-text-muted font-mono uppercase tracking-wider">
                        {dept.department_code}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold text-text-primary mt-1">
                      {dept.name}
                    </CardTitle>
                  </div>
                  <Badge variant={dept.is_active ? 'success' : 'outline'} size="sm">
                    {dept.is_active ? 'Hoạt động' : 'Tạm dừng'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-1 flex-1">
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                  {dept.description || 'Chưa cập nhật mô tả cho phòng ban này.'}
                </p>

                <div className="space-y-2 text-[10px] text-text-secondary border-t border-border/60 pt-3">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    {dept.manager_name ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar
                          name={dept.manager_name}
                          src={dept.manager_avatar_url}
                          size="sm"
                        />
                        <span className="font-bold text-text-primary">
                          {dept.manager_name}
                        </span>
                      </div>
                    ) : (
                      <span className="italic text-text-muted">Chưa chỉ định trưởng phòng</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <span>
                        <strong>{dept.employee_count ?? 0}</strong> nhân viên
                      </span>
                    </div>
                    <span>
                      <strong>{dept.team_count ?? 0}</strong> nhóm
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1" title="Tổng dự án có thành viên phòng ban tham gia">
                      <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span><strong>{dept.project_count ?? 0}</strong> dự án</span>
                    </div>
                    <div className="flex items-center gap-1" title="Số dự án đã hoàn thành">
                      <CircleCheckBig className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span><strong>{dept.completed_project_count ?? 0}</strong> xong</span>
                    </div>
                    <div className="flex items-center gap-1" title="Tổng Sprint thuộc các dự án phòng ban tham gia">
                      <RefreshCw className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span><strong>{dept.sprint_count ?? 0}</strong> Sprint</span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardContent className="border-t border-border/60 p-3 bg-accent/10">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/departments/${dept.id}`)}
                  >
                    Chi tiết
                  </Button>

                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(dept)}
                      >
                        Sửa
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeletingDeptId(dept.id)}
                      >
                        Xóa
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDeptId && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setDeletingDeptId(null)}
          />
          <Card className="relative w-full max-w-sm border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-rose-500 shrink-0" />
              <h3 className="text-sm font-bold text-text-primary">Xác nhận xóa Phòng ban?</h3>
            </div>
            <p className="text-xs text-text-secondary leading-normal">
              Thao tác này sẽ đánh dấu phòng ban là ngừng hoạt động (soft-delete). Phòng ban không
              thể xóa nếu vẫn còn nhân viên hoặc nhóm đang hoạt động. Bạn có muốn tiếp tục?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingDeptId(null)}>
                Hủy
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deletingDeptId !== null && handleDelete(deletingDeptId)}
              >
                Xóa phòng ban
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create / Edit Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingDept ? 'Cập nhật thông tin Phòng ban' : 'Khởi tạo Phòng ban mới'}
      >
        <form onSubmit={handleSave} className="space-y-6 pt-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Tên phòng ban</label>
            <Input
              type="text"
              placeholder="VD: Kỹ thuật phần mềm, Nhân sự"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Mã phòng ban</label>
            <Input
              type="text"
              placeholder="VD: ENG, HR"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={!!editingDept}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Mô tả</label>
            <textarea
              placeholder="Mô tả chức năng và hoạt động của phòng ban..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-80px rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-text-primary outline-none focus:border-primary transition"
            />
          </div>

          <div className="border-t border-border pt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={createDepartment.isPending || updateDepartment.isPending}
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default DepartmentPage;

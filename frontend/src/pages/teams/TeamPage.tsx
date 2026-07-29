import * as React from 'react';
import { Plus, Search, Building2, ShieldAlert, Tag, UserCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/common/Badge';
import { Drawer } from '../../components/common/Drawer';
import { Avatar } from '../../components/common/Avatar';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam } from '../../hooks/useTeams';
import { type TeamItem } from '../../api/services';
import { useDepartments } from '../../hooks/useDepartments';
import { useEmployees } from '../../hooks/useEmployees';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useNavigate } from 'react-router-dom';

export const TeamPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || Number(user?.role_id) === 1;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [deptFilter, setDeptFilter] = React.useState('all');

  // Queries
  const { data: teams = [], isLoading } = useTeams();

  const { data: departments = [] } = useDepartments();
  const { data: employees = [] } = useEmployees();

  // Mutations
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingTeam, setEditingTeam] = React.useState<TeamItem | null>(null);

  // Form inputs state
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState('');
  const [leaderId, setLeaderId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);

  // Delete confirm dialog state
  const [deletingTeamId, setDeletingTeamId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (editingTeam) {
      setName(editingTeam.name);
      setCode(editingTeam.team_code);
      setDepartmentId(String(editingTeam.department_id));
      setLeaderId(editingTeam.leader_id ? String(editingTeam.leader_id) : '');
      setDescription(editingTeam.description || '');
      setIsActive(editingTeam.is_active);
    } else {
      setName('');
      setCode('');
      setDepartmentId(''); // Đã fix: Để chuỗi rỗng mặc định thay vì lấy phòng ban đầu tiên
      setLeaderId('');
      setDescription('');
      setIsActive(true);
    }
  }, [editingTeam, departments]);

  const filteredTeams = React.useMemo(() => {
    return teams.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.team_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDept = deptFilter === 'all' || String(t.department_id) === deptFilter;
      return matchSearch && matchDept;
    });
  }, [teams, searchQuery, deptFilter]);

  const handleOpenCreate = () => {
    setEditingTeam(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (team: TeamItem) => {
    setEditingTeam(team);
    setIsDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !departmentId) {
      toast.error('Thiếu thông tin', 'Vui lòng điền đầy đủ Tên, Mã nhóm và chọn Phòng ban.');
      return;
    }

    const payload = {
      name: name.trim(),
      team_code: code.trim().toUpperCase(),
      department_id: Number(departmentId),
      leader_id: leaderId ? Number(leaderId) : null,
      description: description.trim() || null,
      is_active: isActive,
    };

    try {
      if (editingTeam) {
        await updateTeam.mutateAsync({ id: editingTeam.id, payload });
        toast.success('Cập nhật thành công', `Nhóm ${payload.name} đã được cập nhật.`);
      } else {
        await createTeam.mutateAsync(payload);
        toast.success('Thành công', `Đã tạo nhóm mới ${payload.name}.`);
      }
      setIsDrawerOpen(false);
    } catch {
      toast.error('Lỗi lưu trữ', 'Không thể đồng bộ thông tin nhóm với máy chủ.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTeam.mutateAsync(id);
      toast.success('Đã xóa nhóm', 'Thông tin nhóm đã được gỡ bỏ khỏi hệ thống.');
      setDeletingTeamId(null);
    } catch {
      toast.error('Lỗi khi xóa', 'Không thể xóa nhóm này. Vui lòng thử lại sau.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Quản lý Nhóm (Teams)" description="Đang tải dữ liệu cơ cấu nhóm..." />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Nhóm (Teams)"
        description="Quản lý cơ cấu đội nhóm của phòng ban và phân chia nhân sự dự án"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Administration', href: '#' },
              { label: 'Teams' },
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
              Tạo nhóm mới
            </Button>
          )
        }
      />

      {/* Filter panel */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4 bg-accent/20">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="text"
              placeholder="Tìm theo tên hoặc mã nhóm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-60">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="flex h-10 w-full appearance-none rounded-md border border-input bg-surface px-3 py-2 text-sm text-text-primary transition-all duration-200 outline-none hover:border-slate-400 cursor-pointer"
            >
              <option value="all">Tất cả Phòng ban</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <Card className="p-12 text-center text-text-muted text-xs border-dashed border-2">
          Không tìm thấy nhóm nào trùng khớp.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const dept = departments.find((d) => d.id === team.department_id);

            return (
              <Card key={team.id} className="relative flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-800 transition">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-[10px] font-bold text-text-muted font-mono uppercase tracking-wider">{team.team_code}</span>
                      </div>
                      <CardTitle className="text-sm font-bold text-text-primary mt-1">{team.name}</CardTitle>
                    </div>
                    <Badge variant={team.is_active ? 'success' : 'outline'} size="sm">
                      {team.is_active ? 'Hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1 flex-1">
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {team.description || 'Chưa cập nhật mô tả cho nhóm này.'}
                  </p>

                  <div className="space-y-2 text-[10px] text-text-secondary border-t border-border/60 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <span><strong>Phòng ban:</strong> {dept?.name || 'Không xác định'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <span className="flex items-center gap-1 font-semibold text-text-primary">
                        <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        Trưởng nhóm:
                      </span>
                      {team.leader_name ? (
                        <div className="flex items-center gap-1.5 bg-secondary/60 px-2 py-0.5 rounded-full text-[10px]">
                          <Avatar
                            name={team.leader_name}
                            src={team.leader_avatar_url}
                            size="sm"
                          />
                          <span className="font-bold text-text-primary">
                            {team.leader_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-muted italic">
                          Chưa chỉ định
                        </span>
                      )}
                    </div>

                    <div>
                      <span>
                        <strong>Nhân sự thuộc nhóm:</strong>
                        {' '}
                        {team.member_count ?? 0} thành viên</span>
                    </div>
                  </div>
                </CardContent>

                <CardContent className="border-t border-border/60 p-3 bg-accent/10">

                  <div className="flex justify-end gap-2">

                      <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/teams/${team.id}`)}
                      >
                          Chi tiết
                      </Button>

                      {isAdmin && (
                          <>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(team)}
                              >
                                  Sửa
                              </Button>

                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => setDeletingTeamId(team.id)}
                              >
                                  Xóa
                              </Button>
                          </>
                      )}

                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTeamId && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setDeletingTeamId(null)} />
          <Card className="relative w-full max-w-sm border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-rose-500 shrink-0" />
              <h3 className="text-sm font-bold text-text-primary">Xác nhận xóa Nhóm?</h3>
            </div>
            <p className="text-xs text-text-secondary leading-normal">
              Thao tác này sẽ đánh dấu nhóm là ngừng hoạt động (soft-delete). Bạn có thực sự muốn tiếp tục?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingTeamId(null)}>
                Hủy
              </Button>
              <Button variant="danger" size="sm" onClick={() => deletingTeamId !== null && handleDelete(deletingTeamId)}>
                Xóa nhóm
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create / Edit Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingTeam ? 'Cập nhật thông tin Nhóm' : 'Khởi tạo Nhóm mới'}
      >
        <form onSubmit={handleSave} className="space-y-6 pt-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Tên nhóm</label>
            <Input
              type="text"
              placeholder="VD: Core Engine Dev, HR Operations"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Mã nhóm (Team Code)</label>
            <Input
              type="text"
              placeholder="VD: ENG-CORE, HR-OPS"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={!!editingTeam}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Phòng ban quản lý</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
              className="flex h-10 w-full appearance-none rounded-md border border-input bg-surface px-3 py-2 text-sm text-text-primary transition-all duration-200 outline-none hover:border-slate-400 cursor-pointer"
            >
              <option value="" disabled>-- Chọn phòng ban quản lý --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-secondary">Trưởng nhóm (Team Lead)</label>
              {departmentId && (
                <span className="text-[10px] text-primary font-medium">
                  Lọc theo {departments.find((d) => String(d.id) === String(departmentId))?.name}
                </span>
              )}
            </div>
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="flex h-10 w-full appearance-none rounded-md border border-input bg-surface px-3 py-2 text-sm text-text-primary transition-all duration-200 outline-none hover:border-slate-400 cursor-pointer"
            >
              <option value="">-- Chưa chỉ định Trưởng nhóm --</option>
              {(() => {
                const candidates = departmentId
                  ? employees.filter((e) => String(e.department_id) === String(departmentId))
                  : employees;
                const list = candidates.length > 0 ? candidates : employees;
                return list.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.job_title || 'Thành viên'})
                  </option>
                ));
              })()}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Mô tả chi tiết</label>
            <textarea
              placeholder="Nhập chức năng chính hoặc mô tả về hoạt động của nhóm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-80px rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-text-primary outline-none focus:border-primary transition"
            />
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <input
              id="team-active-checkbox"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary"
            />
            <label htmlFor="team-active-checkbox" className="text-xs text-text-secondary font-semibold cursor-pointer select-none">
              Trạng thái hoạt động
            </label>
          </div>

          <div className="border-t border-border pt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" isLoading={createTeam.isPending || updateTeam.isPending}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default TeamPage;

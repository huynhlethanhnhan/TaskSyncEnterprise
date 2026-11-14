import * as React from 'react';
import { Plus, Search, Building2, ShieldAlert, Tag, UserCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EntityActions } from '../../components/common/EntityActions';
import { Drawer } from '../../components/common/Drawer';
import { Avatar } from '../../components/common/Avatar';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam } from '../../hooks/useTeams';
import { type TeamItem } from '../../api/services';
import { useDepartments } from '../../hooks/useDepartments';
import { useEmployees } from '../../hooks/useEmployees';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { extractApiError } from '../../utils/errorHelpers';
import { useNavigate } from 'react-router';

const TeamPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useSettings();
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
    } catch (err) {
      const apiError = extractApiError(err, 'Không thể đồng bộ thông tin nhóm với máy chủ.');
      toast.error(`Lỗi [${apiError.status}]`, apiError.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTeam.mutateAsync(id);
      toast.success('Đã xóa nhóm', 'Thông tin nhóm đã được gỡ bỏ khỏi hệ thống.');
      setDeletingTeamId(null);
    } catch (err) {
      const apiError = extractApiError(err, 'Không thể xóa nhóm này. Vui lòng thử lại sau.');
      toast.error(`Lỗi [${apiError.status}]`, apiError.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title={t('Quản lý Nhóm (Teams)', 'Team Management')} description={t('Đang tải dữ liệu cơ cấu nhóm...', 'Loading teams data...')} />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('Quản lý Nhóm (Teams)', 'Team Management')}
        description={t('Quản lý cơ cấu đội nhóm của phòng ban và phân chia nhân sự dự án', 'Manage department teams and member assignments')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Quản trị', 'Administration'), href: '#' },
              { label: t('Nhóm', 'Teams') },
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
              {t('Tạo nhóm mới', 'New Team')}
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
              placeholder={t('Tìm theo tên hoặc mã nhóm...', 'Search by team name or code...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              aria-label={t('Lọc theo phòng ban', 'Filter by department')}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              options={[
                { value: 'all', label: t('Tất cả Phòng ban', 'All Departments') },
                ...departments.map((dept) => ({
                  value: String(dept.id),
                  label: dept.name,
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <Card className="p-12 text-center text-text-muted text-xs border-dashed border-2">
          {t('Không tìm thấy nhóm nào trùng khớp.', 'No matching teams found.')}
        </Card>
      ) : (
        <div className="card-grid-fluid">
          {filteredTeams.map((team) => {
            const dept = departments.find((d) => d.id === team.department_id);

            return (
              <Card key={team.id} className="relative flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-800 transition">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-[10px] font-bold text-text-muted font-mono uppercase tracking-wider truncate">{team.team_code}</span>
                      </div>
                      <CardTitle className="text-sm font-bold text-text-primary mt-1 truncate" title={team.name}>
                        {team.name}
                      </CardTitle>
                    </div>
                    <StatusBadge isActive={team.is_active} className="shrink-0" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1 flex-1">
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {team.description || t('Chưa cập nhật mô tả cho nhóm này.', 'No description provided for this team.')}
                  </p>

                  <div className="space-y-2 text-[10px] text-text-secondary border-t border-border/60 pt-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <span className="truncate" title={dept?.name || t('Không xác định', 'Unknown')}>
                        <strong>{t('Phòng ban:', 'Department:')}</strong> {dept?.name || t('Không xác định', 'Unknown')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1 min-w-0">
                      <span className="flex items-center gap-1 font-semibold text-text-primary shrink-0">
                        <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        {t('Trưởng nhóm:', 'Team Leader:')}
                      </span>
                      {team.leader_name ? (
                        <div className="flex items-center gap-1.5 bg-secondary/60 px-2 py-0.5 rounded-full text-[10px] min-w-0 max-w-[175px]">
                          <Avatar
                            name={team.leader_name}
                            src={team.leader_avatar_url}
                            size="sm"
                          />
                          <span className="font-bold text-text-primary truncate" title={team.leader_name}>
                            {team.leader_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-muted italic">
                          {t('Chưa chỉ định', 'Unassigned')}
                        </span>
                      )}
                    </div>

                    <div>
                      <span>
                        <strong>{t('Nhân sự thuộc nhóm:', 'Members:')}</strong>
                        {' '}
                        {team.member_count ?? 0} {t('thành viên', 'members')}</span>
                    </div>
                  </div>
                </CardContent>

                <CardContent className="border-t border-border/60 px-4 py-3 sm:px-6 bg-accent/10">
                  <EntityActions
                    align="end"
                    onView={() => navigate(`/teams/${team.id}`)}
                    onEdit={isAdmin ? () => handleOpenEdit(team) : undefined}
                    onDelete={isAdmin ? () => setDeletingTeamId(team.id) : undefined}
                  />
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
              <h3 className="text-sm font-bold text-text-primary">{t('Xác nhận xóa Nhóm?', 'Confirm Team Deletion?')}</h3>
            </div>
            <p className="text-xs text-text-secondary leading-normal">
              {t('Thao tác này sẽ đánh dấu nhóm là ngừng hoạt động (soft-delete). Bạn có thực sự muốn tiếp tục?', 'This action marks the team as inactive (soft-delete). Are you sure you want to continue?')}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingTeamId(null)}>
                {t('Hủy', 'Cancel')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => deletingTeamId !== null && handleDelete(deletingTeamId)}>
                {t('Xóa nhóm', 'Delete Team')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create / Edit Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingTeam ? t('Cập nhật thông tin Nhóm', 'Update Team Info') : t('Khởi tạo Nhóm mới', 'Create New Team')}
      >
        <form onSubmit={handleSave} className="space-y-6 pt-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">{t('Tên nhóm', 'Team Name')}</label>
            <Input
              type="text"
              placeholder={t('VD: Core Engine Dev, HR Operations', 'e.g., Core Engine Dev, HR Operations')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">{t('Mã nhóm (Team Code)', 'Team Code')}</label>
            <Input
              type="text"
              placeholder={t('VD: ENG-CORE, HR-OPS', 'e.g., ENG-CORE, HR-OPS')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={!!editingTeam}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">{t('Phòng ban quản lý', 'Parent Department')}</label>
            <Select
              aria-label={t('Phòng ban quản lý', 'Parent Department')}
              value={String(departmentId || '')}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
              options={[
                { value: '', label: t('-- Chọn phòng ban quản lý --', '-- Select parent department --'), disabled: true },
                ...departments.map((dept) => ({
                  value: String(dept.id),
                  label: dept.name,
                })),
              ]}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-secondary">{t('Trưởng nhóm (Team Lead)', 'Team Lead')}</label>
              {departmentId && (
                <span className="text-[10px] text-primary font-medium">
                  {t('Lọc theo', 'Filtered by')} {departments.find((d) => String(d.id) === String(departmentId))?.name}
                </span>
              )}
            </div>
            <Select
              aria-label={t('Trưởng nhóm (Team Lead)', 'Team Lead')}
              value={String(leaderId || '')}
              onChange={(e) => setLeaderId(e.target.value)}
              options={[
                { value: '', label: t('-- Chưa chỉ định Trưởng nhóm --', '-- Unassigned Team Lead --') },
                ...(() => {
                  const candidates = departmentId
                    ? employees.filter((e) => String(e.department_id) === String(departmentId))
                    : employees;
                  const list = candidates.length > 0 ? candidates : employees;
                  return list.map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.full_name} (${emp.job_title || t('Thành viên', 'Member')})`,
                  }));
                })(),
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">{t('Mô tả chi tiết', 'Description')}</label>
            <textarea
              placeholder={t('Nhập chức năng chính hoặc mô tả về hoạt động của nhóm...', 'Enter primary responsibilities or team description...')}
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
              {t('Trạng thái hoạt động', 'Active Status')}
            </label>
          </div>

          <div className="border-t border-border pt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              {t('Hủy', 'Cancel')}
            </Button>
            <Button variant="primary" type="submit" isLoading={createTeam.isPending || updateTeam.isPending}>
              {t('Lưu thay đổi', 'Save Changes')}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default TeamPage;

import * as React from 'react';
import { Search, Download, FileText } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { auditApi } from '../../api/auditApi';
import { exportToCsv } from '../../utils/csv';
import { useAuth } from '../../providers/AuthProvider';

const ACTION_BADGE_VARIANTS: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'outline'> = {
  LOGIN: 'success',
  LOGOUT: 'outline',
  CREATE: 'primary',
  UPDATE: 'warning',
  DELETE: 'danger',
};

export const AuditLogPage: React.FC = () => {
  const { user } = useAuth();
  const roleStr = (user?.role || '').toLowerCase();
  const roleId = Number(user?.role_id);
  const isAdmin = roleStr === 'admin' || roleId === 1;

  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await auditApi.getLogs();
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setLogs(data);
      } catch (err: any) {
        if (err?.response?.status !== 403) {
          console.error('Lỗi lấy nhật ký:', err);
        }
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [isAdmin]);



  const actionSummary = React.useMemo(() => {
    return logs.reduce(
      (acc, item) => {
        acc.total = (acc.total || 0) + 1;
        const key = (item.action || 'OTHER').toUpperCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [logs]);

  const filteredLogs = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        (log.employee_email || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  const attendanceSummary = React.useMemo(() => {
    const map: Record<string, { email: string; loginCount: number; lastLogin: Date | null }> = {};
    logs.forEach((log) => {
      const email = log.employee_email || 'unknown';
      if (!map[email]) {
        map[email] = { email, loginCount: 0, lastLogin: null };
      }
      const action = (log.action || '').toUpperCase();
      if (action === 'LOGIN') {
        map[email].loginCount += 1;
        const ts = log.timestamp ? new Date(log.timestamp) : null;
        if (!map[email].lastLogin || (ts && ts > map[email].lastLogin)) {
          map[email].lastLogin = ts;
        }
      }
    });
    return Object.values(map)
      .filter((u) => u.loginCount > 0)
      .sort((a, b) => (b.lastLogin ? b.lastLogin.getTime() : 0) - (a.lastLogin ? a.lastLogin.getTime() : 0));
  }, [logs]);

  // Secure CSV Export
  const handleExport = () => {
    const headers = ['User Email', 'Hành động', 'Thời gian'];
    const rows = filteredLogs.map((log) => [
      log.employee_email || 'unknown',
      log.action || 'OTHER',
      log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—',
    ]);
    exportToCsv('AuditLogs_SecurityExport.csv', headers, rows);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Truy cập bị từ chối</h2>
        <p className="text-xs text-text-muted">Bạn không có quyền truy cập vào trang Nhật ký hệ thống.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 w-64 bg-accent/40 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-24 bg-surface border border-border rounded-3xl" />
          <div className="h-24 bg-surface border border-border rounded-3xl" />
          <div className="h-24 bg-surface border border-border rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header */}
      <PageHeader
        title="Nhật ký Hệ thống (Audit Logs)"
        description="Giám sát lịch sử hoạt động, phiên đăng nhập và các sự kiện bảo mật"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Administration', href: '#' },
              { label: 'Audit Logs' },
            ]}
          />
        }
        actions={
          filteredLogs.length > 0 && (
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Xuất nhật ký (CSV)
            </Button>
          )
        }
      />

      {/* Summary Stats cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
        {[
          { key: 'total', label: 'Tổng số hành động', count: actionSummary.total || 0, variant: 'primary' },
          { key: 'LOGIN', label: 'Đăng nhập', count: actionSummary.LOGIN || 0, variant: 'success' },
          { key: 'CREATE', label: 'Tạo mới', count: actionSummary.CREATE || 0, variant: 'info' },
          { key: 'UPDATE', label: 'Cập nhật', count: actionSummary.UPDATE || 0, variant: 'warning' },
          { key: 'DELETE', label: 'Xóa', count: actionSummary.DELETE || 0, variant: 'danger' },
        ].map((item) => (
          <Card key={item.key}>
            <CardContent className="p-4 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted">{item.label}</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-text-primary">{item.count}</span>
                <Badge variant={item.variant as any} size="sm">
                  Logs
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Filter panel */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4 bg-accent/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="text"
              placeholder="Tìm theo email hoặc hành động..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      {attendanceSummary.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              Lịch sử đăng nhập & Điểm danh
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-accent/40 text-text-secondary border-b border-border">
                    <th className="p-3 font-semibold">User Email</th>
                    <th className="p-3 font-semibold">Số lần đăng nhập</th>
                    <th className="p-3 font-semibold">Thời gian lần cuối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attendanceSummary.map((u) => (
                    <tr key={u.email} className="hover:bg-accent/20 transition-colors">
                      <td className="p-3 font-semibold text-text-primary">{u.email}</td>
                      <td className="p-3">
                        <Badge variant="success" size="sm">
                          {u.loginCount} lần
                        </Badge>
                      </td>
                      <td className="p-3 text-text-secondary">
                        {u.lastLogin ? u.lastLogin.toLocaleString('vi-VN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details logs table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Chi tiết nhật ký hoạt động ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-text-muted text-xs">
              Chưa có ghi chép nhật ký nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-accent/40 text-text-secondary border-b border-border">
                    <th className="p-3 font-semibold">Nhân viên</th>
                    <th className="p-3 font-semibold w-32">Hành động</th>
                    <th className="p-3 font-semibold">Thời gian ghi nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLogs.map((log, index) => (
                    <tr key={log.id || index} className="hover:bg-accent/20 transition-colors">
                      <td className="p-3 font-semibold text-text-primary">{log.employee_email || 'system'}</td>
                      <td className="p-3">
                        <Badge variant={ACTION_BADGE_VARIANTS[log.action] || 'outline'} size="sm">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3 text-text-secondary">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogPage;

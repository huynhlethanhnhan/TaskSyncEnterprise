import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { useProjects } from '../../hooks/useProjects';
import { Select } from '../../components/ui/Select';
import { BacklogManager } from '../../components/backlog/BacklogManager';

const BacklogPage: React.FC = () => {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');

  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(String(projects[0].id));
    }
  }, [projects, selectedProjectId]);

  return (
    <div className="space-y-6 font-sans pb-12 text-xs">
      {/* Page Header */}
      <PageHeader
        title="Product Backlog Planning"
        description="Quản lý danh sách tính năng sản phẩm, user stories và sắp xếp mức độ ưu tiên backlog"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Work Management', href: '#' },
              { label: 'Product Backlog' },
            ]}
          />
        }
      />

      {projectsLoading ? (
        <div className="text-center py-6 text-text-muted">Đang tải danh sách dự án...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface/50 text-xs text-text-muted">
          Bạn chưa tham gia vào dự án nào. Vui lòng tạo dự án hoặc tham gia thành viên để sử dụng Backlog.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project Selector Box */}
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-text-primary text-sm">Lựa chọn dự án làm việc</h4>
              <p className="text-text-muted mt-0.5 text-[11px]">Chọn dự án để lên kế hoạch và quản lý Backlog tương ứng.</p>
            </div>
            <div className="w-full sm:max-w-xs shrink-0">
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                options={projects.map((p) => ({ value: String(p.id), label: p.name }))}
              />
            </div>
          </div>

          {selectedProjectId && (
            <BacklogManager projectId={Number(selectedProjectId)} />
          )}
        </div>
      )}
    </div>
  );
};

export default BacklogPage;

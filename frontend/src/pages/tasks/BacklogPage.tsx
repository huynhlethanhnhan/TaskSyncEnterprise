import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const BacklogPage: React.FC = () => {
  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Product Backlog"
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

      {/* Backend Gap Details Card */}
      <Card className="border-rose-200/40 dark:border-rose-950/20 bg-rose-500/[0.02]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="danger">Backend Gap</Badge>
            <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-400">
              Báo cáo kỹ thuật: Thiếu cơ sở dữ liệu và Endpoint API Backlog
            </CardTitle>
          </div>
          <CardDescription className="text-rose-500/80 mt-1 text-xs">
            Hệ thống API backend và các bảng lưu trữ trong cơ sở dữ liệu SQL Server hiện chưa hỗ trợ các mô hình cho backlog. Dưới đây là phân tích và đề xuất thiết kế để triển khai cho sprint tiếp theo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-xs text-text-secondary leading-relaxed">
          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">1. Thiết kế Mô hình Cơ sở dữ liệu Đề xuất (SQL Server DDL)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`CREATE TABLE dbo.backlog_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    project_id INT NOT NULL FOREIGN KEY REFERENCES dbo.projects(id) ON DELETE CASCADE,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    priority VARCHAR(50) DEFAULT 'Medium', -- Low, Medium, High, Critical
    status VARCHAR(50) DEFAULT 'Unscheduled', -- Unscheduled, Planned, Removed
    assigned_to INT NULL FOREIGN KEY REFERENCES dbo.employees(id),
    story_points INT DEFAULT 0,
    created_at DATETIME DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME DEFAULT SYSUTCDATETIME()
);

-- Index foreign keys for faster join searches
CREATE INDEX ix_dbo_backlog_items_project_id ON dbo.backlog_items(project_id);
CREATE INDEX ix_dbo_backlog_items_assigned_to ON dbo.backlog_items(assigned_to);`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">2. Khai báo API Endpoint & Contracts (FastAPI Router)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`# Route prefix: /api/v1/backlog
@router.get("", response_model=list[BacklogResponse])
def get_backlog_items(project_id: int, db: Session = Depends(get_db)):
    return db.query(BacklogItem).filter(BacklogItem.project_id == project_id).all()

@router.post("", response_model=BacklogResponse, status_code=201)
def create_backlog_item(data: BacklogCreate, db: Session = Depends(get_db)):
    db_item = BacklogItem(**data.model_dump())
    db.add(db_item)
    db.commit()
    return db_item`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">3. Kế hoạch tích hợp Frontend (Vite Client Plan)</h4>
            <p className="mb-2">
              Khi backend hoàn thiện các endpoint API trên:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Khai báo hàm <code className="px-1 rounded bg-secondary font-mono">backlogApi.getAll(projectId)</code> và <code className="px-1 rounded bg-secondary font-mono">backlogApi.create(payload)</code> trong file <code className="px-1 rounded bg-secondary font-mono">frontend/src/api/services.ts</code>.</li>
              <li>Sử dụng React Query hook <code className="px-1 rounded bg-secondary font-mono">useBacklog(projectId)</code> để quản lý đồng bộ trạng thái client-server.</li>
              <li>Chuyển đổi giao diện này thành bảng Kanban drag-and-drop cho phép kéo các item trực tiếp từ Backlog vào các Sprint đang mở.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BacklogPage;

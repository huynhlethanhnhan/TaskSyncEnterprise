import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const SprintsPage: React.FC = () => {
  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Sprints"
        description="Lập kế hoạch sprint, theo dõi hiệu năng hoàn thành mục tiêu công việc theo chu kỳ phát triển (Agile/Scrum)"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Work Management', href: '#' },
              { label: 'Sprint Planning' },
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
              Báo cáo kỹ thuật: Thiếu cơ sở dữ liệu và Endpoint API Sprints
            </CardTitle>
          </div>
          <CardDescription className="text-rose-500/80 mt-1 text-xs">
            Hệ thống cơ sở dữ liệu và API server backend hiện chưa hỗ trợ lưu trữ trạng thái vòng đời của các chu kỳ Sprint. Dưới đây là thiết kế chi tiết để triển khai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-xs text-text-secondary leading-relaxed">
          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">1. Thiết kế Mô hình Vòng đời Sprint (SQL Server Table DDL)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`CREATE TABLE dbo.sprints (
    id INT IDENTITY(1,1) PRIMARY KEY,
    project_id INT NOT NULL FOREIGN KEY REFERENCES dbo.projects(id) ON DELETE CASCADE,
    name NVARCHAR(150) NOT NULL,
    goal NVARCHAR(500) NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Planned', -- Planned, Active, Completed, Cancelled
    created_at DATETIME DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME DEFAULT SYSUTCDATETIME()
);

-- Index foreign keys for faster join searches
CREATE INDEX ix_dbo_sprints_project_id ON dbo.sprints(project_id);`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">2. Khai báo API Endpoints (FastAPI Router)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`# Route prefix: /api/v1/sprints
@router.post("", response_model=SprintResponse, status_code=201)
def create_sprint(data: SprintCreate, db: Session = Depends(get_db)):
    db_sprint = Sprint(**data.model_dump())
    db.add(db_sprint)
    db.commit()
    return db_sprint

@router.patch("/{sprint_id}/start", response_model=SprintResponse)
def start_sprint(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.get(Sprint, sprint_id)
    sprint.status = "Active"
    db.commit()
    return sprint`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">3. Kế hoạch tích hợp Frontend</h4>
            <p className="mb-2">
              Kế hoạch triển khai khi backend hoàn tất:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cập nhật schema trong file <code className="px-1 rounded bg-secondary font-mono">frontend/src/api/services.ts</code> để hỗ trợ các trường Sprint.</li>
              <li>Bổ sung cột <code className="px-1 rounded bg-secondary font-mono">sprint_id</code> vào bảng Tasks để gắn kết task thuộc về sprint nào.</li>
              <li>Tạo view biểu đồ Burn-down chart dựa trên lịch sử thay đổi trạng thái của task trong chu kỳ Sprint.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SprintsPage;

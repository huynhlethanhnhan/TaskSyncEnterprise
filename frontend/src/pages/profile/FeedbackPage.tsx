import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const FeedbackPage: React.FC = () => {
  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Ý kiến & Phản hồi (Feedback)"
        description="Gửi ý kiến đóng góp, phản hồi về sản phẩm hoặc quy trình làm việc nội bộ của doanh nghiệp"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Collaboration', href: '#' },
              { label: 'Feedback' },
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
              Báo cáo kỹ thuật: Thiếu cơ sở dữ liệu và Endpoint API Ý kiến phản hồi (Feedback)
            </CardTitle>
          </div>
          <CardDescription className="text-rose-500/80 mt-1 text-xs">
            Hệ thống backend hiện chưa hỗ trợ bảng lưu trữ và router quản lý ý kiến đóng góp của người dùng. Dưới đây là phân tích và đề xuất thiết kế.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-xs text-text-secondary leading-relaxed">
          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">1. Thiết kế Mô hình Phản hồi (SQL Server Table DDL)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`CREATE TABLE dbo.user_feedback (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- Product, Process, Culture, Tech
    description NVARCHAR(MAX) NOT NULL,
    impact_level VARCHAR(50) DEFAULT 'Medium', -- Low, Medium, High
    status VARCHAR(50) DEFAULT 'New', -- New, Under Review, Planned, Resolved, Rejected
    submitter_id INT NOT NULL FOREIGN KEY REFERENCES dbo.employees(id),
    reviewer_id INT NULL FOREIGN KEY REFERENCES dbo.employees(id),
    created_at DATETIME DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME DEFAULT SYSUTCDATETIME()
);

-- Index foreign keys for faster searches
CREATE INDEX ix_dbo_user_feedback_submitter ON dbo.user_feedback(submitter_id);
CREATE INDEX ix_dbo_user_feedback_status ON dbo.user_feedback(status);`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">2. Khai báo API Endpoints (FastAPI Router)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`# Route prefix: /api/v1/feedback
@router.post("", response_model=FeedbackResponse, status_code=201)
def submit_feedback(data: FeedbackCreate, current_user: Employee = Depends(get_current_user), db: Session = Depends(get_db)):
    db_fb = UserFeedback(submitter_id=current_user.id, **data.model_dump())
    db.add(db_fb)
    db.commit()
    return db_fb

@router.patch("/{feedback_id}/review", response_model=FeedbackResponse)
def review_feedback(feedback_id: int, reviewer_id: int, status: string, db: Session = Depends(get_db)):
    fb = db.get(UserFeedback, feedback_id)
    fb.reviewer_id = reviewer_id
    fb.status = status
    db.commit()
    return fb`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">3. Kế hoạch tích hợp Frontend</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Xây dựng form gửi phản hồi nhanh kèm đính kèm tệp tin tài liệu hỗ trợ.</li>
              <li>Tạo dashboard quản lý phản hồi dành cho ban quản trị và bộ phận HR (để thay đổi trạng thái xử lý).</li>
              <li>Tự động kích hoạt thông báo email/in-app cho nhân viên khi phản hồi của họ được chuyển sang trạng thái "Đã ghi nhận" hoặc "Đang xử lý".</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackPage;

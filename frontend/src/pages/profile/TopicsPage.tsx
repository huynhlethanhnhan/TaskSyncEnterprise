import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const TopicsPage: React.FC = () => {
  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Thảo luận chuyên đề (Topics)"
        description="Không gian thảo luận chuyên môn, chia sẻ ý tưởng và trao đổi thông tin nội bộ doanh nghiệp"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Collaboration', href: '#' },
              { label: 'Topics' },
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
              Báo cáo kỹ thuật: Thiếu cơ sở dữ liệu và Endpoint API Thảo luận (Topics)
            </CardTitle>
          </div>
          <CardDescription className="text-rose-500/80 mt-1 text-xs">
            Hệ thống API backend hiện chưa thiết lập các bảng và router phục vụ cho các chủ đề thảo luận nội bộ. Dưới đây là đề xuất thiết kế triển khai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-xs text-text-secondary leading-relaxed">
          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">1. Thiết kế Mô hình Thảo luận (SQL Server Table DDL)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`CREATE TABLE dbo.discussion_topics (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    author_id INT NOT NULL FOREIGN KEY REFERENCES dbo.employees(id),
    project_id INT NULL FOREIGN KEY REFERENCES dbo.projects(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Open', -- Open, Closed, Archived
    created_at DATETIME DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME DEFAULT SYSUTCDATETIME()
);

-- Index foreign keys for faster join searches
CREATE INDEX ix_dbo_discussion_topics_author_id ON dbo.discussion_topics(author_id);
CREATE INDEX ix_dbo_discussion_topics_project_id ON dbo.discussion_topics(project_id);`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">2. Khai báo API Endpoints (FastAPI Router)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`# Route prefix: /api/v1/topics
@router.get("", response_model=list[TopicResponse])
def get_topics(project_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(DiscussionTopic)
    if project_id:
        query = query.filter(DiscussionTopic.project_id == project_id)
    return query.all()

@router.post("/{topic_id}/replies", response_model=ReplyResponse, status_code=201)
def create_topic_reply(topic_id: int, data: ReplyCreate, db: Session = Depends(get_db)):
    reply = TopicReply(topic_id=topic_id, **data.model_dump())
    db.add(reply)
    db.commit()
    return reply`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">3. Kế hoạch tích hợp Frontend</h4>
            <p className="mb-2">
              Kế hoạch tích hợp:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Xây dựng view giao diện hiển thị danh sách các chuyên đề thảo luận có phân trang và bộ lọc theo dự án.</li>
              <li>Tích hợp trình soạn thảo WYSIWYG (Rich Text Editor) để nhân viên có thể định dạng nội dung thảo luận (bảng biểu, code block, hình ảnh).</li>
              <li>Bổ sung tính năng bình luận thời gian thực (WebSockets) để nhận thông báo đẩy khi có phản hồi mới trong chủ đề đang theo dõi.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TopicsPage;

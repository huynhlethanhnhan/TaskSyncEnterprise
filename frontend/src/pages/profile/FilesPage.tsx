import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const FilesPage: React.FC = () => {
  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Tài liệu (Files)"
        description="Quản lý kho lưu trữ tệp tin đính kèm, báo cáo dự án và tài liệu liên quan đến công việc"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Collaboration', href: '#' },
              { label: 'Files' },
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
              Báo cáo kỹ thuật: Thiếu cơ sở dữ liệu và Endpoint API Quản lý Tài liệu chung (Files)
            </CardTitle>
          </div>
          <CardDescription className="text-rose-500/80 mt-1 text-xs">
            Hệ thống backend hiện chỉ hỗ trợ đính kèm tệp tin trực tiếp vào từng Task cụ thể (`/tasks/{'{task_id}'}/attachments`). Hiện chưa có mô hình lưu trữ và quản trị tài liệu dùng chung ở cấp độ dự án hoặc toàn bộ doanh nghiệp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-xs text-text-secondary leading-relaxed">
          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">1. Thiết kế Mô hình Tài liệu cấp Dự án (SQL Server DDL)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`CREATE TABLE dbo.project_files (
    id INT IDENTITY(1,1) PRIMARY KEY,
    project_id INT NOT NULL FOREIGN KEY REFERENCES dbo.projects(id) ON DELETE CASCADE,
    file_name NVARCHAR(255) NOT NULL,
    file_path NVARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by_id INT NOT NULL FOREIGN KEY REFERENCES dbo.employees(id),
    uploaded_at DATETIME DEFAULT SYSUTCDATETIME()
);

-- Index foreign keys for faster search queries
CREATE INDEX ix_dbo_project_files_project_id ON dbo.project_files(project_id);`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">2. Khai báo API Endpoints Đề xuất (FastAPI Router)</h4>
            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`# Route prefix: /api/v1/files
@router.get("", response_model=list[FileResponse])
def list_project_files(project_id: int, db: Session = Depends(get_db)):
    return db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()

@router.delete("/{file_id}", status_code=204)
def delete_file(file_id: int, current_user: Employee = Depends(get_current_user), db: Session = Depends(get_db)):
    file = db.get(ProjectFile, file_id)
    if file.uploaded_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(file)
    db.commit()`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2 text-sm">3. Kế hoạch tích hợp Frontend</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Xây dựng view giao diện hiển thị danh sách các tệp tin theo lưới (Grid) hoặc danh sách (List) với icon nhận diện định dạng (PDF, Image, Word, Excel).</li>
              <li>Cho phép lọc nhanh tài liệu theo dung lượng, người tải lên, hoặc định dạng file.</li>
              <li>Tích hợp trình xem trước tài liệu trực tiếp trên trình duyệt (PDF Reader, Image Lightbox) để giảm số lượt tải về.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FilesPage;

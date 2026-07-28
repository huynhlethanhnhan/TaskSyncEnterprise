import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { FilesManager } from '../../components/files/FilesManager';

export const FilesPage: React.FC = () => {
  return (
    <div className="space-y-6 font-sans pb-12 text-xs">
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

      <FilesManager />
    </div>
  );
};

export default FilesPage;

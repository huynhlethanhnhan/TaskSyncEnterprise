import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { FilesManager } from '../../components/files/FilesManager';
import { useSettings } from '../../providers/SettingsProvider';

const FilesPage: React.FC = () => {
  const { t } = useSettings();
  return (
    <div className="space-y-6 font-sans pb-12 text-xs">
      {/* Page Header */}
      <PageHeader
        title={t('Quản lý Tài liệu (Files)', 'Document & File Registry')}
        description={t('Quản lý kho lưu trữ tệp tin đính kèm, báo cáo dự án và tài liệu liên quan đến công việc', 'Manage attachments, project reports, and work documents')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Cộng tác', 'Collaboration'), href: '#' },
              { label: t('Tài liệu', 'Files') },
            ]}
          />
        }
      />

      <FilesManager />
    </div>
  );
};

export default FilesPage;

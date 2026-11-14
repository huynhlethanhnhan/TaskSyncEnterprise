import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { FeedbackManager } from '../../components/feedback/FeedbackManager';
import { useSettings } from '../../providers/SettingsProvider';

const FeedbackPage: React.FC = () => {
  const { t } = useSettings();
  return (
    <div className="space-y-6 font-sans pb-12 text-xs">
      {/* Page Header */}
      <PageHeader
        title={t('Ý kiến & Phản hồi (Feedback)', 'Feedback & Suggestions')}
        description={t('Gửi ý kiến đóng góp, phản hồi về sản phẩm hoặc quy trình làm việc nội bộ của doanh nghiệp', 'Share feedback and suggestions about products or internal workflows')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Cộng tác', 'Collaboration'), href: '#' },
              { label: t('Góp ý', 'Feedback') },
            ]}
          />
        }
      />

      <FeedbackManager />
    </div>
  );
};

export default FeedbackPage;

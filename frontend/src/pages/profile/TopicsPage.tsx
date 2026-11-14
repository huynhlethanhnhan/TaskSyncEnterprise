import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { TopicsManager } from '../../components/topics/TopicsManager';
import { useSettings } from '../../providers/SettingsProvider';

const TopicsPage: React.FC = () => {
  const { t } = useSettings();
  return (
    <div className="space-y-6 font-sans pb-12 text-xs">
      {/* Page Header */}
      <PageHeader
        title={t('Thảo luận chuyên đề (Topics)', 'Topics & Discussions')}
        description={t('Không gian thảo luận chuyên môn, chia sẻ ý tưởng và trao đổi thông tin nội bộ doanh nghiệp', 'Space for technical discussions, knowledge sharing, and internal collaboration')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Cộng tác', 'Collaboration'), href: '#' },
              { label: t('Thảo luận', 'Topics') },
            ]}
          />
        }
      />

      <TopicsManager />
    </div>
  );
};

export default TopicsPage;

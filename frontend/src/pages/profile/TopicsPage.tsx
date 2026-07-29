import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { TopicsManager } from '../../components/topics/TopicsManager';

const TopicsPage: React.FC = () => {
  return (
    <div className="space-y-6 font-sans pb-12 text-xs">
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

      <TopicsManager />
    </div>
  );
};

export default TopicsPage;

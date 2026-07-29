import * as React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { FeedbackManager } from '../../components/feedback/FeedbackManager';

const FeedbackPage: React.FC = () => {
  return (
    <div className="space-y-6 font-sans pb-12 text-xs">
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

      <FeedbackManager />
    </div>
  );
};

export default FeedbackPage;

import * as React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useSprintAnalytics } from '../../hooks/useSprintBacklog';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Flame, TrendingDown, CheckCircle, Target } from 'lucide-react';

interface SprintBurndownChartProps {
  sprintId: number;
}

export const SprintBurndownChart: React.FC<SprintBurndownChartProps> = ({ sprintId }) => {
  const { data: analytics, isLoading, isError } = useSprintAnalytics(sprintId);

  const chartData = React.useMemo(() => {
    if (!analytics || !analytics.snapshots || analytics.snapshots.length === 0) return [];

    const totalSP = analytics.total_story_points || analytics.capacity || 20;
    const snapshots = analytics.snapshots;
    const totalDays = snapshots.length > 1 ? snapshots.length - 1 : 1;

    return snapshots.map((s, index) => {
      // Calculate ideal linear burndown
      const idealRemaining = Math.max(0, Math.round(totalSP - (totalSP / totalDays) * index));
      const formattedDate = new Date(s.snapshot_date).toLocaleDateString('vi-VN', {
        month: 'short',
        day: 'numeric',
      });

      return {
        date: formattedDate,
        rawDate: s.snapshot_date,
        actualRemaining: s.remaining_story_points,
        idealRemaining,
        completedSP: s.completed_story_points,
      };
    });
  }, [analytics]);

  if (isLoading) {
    return <div className="text-center py-8 text-xs text-text-muted">Đang tính toán dữ liệu Sprint Burndown Chart...</div>;
  }

  if (isError || !analytics) {
    return <div className="text-center py-6 text-xs text-text-muted">Không thể tải dữ liệu Burndown Chart.</div>;
  }

  const completionRate = analytics.total_story_points > 0
    ? Math.round((analytics.completed_story_points / analytics.total_story_points) * 100)
    : 0;

  return (
    <Card className="font-sans">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase">
            <Flame className="h-4 w-4 text-amber-500" />
            Sprint Burndown Chart ({analytics.name})
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle className="h-3.5 w-3.5" />
              Đã xong: {analytics.completed_story_points}/{analytics.total_story_points} SP ({completionRate}%)
            </span>
            <span className="flex items-center gap-1 text-primary font-semibold">
              <Target className="h-3.5 w-3.5" />
              Capacity: {analytics.capacity} SP
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted flex flex-col items-center gap-2">
            <TrendingDown className="h-8 w-8 text-text-muted/40" />
            <span>Chưa có dữ liệu snapshot hàng ngày cho Sprint này. Kích hoạt Sprint để theo dõi tiến trình.</span>
          </div>
        ) : (
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft', fontSize: 11 }} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--surface))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} SP`,
                    name === 'actualRemaining' ? 'Thực tế còn lại' : 'Lý tưởng (Ideal)',
                  ]}
                />
                <Legend formatter={(value) => (value === 'actualRemaining' ? 'Thực tế còn lại (Actual)' : 'Tiến độ lý tưởng (Ideal)')} />
                <Line
                  type="monotone"
                  dataKey="idealRemaining"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                  name="idealRemaining"
                />
                <Line
                  type="monotone"
                  dataKey="actualRemaining"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  name="actualRemaining"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

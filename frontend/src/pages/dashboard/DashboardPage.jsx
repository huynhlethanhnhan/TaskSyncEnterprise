import React from "react";
import { Users, Briefcase, CheckSquare, Clock, ArrowUpRight, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Breadcrumb } from "../../components/navigation/Breadcrumb";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/common/Avatar";
import { useAuth } from "../../providers/AuthProvider";

export default function DashboardPage() {
  const { user } = useAuth();
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const kpis = [
    {
      title: "Total Employees",
      value: "1,248",
      change: "+5.2%",
      trend: "up",
      icon: <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      subtext: "vs last month",
    },
    {
      title: "Active Projects",
      value: "42",
      change: "+12.4%",
      trend: "up",
      icon: <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      subtext: "8 closing this week",
    },
    {
      title: "Task Completion Rate",
      value: "94.6%",
      change: "+2.3%",
      trend: "up",
      icon: <CheckSquare className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
      subtext: "vs last week",
    },
    {
      title: "Avg Approval Time",
      value: "1.8 days",
      change: "-8.5%",
      trend: "up",
      icon: <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      subtext: "Faster response rate",
    },
  ];

  const recentActivities = [
    {
      id: "act-1",
      user: "Emma Johnson",
      action: "submitted leave request for May 24 - May 28",
      time: "10 minutes ago",
      avatar: null,
    },
    {
      id: "act-2",
      user: "Liam Smith",
      action: "completed task 'Implement Redis Idempotency Lock'",
      time: "45 minutes ago",
      avatar: null,
    },
    {
      id: "act-3",
      user: "Olivia Brown",
      action: "updated employee profile for EMP-1004",
      time: "2 hours ago",
      avatar: null,
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${user?.name || "Administrator"}!`}
        description={`Enterprise overview and workforce summary for ${currentDate}`}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Portal Root', href: '/dashboard' },
              { label: 'Dashboard Overview' },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Calendar className="h-4 w-4" />}>
              Filter Date
            </Button>
            <Button variant="primary" size="sm" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
              Export Summary
            </Button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index} variant="interactive">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted">{kpi.title}</span>
                <div className="p-2 rounded-lg bg-accent/60 text-accent-foreground">{kpi.icon}</div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-text-primary">{kpi.value}</span>
                  <Badge variant="success" showDot>
                    {kpi.change}
                  </Badge>
                </div>
                <p className="text-[11px] text-text-muted mt-1">{kpi.subtext}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Column: Task & Project Status Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Workforce Status Overview</span>
              <Badge variant="outline">Q3 FY2026</Badge>
            </CardTitle>
            <CardDescription>Live operational metrics across active departments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-900/60 border border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">System Operational Readiness</h4>
                  <p className="text-[11px] text-text-muted">Prometheus metrics & SQL Server health status 100% healthy</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                View Health
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-primary">Key Action Items</h4>
              <div className="divide-y divide-border/60 rounded-md border border-border bg-surface">
                <div className="p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span>3 Leave approval requests awaiting manager review</span>
                  </div>
                  <Badge variant="warning">Action Needed</Badge>
                </div>
                <div className="p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-blue-500" />
                    <span>Quarterly Performance Review cycle Q2 2026 open</span>
                  </div>
                  <Badge variant="primary">In Progress</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right 1-Column: Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Live updates from team members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs">
                <Avatar name={act.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium">
                    <strong className="font-semibold">{act.user}</strong> {act.action}
                  </p>
                  <span className="text-[11px] text-text-muted">{act.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

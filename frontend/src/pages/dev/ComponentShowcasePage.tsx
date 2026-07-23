import * as React from 'react';
import {
  Sparkles,
  Plus,
  Trash,
  Check,
  FolderPlus,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { Switch } from '../../components/ui/Switch';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { Drawer } from '../../components/common/Drawer';
import { Dropdown } from '../../components/common/Dropdown';
import { Tabs } from '../../components/navigation/Tabs';
import { SkeletonCard } from '../../components/feedback/Skeleton';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Pagination } from '../../components/data-display/Pagination';
import { DataTableWrapper } from '../../components/data-display/DataTableWrapper';
import { useToast } from '../../providers/ToastProvider';
import { useTheme } from '../../providers/ThemeProvider';

export const ComponentShowcasePage: React.FC = () => {
  const toast = useToast();
  const { isDarkMode, setTheme, theme } = useTheme();

  // State for interactive modals/drawers
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [switchChecked, setSwitchChecked] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedRadio, setSelectedRadio] = React.useState('admin');

  // Sample data table dataset
  const sampleTableData = [
    { id: 'EMP-1001', name: 'Emma Johnson', role: 'Engineering Lead', department: 'Software Eng', status: 'Active' },
    { id: 'EMP-1002', name: 'Liam Smith', role: 'Product Manager', department: 'Product', status: 'On Leave' },
    { id: 'EMP-1003', name: 'Olivia Brown', role: 'HR Specialist', department: 'Human Resources', status: 'Active' },
    { id: 'EMP-1004', name: 'Noah Williams', role: 'Financial Analyst', department: 'Finance', status: 'Remote' },
    { id: 'EMP-1005', name: 'Ava Davis', role: 'Marketing Specialist', department: 'Marketing', status: 'Active' },
  ];

  const sampleColumns = [
    { accessorKey: 'id', header: 'Employee ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'department', header: 'Department' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: { status: string } } }) => {
        const s = row.original.status;
        return (
          <Badge
            variant={s === 'Active' ? 'success' : s === 'On Leave' ? 'warning' : 'primary'}
            showDot
          >
            {s}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Page Header */}
      <PageHeader
        title="Design System & Component Showcase"
        description="Development showcase verifying all Phase 4.2 reusable components, variants, accessibility indicators, and dark mode compliance."
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Development', href: '/dev/components' },
              { label: 'Component Showcase' },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
            </Button>
            <Badge variant="primary" showDot>
              Phase 4.2 Verified
            </Badge>
          </div>
        }
      />

      {/* 1. Buttons Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>1. Buttons & Variants</CardTitle>
          <CardDescription>Primary, Secondary, Outline, Ghost, Danger, Link with size and loading states.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" leftIcon={<Trash className="h-4 w-4" />}>
              Danger Action
            </Button>
            <Button variant="link">Link Style</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="primary" size="sm">Small (sm)</Button>
            <Button variant="primary" size="md">Medium (md)</Button>
            <Button variant="primary" size="lg">Large (lg)</Button>
            <Button variant="primary" size="icon" aria-label="Add item">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="primary" isLoading>
              Loading State
            </Button>
            <Button variant="primary" disabled>
              Disabled State
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Form Input Controls */}
      <Card>
        <CardHeader>
          <CardTitle>2. Form & Control Primitives</CardTitle>
          <CardDescription>Input fields, Textarea, Select dropdowns, Checkbox, Radio, Switch controls.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Standard Text Input"
              placeholder="Enter project name..."
              helperText="Helper text guidance for input structure."
            />
            <Input
              label="Input with Prefix Icon"
              placeholder="Search employee records..."
              leftIcon={<Search className="h-4 w-4" />}
            />
            <Input
              label="Invalid Error State"
              value="invalid-email-address"
              error="Please enter a valid email format."
            />
            <Textarea
              label="Textarea Box"
              placeholder="Write project description or notes..."
              rows={3}
            />
          </div>

          <div className="space-y-5">
            <Select
              label="Role Select Dropdown"
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'manager', label: 'HR Manager' },
                { value: 'staff', label: 'Staff Member' },
              ]}
            />

            <div className="space-y-2">
              <span className="text-xs font-semibold text-text-primary">Checkbox States</span>
              <div className="flex items-center gap-4">
                <Checkbox label="Standard Checkbox" defaultChecked />
                <Checkbox label="Indeterminate" indeterminate />
                <Checkbox label="Disabled" disabled />
              </div>
            </div>

            <RadioGroup
              name="user-role"
              label="Radio Group Selection"
              value={selectedRadio}
              onChange={setSelectedRadio}
              options={[
                { value: 'admin', label: 'Admin Access', description: 'Full system configuration access' },
                { value: 'staff', label: 'Standard Staff', description: 'Standard employee portal features' },
              ]}
            />

            <div className="pt-2">
              <Switch
                label="Enable Real-Time Email Notifications"
                checked={switchChecked}
                onChange={setSwitchChecked}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Badges & Avatars */}
      <Card>
        <CardHeader>
          <CardTitle>3. Badges & Avatars</CardTitle>
          <CardDescription>Status tags, dot indicators, user profile avatar sizes, and online status badges.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default">Default Badge</Badge>
            <Badge variant="primary" showDot>Primary Accent</Badge>
            <Badge variant="success" showDot>Active / Approved</Badge>
            <Badge variant="warning" showDot>Pending Review</Badge>
            <Badge variant="danger" showDot>Overdue Alert</Badge>
            <Badge variant="outline">Outline Tag</Badge>
          </div>

          <div className="flex items-center gap-6">
            <Avatar name="Thanh Nhân" size="sm" status="online" />
            <Avatar name="Emma Johnson" size="md" status="busy" />
            <Avatar name="Liam Smith" size="lg" status="away" />
            <Avatar name="Olivia Brown" size="xl" status="offline" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Modals, Drawers & Toast Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>4. Overlays, Drawers & Toast Dispatchers</CardTitle>
          <CardDescription>Interactive trigger buttons testing Dialog Modal, Slide-Over Drawer, Context Dropdown, and Toasts.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Open Dialog Modal
          </Button>

          <Button variant="outline" onClick={() => setIsDrawerOpen(true)}>
            Open Slide-Over Drawer
          </Button>

          <Dropdown
            trigger={
              <Button variant="secondary" rightIcon={<Sparkles className="h-4 w-4" />}>
                Context Dropdown
              </Button>
            }
            items={[
              { key: 'edit', label: 'Edit Project', icon: <Plus className="h-4 w-4" />, shortcut: '⌘E' },
              { key: 'export', label: 'Export Report', icon: <FolderPlus className="h-4 w-4" /> },
              'separator',
              { key: 'delete', label: 'Delete Record', icon: <Trash className="h-4 w-4" />, destructive: true },
            ]}
          />

          <Button
            variant="outline"
            onClick={() => toast.success('Action Saved!', 'Your changes have been saved to SQL Server.')}
          >
            Trigger Success Toast
          </Button>

          <Button
            variant="danger"
            onClick={() => toast.error('Connection Lost', 'Unable to reach backend API endpoint.')}
          >
            Trigger Error Toast
          </Button>
        </CardContent>
      </Card>

      {/* 5. Navigation Tabs & Breadcrumb */}
      <Card>
        <CardHeader>
          <CardTitle>5. Navigation Tabs</CardTitle>
          <CardDescription>Line underline & Pill segmented control tabs with animated active bar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            tabs={[
              { id: 'overview', label: 'Overview', badge: 12 },
              { id: 'analytics', label: 'Analytics' },
              { id: 'logs', label: 'Audit Logs', badge: 'NEW' },
              { id: 'disabled', label: 'Disabled Tab', disabled: true },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="line"
          />

          <Tabs
            tabs={[
              { id: 'overview', label: 'Overview Segment' },
              { id: 'analytics', label: 'Analytics Segment' },
              { id: 'logs', label: 'Audit Segment' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pills"
          />
        </CardContent>
      </Card>

      {/* 6. Feedback & Skeletons */}
      <Card>
        <CardHeader>
          <CardTitle>6. Skeletons, Empty & Error States</CardTitle>
          <CardDescription>Pulse loading skeletons, structured empty view, and alert error card fallbacks.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-text-primary">Card Loading Skeleton</h4>
            <SkeletonCard />
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-text-primary">Inline Loading Spinners</h4>
            <div className="flex items-center gap-6">
              <LoadingSpinner size="sm" label="Loading..." />
              <LoadingSpinner size="md" label="Processing..." />
              <LoadingSpinner size="lg" />
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmptyState
              title="No Tasks Assigned"
              description="There are no pending tasks assigned to your queue at this moment."
              action={
                <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Create New Task
                </Button>
              }
            />

            <ErrorState
              title="Database Connection Timeout"
              message="Failed to acquire a connection lock from Redis cache provider within 5000ms."
              onRetry={() => toast.info('Retrying connection...')}
            />
          </div>
        </CardContent>
      </Card>

      {/* 7. Data Table & Pagination */}
      <Card>
        <CardHeader>
          <CardTitle>7. Enterprise Data Table & Pagination</CardTitle>
          <CardDescription>TanStack Table integration with column sorting, selection checkboxes, and record pagination.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-0 sm:p-0">
          <DataTableWrapper
            columns={sampleColumns}
            data={sampleTableData}
            enableSelection
          />
          <Pagination
            currentPage={currentPage}
            totalPages={5}
            pageSize={pageSize}
            totalRecords={48}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Interactive Modal Instance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Interactive Modal Specification"
        description="Verify focus lock, dark mode surface, and backdrop blur overlay."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => { setIsModalOpen(false); toast.success('Confirmed!'); }}>
              Confirm Action
            </Button>
          </>
        }
      >
        <p className="text-xs text-text-secondary leading-relaxed">
          This modal is rendered inside a Radix Dialog pattern with Framer Motion enter and exit scale transitions. Press <strong>Escape</strong> or click outside to dismiss.
        </p>
      </Modal>

      {/* Interactive Drawer Instance */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Right Slide-Over Drawer"
        description="Side panel details view"
        position="right"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsDrawerOpen(false)}>
            Close Panel
          </Button>
        }
      >
        <div className="space-y-4 text-xs text-text-secondary">
          <p>
            Slide-over panels are ideal for inspecting high-density employee details, task comments, or editing complex sub-forms without losing page context.
          </p>
          <div className="p-3 rounded bg-accent text-accent-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span>Framer Motion slide-over transition active.</span>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

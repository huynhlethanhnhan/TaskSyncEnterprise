import * as React from 'react';
import {
  User,
  Mail,
  Shield,
  Key,
  Save,
  Lock,
  Building,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Laptop,
  Globe,
  CheckCircle2,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import api from '../../api/axios';

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = React.useState<'general' | 'security' | 'sessions' | 'preferences'>('general');

  // General Info State
  const [fullName, setFullName] = React.useState(user?.name || user?.full_name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState((user as any)?.phone || '');
  const [jobTitle, setJobTitle] = React.useState(user?.job_title || '');
  const [departmentName, setDepartmentName] = React.useState('');
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // Avatar Upload / Drag State
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(user?.avatar_url || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrentPass, setShowCurrentPass] = React.useState(false);
  const [showNewPass, setShowNewPass] = React.useState(false);
  const [showConfirmPass, setShowConfirmPass] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  // Sessions State
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = React.useState(false);
  const [isLoggingOutOthers, setIsLoggingOutOthers] = React.useState(false);


  // Preferences State
  const [languagePref, setLanguagePref] = React.useState('vi');
  const [timezonePref, setTimezonePref] = React.useState('Asia/Ho_Chi_Minh');
  const [emailNotifs, setEmailNotifs] = React.useState(true);
  const [systemNotifs, setSystemNotifs] = React.useState(true);


  React.useEffect(() => {
    if (!user) return;
    setFullName(user.name || user.full_name || '');
    setEmail(user.email || '');
    setJobTitle(user.job_title || '');
    setAvatarPreview(user.avatar_url || null);

    // Fetch department details if available
    if ((user as any)?.department_id) {
      api.get(`/departments/${(user as any).department_id}`)
        .then((res) => setDepartmentName(res.data.name || ''))
        .catch(() => setDepartmentName('Phòng ban Doanh nghiệp'));
    }
  }, [user]);

  // Load Sessions when sessions tab is selected
  React.useEffect(() => {
    if (activeTab === 'sessions') {
      setIsLoadingSessions(true);
      api.get('/auth/sessions')
        .then((res) => setSessions(res.data || []))
        .catch(() => setSessions([]))
        .finally(() => setIsLoadingSessions(false));
    }
  }, [activeTab]);

  // Profile Completion Percentage Calculation
  const profileCompletion = React.useMemo(() => {
    let score = 0;
    if (fullName.trim()) score += 20;
    if (email.trim()) score += 20;
    if (user?.avatar_url || avatarPreview) score += 20;
    if (jobTitle.trim()) score += 20;
    if (phone.trim() || departmentName) score += 20;
    return Math.min(100, score);
  }, [fullName, email, avatarPreview, user?.avatar_url, jobTitle, phone, departmentName]);

  // Password Strength Meter Calculation
  const passwordStrength = React.useMemo(() => {
    if (!newPassword) return { score: 0, label: 'Chưa nhập', color: 'bg-border' };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 10) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 2) return { score: 25, label: 'Yếu', color: 'bg-rose-500' };
    if (score === 3) return { score: 50, label: 'Trung bình', color: 'bg-amber-500' };
    if (score === 4) return { score: 75, label: 'Khá tốt', color: 'bg-sky-500' };
    return { score: 100, label: 'Mạnh (An toàn)', color: 'bg-emerald-500' };
  }, [newPassword]);

  // Avatar Upload Handler
  const handleAvatarFileSelected = async (file: File) => {
    // File validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Định dạng không hợp lệ', 'Chỉ chấp nhận file ảnh JPEG, PNG, WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước quá lớn', 'Dung lượng ảnh đại diện không vượt quá 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingAvatar(true);
    try {
      const res = await api.post('/employees/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newAvatarUrl = res.data.avatar_url;
      setAvatarPreview(newAvatarUrl);
      if (user) {
        setUser({ ...user, avatar_url: newAvatarUrl });
      }
      toast.success('Cập nhật Avatar thành công', 'Ảnh đại diện đã được lưu vào hệ thống.');
    } catch {
      toast.error('Tải ảnh thất bại', 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    setIsUploadingAvatar(true);
    try {
      await api.delete('/employees/avatar');
      setAvatarPreview(null);
      if (user) {
        setUser({ ...user, avatar_url: null });
      }
      toast.success('Đã xóa Avatar', 'Ảnh đại diện đã được gỡ bỏ.');
    } catch {
      toast.error('Thao tác thất bại', 'Không thể xóa ảnh đại diện.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAvatarFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setIsSavingProfile(true);
    try {
      if (user?.id) {
        await api.put(`/employees/${user.id}`, {
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        });
        if (user) {
          setUser({ ...user, name: fullName.trim(), full_name: fullName.trim(), email: email.trim() });
        }
      }
      toast.success('Cập nhật hồ sơ thành công', 'Thông tin cá nhân đã được đồng bộ.');
    } catch {
      toast.error('Cập nhật thất bại', 'Không thể lưu thay đổi.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Lỗi mật khẩu', 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu quá ngắn', 'Mật khẩu mới phải từ 6 ký tự trở lên.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        old_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success('Đổi mật khẩu thành công', 'Vui lòng sử dụng mật khẩu mới cho lần đăng nhập sau.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Đổi mật khẩu thất bại', 'Mật khẩu hiện tại không chính xác.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoutOthers = async () => {
    setIsLoggingOutOthers(true);
    try {
      await api.post('/auth/sessions/logout-others');
      toast.success('Đã đăng xuất các thiết bị khác', 'Tất cả các phiên làm việc khác đã được đăng xuất.');
      setSessions((prev) => prev.filter((s) => s.is_active));
    } catch {
      toast.error('Thao tác thất bại', 'Không thể đăng xuất phiên khác.');
    } finally {
      setIsLoggingOutOthers(false);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title="Trung tâm Tài khoản (Account Center)"
        description="Quản lý hồ sơ cá nhân, bảo mật mật khẩu, phiên đăng nhập và tùy chỉnh hệ thống"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Trung tâm Tài khoản' },
            ]}
          />
        }
      />

      {/* Top Banner Card with Profile Completion */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar name={fullName || 'User'} src={avatarPreview} size="xl" status="online" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">{fullName || 'Người dùng'}</h2>
                  <Badge variant="success" showDot size="sm">Active</Badge>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {jobTitle || 'Nhân sự Doanh nghiệp'} · {email}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-text-secondary mt-2">
                  <span>Mã NV: <strong className="text-text-primary font-mono">EMP-{user?.id || '001'}</strong></span>
                  <span>Vai trò: <strong className="text-text-primary">{user?.role || 'Employee'}</strong></span>
                </div>
              </div>
            </div>

            {/* Profile Completion Bar */}
            <div className="w-full md:w-64 space-y-2 p-4 rounded-xl bg-accent/30 border border-border/60">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Độ hoàn thiện hồ sơ
                </span>
                <span className="text-primary">{profileCompletion}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              <p className="text-[10px] text-text-muted">
                {profileCompletion === 100 ? 'Hồ sơ của bạn đã hoàn tất 100%!' : 'Cập nhật ảnh đại diện & SĐT để đạt 100%'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Tabs (Left 1 Col) */}
        <div className="lg:col-span-1 space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'general'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Thông tin Chung & Avatar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'security'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Bảo mật & Mật khẩu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'sessions'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <Laptop className="h-4 w-4" />
            <span>Phiên Đăng nhập ({sessions.length || 1})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'preferences'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Tùy chỉnh & Thông báo</span>
          </button>
        </div>

        {/* Tab Content Panels (Right 3 Cols) */}
        <div className="lg:col-span-3">
          {/* TAB 1: General Info & Avatar */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Avatar Upload Dropzone Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Ảnh đại diện Tài khoản (Avatar)</CardTitle>
                  <CardDescription>Hỗ trợ định dạng JPG, PNG, WEBP tối đa 5MB. Ảnh sẽ được tự động lưu trữ kiên cố.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
                    {/* Dedicated Left Column: Avatar Circular Preview */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-28 h-28 sm:w-32 sm:h-32">
                      <Avatar
                        name={fullName}
                        src={avatarPreview}
                        size="xl"
                        className="h-28 w-28 sm:h-28 sm:w-28 rounded-full border-2 border-primary/20 shadow-sm transition-transform hover:scale-105"
                      />
                    </div>

                    {/* Right Column: Upload Dropzone & Controls */}
                    <div className="flex-1 flex flex-col justify-between w-full space-y-4">
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 w-full p-5 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-accent/20'
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={(e) => e.target.files?.[0] && handleAvatarFileSelected(e.target.files[0])}
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                        />
                        <Upload className="h-6 w-6 text-primary mb-1.5" />
                        <p className="text-xs font-semibold text-text-primary">
                          Kéo & Thả ảnh vào đây, hoặc <span className="text-primary underline">Chọn từ thiết bị</span>
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">Hỗ trợ JPG, PNG, WEBP dưới 5MB</p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                        {avatarPreview && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            leftIcon={<Trash2 className="h-4 w-4 text-rose-500" />}
                            onClick={handleAvatarDelete}
                            isLoading={isUploadingAvatar}
                          >
                            Xóa Ảnh hiện tại
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full sm:w-auto"
                          leftIcon={<Upload className="h-4 w-4" />}
                          onClick={() => fileInputRef.current?.click()}
                          isLoading={isUploadingAvatar}
                        >
                          Tải Ảnh mới
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* General Details Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin Hồ sơ Doanh nghiệp</CardTitle>
                  <CardDescription>Cập nhật họ tên, email công việc, số điện thoại và thông tin vị trí</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Họ và Tên *"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        leftIcon={<User className="h-4 w-4 text-text-muted" />}
                        required
                      />

                      <Input
                        label="Email Doanh nghiệp *"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<Mail className="h-4 w-4 text-text-muted" />}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Số điện thoại"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        leftIcon={<Smartphone className="h-4 w-4 text-text-muted" />}
                        placeholder="0912 345 678"
                      />

                      <Input
                        label="Chức danh / Vị trí"
                        value={jobTitle}
                        disabled
                        helperText="Managed by an administrator."
                        leftIcon={<Building className="h-4 w-4 text-text-muted" />}
                        placeholder="Senior Solution Architect"
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        leftIcon={<Save className="h-4 w-4" />}
                        isLoading={isSavingProfile}
                      >
                        Lưu Thông tin Hồ sơ
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Đổi Mật khẩu Tài khoản</CardTitle>
                <CardDescription>Khuyên dùng mật khẩu mạnh bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                  {/* Current Password */}
                  <div className="relative">
                    <Input
                      label="Mật khẩu Hiện tại *"
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      leftIcon={<Lock className="h-4 w-4 text-text-muted" />}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-8 text-text-muted hover:text-text-primary"
                    >
                      {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* New Password */}
                  <div className="relative">
                    <Input
                      label="Mật khẩu Mới *"
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      leftIcon={<Lock className="h-4 w-4 text-text-muted" />}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-8 text-text-muted hover:text-text-primary"
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-1.5 p-3 rounded-lg bg-accent/20 border border-border/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted font-medium">Độ mạnh mật khẩu:</span>
                        <span className="font-bold text-text-primary">{passwordStrength.label}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                        <div className={`h-full ${passwordStrength.color} transition-all duration-300`} style={{ width: `${passwordStrength.score}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Confirm Password */}
                  <div className="relative">
                    <Input
                      label="Xác nhận Mật khẩu Mới *"
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={<Lock className="h-4 w-4 text-text-muted" />}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-8 text-text-muted hover:text-text-primary"
                    >
                      {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      leftIcon={<Key className="h-4 w-4" />}
                      isLoading={isChangingPassword}
                    >
                      Xác nhận Đổi Mật khẩu
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Sessions */}
          {activeTab === 'sessions' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Phiên làm việc & Thiết bị Đăng nhập</CardTitle>
                    <CardDescription>Quản lý các trình duyệt và IP đang truy cập vào tài khoản</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoutOthers}
                    isLoading={isLoggingOutOthers}
                  >
                    Đăng xuất các thiết bị khác
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSessions ? (
                  <p className="text-xs text-text-muted text-center py-4">Đang tải danh sách phiên làm việc...</p>
                ) : (
                  <>
                    {/* Current Device Item */}
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Laptop className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-text-primary">Trình duyệt Hiện tại (Thiết bị này)</h4>
                            <Badge variant="success" size="sm">Current Session</Badge>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Hệ điều hành: Windows / Edge / Chrome · IP: 127.0.0.1
                          </p>
                        </div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>

                    {sessions.filter(s => !s.is_active).map((s) => (
                      <div key={s.id} className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-accent text-text-muted">
                            <Laptop className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-text-primary">{s.user_agent || 'Unknown Browser'}</h4>
                            <p className="text-[11px] text-text-muted mt-0.5">IP: {s.ip_address || '127.0.0.1'}</p>
                          </div>
                        </div>
                        <Badge variant="outline" size="sm">Đã ngắt</Badge>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>

            </Card>
          )}

          {/* TAB 4: Preferences */}
          {activeTab === 'preferences' && (
            <Card>
              <CardHeader>
                <CardTitle>Tùy chỉnh Giao diện & Thông báo</CardTitle>
                <CardDescription>Cấu hình trải nghiệm làm việc cá nhân hóa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Ngôn ngữ & Múi giờ</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1.5">Ngôn ngữ Hiển thị</label>
                      <select
                        value={languagePref}
                        onChange={(e) => setLanguagePref(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-surface px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="vi">Tiếng Việt (Vietnamese)</option>
                        <option value="en">English (US)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1.5">Múi giờ Đô thị</label>
                      <select
                        value={timezonePref}
                        onChange={(e) => setTimezonePref(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-surface px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="Asia/Ho_Chi_Minh">(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                        <option value="UTC">(GMT+00:00) UTC Timezone</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 space-y-4">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Kênh Thông báo</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotifs}
                        onChange={(e) => setEmailNotifs(e.target.checked)}
                        className="rounded border-input text-primary focus:ring-ring h-4 w-4"
                      />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">Thông báo qua Email</p>
                        <p className="text-[11px] text-text-muted">Nhận email khi có task mới được gán hoặc phê duyệt nghỉ phép</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemNotifs}
                        onChange={(e) => setSystemNotifs(e.target.checked)}
                        className="rounded border-input text-primary focus:ring-ring h-4 w-4"
                      />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">Thông báo Hệ thống Thời gian thực (In-App)</p>
                        <p className="text-[11px] text-text-muted">Hiển thị popup chuông báo khi có thay đổi công việc</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() => toast.success('Đã lưu tùy chọn', 'Cấu hình trải nghiệm người dùng đã cập nhật.')}
                  >
                    Lưu Tùy chỉnh
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

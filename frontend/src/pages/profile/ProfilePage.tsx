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
  KeyRound,
  Laptop,
  Globe,
  CheckCircle2,
  Sparkles,
  Smartphone,
  MapPin,
  FileSignature,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Breadcrumb } from '../../components/navigation/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ContractDetailModal,
  formatVndCurrency,
  getContractTypeLabel,
} from '../../components/hrm/HrmModals';
import { useHrmContracts } from '../../hooks/useHRM';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { authApi, type EmploymentContractItem } from '../../api/services';
import { extractApiError } from '../../utils/errorHelpers';
import api from '../../api/axios';

const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { t, prefs, updatePrefs, formatDate, isEnglish } = useSettings();

  const [activeTab, setActiveTab] = React.useState<'general' | 'contracts' | 'security' | 'sessions' | 'preferences'>('general');
  const [selectedContract, setSelectedContract] = React.useState<EmploymentContractItem | null>(null);
  const { data: myContracts = [], isLoading: contractsLoading } = useHrmContracts(
    { employee_id: user?.id },
    Boolean(user?.id),
  );

  // General Info State
  const [fullName, setFullName] = React.useState(user?.name || user?.full_name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState((user as any)?.phone || '');
  const [gender, setGender] = React.useState((user as any)?.gender || '');
  const [address, setAddress] = React.useState((user as any)?.address || '');
  const [dateOfBirth, setDateOfBirth] = React.useState((user as any)?.date_of_birth || '');
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
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  // Employee self-service "Request Admin password reset" State
  const [resetRequestNote, setResetRequestNote] = React.useState('');
  const [isRequestingReset, setIsRequestingReset] = React.useState(false);
  const [hasSentResetRequest, setHasSentResetRequest] = React.useState(false);

  // Sessions State
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = React.useState(false);
  const [isLoggingOutOthers, setIsLoggingOutOthers] = React.useState(false);


  // Preferences State
  const [languagePref, setLanguagePref] = React.useState<'vi' | 'en'>(prefs.language === 'en' ? 'en' : 'vi');
  const [timezonePref, setTimezonePref] = React.useState(prefs.timezone || 'Asia/Ho_Chi_Minh');
  const [emailNotifs, setEmailNotifs] = React.useState(prefs.email_notifications ?? true);
  const [systemNotifs, setSystemNotifs] = React.useState(prefs.in_app_notifications ?? true);

  React.useEffect(() => {
    setLanguagePref(prefs.language === 'en' ? 'en' : 'vi');
    if (prefs.timezone) setTimezonePref(prefs.timezone);
    setEmailNotifs(prefs.email_notifications ?? true);
    setSystemNotifs(prefs.in_app_notifications ?? true);
  }, [prefs.language, prefs.timezone, prefs.email_notifications, prefs.in_app_notifications]);


  React.useEffect(() => {
    if (!user) return;
    setFullName(user.name || user.full_name || '');
    setEmail(user.email || '');
    setJobTitle(user.job_title || '');
    setAvatarPreview(user.avatar_url || null);
    if ((user as any)?.date_of_birth) {
      setDateOfBirth((user as any).date_of_birth);
    }

    // Fetch full profile to ensure all fields are fresh
    api.get('/employees/me')
      .then((res) => {
        if (res.data) {
          if (res.data.date_of_birth) setDateOfBirth(res.data.date_of_birth);
          if (res.data.phone) setPhone(res.data.phone);
          if (res.data.gender) setGender(res.data.gender);
          if (res.data.address) setAddress(res.data.address);
          if (res.data.department_name) setDepartmentName(res.data.department_name);
        }
      })
      .catch(() => {});

    // Fetch department details if available
    if ((user as any)?.department_id) {
      api.get(`/departments/${(user as any).department_id}`)
        .then((res) => setDepartmentName(res.data.name || ''))
        .catch(() => setDepartmentName(t('Phòng ban Doanh nghiệp', 'Enterprise Department')));
    }
  }, [user, t]);

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
    if (!newPassword) return { score: 0, label: t('Chưa nhập', 'Not entered'), color: 'bg-border' };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 10) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 2) return { score: 25, label: t('Yếu', 'Weak'), color: 'bg-rose-500' };
    if (score === 3) return { score: 50, label: t('Trung bình', 'Fair'), color: 'bg-amber-500' };
    if (score === 4) return { score: 75, label: t('Khá tốt', 'Good'), color: 'bg-sky-500' };
    return { score: 100, label: t('Mạnh (An toàn)', 'Strong (Secure)'), color: 'bg-emerald-500' };
  }, [newPassword, t]);

  // Avatar Upload Handler
  const handleAvatarFileSelected = async (file: File) => {
    // File validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('Định dạng không hợp lệ', 'Invalid Format'), t('Chỉ chấp nhận file ảnh JPEG, PNG, WEBP.', 'Only JPEG, PNG, WEBP image files are accepted.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('Kích thước quá lớn', 'File Too Large'), t('Dung lượng ảnh đại diện không vượt quá 5MB.', 'Avatar image size must not exceed 5MB.'));
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
      toast.success(t('Cập nhật Avatar thành công', 'Avatar updated'), t('Ảnh đại diện đã được lưu vào hệ thống.', 'Your profile photo has been saved.'));
    } catch {
      toast.error(t('Tải ảnh thất bại', 'Upload failed'), t('Không thể cập nhật ảnh đại diện. Vui lòng thử lại.', 'Unable to update avatar. Please try again.'));
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
      toast.success(t('Đã xóa Avatar', 'Avatar removed'), t('Ảnh đại diện đã được gỡ bỏ.', 'Your profile photo has been removed.'));
    } catch {
      toast.error(t('Thao tác thất bại', 'Action failed'), t('Không thể xóa ảnh đại diện.', 'Unable to remove profile photo.'));
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
          gender: gender || null,
          address: address.trim() || null,
          date_of_birth: dateOfBirth || null,
        });
        if (user) {
          setUser({
            ...user,
            name: fullName.trim(),
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            gender: gender || null,
            address: address.trim() || null,
            date_of_birth: dateOfBirth || null,
          } as any);
        }
      }
      toast.success(
        t('Cập nhật hồ sơ thành công', 'Profile updated'),
        t('Thông tin cá nhân đã được đồng bộ.', 'Your personal details have been synced.'),
      );
    } catch {
      toast.error(t('Cập nhật thất bại', 'Update failed'), t('Không thể lưu thay đổi.', 'Unable to save changes.'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(
        t('Lỗi mật khẩu', 'Password mismatch'),
        t('Mật khẩu mới và xác nhận mật khẩu không trùng khớp.', 'New password and confirmation do not match.'),
      );
      return;
    }
    if (newPassword.length < 6) {
      toast.error(
        t('Mật khẩu quá ngắn', 'Password too short'),
        t('Mật khẩu mới phải từ 6 ký tự trở lên.', 'New password must be at least 6 characters long.'),
      );
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        old_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success(
        t('Đổi mật khẩu thành công', 'Password changed'),
        t('Vui lòng sử dụng mật khẩu mới cho lần đăng nhập sau.', 'Please use your new password on next sign-in.'),
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error(
        t('Đổi mật khẩu thất bại', 'Password change failed'),
        extractApiError(
          err,
          t('Mật khẩu hiện tại không chính xác hoặc mật khẩu mới chưa đạt chuẩn.', 'Current password is incorrect or new password does not meet policy.'),
        ).message,
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRequestAdminReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (user?.email || email || '').trim();
    if (!targetEmail) {
      toast.error(t('Thiếu email', 'Missing Email'), t('Không tìm thấy email tài khoản hiện tại.', 'Account email is unavailable.'));
      return;
    }

    setIsRequestingReset(true);
    try {
      await authApi.forgotPassword(targetEmail, resetRequestNote.trim() || undefined);
      setHasSentResetRequest(true);
      setResetRequestNote('');
      toast.success(
        t('Đã gửi yêu cầu cấp lại mật khẩu', 'Reset Request Sent'),
        t(
          'Quản trị viên đã nhận được thông báo và sẽ cấp lại mật khẩu tạm thời cho bạn.',
          'Administrators have been notified and can now issue a temporary password or reset link.',
        ),
      );
    } catch (err: unknown) {
      toast.error(
        t('Gửi yêu cầu thất bại', 'Request Failed'),
        extractApiError(err, t('Không thể gửi yêu cầu lúc này.', 'Could not submit password reset request.')).message,
      );
    } finally {
      setIsRequestingReset(false);
    }
  };

  const handleLogoutOthers = async () => {
    setIsLoggingOutOthers(true);
    try {
      await api.post('/auth/sessions/logout-others');
      toast.success(
        t('Đã đăng xuất các thiết bị khác', 'Signed out other devices'),
        t('Tất cả các phiên làm việc khác đã được đăng xuất.', 'All other active sessions have been signed out.'),
      );
      setSessions((prev) => prev.filter((s) => s.is_active));
    } catch {
      toast.error(t('Thao tác thất bại', 'Action failed'), t('Không thể đăng xuất phiên khác.', 'Unable to sign out other sessions.'));
    } finally {
      setIsLoggingOutOthers(false);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('Trung tâm Tài khoản', 'Account Center')}
        description={t('Quản lý hồ sơ cá nhân, bảo mật mật khẩu, phiên đăng nhập và tùy chỉnh hệ thống', 'Manage personal profile, password security, active sessions, and system preferences')}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: t('Tổng quan', 'Dashboard'), href: '/dashboard' },
              { label: t('Trung tâm Tài khoản', 'Account Center') },
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
                  <h2 className="text-xl font-bold text-text-primary">{fullName || t('Người dùng', 'User')}</h2>
                  <StatusBadge status="Active" size="sm" />
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {jobTitle || t('Nhân sự Doanh nghiệp', 'Enterprise Staff')} · {email}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-text-secondary mt-2">
                  <span>{t('Mã NV:', 'Employee ID:')} <strong className="text-text-primary font-mono">EMP-{user?.id || '001'}</strong></span>
                  <span>{t('Vai trò:', 'Role:')} <strong className="text-text-primary">{user?.role || 'Employee'}</strong></span>
                </div>
              </div>
            </div>

            {/* Profile Completion Bar */}
            <div className="w-full md:w-64 space-y-2 p-4 rounded-xl bg-accent/30 border border-border/60">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t('Độ hoàn thiện hồ sơ', 'Profile Completion')}
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
                {profileCompletion === 100
                  ? t('Hồ sơ của bạn đã hoàn tất 100%!', 'Your profile is 100% complete!')
                  : t('Cập nhật ảnh đại diện & SĐT để đạt 100%', 'Add your avatar & phone number to reach 100%')}
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
            <span>{t('Thông tin Chung & Avatar', 'General Info & Avatar')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contracts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'contracts'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface hover:bg-secondary text-text-secondary border border-border'
            }`}
          >
            <FileSignature className="h-4 w-4" />
            <span>{t('Hợp đồng Lao động', 'Employment Contracts')} ({myContracts.length})</span>
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
            <span>{t('Bảo mật & Mật khẩu', 'Security & Password')}</span>
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
            <span>{t('Phiên Đăng nhập', 'Active Sessions')} ({sessions.length || 1})</span>
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
            <span>{t('Tùy chỉnh & Thông báo', 'Preferences & Notifications')}</span>
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
                  <CardTitle>{t('Ảnh đại diện Tài khoản', 'Account Avatar')}</CardTitle>
                  <CardDescription>{t('Hỗ trợ định dạng JPG, PNG, WEBP tối đa 5MB. Ảnh sẽ được tự động lưu trữ kiên cố.', 'Supports JPG, PNG, WEBP up to 5MB. Photos are securely stored.')}</CardDescription>
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
                          {t('Kéo & Thả ảnh vào đây, hoặc', 'Drag & drop an image here, or')}{' '}
                          <span className="text-primary underline">{t('Chọn từ thiết bị', 'Browse device')}</span>
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">{t('Hỗ trợ JPG, PNG, WEBP dưới 5MB', 'Supports JPG, PNG, WEBP under 5MB')}</p>
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
                            {t('Xóa Ảnh hiện tại', 'Remove Photo')}
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
                          {t('Tải Ảnh mới', 'Upload Photo')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* General Details Form */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('Thông tin Hồ sơ Doanh nghiệp', 'Enterprise Profile Details')}</CardTitle>
                  <CardDescription>{t('Cập nhật họ tên, email công việc, số điện thoại và thông tin vị trí', 'Update your full name, work email, phone number, and position details')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label={t('Họ và Tên *', 'Full Name *')}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        leftIcon={<User className="h-4 w-4 text-text-muted" />}
                        required
                      />

                      <Input
                        label={t('Email Doanh nghiệp *', 'Work Email *')}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<Mail className="h-4 w-4 text-text-muted" />}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label={t('Số điện thoại', 'Phone Number')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        leftIcon={<Smartphone className="h-4 w-4 text-text-muted" />}
                        placeholder="0912 345 678"
                      />

                      <Select
                        label={t('Giới tính', 'Gender')}
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        options={[
                          { value: '', label: t('-- Chọn Giới tính --', '-- Select Gender --') },
                          { value: 'Male', label: t('Nam', 'Male') },
                          { value: 'Female', label: t('Nữ', 'Female') },
                          { value: 'Other', label: t('Khác', 'Other') },
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label={t('Ngày sinh', 'Date of Birth')}
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />

                      <Input
                        label={t('Địa chỉ liên hệ', 'Contact Address')}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        leftIcon={<MapPin className="h-4 w-4 text-text-muted" />}
                        placeholder={t('Số nhà, đường, quận/huyện, tỉnh/thành phố...', 'Street, district, city...')}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label={t('Chức danh / Vị trí', 'Job Title / Position')}
                        value={jobTitle}
                        disabled
                        helperText={t('Được quản lý bởi quản trị viên.', 'Managed by an administrator.')}
                        leftIcon={<Building className="h-4 w-4 text-text-muted" />}
                        placeholder="Senior Solution Architect"
                      />

                      <Input
                        label={t('Phòng ban trực thuộc', 'Department')}
                        value={departmentName || t('Chưa phân bổ', 'Unassigned')}
                        disabled
                        helperText={t('Được quản lý bởi quản trị viên.', 'Managed by an administrator.')}
                        leftIcon={<Building className="h-4 w-4 text-text-muted" />}
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
                        {t('Lưu Thông tin Hồ sơ', 'Save Profile')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB: Employment Contracts */}
          {activeTab === 'contracts' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Hợp đồng Lao động Cá nhân', 'My Employment Contracts')}</CardTitle>
                <CardDescription>
                  {t(
                    'Thông tin hợp đồng lao động, mức lương cơ bản, phụ cấp và thời hạn hiệu lực của bạn',
                    'Your employment contract terms, base compensation, allowance, and effective dates',
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {contractsLoading ? (
                  <p className="text-xs text-text-muted py-4">{t('Đang tải hợp đồng...', 'Loading contracts...')}</p>
                ) : myContracts.length === 0 ? (
                  <EmptyState
                    type="no-data"
                    description={t(
                      'Bạn chưa có hợp đồng lao động nào được ghi nhận trên hệ thống.',
                      'No employment contracts have been recorded for your account yet.',
                    )}
                  />
                ) : (
                  myContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" size="sm" className="font-mono font-bold text-primary">
                            {contract.contract_code}
                          </Badge>
                          <span className="font-bold text-text-primary">
                            {getContractTypeLabel(contract.contract_type, isEnglish)}
                          </span>
                          <StatusBadge status={contract.status} size="sm" />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-text-secondary">
                          <span>
                            {t('Hiệu lực:', 'Effective:')}{' '}
                            <strong className="text-text-primary">
                              {formatDate(contract.start_date)} →{' '}
                              {contract.end_date ? formatDate(contract.end_date) : t('Vô thời hạn', 'Indefinite')}
                            </strong>
                          </span>
                          <span>
                            {t('Lương cơ bản:', 'Base Salary:')}{' '}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {formatVndCurrency(contract.base_salary, contract.currency)}
                            </strong>
                          </span>
                          {Number(contract.allowance || 0) > 0 && (
                            <span>
                              {t('Phụ cấp:', 'Allowance:')}{' '}
                              <strong className="text-primary">
                                {formatVndCurrency(contract.allowance, contract.currency)}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setSelectedContract(contract)}
                      >
                        {t('Xem chi tiết', 'View Details')}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('Đổi Mật khẩu Tài khoản', 'Change Account Password')}</CardTitle>
                  <CardDescription>{t('Khuyên dùng mật khẩu mạnh bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt', 'Use a strong password combining uppercase, lowercase, numbers, and symbols')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                    <Input
                      label={t('Mật khẩu Hiện tại', 'Current Password')}
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      leftIcon={<Lock className="h-4 w-4 text-text-muted" />}
                      required
                    />

                    <Input
                      label={t('Mật khẩu Mới', 'New Password')}
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      leftIcon={<Lock className="h-4 w-4 text-text-muted" />}
                      required
                    />

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="space-y-1.5 p-3 rounded-lg bg-accent/20 border border-border/60">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted font-medium">{t('Độ mạnh mật khẩu:', 'Password Strength:')}</span>
                          <span className="font-bold text-text-primary">{passwordStrength.label}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                          <div className={`h-full ${passwordStrength.color} transition-all duration-300`} style={{ width: `${passwordStrength.score}%` }} />
                        </div>
                      </div>
                    )}

                    <Input
                      label={t('Xác nhận Mật khẩu Mới', 'Confirm New Password')}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={<Lock className="h-4 w-4 text-text-muted" />}
                      required
                    />

                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        leftIcon={<Key className="h-4 w-4" />}
                        isLoading={isChangingPassword}
                      >
                        {t('Xác nhận Đổi Mật khẩu', 'Update Password')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-amber-500" />
                    {t('Quên mật khẩu hiện tại? Yêu cầu Admin cấp lại', 'Forgot Current Password? Request Admin Reset')}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      'Nếu bạn không nhớ mật khẩu cũ để tự đổi bên trên, hãy gửi yêu cầu trực tiếp để Admin/IT nhận thông báo và cấp lại mật khẩu tạm thời cho tài khoản của bạn.',
                      'If you cannot remember your current password, send a request directly so an Administrator can issue a temporary password or reset link.',
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleRequestAdminReset} className="space-y-4 max-w-lg">
                    <div className="rounded-lg border border-border/70 bg-background/50 px-3.5 py-2.5 text-xs text-text-secondary flex items-center justify-between gap-2">
                      <span>{t('Tài khoản yêu cầu:', 'Requesting account:')}</span>
                      <strong className="font-mono text-text-primary">{user?.email || email}</strong>
                    </div>

                    <Input
                      label={t('Ghi chú cho Admin / Bộ phận IT (tuỳ chọn)', 'Note for Admin / IT Support (optional)')}
                      type="text"
                      value={resetRequestNote}
                      onChange={(e) => setResetRequestNote(e.target.value)}
                      placeholder={t(
                        'VD: Quên mật khẩu cũ, nhờ Admin cấp lại qua chat/email nội bộ...',
                        'e.g. Forgot my old password, please send a temporary password...',
                      )}
                      leftIcon={<Mail className="h-4 w-4 text-text-muted" />}
                    />

                    {hasSentResetRequest && (
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>
                          {t(
                            'Yêu cầu của bạn đã được chuyển tới quản trị viên hệ thống. Vui lòng chờ Admin cấp mật khẩu tạm thời.',
                            'Your request has been delivered to system administrators.',
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        type="submit"
                        leftIcon={<KeyRound className="h-4 w-4" />}
                        isLoading={isRequestingReset}
                      >
                        {t('Gửi yêu cầu cấp lại cho Admin', 'Send Reset Request to Admin')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: Sessions */}
          {activeTab === 'sessions' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('Phiên làm việc & Thiết bị Đăng nhập', 'Active Sessions & Devices')}</CardTitle>
                    <CardDescription>{t('Quản lý các trình duyệt và IP đang truy cập vào tài khoản', 'Manage browsers and IP addresses signed in to your account')}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoutOthers}
                    isLoading={isLoggingOutOthers}
                  >
                    {t('Đăng xuất các thiết bị khác', 'Sign Out Other Devices')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSessions ? (
                  <p className="text-xs text-text-muted text-center py-4">{t('Đang tải danh sách phiên làm việc...', 'Loading active sessions...')}</p>
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
                            <h4 className="text-xs font-bold text-text-primary">{t('Trình duyệt Hiện tại (Thiết bị này)', 'Current Browser (This Device)')}</h4>
                            <Badge variant="success" size="sm">{t('Phiên hiện tại', 'Current Session')}</Badge>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {t('Hệ điều hành: Windows / Edge / Chrome · IP: 127.0.0.1', 'OS: Windows / Edge / Chrome · IP: 127.0.0.1')}
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
                            <h4 className="text-xs font-bold text-text-primary">{s.user_agent || t('Trình duyệt không xác định', 'Unknown Browser')}</h4>
                            <p className="text-[11px] text-text-muted mt-0.5">IP: {s.ip_address || '127.0.0.1'}</p>
                          </div>
                        </div>
                        <Badge variant="outline" size="sm">{t('Đã ngắt', 'Disconnected')}</Badge>
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
                <CardTitle>{t('Tùy chỉnh Giao diện & Thông báo', 'Interface & Notification Preferences')}</CardTitle>
                <CardDescription>{t('Cấu hình trải nghiệm làm việc cá nhân hóa', 'Customize your workspace language, timezone, and alerts')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">{t('Ngôn ngữ & Múi giờ', 'Language & Timezone')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label={t('Ngôn ngữ Hiển thị', 'Display Language')}
                      value={languagePref}
                      onChange={(e) => setLanguagePref(e.target.value as 'vi' | 'en')}
                      options={[
                        { value: 'vi', label: 'Tiếng Việt (Vietnamese)' },
                        { value: 'en', label: 'English (US)' },
                      ]}
                    />

                    <Select
                      label={t('Múi giờ Đô thị', 'Timezone')}
                      value={timezonePref}
                      onChange={(e) => setTimezonePref(e.target.value)}
                      options={[
                        { value: 'Asia/Ho_Chi_Minh', label: '(GMT+07:00) Bangkok, Hanoi, Jakarta' },
                        { value: 'UTC', label: '(GMT+00:00) UTC Timezone' },
                      ]}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 space-y-4">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">{t('Kênh Thông báo', 'Notification Channels')}</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotifs}
                        onChange={(e) => setEmailNotifs(e.target.checked)}
                        className="rounded border-input text-primary focus:ring-ring h-4 w-4"
                      />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{t('Thông báo qua Email', 'Email Notifications')}</p>
                        <p className="text-[11px] text-text-muted">{t('Nhận email khi có task mới được gán hoặc phê duyệt nghỉ phép', 'Receive email alerts when new tasks are assigned or leave is reviewed')}</p>
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
                        <p className="text-xs font-semibold text-text-primary">{t('Thông báo Hệ thống Thời gian thực (In-App)', 'Real-Time In-App Notifications')}</p>
                        <p className="text-[11px] text-text-muted">{t('Hiển thị popup chuông báo khi có thay đổi công việc', 'Show bell popup alerts whenever workspace items update')}</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={async () => {
                      await updatePrefs({
                        language: languagePref,
                        timezone: timezonePref,
                        email_notifications: emailNotifs,
                        in_app_notifications: systemNotifs,
                      });
                      toast.success(
                        t('Đã lưu tùy chọn', 'Preferences saved'),
                        t('Cấu hình trải nghiệm người dùng đã cập nhật.', 'Your display preferences have been updated.'),
                      );
                    }}
                  >
                    {t('Lưu Tùy chỉnh', 'Save Preferences')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ContractDetailModal
        isOpen={Boolean(selectedContract)}
        onClose={() => setSelectedContract(null)}
        contract={selectedContract}
        employeeName={fullName || user?.full_name || t('Nhân sự', 'Employee')}
        canEdit={false}
        onEditClick={() => {}}
      />
    </div>
  );
};

export default ProfilePage;

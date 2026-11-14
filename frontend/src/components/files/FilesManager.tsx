import * as React from 'react';
import { useFilesList, useDeleteFile } from '../../hooks/useFiles';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Input } from '../ui/Input';
import { Badge } from '../common/Badge';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { Search, Download, Trash2, FileIcon, FileText, ImageIcon, FileArchive, AlertCircle } from 'lucide-react';
import api from '../../api/axios';

interface FilesManagerProps {
  projectId?: number;
  module?: string;
}

export const FilesManager: React.FC<FilesManagerProps> = ({ projectId, module }) => {
  const toast = useToast();
  const { user } = useAuth();
  const { t, formatDate } = useSettings();

  const roleStr = (user?.role || '').toLowerCase();
  const isMod = user?.role_id === 1 || user?.role_id === 2 || roleStr === 'admin' || roleStr === 'manager';

  // Search and filter states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedModule, setSelectedModule] = React.useState<string>('All');

  // Load files list
  const { data: files = [], isLoading } = useFilesList(projectId, module);

  // Mutations
  const deleteMutation = useDeleteFile();

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    try {
      const response = await api.get(`/files/download/${fileId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('Tải tệp thành công!', 'File downloaded!'));
    } catch {
      toast.error(t('Lỗi tải tệp', 'Download Error'), t('Không thể tải xuống tệp tin này.', 'Unable to download this file.'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('Xác nhận xóa tệp tin này? Hành động này sẽ loại bỏ tệp vĩnh viễn khỏi hệ thống.', 'Confirm deleting this file? This will permanently remove it.'))) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t('Đã xóa tệp tin thành công', 'File deleted successfully'));
    } catch {
      toast.error(t('Lỗi', 'Error'), t('Không thể xóa tệp tin này.', 'Unable to delete this file.'));
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-emerald-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-6 w-6 text-rose-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <FileArchive className="h-6 w-6 text-amber-500" />;
    return <FileIcon className="h-6 w-6 text-primary" />;
  };

  // Filter and search logic
  const filteredFiles = React.useMemo(() => {
    return files.filter((file) => {
      const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModule = selectedModule === 'All' || file.parent_module === selectedModule;
      return matchesSearch && matchesModule;
    });
  }, [files, searchQuery, selectedModule]);

  if (isLoading) {
    return <div className="text-center py-8 text-xs text-text-muted">{t('Đang tải danh sách tài liệu...', 'Loading files...')}</div>;
  }

  return (
    <Card className="font-sans text-xs">
      <CardHeader className="border-b border-border/40 pb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" />
            {t('Kho Tài liệu Hợp nhất', 'Unified Files Registry')} ({filteredFiles.length})
          </CardTitle>
          <div className="w-full sm:max-w-xs relative">
            <Input
              placeholder={t('Tìm kiếm theo tên tệp...', 'Search by file name...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            <Search className="h-4 w-4 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Filter Badges */}
        {!module && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {['All', 'Task', 'DiscussionTopic', 'DiscussionReply', 'UserFeedback'].map((mod) => (
              <Badge
                key={mod}
                variant={selectedModule === mod ? 'primary' : 'default'}
                className="cursor-pointer select-none"
                onClick={() => setSelectedModule(mod)}
              >
                {mod === 'All' ? t('Tất cả nguồn', 'All Sources') : mod}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-text-muted flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-8 w-8 text-text-muted/60" />
            <span>{t('Không tìm thấy tài liệu nào.', 'No files found.')}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/40 text-[10px] uppercase font-bold text-text-muted tracking-wider">
                  <th className="pb-3 pl-2">{t('Tên Tệp', 'File Name')}</th>
                  <th className="pb-3">{t('Kích thước', 'Size')}</th>
                  <th className="pb-3">{t('Nguồn (Module)', 'Source Module')}</th>
                  <th className="pb-3">{t('Người tải lên', 'Uploaded By')}</th>
                  <th className="pb-3">{t('Ngày upload', 'Uploaded At')}</th>
                  <th className="pb-3 pr-2 text-right">{t('Thao tác', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredFiles.map((file) => {
                  const isOwner = user?.id === file.uploaded_by_id;
                  const _downloadUrl = `${api.defaults.baseURL || ''}/files/download/${file.id}`;
                  return (
                    <tr key={file.id} className="hover:bg-secondary/10 group transition-colors">
                      <td className="py-3 pl-2 max-w-[200px] truncate">
                        <div className="flex items-center gap-2.5">
                          {getFileIcon(file.mime_type)}
                          <div className="min-w-0">
                            <p className="font-bold text-text-primary truncate" title={file.file_name}>
                              {file.file_name}
                            </p>
                            <p className="text-[10px] text-text-muted truncate">{file.mime_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-text-secondary">
                        {(file.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3">
                        <Badge variant="default">{file.parent_module}</Badge>
                      </td>
                      <td className="py-3 text-text-secondary">{file.uploader_name || t('Hệ thống', 'System')}</td>
                      <td className="py-3 text-text-muted">
                        {formatDate(file.uploaded_at)}
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file.id, file.file_name)}
                            className="p-1.5 rounded-lg border border-border bg-surface text-primary hover:bg-secondary transition-colors cursor-pointer"
                            title={t('Tải tệp về', 'Download file')}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          {(isOwner || isMod) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(file.id)}
                              className="p-1.5 rounded-lg border border-border bg-surface text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-200 dark:hover:border-rose-950/40 transition-colors cursor-pointer"
                              title={t('Xóa tệp', 'Delete file')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

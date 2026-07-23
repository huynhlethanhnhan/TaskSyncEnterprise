import * as React from 'react';
import { Search, Briefcase, CheckSquare, Users, Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';

export interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');

  const quickLinks = [
    { label: 'Tổng quan Dashboard', path: '/dashboard', icon: <Briefcase className="h-4 w-4 text-primary" /> },
    { label: 'Danh sách Dự án', path: '/projects', icon: <Briefcase className="h-4 w-4 text-emerald-500" /> },
    { label: 'Quản lý Task', path: '/tasks', icon: <CheckSquare className="h-4 w-4 text-sky-500" /> },
    { label: 'Danh sách Nhân sự', path: '/employees', icon: <Users className="h-4 w-4 text-purple-500" /> },
    { label: 'Sơ đồ Phòng ban', path: '/departments', icon: <Building2 className="h-4 w-4 text-amber-500" /> },
  ];

  const filteredLinks = quickLinks.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setSearch('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tìm kiếm Nhanh (Quick Search)" size="md">
      <div className="space-y-4">
        <Input
          placeholder="Nhập từ khóa hoặc trang cần tìm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4 text-text-muted" />}
          autoFocus
        />

        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Lối tắt Truy cập</span>
          <div className="divide-y divide-border/60 rounded-xl border border-border bg-surface overflow-hidden">
            {filteredLinks.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Không tìm thấy lối tắt phù hợp</p>
            ) : (
              filteredLinks.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(item.path)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="font-semibold text-text-primary">{item.label}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

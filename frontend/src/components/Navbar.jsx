// 📂 FILE: src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { tokenService } from "../services/tokenService";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    tokenService.clear(); // Xóa token
    navigate("/login");    // Đá về trang đăng nhập
  };

  return (
    <nav className="bg-blue-800 p-4 text-white flex justify-between items-center shadow-md">
      {/* 🟢 Bọc chữ TaskSync trong thẻ Link để bấm vào là về thẳng Dashboard mới */}
      <Link to="/dashboard" className="font-bold text-xl hover:text-blue-200 transition-all">
        TaskSync 🏠
      </Link>
      
      <div className="space-x-6">
        {/* 🟢 Thêm một nút tường minh để người dùng dễ click */}
        <Link to="/dashboard" className="bg-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-600 transition font-medium text-sm">
          📊 Bảng Điều Khiển
        </Link>
        <Link to="/audit" className="hover:text-blue-200">Nhật ký (Audit)</Link>
        <Link to="/profile" className="hover:text-blue-200">Profile</Link>
        <button 
          onClick={handleLogout} 
          className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition"
        >
          Đăng xuất
        </button>
      </div>
    </nav>
  );
}
// 📂 FILE: src/pages/auth/LoginPage.jsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios"; 
import { tokenService } from "../../services/tokenService";

export default function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();
  const [error, setError] = useState("");

  const onSubmit = async (data) => {
    try {
      // 1. Chuyển đổi dữ liệu sang dạng URLSearchParams (Form-data)
      // FastAPI OAuth2PasswordRequestForm yêu cầu "username" và "password"
      const formData = new URLSearchParams();
      formData.append("username", data.email); // Chú ý: Backend dùng 'username' để nhận email
      formData.append("password", data.password);

      // 2. Gửi request với Content-Type chuẩn cho form-data
      const res = await api.post("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
       
      // 3. Lưu tokens
      tokenService.setTokens(res.data.access_token, res.data.refresh_token);
      const responseUser = res.data.user || {};
      const user = {
        id: responseUser.id,
        email: responseUser.email || data.email,
        full_name: responseUser.full_name || responseUser.name || data.email,
        name: responseUser.full_name || responseUser.name || data.email,
        role_id: responseUser.role_id,
        role: responseUser.role || "staff",
        avatar_url: responseUser.avatar_url || null,
        login_count: responseUser.login_count || 0,
        last_login: responseUser.last_login || null,
        last_logout: responseUser.last_logout || null,
      };

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("is_first_login", res.data.is_first_login ? "true" : "false");
       
      if (res.data.is_first_login) {
        navigate("/change-password");
      } else {
        alert("Đăng nhập thành công!");
        navigate("/");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Email hoặc Mật khẩu không đúng!");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="p-8 bg-white shadow-lg rounded-xl w-96 border border-gray-200"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          TaskSync Enterprise
        </h2>
        
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            {...register("email", { required: true })} 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="admin@tasksync.com"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Password</label>
          <input 
            {...register("password", { required: true })} 
            type="password" 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="********"
          />
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition font-bold"
        >
          Đăng nhập
        </button>
      </form>
    </div>
  );
}
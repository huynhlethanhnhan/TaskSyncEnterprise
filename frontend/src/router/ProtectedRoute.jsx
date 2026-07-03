// 📂 FILE: src/router/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { tokenService } from "../services/tokenService";

export default function ProtectedRoute({ children }) {
  const token = tokenService.getAccessToken();

  // Nếu không có token -> đá về login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có token -> cho vào trang đích
  return children;
}
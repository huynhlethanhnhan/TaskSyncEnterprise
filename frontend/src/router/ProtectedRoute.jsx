import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const roleStr = (user?.role || "").toLowerCase();
    const roleId = Number(user?.role_id);
    const isAllowed = allowedRoles.some((role) => {
      if (typeof role === "number") return role === roleId;
      return String(role).toLowerCase() === roleStr;
    });

    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
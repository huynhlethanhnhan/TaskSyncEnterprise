import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../providers/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: (string | number)[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps): React.ReactElement | null {
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

  return <>{children}</>;
}

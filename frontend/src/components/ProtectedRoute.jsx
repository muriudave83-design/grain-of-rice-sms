import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  const token = localStorage.getItem("token");

  // ⏳ Wait for auth restoration
  if (loading) {
    return null;
  }

  // 🔒 Not logged in OR token missing
  if (!isAuthenticated || !user || !token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // 🔐 FORCE PASSWORD CHANGE ENFORCEMENT
  if (
    user.forcePasswordChange &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  // 🚫 Role restriction
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
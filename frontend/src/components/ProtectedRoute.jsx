import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const token = localStorage.getItem("token");

  // 🔥 SAFE FALLBACK (does NOT break existing logic)
  let storedUser = null;
  try {
    storedUser = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : null;
  } catch {
    storedUser = null;
  }

  const effectiveUser = user || storedUser;

  // ⏳ Wait for auth restoration
  if (loading) {
    return <div>Loading...</div>;
  }

  // 🔒 Not logged in OR token missing
  if (!effectiveUser || !token) {
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
    effectiveUser.forcePasswordChange &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  // 🚫 Role restriction
  if (allowedRoles && !allowedRoles.includes(effectiveUser.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
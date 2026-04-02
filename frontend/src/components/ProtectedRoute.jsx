import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth(); // 🔥 token not from context
  const location = useLocation();

  const token = localStorage.getItem("token"); // ✅ single source of truth

  // ⏳ Wait for auth restoration
  if (loading) {
    return <div>Loading...</div>;
  }

  // 🧪 DEBUG
  console.log("AUTH DEBUG:", {
    token,
    user,
    loading,
    path: location.pathname,
  });

  // 🚨 CRITICAL: INVALID AUTH STATE (MOST IMPORTANT FIX)
  if (!token || !user) {
    console.error("🚨 Invalid auth state → forcing logout from:", location.pathname);

    localStorage.clear();

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // 🔐 FORCE PASSWORD CHANGE
  if (
    user.forcePasswordChange &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  // 🚫 ROLE CHECK
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.warn("🚫 Role mismatch", {
      required: allowedRoles,
      actual: user.role,
    });

    return <div>Access restricted</div>;
  }

  return <Outlet />;
}
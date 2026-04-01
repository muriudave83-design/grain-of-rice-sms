import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, token, loading } = useAuth(); // ✅ USE CONTEXT ONLY
  const location = useLocation();

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

  // 🔒 NOT AUTHENTICATED
  if (!token) {
    console.error("🚨 REDIRECT TO LOGIN FROM:", location.pathname);

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // ⚠️ Token exists but user not ready → WAIT
  if (token && !user) {
    console.warn("⏳ Token exists but user not ready — waiting");
    return <div>Restoring session...</div>;
  }

  // 🔐 FORCE PASSWORD CHANGE
  if (
    user?.forcePasswordChange &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  // 🚫 ROLE CHECK
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    console.warn("🚫 Role mismatch", {
      required: allowedRoles,
      actual: user?.role,
    });

    return <div>Access restricted</div>;
  }

  return <Outlet />;
}
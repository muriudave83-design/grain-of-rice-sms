import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const token = localStorage.getItem("token");

  // ✅ SAFE PARSE
  let storedUser = null;
  try {
    storedUser = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : null;
  } catch {
    console.warn("⚠️ Failed to parse stored user");
    storedUser = null;
  }

  // ✅ Prefer context, fallback to storage
  const effectiveUser = user ?? storedUser;

  // ⏳ Wait for auth restoration
  if (loading) {
    return <div>Loading...</div>;
  }

  // 🧪 DEBUG
  console.log("AUTH DEBUG:", {
    token,
    user,
    storedUser,
    effectiveUser,
    loading,
    path: location.pathname,
  });

  // 🔒 ONLY redirect if COMPLETELY unauthenticated
  if (!token && !effectiveUser) {
      console.error("🚨 REDIRECT TRIGGERED FROM:", location.pathname);

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // ⚠️ Token exists but user not ready yet → WAIT (CRITICAL FIX)
  if (token && !effectiveUser) {
    console.warn("⏳ Token exists but user not ready — waiting");
    return <div>Restoring session...</div>;
  }

  // 🔐 FORCE PASSWORD CHANGE
  if (
    effectiveUser?.forcePasswordChange &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  // 🚫 ROLE CHECK (SAFE VERSION)
  if (allowedRoles && !allowedRoles.includes(effectiveUser?.role)) {
    console.warn("🚫 Role mismatch", {
      required: allowedRoles,
      actual: effectiveUser?.role,
    });

    // ✅ DO NOT hard redirect — show safe fallback
    return <div>Access restricted</div>;
  }

  return <Outlet />;
}
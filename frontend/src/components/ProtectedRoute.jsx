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

  // 🧪 DEBUG (TEMP — remove later)
  console.log("🔍 ProtectedRoute check:", {
    user,
    storedUser,
    effectiveUser,
    token,
    loading,
  });

  // ⏳ Wait for auth restoration
  if (loading) {
    return <div>Loading...</div>;
  }

  // 🔒 STRICT AUTH CHECK (but stable)
  if (!token) {
    console.warn("❌ No token → redirecting");

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (!effectiveUser) {
    console.warn("❌ No user → redirecting");

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
    effectiveUser.forcePasswordChange &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  // 🚫 ROLE CHECK (WITH DEBUG)
  if (allowedRoles && !allowedRoles.includes(effectiveUser.role)) {
    console.warn("🚫 Role mismatch", {
      required: allowedRoles,
      actual: effectiveUser.role,
    });

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
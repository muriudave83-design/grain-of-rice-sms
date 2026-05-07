import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const token = localStorage.getItem("token");

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

  const isChangePasswordRoute = location.pathname === "/change-password";

  // ✅ ALLOW ACCESS TO CHANGE PASSWORD EVEN IF TOKEN IS MISSING
  if ((!token || !user) && !isChangePasswordRoute) {
    console.error(
      "🚨 Invalid auth state → forcing logout from:",
      location.pathname
    );

    localStorage.clear();

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // 🔐 FORCE PASSWORD CHANGE (FIXED FIELD NAME)
  if (
    user?.mustChangePassword &&
    !isChangePasswordRoute
  ) {
    console.log("🔐 Redirecting to forced password change");

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
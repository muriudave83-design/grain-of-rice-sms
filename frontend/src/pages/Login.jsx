import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/apiClient";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("✅ Login component mounted");
    console.log("🔁 Redirect from:", location.state?.from);
  }, [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    setError(null);

    try {
      console.log("🚀 Calling API: /auth/login");

      const res = await api.post(
        "/auth/login",
        { email, password },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      console.log("✅ LOGIN RESPONSE:", res.data);

      const {
        token,
        user,
        requirePasswordChange,
        mustChangePassword,
        userId,
      } = res.data;

      // 🚨 HANDLE FORCED PASSWORD CHANGE (NO TOKEN / NO USER CASE)
      if (requirePasswordChange || mustChangePassword) {
        console.log("🔐 Password change required");

        // ✅ clear any previous state
        localStorage.clear();

        // ✅ store temp userId for change-password request
        if (userId) {
          localStorage.setItem("tempUserId", userId);
        }

        navigate("/change-password", { replace: true });
        return;
      }

      // 🚨 VALIDATE NORMAL LOGIN RESPONSE
      if (!token || !user || !user.id) {
        console.error("🚨 Invalid login response:", res.data);
        throw new Error("Invalid server response. Please contact admin.");
      }

      // ✅ CLEAR OLD STATE
      localStorage.clear();

      // ✅ STORE AUTH
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // ✅ SYNC CONTEXT
      login(user, token);

      console.log("🔥 TOKEN AFTER SAVE:", localStorage.getItem("token"));
      console.log("👤 USER:", user);

      // ✅ ROLE-BASED REDIRECT
      const normalizedRole = user.role?.toUpperCase();

      if (normalizedRole === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (normalizedRole === "TEACHER") {
        navigate("/teacher/classes", { replace: true });
      } else if (normalizedRole === "PARENT") {
        navigate("/parent", { replace: true });
      } else if (normalizedRole === "STUDENT") {
        navigate("/student/dashboard", { replace: true });
      } else {
        console.warn("⚠️ Unknown role, redirecting to home");
        navigate("/", { replace: true });
      }

    } catch (err) {
      console.error("❌ LOGIN ERROR:", err);

      // 🚨 ENSURE CLEAN STATE
      localStorage.clear();

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow w-full max-w-sm"
      >
        <h1 className="text-xl font-semibold mb-4 text-center">
          Login
        </h1>

        {error && (
          <div className="mb-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mb-3">
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
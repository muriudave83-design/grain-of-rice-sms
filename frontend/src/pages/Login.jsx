import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
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

  // NEW
  const [showPassword, setShowPassword] = useState(false);

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

      const res = await api.post("/auth/login", {
        email,
        password,
      });

      console.log("✅ LOGIN RESPONSE:", res.data);

      const {
        token,
        user,
        requirePasswordChange,
        mustChangePassword,
        userId,
      } = res.data;

      if (requirePasswordChange || mustChangePassword) {
        console.log("🔐 Password change required");

        localStorage.clear();

        if (userId) {
          localStorage.setItem("tempUserId", userId);
        }

        navigate("/change-password", { replace: true });
        return;
      }

      if (!token || !user || !user.id) {
        console.error("🚨 Invalid login response:", res.data);
        throw new Error("Invalid server response. Please contact admin.");
      }

      localStorage.clear();

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      login(user, token);

      console.log("🔥 TOKEN AFTER SAVE:", localStorage.getItem("token"));
      console.log("👤 USER:", user);

      const normalizedRole = user.role?.toUpperCase();

      if (normalizedRole === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (normalizedRole === "TEACHER") {
        navigate("/teacher/classes", { replace: true });
      } else if (normalizedRole === "ATTENDANCE_OFFICER") {
        navigate("/dashboard/admin/attendance", { replace: true });
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2">

        {/* LEFT PANEL */}
        <div className="hidden md:flex flex-col justify-center p-12 bg-gradient-to-br from-blue-800 to-indigo-900 text-white">
          <img
            src="/logo.png"
            alt="School Logo"
            className="w-32 h-32 object-contain mb-6"
          />

          <h1 className="text-4xl font-bold mb-3">
            Grain of Rice Academy
          </h1>

          <p className="text-blue-100 text-lg mb-8">
            School Management Information System
          </p>

          <div className="space-y-4 text-blue-50">
            <div>✓ Student Management</div>
            <div>✓ Attendance Tracking</div>
            <div>✓ Report Cards & Assessments</div>
            <div>✓ Parent Communication</div>
            <div>✓ Academic Records</div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="p-8 md:p-12 flex flex-col justify-center">

          <div className="md:hidden flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="School Logo"
              className="w-24 h-24 object-contain"
            />
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome Back
          </h2>

          <p className="text-gray-500 mb-8">
            Sign in to continue to your dashboard
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>

              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter your email"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500"
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            © 2026 Grain of Rice Academy
            <br />
            School Management System
          </div>
        </div>
      </div>
    </div>
  );
}
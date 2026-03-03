import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getHomeRouteForRole } from "../utils/roleRedirect";

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
    console.log("🌐 VITE_API_URL =", import.meta.env.VITE_API_URL);
    console.log("🔁 Redirect from:", location.state?.from);
  }, [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL;

      if (!API_URL) {
        throw new Error("VITE_API_URL is not defined");
      }

      const url = `${API_URL}/auth/login`;
      console.log("🚀 Calling API:", url);

      const res = await axios.post(
        url,
        { email, password },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ LOGIN RESPONSE:", res.data);

      const { user, token, mustChangePassword } = res.data;

      console.log("👉 ROLE:", user.role);
      console.log("🔐 mustChangePassword:", mustChangePassword);

      // Persist token
      localStorage.setItem("token", token);

      // Store user in auth context INCLUDING password flag
      login({
        ...user,
        forcePasswordChange: mustChangePassword,
      });

      /**
       * 🔐 PASSWORD ENFORCEMENT
       * If backend requires password change,
       * user MUST go to change-password page.
       */
      if (mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }

      /**
       * ✅ EXISTING REDIRECT LOGIC (UNCHANGED)
       */
      const fromLocation = location.state?.from;
      const home = getHomeRouteForRole(user.role);

      if (user.role === "PARENT") {
        navigate("/parent", { replace: true });
      } else if (fromLocation?.pathname) {
        const redirectTo =
          fromLocation.pathname + (fromLocation.search || "");
        navigate(redirectTo, { replace: true });
      } else {
        navigate(home, { replace: true });
      }

    } catch (err) {
      console.error("❌ LOGIN ERROR:", err);
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
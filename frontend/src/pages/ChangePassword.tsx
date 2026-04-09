import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient"; // ✅ USE THIS
import { useAuth } from "../context/AuthContext";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useAuth() as { user: { role: string } | null };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return { label: "", color: "" };

    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 1) return { label: "Weak", color: "#e74c3c" };
    if (score === 2) return { label: "Fair", color: "#f39c12" };
    if (score === 3) return { label: "Good", color: "#3498db" };
    return { label: "Strong", color: "#27ae60" };
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match.");
    }

    try {
      setLoading(true);

      console.log("🚀 Sending change-password request");

      // ✅ USE apiClient (INTERCEPTOR ATTACHES TOKEN)
      await apiClient.patch("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      console.log("✅ Password updated successfully");

      // 🔐 FORCE RE-LOGIN AFTER PASSWORD CHANGE
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      navigate("/login", { replace: true });
      return;

    } catch (err: any) {
      console.error("❌ Change password error:", err);

      setError(
        err.response?.data?.message || "Password change failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #eef2f7, #dce3ec)",
      }}
    >
      <div
        style={{
          width: "400px",
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          animation: "fadeIn 0.4s ease",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "20px",
            fontWeight: 600,
          }}
        >
          🔐 Change Password
        </h2>

        {error && (
          <div
            style={{
              background: "#fdecea",
              color: "#c0392b",
              padding: "8px",
              borderRadius: "6px",
              marginBottom: "12px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {passwordStrength.label && (
            <div
              style={{
                fontSize: "13px",
                marginBottom: "10px",
                color: passwordStrength.color,
                fontWeight: 500,
              }}
            >
              Strength: {passwordStrength.label}
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: loading ? "#7f8c8d" : "#2c3e50",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                (e.target as HTMLButtonElement).style.backgroundColor =
                  "#1a252f";
            }}
            onMouseLeave={(e) => {
              if (!loading)
                (e.target as HTMLButtonElement).style.backgroundColor =
                  "#2c3e50";
            }}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  borderRadius: "6px",
  border: "1px solid #dcdcdc",
  fontSize: "14px",
  transition: "border 0.2s ease",
};
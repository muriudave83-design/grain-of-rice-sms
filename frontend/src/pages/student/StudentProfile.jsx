import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const StudentProfile = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user from localStorage (already stored during login)
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (!user) return <p style={{ padding: "20px" }}>Loading profile...</p>;

  return (
    <div style={{ padding: "20px", color: "white" }}>
      
      {/* TOP BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        
        <button
          onClick={() => navigate("/student/dashboard")}
          style={{
            padding: "8px 12px",
            background: "#333",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          ⬅ Back
        </button>

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 12px",
            background: "#b91c1c",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          🚪 Logout
        </button>

      </div>

      <h2>👤 Student Profile</h2>

      <div style={{ marginTop: "20px" }}>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

    </div>
  );
};

export default StudentProfile;
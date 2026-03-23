import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

const StudentDashboard = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [term, setTerm] = useState("term1");

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setError(null);

        const res = await api.get("/report-cards/me");

        console.log("DASHBOARD DATA:", res.data);

        setStudent(res.data);
      } catch (err) {
        console.error("❌ Failed to load dashboard:", err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [term]);

  // ✅ Loading UI
  if (loading)
    return <p style={{ padding: "20px" }}>Loading dashboard...</p>;

  // ✅ Error UI
  if (error)
    return (
      <p style={{ padding: "20px", color: "red" }}>
        {error}
      </p>
    );

  // 🧠 Safe fallbacks
  const studentName =
    student?.name || student?.studentName || "Student";

  const studentId = student?.studentId || student?.id || 1;

  return (
    <div
      style={{
        padding: "20px",
        color: "white",
        background: "#111",
        minHeight: "100vh",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>🎓 Student Dashboard</h2>

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

      {/* ✅ CARD UI */}
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <div
          style={{
            background: "#222",
            padding: "15px",
            borderRadius: "8px",
          }}
        >
          <h4>Name</h4>
          <p>{studentName}</p>
        </div>

        <div
          style={{
            background: "#222",
            padding: "15px",
            borderRadius: "8px",
          }}
        >
          <h4>Average</h4>
          <p>{student?.overallAverage ?? "N/A"}</p>
        </div>

        <div
          style={{
            background: "#222",
            padding: "15px",
            borderRadius: "8px",
          }}
        >
          <h4>Grade</h4>
          <p>{student?.overallGrade ?? "N/A"}</p>
        </div>
      </div>

      <hr style={{ margin: "20px 0" }} />

      {/* ✅ TERM SELECTOR */}
      <div style={{ margin: "20px 0" }}>
        <label style={{ marginRight: "10px" }}>Select Term:</label>

        <select
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          style={{
            padding: "8px",
            background: "#222",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: "4px",
          }}
        >
          <option value="term1" style={{ color: "#000" }}>
            Term 1
          </option>
          <option value="term2" style={{ color: "#000" }}>
            Term 2
          </option>
          <option value="term3" style={{ color: "#000" }}>
            Term 3
          </option>
        </select>
      </div>

      <h3>Quick Links</h3>

      {/* ✅ FIXED LINKS (React Router) */}
      <div style={{ display: "flex", gap: "10px" }}>
        <Link
          to={`/student/report-cards/${studentId}/${term}`}
          style={{
            padding: "10px",
            background: "#333",
            color: "white",
            textDecoration: "none",
          }}
        >
          📄 Report Card
        </Link>

        <Link
          to="/student/attendance"
          style={{
            padding: "10px",
            background: "#333",
            color: "white",
            textDecoration: "none",
          }}
        >
          📅 Attendance
        </Link>

        <Link
          to="/student/profile"
          style={{
            padding: "10px",
            background: "#333",
            color: "white",
            textDecoration: "none",
          }}
        >
          👤 Profile
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboard;
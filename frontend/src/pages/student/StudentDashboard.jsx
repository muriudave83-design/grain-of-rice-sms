import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/apiClient";
import { formatGrade } from "@/utils/grading";

const StudentDashboard = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [termId, setTermId] = useState("");

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setError(null);

        const res = await api.get("/students/me");

        console.log("DASHBOARD DATA:", res.data);

        setStudent(res.data);
        const initialTerm = res.data.terms?.find((entry) => entry.isActive) || res.data.terms?.[0];
        setTermId(initialTerm ? String(initialTerm.id) : "");
      } catch (err) {
        console.error("❌ Failed to load dashboard:", err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, []);

  if (loading)
    return <p style={{ padding: "20px" }}>Loading dashboard...</p>;

  if (error)
    return (
      <p style={{ padding: "20px", color: "red" }}>
        {error}
      </p>
    );

  const studentName =
    student?.name || student?.studentName || "Student";

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

      {/* CARD UI */}
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
          <p>{formatGrade(student?.overallGrade, "N/A")}</p>
        </div>
      </div>

      <hr style={{ margin: "20px 0" }} />

      {/* TERM SELECTOR */}
      <div style={{ margin: "20px 0" }}>
        <p><strong>Class:</strong> {student?.class?.name || "No current class"}</p>
        {student?.terms?.length ? (
          <>
            <label style={{ marginRight: "10px" }}>Select Term:</label>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              style={{ padding: "8px", background: "#222", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}
            >
              {student.terms.map((entry) => (
                <option key={entry.id} value={entry.id} style={{ color: "#000" }}>
                  {entry.name} — {entry.academicYear}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p>No term is currently configured. Academic results will appear when available.</p>
        )}
      </div>

      <h3>Quick Links</h3>

      <div style={{ display: "flex", gap: "10px" }}>
        <Link
          to="/student/report-cards"
          style={{
            padding: "10px",
            background: "#333",
            color: "white",
            textDecoration: "none",
          }}
        >
          📄 View My Report
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

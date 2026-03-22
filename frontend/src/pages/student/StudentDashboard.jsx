import { useEffect, useState } from "react";
import api from "@/services/apiClient";

const StudentDashboard = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        // ✅ Correct endpoint (auth-driven)
        const res = await api.get("/report-cards/me");

        console.log("DASHBOARD DATA:", res.data);

        setStudent(res.data);
      } catch (err) {
        console.error("❌ Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, []);

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;

  // 🧠 Safe fallbacks
  const studentName =
    student?.name || student?.studentName || "Student";

  const studentId = student?.studentId || student?.id || 1;
  const term = "term1"; // TEMP: static until dynamic terms added

  return (
    <div style={{ padding: "20px", color: "white", background: "#111", minHeight: "100vh" }}>
      <h2>🎓 Student Dashboard</h2>

      <p>
        <strong>Name:</strong> {studentName}
      </p>

      <p>
        <strong>Overall Average:</strong>{" "}
        {student?.overallAverage ?? "N/A"}
      </p>

      <p>
        <strong>Overall Grade:</strong>{" "}
        {student?.overallGrade ?? "N/A"}
      </p>

      <hr style={{ margin: "20px 0" }} />

      <h3>Quick Links</h3>

      <div style={{ display: "flex", gap: "10px" }}>
        <a
          href={`/student/report-cards/${studentId}/${term}`}
          style={{
            padding: "10px",
            background: "#333",
            color: "white",
            textDecoration: "none",
          }}
        >
          📄 View Report Card
        </a>

        <div
          style={{
            padding: "10px",
            background: "#555",
          }}
        >
          📅 Attendance (coming soon)
        </div>

        <div
          style={{
            padding: "10px",
            background: "#555",
          }}
        >
          👤 Profile (coming soon)
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
import { useEffect, useState } from "react";
import api from "@/services/apiClient";

const StudentDashboard = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("term1"); // ✅ NEW STATE

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        // ✅ Now dynamic with term
        const res = await api.get(`/report-cards/me?term=${term}`);

        console.log("DASHBOARD DATA:", res.data);

        setStudent(res.data);
      } catch (err) {
        console.error("❌ Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [term]); // ✅ Refetch when term changes

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;

  // 🧠 Safe fallbacks
  const studentName =
    student?.name || student?.studentName || "Student";

  const studentId = student?.studentId || student?.id || 1;

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
          <option value="term1" style={{ color: "#000" }}>Term 1</option>
          <option value="term2" style={{ color: "#000" }}>Term 2</option>
          <option value="term3" style={{ color: "#000" }}>Term 3</option>
        </select>
      </div>

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
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/apiClient";
import { formatGrade } from "../../utils/grading";

export default function StudentReportCardView() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // ✅ FIXED: Grade system (E → F)
  const getGrade = (avg) => {
    if (avg >= 80) return "A";
    if (avg >= 70) return "B";
    if (avg >= 60) return "C";
    if (avg >= 50) return "D";
    return "F";
  };

  useEffect(() => {
    fetchData();
  }, [studentId]);

  async function fetchData() {
    try {
      setLoading(true);

      console.log("🔥 CALLING:", `/reports/student/${studentId}`);

      const res = await api.get(`/reports/student/${studentId}`);

      console.log("🔥 AXIOS DATA:", res.data);

      setStudentData(res.data);
    } catch (err) {
      console.error("❌ ERROR:", err.response || err);
      setError("Failed to load report card");
    } finally {
      setLoading(false);
    }
  }

  if (loading)
    return <div style={{ padding: "20px" }}>Loading...</div>;

  if (error)
    return (
      <div style={{ padding: "20px", color: "red" }}>
        {error}
      </div>
    );

  if (!studentData)
    return <div style={{ padding: "20px" }}>No data</div>;

  // ✅ Overall average
  const overall =
    studentData.subjects?.length > 0
      ? studentData.subjects.reduce(
          (acc, s) => acc + (s.average || 0),
          0
        ) / studentData.subjects.length
      : 0;

  return (
    <div
      style={{
        padding: "20px",
        background: "#111",
        minHeight: "100vh",
        color: "white",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => navigate(-1)}
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

      {/* TITLE */}
      <h1>Report Card — {studentData.student}</h1>

      <p style={{ marginTop: "5px", color: "#ccc" }}>
        Class: {studentData.class}
      </p>

      {/* TABLE */}
      <table
        style={{
          width: "100%",
          marginTop: "20px",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th style={th}>Subject</th>
            <th style={th}>Average</th>
            <th style={th}>Grade</th>
            <th style={th}>Position</th>
          </tr>
        </thead>

        <tbody>
          {studentData.subjects?.map((subj, i) => (
            <tr key={i} style={row}>
              <td style={td}>{subj.subject}</td>

              <td style={td}>
                {subj.average?.toFixed(2) || "0.00"}
              </td>

              <td style={td}>
                {formatGrade(getGrade(subj.average))}
              </td>

              {/* ✅ SAFE POSITION */}
              <td style={td}>
                {subj.position && subj.totalStudents
                  ? `${subj.position}/${subj.totalStudents}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SUMMARY */}
      <div style={{ marginTop: "20px" }}>
        <strong>Overall Average:</strong>{" "}
        {overall.toFixed(2)}
      </div>

      <div>
        <strong>Overall Grade:</strong>{" "}
        {formatGrade(getGrade(overall))}
      </div>

      {/* ✅ SAFE OVERALL POSITION */}
      <div>
        <strong>Overall Position:</strong>{" "}
        {studentData.overallPosition &&
        studentData.totalStudents
          ? `${studentData.overallPosition}/${studentData.totalStudents}`
          : "—"}
      </div>
    </div>
  );
}

/* STYLES */

const th = {
  padding: "10px",
  borderBottom: "1px solid #444",
  textAlign: "left",
};

const td = {
  padding: "10px",
};

const row = {
  background: "#1f2937",
  color: "white",
};

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/apiClient";

export default function StudentReportCardView() {
  const { term } = useParams(); // ✅ ONLY term is needed
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    fetchData();
  }, [term]);

  async function fetchData() {
    try {
      setLoading(true);

      console.log("🔥 CALLING:", `/report-cards/me?termId=${term}`);
      console.log("🔑 TOKEN:", localStorage.getItem("token"));

      const res = await api.get(
        `/report-cards/me?termId=${term}`
      );

      console.log("🔥 AXIOS DATA:", res.data);
      setStudentData(res.data);

    } catch (err) {
      console.error("❌ ERROR:", err.response || err);
      setError("Failed to load report card");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
  if (error) return <div style={{ padding: "20px", color: "red" }}>{error}</div>;
  if (!studentData) return <div style={{ padding: "20px" }}>No data</div>;

  return (
    <div style={{ padding: "20px", background: "#111", minHeight: "100vh", color: "white" }}>
      
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

      <h1>
        Report Card — {studentData.name}
      </h1>

      <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ padding: "10px", borderBottom: "1px solid #444" }}>Subject</th>
            <th style={{ padding: "10px", borderBottom: "1px solid #444" }}>Average</th>
            <th style={{ padding: "10px", borderBottom: "1px solid #444" }}>Grade</th>
          </tr>
        </thead>
        <tbody>
          {studentData.subjects?.map((subj, i) => (
            <tr key={i} style={{ background: "#1f2937", color: "white" }}>
              <td style={{ padding: "10px" }}>{subj.subject}</td>
              <td style={{ padding: "10px" }}>
                {subj.average?.toFixed(2) || "0.00"}
              </td>
              <td style={{ padding: "10px" }}>{subj.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "20px" }}>
        <strong>Overall Average:</strong>{" "}
        {studentData.overallAverage?.toFixed(2) || "0.00"}
      </div>

      <div>
        <strong>Overall Grade:</strong> {studentData.overallGrade}
      </div>
    </div>
  );
}
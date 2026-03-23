import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

const StudentAttendance = () => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setError(null);

        const res = await api.get("/attendance/student");

        console.log("ATTENDANCE DATA:", res.data);

        setAttendance(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  if (loading) return <p style={{ padding: "20px" }}>Loading attendance...</p>;

  if (error)
    return (
      <p style={{ padding: "20px", color: "red" }}>
        {error}
      </p>
    );

  return (
    <div
      style={{
        padding: "20px",
        color: "white",
        background: "#111",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
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

      <h2>📅 Attendance</h2>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <div style={{ background: "#222", padding: "15px", borderRadius: "8px" }}>
          <h4>Total Days</h4>
          <p>{attendance?.totalDays ?? 0}</p>
        </div>

        <div style={{ background: "#222", padding: "15px", borderRadius: "8px" }}>
          <h4>Present</h4>
          <p>{attendance?.present ?? 0}</p>
        </div>

        <div style={{ background: "#222", padding: "15px", borderRadius: "8px" }}>
          <h4>Absent</h4>
          <p>{attendance?.absent ?? 0}</p>
        </div>

        <div style={{ background: "#222", padding: "15px", borderRadius: "8px" }}>
          <h4>Attendance %</h4>
          <p>{attendance?.percentage ?? 0}%</p>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
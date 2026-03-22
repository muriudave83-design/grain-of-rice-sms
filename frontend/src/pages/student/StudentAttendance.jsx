import { useEffect, useState } from "react";
import api from "@/services/apiClient";

const StudentAttendance = () => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
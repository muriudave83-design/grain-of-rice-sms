import { useEffect, useState } from "react";
import api from "../../../services/apiClient";

export default function ParentAttendanceSummary() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get("/attendance/parent");
        setEntries(res.data || []);
      } catch (err) {
        console.error("Failed to load attendance", err);
        setError("Failed to load attendance records");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  if (loading) {
    return <p style={{ padding: "20px" }}>Loading attendance…</p>;
  }

  if (error) {
    return (
      <p style={{ padding: "20px", color: "red" }}>
        {error}
      </p>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Attendance Summary</h1>

      {entries.length === 0 ? (
        <p>No attendance records found.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.student?.name}</strong> —{" "}
              {entry.status} (
              {entry.session?.class?.name})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

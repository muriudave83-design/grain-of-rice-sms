import { useEffect, useState } from "react";
import api from "@/services/apiClient";

export default function StudentAttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAttendance() {
      try {
        /**
         * Expected backend behavior:
         * - /student/attendance
         *   Returns attendance records for the authenticated student,
         *   already ownership-filtered.
         */
        const res = await api.get("/student/attendance");
        setRecords(res.data || []);
      } catch (err) {
        if (err.response?.status === 403) {
          setError("You are not authorized to view attendance.");
        } else {
          setError("Failed to load attendance records.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchAttendance();
  }, []);

  if (loading) {
    return <div className="p-6">Loading attendance...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (records.length === 0) {
    return (
      <div className="p-6 text-gray-600">
        No attendance records available.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">My Attendance</h1>

      <div className="overflow-x-auto border rounded bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">
                  {new Date(r.date).toLocaleDateString()}
                </td>
                <td className="p-3">{r.subject?.name}</td>
                <td className="p-3">
                  <span
                    className={
                      r.status === "PRESENT"
                        ? "text-green-600"
                        : r.status === "ABSENT"
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

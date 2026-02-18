import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AdminAttendanceClass() {
  const { classId } = useParams();
  const [sessions, setSessions] = useState([]);

  /**
   * TEMP DEMO SAFE
   * ----------------
   * Attendance API wiring is postponed.
   * We intentionally neutralize data loading
   * so the app boots cleanly for the demo.
   */
  useEffect(() => {
    // No API call for now — prevents build/runtime failure
    setSessions([]);
  }, [classId]);

  if (!sessions.length) {
    return <p className="text-gray-500">No attendance records.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex justify-between items-center border rounded p-2"
        >
          <span>{new Date(s.date).toDateString()}</span>

          {/* Plain Tailwind status label — no UI libs */}
          <span
            className={`px-2 py-1 text-xs rounded font-medium ${
              s.status === "DRAFT"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {s.status}
          </span>
        </div>
      ))}
    </div>
  );
}

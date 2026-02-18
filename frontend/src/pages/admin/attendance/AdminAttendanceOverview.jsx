import { useState } from "react";
import { Link } from "react-router-dom";

export default function AdminAttendanceOverview() {
  const [classId, setClassId] = useState("");

  return (
    <div className="space-y-4 max-w-md">
      {/* Plain input — no UI library */}
      <input
        type="text"
        placeholder="Filter by class ID"
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="w-full border rounded px-3 py-2"
      />

      {/* Plain link styled as button */}
      <Link
        to={`/dashboard/admin/attendance/class/${classId}`}
        className="inline-block px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        View Attendance
      </Link>
    </div>
  );
}

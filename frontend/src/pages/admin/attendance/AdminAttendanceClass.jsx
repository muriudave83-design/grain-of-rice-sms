import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../../../services/apiClient";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

function PeriodControls({ status, disabled, onMark }) {
  if (disabled) return <span className="text-gray-500">Not Started</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {STATUSES.map((value) => (
        <button
          key={value}
          onClick={() => onMark(value)}
          className={`px-2 py-1 rounded text-xs border ${
            status === value ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-100"
          }`}
        >
          {value[0] + value.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );
}

function periodCounts(students, key) {
  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, NOT_MARKED: 0 };
  for (const student of students) counts[student[key] ?? "NOT_MARKED"]++;
  return counts;
}

export default function AdminAttendanceClass() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [afternoonInitialized, setAfternoonInitialized] = useState(false);
  const [legacyOnly, setLegacyOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await apiClient.get(
        `/admin/attendance/class/${classId}?date=${selectedDate}`,
      );
      setStudents(res.data.students ?? res.data ?? []);
      setAfternoonInitialized(Boolean(res.data.afternoonInitialized));
      setLegacyOnly(Boolean(res.data.legacyOnly));
    } finally {
      setLoading(false);
    }
  }, [classId, selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchStudents().catch((error) => console.error("Failed to fetch attendance", error));
  }, [fetchStudents]);

  const markAttendance = async (studentId, status, period, refresh = true) => {
    await apiClient.post("/admin/attendance/mark", {
      studentId,
      classId: Number(classId),
      status,
      period,
      date: selectedDate,
    });
    if (refresh) await fetchStudents();
  };

  const markAllPresent = async (period) => {
    await Promise.all(
      students.map((student) => markAttendance(student.studentId, "PRESENT", period, false)),
    );
    await fetchStudents();
  };

  const startAfternoon = async () => {
    try {
      await apiClient.post(`/admin/attendance/class/${classId}/start-afternoon`, {
        date: selectedDate,
      });
      await fetchStudents();
    } catch (error) {
      alert(error.response?.data?.message ?? "Unable to start afternoon attendance");
    }
  };

  if (loading) return <p className="p-6">Loading class attendance...</p>;

  const morning = periodCounts(students, "morningStatus");
  const afternoon = periodCounts(students, "afternoonStatus");
  const dailyAbsent = students.filter(
    (student) => student.morningStatus === "ABSENT" && student.afternoonStatus === "ABSENT",
  ).length;

  return (
    <div className="p-6">
      <button
        onClick={() => navigate("/dashboard/admin/attendance")}
        className="mb-4 px-4 py-2 bg-gray-700 text-white rounded"
      >
        ← Back to Attendance
      </button>

      <h1 className="text-xl font-semibold mb-4">Class Attendance</h1>
      <input
        type="date"
        value={selectedDate}
        onChange={(event) => setSelectedDate(event.target.value)}
        className="border rounded px-3 py-2 mb-4"
      />

      {legacyOnly && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded">
          Historical single-session attendance is shown as legacy data and has not been
          converted to Morning or Afternoon.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4">
          <h2 className="font-semibold">Morning</h2>
          <p>Present {morning.PRESENT} · Absent {morning.ABSENT} · Late {morning.LATE}</p>
          <p>Excused {morning.EXCUSED} · Not marked {morning.NOT_MARKED}</p>
        </div>
        <div className="border rounded p-4">
          <h2 className="font-semibold">Afternoon</h2>
          <p>Present {afternoon.PRESENT} · Absent {afternoon.ABSENT} · Late {afternoon.LATE}</p>
          <p>Excused {afternoon.EXCUSED} · Not marked {afternoon.NOT_MARKED}</p>
        </div>
        <div className="border rounded p-4">
          <h2 className="font-semibold">Daily result</h2>
          <p>Full-day absent: {dailyAbsent}</p>
          <p>Total active students: {students.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => markAllPresent("MORNING")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Mark All Morning Present
        </button>
        {!afternoonInitialized ? (
          <button onClick={startAfternoon} className="px-4 py-2 bg-purple-600 text-white rounded">
            Start Afternoon
          </button>
        ) : (
          <button
            onClick={() => markAllPresent("AFTERNOON")}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Mark All Afternoon Present
          </button>
        )}
      </div>

      <table className="w-full border bg-white">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 border text-left">Student</th>
            <th className="p-3 border text-left">Morning</th>
            <th className="p-3 border text-left">Afternoon</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.studentId}>
              <td className="p-3 border">{student.name}</td>
              <td className="p-3 border">
                <PeriodControls
                  status={student.morningStatus}
                  onMark={(status) => markAttendance(student.studentId, status, "MORNING")}
                />
              </td>
              <td className="p-3 border">
                <PeriodControls
                  status={student.afternoonStatus}
                  disabled={!afternoonInitialized}
                  onMark={(status) => markAttendance(student.studentId, status, "AFTERNOON")}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

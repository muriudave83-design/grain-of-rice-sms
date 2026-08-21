import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/apiClient";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

function PeriodControls({ status, disabled, onMark }) {
  if (disabled) {
    return <span className="text-gray-500">{status ? status[0] + status.slice(1).toLowerCase() : "Not Started"}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {STATUSES.map((value) => (
        <button
          key={value}
          disabled={disabled}
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

export default function TeacherAttendanceSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/attendance/sessions/${sessionId}`);
      if (!response.data.session) {
        setError(404);
        return;
      }
      setSession(response.data.session);
      setStudents(response.data.students ?? []);
      setEntries(response.data.entries ?? []);
    } catch (requestError) {
      setError(requestError.response?.status ?? 500);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p>Loading attendance session...</p>;
  if (error === 404) return <p>Not found</p>;
  if (error === 403) return <p>Forbidden</p>;
  if (!session) return <p>Unable to load attendance.</p>;

  const isDraft = session.status === "DRAFT";
  const afternoonStarted = entries.some((entry) => entry.period === "AFTERNOON");
  const date = new Date(session.date).toISOString().slice(0, 10);
  const statusFor = (studentId, period) =>
    entries.find((entry) => entry.studentId === studentId && entry.period === period)?.status ?? null;

  async function mark(studentId, status, period) {
    try {
      await api.post("/attendance/mark", {
        studentId,
        classId: session.classId,
        status,
        period,
        date,
      });
      await load();
    } catch (requestError) {
      alert(requestError.response?.data?.message ?? "Unable to mark attendance");
    }
  }

  async function markAll(period) {
    try {
      await api.post("/attendance/mark-all", { classId: session.classId, period, date });
      await load();
    } catch (requestError) {
      alert(requestError.response?.data?.message ?? "Unable to mark attendance");
    }
  }

  async function startAfternoon() {
    try {
      await api.post(`/attendance/class/${session.classId}/start-afternoon`, { date });
      await load();
    } catch (requestError) {
      alert(requestError.response?.data?.message ?? "Unable to start afternoon attendance");
    }
  }

  async function submitAttendance() {
    if (!confirm("Once submitted, attendance cannot be changed. Continue?")) return;
    try {
      await api.post(`/attendance/sessions/${session.id}/submit`);
      await load();
    } catch (requestError) {
      alert(requestError.response?.data?.message ?? "Error submitting attendance");
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="px-3 py-1 border rounded">
        ← Back to Class
      </button>
      <div>
        <h2 className="text-xl font-semibold">Attendance — Class {session.classId}</h2>
        <p className="text-sm text-gray-600">Date: {new Date(session.date).toDateString()}</p>
        <p className="text-sm text-gray-600">Status: {session.status}</p>
      </div>

      {isDraft && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => markAll("MORNING")} className="px-3 py-2 bg-blue-600 text-white rounded">
            Mark All Morning Present
          </button>
          {!afternoonStarted ? (
            <button onClick={startAfternoon} className="px-3 py-2 bg-purple-600 text-white rounded">
              Start Afternoon
            </button>
          ) : (
            <button onClick={() => markAll("AFTERNOON")} className="px-3 py-2 bg-indigo-600 text-white rounded">
              Mark All Afternoon Present
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2 border">Student</th>
              <th className="text-left p-2 border">Morning</th>
              <th className="text-left p-2 border">Afternoon</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="p-2 border">{student.firstName} {student.lastName}</td>
                <td className="p-2 border">
                  <PeriodControls
                    status={statusFor(student.id, "MORNING")}
                    disabled={!isDraft}
                    onMark={(status) => mark(student.id, status, "MORNING")}
                  />
                </td>
                <td className="p-2 border">
                  <PeriodControls
                    status={statusFor(student.id, "AFTERNOON")}
                    disabled={!isDraft || !afternoonStarted}
                    onMark={(status) => mark(student.id, status, "AFTERNOON")}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDraft && (
        <button onClick={submitAttendance} className="px-3 py-2 bg-red-600 text-white rounded">
          Submit Attendance
        </button>
      )}
    </div>
  );
}

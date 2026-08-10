import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../services/apiClient";

/*
--------------------------------------------------
Tiny Save Hook (same pattern as other pages)
--------------------------------------------------
*/
function useSaveStatus() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function startSaving() {
    setSaving(true);
    setSaved(false);
  }

  function finishSaving() {
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return { saving, saved, startSaving, finishSaving };
}

export default function TeacherAttendanceSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [error, setError] = useState(null);
  const [lastSavedRecords, setLastSavedRecords] = useState({});

  const { saving, saved, startSaving, finishSaving } = useSaveStatus();

  // --------------------------------------------------
  // LOAD SESSION + STUDENTS
  // --------------------------------------------------
  useEffect(() => {
    api
      .get(`/attendance/sessions/${sessionId}`)
      .then((res) => {
        setSession(res.data.session);

        const studentsList = res.data.students || [];
        setStudents(studentsList);

        const initial = {};

        studentsList.forEach((s) => {
          const morning = (res.data.entries || []).find(
            (entry) => entry.studentId === s.id && entry.period === "MORNING"
          );
          initial[s.id] = morning?.status || "PRESENT";
        });

        setRecords(initial);
        setLastSavedRecords(initial);

        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.status);
        setLoading(false);
      });
  }, [sessionId]);

  // --------------------------------------------------
  // AUTO SAVE (EVERY 3 SECONDS)
  // --------------------------------------------------
  useEffect(() => {
    if (!session || session.status !== "DRAFT") return;

    const interval = setInterval(async () => {
      const changed =
        JSON.stringify(records) !== JSON.stringify(lastSavedRecords);

      if (!changed) return;

      try {
        const payload = {
          records: Object.entries(records).map(([studentId, status]) => ({
            studentId: Number(studentId),
            status,
            period: "MORNING",
          })),
        };

        await api.post(`/attendance/sessions/${sessionId}/records`, payload);

        setLastSavedRecords(records);
      } catch {
        console.error("Autosave failed");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [records, lastSavedRecords, session, sessionId]);

  if (loading) return <p>Loading attendance session...</p>;
  if (error === 404) return <p>Not found</p>;
  if (error === 403) return <p>Forbidden</p>;

  const isDraft = session.status === "DRAFT";

  // --------------------------------------------------
  // PRESENT / ABSENT COUNTERS
  // --------------------------------------------------
  const presentCount = Object.values(records).filter(
    (r) => r === "PRESENT"
  ).length;

  const absentCount = Object.values(records).filter(
    (r) => r === "ABSENT"
  ).length;

  // --------------------------------------------------
  // TOGGLE STUDENT STATUS
  // --------------------------------------------------
  function toggleStatus(studentId) {
    if (!isDraft) return;

    setRecords((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "PRESENT" ? "ABSENT" : "PRESENT",
    }));
  }

  // --------------------------------------------------
  // MARK ALL PRESENT
  // --------------------------------------------------
  function markAllPresent() {
    if (!isDraft) return;

    const updated = {};

    students.forEach((s) => {
      updated[s.id] = "PRESENT";
    });

    setRecords(updated);
  }

  // --------------------------------------------------
  // MANUAL SAVE
  // --------------------------------------------------
  async function saveAttendance() {
    startSaving();

    try {
      const payload = {
        records: Object.entries(records).map(([studentId, status]) => ({
          studentId: Number(studentId),
          status,
          period: "MORNING",
        })),
      };

      await api.post(`/attendance/sessions/${sessionId}/records`, payload);

      setLastSavedRecords(records);

      finishSaving();
    } catch {
      alert("Error saving attendance");
    }
  }

  // --------------------------------------------------
  // SUBMIT SESSION
  // --------------------------------------------------
  function submitAttendance() {
    if (
      !confirm(
        "Once submitted, attendance cannot be changed. Continue?"
      )
    ) {
      return;
    }

    api
      .post(`/attendance/sessions/${session.id}/submit`)
      .then(() => {
        alert("Attendance submitted successfully");

        setSession((prev) => ({
          ...prev,
          status: "SUBMITTED",
        }));
      })
      .catch((err) =>
        alert(
          err.response?.status === 409
            ? "Attendance already submitted"
            : "Error submitting attendance"
        )
      );
  }

  return (
    <div className="space-y-6">

      <div className="text-sm text-gray-600">
        Teacher / Attendance / Class {session.classId} / Session
      </div>

      <button
        onClick={() => navigate(-1)}
        className="px-3 py-1 border rounded"
      >
        ← Back to Class
      </button>

      <div>
        <h2 className="text-xl font-semibold">
          Attendance — Class {session.classId}
        </h2>

        <p className="text-sm text-gray-600">
          Date: {new Date(session.date).toDateString()}
        </p>
      </div>

      <span
        style={{
          background: isDraft ? "#facc15" : "#16a34a",
          color: "white",
          padding: "4px 8px",
          borderRadius: "6px"
        }}
      >
        {session.status}
      </span>

      {!isDraft && (
        <div className="text-sm text-gray-600">
          <p>Submitted at: {new Date(session.updatedAt).toLocaleString()}</p>
        </div>
      )}

      <div className="font-semibold">
        Present: {presentCount} | Absent: {absentCount} | Total: {students.length}
      </div>

      {isDraft && (
        <button
          onClick={markAllPresent}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          Mark All Present
        </button>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2 border">#</th>
              <th className="text-left p-2 border">Student</th>
              <th className="text-left p-2 border">Status</th>
            </tr>
          </thead>

          <tbody>
            {students.map((s, index) => (
              <tr
                key={s.id}
                className={
                  records[s.id] === "ABSENT"
                    ? "bg-red-50"
                    : ""
                }
              >
                <td className="p-2 border">{index + 1}</td>

                <td className="p-2 border">
                  {s.firstName} {s.lastName}
                </td>

                <td className="p-2 border">
                  <button
                    disabled={!isDraft}
                    onClick={() => toggleStatus(s.id)}
                    className={`px-3 py-1 rounded text-white ${
                      records[s.id] === "PRESENT"
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  >
                    {records[s.id]}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDraft && (
        <div className="flex gap-3">

          <button
            onClick={saveAttendance}
            disabled={saving}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Attendance"}
          </button>

          <button
            onClick={submitAttendance}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Submit Attendance
          </button>

        </div>
      )}

    </div>
  );
}

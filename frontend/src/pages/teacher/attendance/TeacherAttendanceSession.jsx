import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/services/apiClient";

export default function TeacherAttendanceSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ improvement line
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [error, setError] = useState(null);
  const [lastSavedRecords, setLastSavedRecords] = useState({});

  // --------------------------------------------------
  // LOAD SESSION + STUDENTS (SINGLE API CALL)
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
          initial[s.id] = "PRESENT";
        });

        setRecords(initial);
        setLastSavedRecords(initial);

        setLoading(false); // ✅ improvement line
      })
      .catch((err) => {
        setError(err.response?.status);
        setLoading(false); // ✅ improvement line
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
          })),
        };

        await api.post(`/attendance/sessions/${sessionId}/records`, payload);

        setLastSavedRecords(records);
      } catch (err) {
        console.error("Autosave failed");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [records, lastSavedRecords, session, sessionId]);

  if (loading) return <p>Loading attendance session...</p>; // ✅ improvement line
  if (error === 404) return <p>Not found</p>;
  if (error === 403) return <p>Forbidden</p>;

  const isDraft = session.status === "DRAFT";

  // --------------------------------------------------
  // TOGGLE STUDENT STATUS
  // --------------------------------------------------
  function toggleStatus(studentId) {
    if (!isDraft) return;

    setRecords((prev) => ({
      ...prev,
      [studentId]:
        prev[studentId] === "PRESENT" ? "ABSENT" : "PRESENT",
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
    try {
      const payload = {
        records: Object.entries(records).map(([studentId, status]) => ({
          studentId: Number(studentId),
          status,
        })),
      };

      await api.post(`/attendance/sessions/${sessionId}/records`, payload);

      setLastSavedRecords(records);

      alert("Attendance saved");
    } catch (err) {
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

      <Button
        variant="outline"
        onClick={() => navigate(-1)}
      >
        ← Back to Class
      </Button>

      <div>
        <h2 className="text-xl font-semibold">
          Attendance — Class {session.classId}
        </h2>

        <p className="text-sm text-gray-600">
          Date: {new Date(session.date).toDateString()}
        </p>
      </div>

      <Badge className={isDraft ? "bg-yellow-500" : "bg-green-600"}>
        {session.status}
      </Badge>

      {!isDraft && (
        <div className="text-sm text-gray-600">
          <p>Submitted at: {new Date(session.updatedAt).toLocaleString()}</p>
        </div>
      )}

      {isDraft && (
        <Button onClick={markAllPresent}>
          Mark All Present
        </Button>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2 border">Student</th>
              <th className="text-left p-2 border">Status</th>
            </tr>
          </thead>

          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
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
        <Button onClick={saveAttendance}>
          Save Attendance
        </Button>
      )}

      {isDraft && (
        <Button variant="destructive" onClick={submitAttendance}>
          Submit Attendance
        </Button>
      )}

    </div>
  );
}
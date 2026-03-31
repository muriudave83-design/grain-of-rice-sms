import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../../services/apiClient";

export default function TeacherAttendanceClass() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendlyMessage, setFriendlyMessage] = useState("");

  useEffect(() => {
    // ✅ CRITICAL FIX: prevent invalid API call
    if (!classId) {
      console.warn("⚠️ No classId → skipping API call");
      setLoading(false);
      return;
    }

    api
      .get(`/attendance/classes/${classId}`)
      .then((res) => {
        const unique = [];
        const seenDates = new Set();

        res.data
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .forEach((s) => {
            const d = new Date(s.date).toDateString();
            if (!seenDates.has(d)) {
              seenDates.add(d);
              unique.push(s);
            }
          });

        setSessions(unique);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Attendance API error:", err);
        setError(err.response?.status);
        setLoading(false);
      });
  }, [classId]);

  const startNewSession = async () => {
    if (!classId) {
      alert("No class selected");
      return;
    }

    try {
      const res = await api.post("/attendance/sessions", { classId });

      navigate(`/teacher/attendance/session/${res.data.id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setFriendlyMessage(
          "Attendance for today already exists. You can view or continue the session until tomorrow."
        );
      } else {
        alert("Error starting new session");
      }
    }
  };

  // ✅ UI for missing class
  if (!classId) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold">Attendance</h2>
        <p className="mt-2 text-gray-600">No class selected.</p>

        <button
          onClick={() => navigate("/teacher/classes")}
          className="mt-4 px-4 py-2 bg-yellow-500 text-black rounded"
        >
          Go to Classes
        </button>
      </div>
    );
  }

  if (loading) return <p>Loading attendance sessions...</p>;
  if (error === 403) return <p>Forbidden</p>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Attendance Sessions — Class {classId}
        </h2>

        <button
          onClick={startNewSession}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Start New Session
        </button>
      </div>

      {friendlyMessage && (
        <p className="mt-2 text-yellow-700 bg-yellow-100 p-2 rounded border-l-4 border-yellow-500">
          {friendlyMessage}
        </p>
      )}

      {sessions.length === 0 ? (
        <p className="mt-4 text-gray-600">
          No attendance sessions yet.
        </p>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full border border-gray-200 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const dateStr = new Date(s.date).toDateString();
                const statusClass =
                  s.status === "SUBMITTED"
                    ? "bg-green-500 text-white"
                    : "bg-yellow-500 text-white";

                return (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{dateStr}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${statusClass}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/teacher/attendance/session/${s.id}`}>
                        <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                          {s.status === "DRAFT" ? "Continue" : "View"}
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
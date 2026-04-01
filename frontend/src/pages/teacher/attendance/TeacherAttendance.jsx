import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/apiClient";

export default function TeacherAttendance() {
  console.log("🚀 Attendance page mounted");

  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState({});
  const [loadingClassId, setLoadingClassId] = useState(null);

  const navigate = useNavigate();

  // ✅ Fetch classes
  useEffect(() => {
    api.get("/teacher/classes")
      .then(res => {
        const data = res.data || [];

        // Sort by last used class (localStorage)
        const lastUsed = localStorage.getItem("lastAttendanceClassId");

        const sorted = [...data].sort((a, b) => {
          if (a.id == lastUsed) return -1;
          if (b.id == lastUsed) return 1;
          return 0;
        });

        setClasses(sorted);
      })
      .catch((err) => {
        console.error("CLASSES FETCH ERROR:", err);
      });
  }, []);

  // ✅ Check today's sessions for all classes
  useEffect(() => {
    async function fetchSessions() {
      const map = {};

      for (let c of classes) {
        try {
          const res = await api.get(`/attendance/sessions/today/${c.id}`);
          if (res.data) {
            map[c.id] = res.data;
          }
        } catch (err) {
          // 404 = no session → ignore
        }
      }

      setSessions(map);
    }

    if (classes.length > 0) {
      fetchSessions();
    }
  }, [classes]);

  return (
    <div className="space-y-6">

      <h2 className="text-xl font-semibold">Attendance</h2>

      <table className="w-full border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border text-left">Class</th>
            <th className="p-2 border text-left">Today</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>

        <tbody>
          {classes.map((c) => {
            const session = sessions[c.id];
            const isLoading = loadingClassId === c.id;

            return (
              <tr key={c.id}>
                <td className="p-2 border">
                  <div className="font-medium">{c.name}</div>
                </td>

                <td className="p-2 border text-sm text-gray-600">
                  {session ? (
                    <span className="text-green-600">Session exists (Today)</span>
                  ) : (
                    <span className="text-gray-400">No session yet</span>
                  )}
                </td>

                <td className="p-2 border">
                  <button
                    disabled={isLoading}
                    onClick={() => startAttendance(c.id)}
                    className={`px-3 py-1 rounded text-white ${
                      isLoading
                        ? "bg-gray-400"
                        : session
                        ? "bg-yellow-600"
                        : "bg-blue-600"
                    }`}
                  >
                    {isLoading
                      ? "Loading..."
                      : session
                      ? "Resume Attendance"
                      : "Start Attendance"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

    </div>
  );

  // ✅ START / RESUME ATTENDANCE
  async function startAttendance(classId) {
    setLoadingClassId(classId);

    try {
      // STEP 1: Check existing session
      const existing = await api.get(`/attendance/sessions/today/${classId}`);

      if (existing.data) {
        localStorage.setItem("lastAttendanceClassId", classId);

        navigate(`/teacher/attendance/session/${existing.data.id}`);
        return;
      }

    } catch (err) {
      // 404 → continue
    }

    try {
      // STEP 2: Create session
      const res = await api.post("/attendance/sessions", { classId });

      const sessionId = res.data.id;

      localStorage.setItem("lastAttendanceClassId", classId);

      navigate(`/teacher/attendance/session/${sessionId}`);

    } catch (err) {
      console.error("Start attendance error:", err);
      alert("Could not start attendance");
    } finally {
      setLoadingClassId(null);
    }
  }
}
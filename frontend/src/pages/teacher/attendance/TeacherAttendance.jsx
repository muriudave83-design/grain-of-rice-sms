import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/apiClient";

export default function TeacherAttendance() {
  console.log("🚀 Attendance page mounted");

  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  // ✅ Fetch classes (WITH DEBUG)
  useEffect(() => {
    api.get("/teacher/classes")
      .then(res => {
        console.log("CLASSES RESPONSE:", res);

        const data = res.data || [];
        console.log("CLASSES ARRAY:", data);

        setClasses(data);
      })
      .catch((err) => {
        console.error("CLASSES FETCH ERROR:", err);
      });
  }, []);

  return (
    <div className="space-y-6">

      <h2 className="text-xl font-semibold">Attendance</h2>

      <table className="w-full border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Class</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>

        <tbody>
          {classes.map((c) => (
            <tr key={c.id}>
              <td className="p-2 border">{c.name}</td>

              <td className="p-2 border">
                <button
                  onClick={() => startAttendance(c.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Start Attendance
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );

  // ✅ START / RESUME ATTENDANCE (ONLY ON CLICK)
  async function startAttendance(classId) {
    try {
      // STEP 1: Check if session already exists
      const existing = await api.get(`/attendance/sessions/today/${classId}`);

      if (existing.data) {
        console.log("🔁 Resuming existing session");

        localStorage.setItem("lastAttendanceClassId", classId);

        navigate(`/teacher/attendance/session/${existing.data.id}`);
        return;
      }

    } catch (err) {
      // ✅ 404 = no session → continue to create
    }

    try {
      // STEP 2: Create new session
      const res = await api.post("/attendance/sessions", { classId });

      const sessionId = res.data.id;

      localStorage.setItem("lastAttendanceClassId", classId);

      navigate(`/teacher/attendance/session/${sessionId}`);

    } catch (err) {
      console.error("Start attendance error:", err);
      alert("Could not start attendance");
    }
  }
}
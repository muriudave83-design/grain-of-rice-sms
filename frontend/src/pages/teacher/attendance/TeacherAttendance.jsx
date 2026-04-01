import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/apiClient";

export default function TeacherAttendance() {
  console.log("🚀 Attendance page mounted");

  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  // ✅ Prevent double autoStart (React Strict Mode fix)
  const hasAutoStarted = useRef(false);

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

  // ✅ AUTO START ATTENDANCE (ThinkWave UX)
  useEffect(() => {
    if (classes.length === 0) {
      console.warn("No classes found, staying on page");
      return;
    }

    // 🚫 Prevent double execution (STRICT MODE FIX)
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;

    const autoStart = async () => {
      try {
        const lastClassId = localStorage.getItem("lastAttendanceClassId");

        console.log("LAST CLASS ID:", lastClassId);

        const validClass = classes.find(
          (c) => String(c.id) === String(lastClassId)
        );

        console.log("VALID CLASS:", validClass);

        const selectedClass = validClass || classes[0];

        console.log("SELECTED CLASS:", selectedClass);

        await startAttendance(selectedClass.id);

      } catch (err) {
        console.error("Auto attendance error:", err);
      }
    };

    autoStart();
  }, [classes]);

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

  // ✅ START / RESUME ATTENDANCE (FINAL LOGIC)
  async function startAttendance(classId) {
    try {
      // Try creating session
      const res = await api.post("/attendance/sessions", { classId });

      const sessionId = res.data.id;

      localStorage.setItem("lastAttendanceClassId", classId);

      navigate(`/teacher/attendance/session/${sessionId}`);

    } catch (err) {
      if (err.response?.status === 409) {
        console.log("🔁 Session exists, fetching today's session...");

        try {
          const res = await api.get(`/attendance/sessions/today/${classId}`);

          const sessionId = res.data.id;

          localStorage.setItem("lastAttendanceClassId", classId);

          // ✅ RESUME existing session
          navigate(`/teacher/attendance/session/${sessionId}`);

        } catch (fetchErr) {
          console.error("❌ Could not recover session", fetchErr);
          alert("Could not resume attendance session.");
        }

      } else {
        console.error("Start attendance error:", err);
        alert("Failed to start attendance.");
      }
    }
  }
}
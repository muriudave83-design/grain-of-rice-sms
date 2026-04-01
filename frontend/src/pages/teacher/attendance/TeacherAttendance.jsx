import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/apiClient";

export default function TeacherAttendance() {
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  // ✅ Fetch classes
  useEffect(() => {
    api.get("/classes/my")
      .then(res => setClasses(res.data))
      .catch(() => {});
  }, []);

  // ✅ AUTO START ATTENDANCE (ThinkWave UX)
  useEffect(() => {
    if (classes.length === 0) return;

    const autoStart = async () => {
      try {
        const lastClassId = localStorage.getItem("lastAttendanceClassId");

        // ✅ Validate last class
        const validClass = classes.find(
          (c) => String(c.id) === String(lastClassId)
        );

        const selectedClass = validClass || classes[0];

        await startAttendance(selectedClass.id, true);

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

  // ✅ START ATTENDANCE (manual + auto)
  async function startAttendance(classId, isAuto = false) {
    try {
      const res = await api.post("/attendance/sessions", {
        classId
      });

      const sessionId = res.data.id;

      // ✅ Save last used class (ONLY here — correct place)
      localStorage.setItem("lastAttendanceClassId", classId);

      navigate(`/teacher/attendance/session/${sessionId}`);

    } catch (err) {

      // ✅ If session already exists, try to recover instead of failing
      if (err?.response?.status === 400) {
        try {
          const existing = await api.get(`/attendance/sessions/today/${classId}`);
          const sessionId = existing.data.id;

          localStorage.setItem("lastAttendanceClassId", classId);

          navigate(`/teacher/attendance/session/${sessionId}`);
          return;
        } catch {}
      }

      if (!isAuto) {
        alert("Attendance session already exists today");
      }

    }
  }
}
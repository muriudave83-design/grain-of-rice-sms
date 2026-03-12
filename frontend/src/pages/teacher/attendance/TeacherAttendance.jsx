import { useEffect, useState } from "react";
import api from "../../../services/apiClient";

export default function TeacherAttendance() {

  const [classes, setClasses] = useState([]);

  useEffect(() => {
    api.get("/classes/my")
      .then(res => setClasses(res.data))
      .catch(() => {});
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

  async function startAttendance(classId) {

    try {

      const res = await api.post("/attendance/sessions", {
        classId
      });

      const sessionId = res.data.id;

      window.location.href =
        `/teacher/attendance/session/${sessionId}`;

    } catch {

      alert("Attendance session already exists today");

    }

  }

}
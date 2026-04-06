import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../../../services/apiClient";

export default function AdminAttendanceClass() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      const res = await apiClient.get(
        `/admin/attendance/class/${classId}`
      );

      setStudents(res.data);

      console.log("CLASS ATTENDANCE:", res.data);
    } catch (err) {
      console.error("Failed to fetch class attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  // ✅ Normalize status (VERY IMPORTANT)
  const normalizedStudents = students.map((s) => ({
    ...s,
    status: s.status || "NOT_MARKED",
  }));

  // ✅ SAFE COUNTS (ALWAYS CONSISTENT)
  const total = normalizedStudents.length;

  const presentCount = normalizedStudents.filter(
    (s) => s.status === "PRESENT"
  ).length;

  const absentCount = normalizedStudents.filter(
    (s) => s.status === "ABSENT"
  ).length;

  const lateCount = normalizedStudents.filter(
    (s) => s.status === "LATE"
  ).length;

  const marked = presentCount + absentCount + lateCount;

  const notMarkedCount = total - marked;

  const attendanceRate =
    total === 0 ? 0 : Math.round((presentCount / total) * 100);

  // 📅 Today label
  const today = new Date().toLocaleDateString();

  // ✅ Mark attendance
  const markAttendance = async (studentId, status) => {
    try {
      await apiClient.post("/admin/attendance/mark", {
        studentId,
        classId,
        status,
      });

      fetchStudents();
    } catch (err) {
      console.error("Failed to mark attendance:", err);
    }
  };

  // ✅ Mark all present
  const markAllPresent = async () => {
    try {
      await Promise.all(
        normalizedStudents.map((student) =>
          apiClient.post("/admin/attendance/mark", {
            studentId: student.studentId,
            classId,
            status: "PRESENT",
          })
        )
      );

      fetchStudents();
    } catch (err) {
      console.error("Failed to mark all present:", err);
    }
  };

  if (loading) {
    return <p className="p-6">Loading class attendance...</p>;
  }

  return (
    <div className="p-6">
      {/* 🔙 BACK BUTTON */}
      <button
        onClick={() => navigate("/dashboard/admin/attendance")}
        className="mb-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
      >
        ← Back to Attendance
      </button>

      <h1 className="text-xl font-semibold mb-1">
        Class Attendance (Class ID: {classId})
      </h1>

      {/* 📅 TODAY */}
      <p className="text-sm text-gray-500 mb-4">
        Showing attendance for:{" "}
        <span className="font-medium">{today}</span>
      </p>

      {/* ✅ SUMMARY CARDS */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gray-800 text-white shadow">
          <p className="text-xs">Total</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>

        <div className="p-4 rounded-xl bg-green-600 text-white shadow">
          <p className="text-xs">Present</p>
          <p className="text-2xl font-bold">{presentCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-red-600 text-white shadow">
          <p className="text-xs">Absent</p>
          <p className="text-2xl font-bold">{absentCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-yellow-500 text-black shadow">
          <p className="text-xs">Late</p>
          <p className="text-2xl font-bold">{lateCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-gray-300 text-black shadow">
          <p className="text-xs">Not Marked</p>
          <p className="text-2xl font-bold">{notMarkedCount}</p>
        </div>
      </div>

      {/* 📊 ATTENDANCE RATE */}
      <div className="mb-6 p-4 bg-black text-white rounded-xl">
        <p className="text-sm text-gray-400">Attendance Rate</p>
        <p className="text-2xl font-bold">{attendanceRate}%</p>
      </div>

      {/* MARK ALL */}
      <div className="mb-4">
        <button
          onClick={markAllPresent}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Mark All Present
        </button>
      </div>

      <div className="bg-white border rounded p-4">
        {normalizedStudents.length === 0 ? (
          <p>No students found.</p>
        ) : (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 border">Student</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>

            <tbody>
              {normalizedStudents.map((student) => {
                const status = student.status;

                return (
                  <tr key={student.studentId} className="border-t">
                    <td className="p-3 border">{student.name}</td>

                    <td className="p-3 border">
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium
                          ${
                            status === "PRESENT"
                              ? "bg-green-100 text-green-700"
                              : status === "ABSENT"
                              ? "bg-red-100 text-red-700"
                              : status === "LATE"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }
                        `}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="p-3 border space-x-2">
                      <button
                        onClick={() =>
                          markAttendance(student.studentId, "PRESENT")
                        }
                        className={`px-3 py-1 rounded text-white ${
                          status === "PRESENT"
                            ? "bg-green-800"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        Present
                      </button>

                      <button
                        onClick={() =>
                          markAttendance(student.studentId, "ABSENT")
                        }
                        className={`px-3 py-1 rounded text-white ${
                          status === "ABSENT"
                            ? "bg-red-800"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        Absent
                      </button>

                      <button
                        onClick={() =>
                          markAttendance(student.studentId, "LATE")
                        }
                        className={`px-3 py-1 rounded text-white ${
                          status === "LATE"
                            ? "bg-yellow-700"
                            : "bg-yellow-500 hover:bg-yellow-600"
                        }`}
                      >
                        Late
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
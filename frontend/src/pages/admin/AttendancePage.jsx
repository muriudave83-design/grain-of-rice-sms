import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function AttendancePage() {
  const navigate = useNavigate();

  // ✅ summary state
  const [summary, setSummary] = useState(null);

  // ✅ classes state
  const [classes, setClasses] = useState([]);

  // ✅ today label
  const today = new Date().toLocaleDateString();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, classRes] = await Promise.all([
          apiClient.get("/admin/attendance/summary"),
          apiClient.get("/admin/attendance/by-class"),
        ]);

        setSummary(summaryRes.data);
        setClasses(classRes.data);

        console.log("SUMMARY:", summaryRes.data);
        console.log("CLASSES:", classRes.data);
      } catch (err) {
        console.error("Failed to fetch attendance data:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">
        Attendance Overview
      </h1>

      {/* ✅ SHOW TODAY */}
      <div className="mb-4 text-sm text-gray-500">
        Showing attendance for:{" "}
        <span className="font-medium text-gray-700">{today}</span>
      </div>

      {/* ✅ SUMMARY CARDS */}
      {!summary ? (
        <p>Loading summary...</p>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Total Students</p>
            <h2 className="text-xl font-semibold">
              {summary.totalStudents}
            </h2>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Present</p>
            <h2 className="text-xl text-green-600 font-semibold">
              {summary.present}
            </h2>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Absent</p>
            <h2 className="text-xl text-red-600 font-semibold">
              {summary.absent}
            </h2>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Attendance Rate</p>
            <h2 className="text-xl text-blue-600 font-semibold">
              {summary.attendanceRate}%
            </h2>
          </div>
        </div>
      )}

      {/* ✅ TABLE UI */}
      <div className="mt-6 bg-white border rounded-lg p-4 shadow-sm">
        <h2 className="font-semibold mb-4">Class Attendance</h2>

        <table className="w-full border rounded overflow-hidden">
          <thead>
            <tr className="bg-gray-100 text-left text-sm">
              <th className="p-3 border">Class</th>
              <th className="p-3 border">Total</th>
              <th className="p-3 border">Present</th>
              <th className="p-3 border">Absent</th>
              <th className="p-3 border">Not Marked</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <tr
                key={cls.classId}
                onClick={() =>
                  navigate(`/dashboard/admin/attendance/${cls.classId}`)
                }
                className="cursor-pointer hover:bg-gray-50 transition"
              >
                <td className="p-3 border">{cls.className}</td>
                <td className="p-3 border">{cls.totalStudents}</td>
                <td className="p-3 border text-green-600 font-medium">
                  {cls.present}
                </td>
                <td className="p-3 border text-red-600 font-medium">
                  {cls.absent}
                </td>
                <td className="p-3 border text-gray-500">
                  {cls.notMarked}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
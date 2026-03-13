import { useEffect, useState } from "react";

export default function AdminAttendanceOverview() {

  const [classes, setClasses] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {

    fetchClasses();
    fetchHistory();

  }, []);

  async function fetchClasses() {

    try {

      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/attendance/by-class`);
      const data = await res.json();
      setClasses(data);

    } catch (err) {

      console.error("Failed to load attendance", err);

    }

  }

  async function fetchHistory() {

    try {

      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/attendance/by-grade`);
      const data = await res.json();
      setHistory(data);

    } catch (err) {

      console.error("Failed to load attendance history", err);

    }

  }

  return (
    <div className="space-y-8">

      <h2 className="text-lg font-semibold">
        Attendance Overview
      </h2>

      {/* CLASS OVERVIEW TABLE */}

      <div className="overflow-x-auto border rounded">

        <table className="w-full text-sm">

          <thead className="bg-gray-50">

            <tr className="text-left">
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Students</th>
              <th className="px-4 py-2">Present</th>
              <th className="px-4 py-2">Absent</th>
              <th className="px-4 py-2">Not Marked</th>
              <th className="px-4 py-2">Attendance %</th>
            </tr>

          </thead>

          <tbody>

            {classes.map((cls) => (

              <tr
                key={cls.classId}
                className="border-t cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  window.location.href = `/dashboard/admin/attendance/${cls.classId}`
                }
              >

                <td className="px-4 py-2 font-medium">
                  {cls.className}
                </td>

                <td className="px-4 py-2">
                  {cls.totalStudents}
                </td>

                <td className="px-4 py-2 text-green-600">
                  {cls.present}
                </td>

                <td className="px-4 py-2 text-red-600">
                  {cls.absent}
                </td>

                <td className="px-4 py-2 text-gray-600">
                  {cls.notMarked}
                </td>

                <td className="px-4 py-2">
                  {cls.attendanceRate === null ? "-" : `${cls.attendanceRate}%`}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>


      {/* ATTENDANCE HISTORY SECTION */}

      <div className="space-y-4">

        <h3 className="text-lg font-semibold">
          Attendance History (Last 30 Days)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {history.map((grade) => (

            <div
              key={grade.grade}
              className="border rounded p-4 bg-white shadow-sm"
            >

              <div className="text-sm text-gray-500">
                Class
              </div>

              <div className="text-lg font-semibold">
                {grade.grade}
              </div>

              <div className="mt-2 text-sm">
                Attendance Rate
              </div>

              <div className="text-2xl font-bold text-blue-600">
                {grade.attendanceRate}%
              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}
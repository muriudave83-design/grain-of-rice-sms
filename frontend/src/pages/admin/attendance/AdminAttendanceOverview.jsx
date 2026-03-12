import { useEffect, useState } from "react";

export default function AdminAttendanceOverview() {

  const [classes, setClasses] = useState([]);

  useEffect(() => {

    fetch(`${import.meta.env.VITE_API_URL}/admin/attendance/by-class`)
      .then((res) => res.json())
      .then((data) => setClasses(data))
      .catch((err) => console.error("Failed to load attendance", err));

  }, []);

  return (
    <div className="space-y-6">

      <h2 className="text-lg font-semibold">
        Attendance Overview
      </h2>

      <div className="overflow-x-auto border rounded">

        <table className="w-full text-sm">

          <thead className="bg-gray-50">

            <tr className="text-left">
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Total Students</th>
              <th className="px-4 py-2">Present</th>
              <th className="px-4 py-2">Absent</th>
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

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
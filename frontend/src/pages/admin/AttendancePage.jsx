import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AttendancePage() {

  const [classes, setClasses] = useState([]);

  useEffect(() => {

    fetch(`${import.meta.env.VITE_API_URL}/admin/attendance/by-class`)
      .then(res => res.json())
      .then(data => setClasses(data))
      .catch(err => console.error("Failed to load attendance", err));

  }, []);

  return (
    <AdminLayout>

      <div className="p-6">

        <h1 className="text-xl font-semibold mb-6">
          Attendance Overview
        </h1>

        <div className="overflow-x-auto bg-white border rounded">

          <table className="w-full text-sm">

            <thead className="bg-gray-50">

              <tr className="text-left">
                <th className="p-3">Class</th>
                <th className="p-3">Total Students</th>
                <th className="p-3">Present</th>
                <th className="p-3">Absent</th>
                <th className="p-3">Attendance Rate</th>
              </tr>

            </thead>

            <tbody>

              {classes.map((cls) => (

                <tr key={cls.classId} className="border-t">

                  <td className="p-3 font-medium">
                    {cls.className}
                  </td>

                  <td className="p-3">
                    {cls.totalStudents}
                  </td>

                  <td className="p-3 text-green-600">
                    {cls.present}
                  </td>

                  <td className="p-3 text-red-600">
                    {cls.absent}
                  </td>

                  <td className="p-3">
                    {cls.attendanceRate}%
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </AdminLayout>
  );
}
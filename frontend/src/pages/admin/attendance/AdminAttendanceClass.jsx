import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function AdminAttendanceClass() {

  const { classId } = useParams();
  const [students, setStudents] = useState([]);

  useEffect(() => {

    fetch(`${import.meta.env.VITE_API_URL}/admin/attendance/class/${classId}`)
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch((err) => console.error("Failed to load class attendance", err));

  }, [classId]);

  return (
    <div className="space-y-6">

      <h2 className="text-lg font-semibold">
        Class Attendance
      </h2>

      <div className="overflow-x-auto border rounded">

        <table className="w-full text-sm">

          <thead className="bg-gray-50">

            <tr className="text-left">
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Status</th>
            </tr>

          </thead>

          <tbody>

            {students.map((s) => (

              <tr key={s.studentId} className="border-t">

                <td className="px-4 py-2">
                  {s.studentName}
                </td>

                <td
                  className={`px-4 py-2 font-medium ${
                    s.status === "PRESENT"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {s.status}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
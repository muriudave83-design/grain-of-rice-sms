import React from "react";
import AdminLayout from "../../components/layout/AdminLayout";

export default function GradesPage() {
  const mock = [
    { id: 1, student: "Student A", exam: "Midterm", grade: "B+" },
    { id: 2, student: "Student B", exam: "Final", grade: "A-" },
  ];

  return (
    <AdminLayout>
      <div className="p-6">

        <h1 className="text-xl font-semibold mb-6">Grades</h1>

        <input
          type="text"
          placeholder="Search grades..."
          className="w-full mb-6 p-2 border rounded"
        />

        <div className="overflow-x-auto bg-white border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Student</th>
                <th className="p-3">Exam</th>
                <th className="p-3">Grade</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>

            <tbody>
              {mock.map((g) => (
                <tr key={g.id} className="border-t">
                  <td className="p-3">{g.student}</td>
                  <td className="p-3">{g.exam}</td>
                  <td className="p-3">{g.grade}</td>
                  <td className="p-3">
                    <button className="text-blue-600 text-xs mr-2">View</button>
                    <button className="text-green-600 text-xs mr-2">Edit</button>
                    <button className="text-red-600 text-xs">Delete</button>
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

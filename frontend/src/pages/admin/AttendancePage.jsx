import React from "react";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AttendancePage() {
  const mock = [
    { id: 1, class: "Form 1A", date: "2025-12-02", attendance: "88%" },
    { id: 2, class: "Form 2B", date: "2025-12-02", attendance: "91%" },
  ];

  return (
    <AdminLayout>
      <div className="p-6">

        <h1 className="text-xl font-semibold mb-6">Attendance</h1>

        <input
          type="text"
          placeholder="Search attendance..."
          className="w-full mb-6 p-2 border rounded"
        />

        <div className="overflow-x-auto bg-white border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Class</th>
                <th className="p-3">Date</th>
                <th className="p-3">Attendance</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>

            <tbody>
              {mock.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{a.class}</td>
                  <td className="p-3">{a.date}</td>
                  <td className="p-3">{a.attendance}</td>
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

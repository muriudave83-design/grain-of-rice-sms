import React from "react";
import AdminLayout from "../../components/layout/AdminLayout";

export default function ExamsPage() {
  const mock = [
    { id: 1, name: "Midterm Exam", term: "Term 1", classes: "Form 1, Form 2" },
    { id: 2, name: "Final Exam", term: "Term 1", classes: "All Forms" },
  ];

  return (
    <AdminLayout>
      <div className="p-6">

        <h1 className="text-xl font-semibold mb-6">Exams</h1>

        <input
          type="text"
          placeholder="Search exams..."
          className="w-full mb-6 p-2 border rounded"
        />

        <div className="overflow-x-auto bg-white border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Exam</th>
                <th className="p-3">Term</th>
                <th className="p-3">Classes</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>

            <tbody>
              {mock.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3">{e.name}</td>
                  <td className="p-3">{e.term}</td>
                  <td className="p-3">{e.classes}</td>
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

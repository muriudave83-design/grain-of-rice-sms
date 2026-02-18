import React from "react";
import AdminLayout from "../../components/layout/AdminLayout";

export default function FeesPage() {
  const mock = [
    { id: 1, class: "Form 1A", amount: "KES 22,000", term: "Term 1" },
    { id: 2, class: "Form 2B", amount: "KES 26,000", term: "Term 1" },
  ];

  return (
    <AdminLayout>
      <div className="p-6">

        <h1 className="text-xl font-semibold mb-6">Fee Structure</h1>

        <input
          type="text"
          placeholder="Search fees..."
          className="w-full mb-6 p-2 border rounded"
        />

        <div className="overflow-x-auto bg-white border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Class</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Term</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>

            <tbody>
              {mock.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-3">{f.class}</td>
                  <td className="p-3">{f.amount}</td>
                  <td className="p-3">{f.term}</td>
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

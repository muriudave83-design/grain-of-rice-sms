import React from "react";
import AdminLayout from "../../components/layout/AdminLayout";

export default function PaymentsPage() {
  const mock = [
    { id: 1, student: "Student A", amount: "KES 22,000", date: "2025-12-01" },
    { id: 2, student: "Student B", amount: "KES 26,000", date: "2025-12-01" },
  ];

  return (
    <AdminLayout>
      <div className="p-6">

        <h1 className="text-xl font-semibold mb-6">Payments</h1>

        <input
          type="text"
          placeholder="Search payments..."
          className="w-full mb-6 p-2 border rounded"
        />

        <div className="overflow-x-auto bg-white border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Student</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Date</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>

            <tbody>
              {mock.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.student}</td>
                  <td className="p-3">{p.amount}</td>
                  <td className="p-3">{p.date}</td>
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
